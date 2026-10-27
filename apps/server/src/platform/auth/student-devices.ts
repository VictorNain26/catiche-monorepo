/**
 * The repository of the student's way in (`./student-sign-in.ts`): devices, the profiles they
 * hold, the student's code and its tries, and the sessions a device holds. Every count of a try
 * is one statement that cannot pass its ceiling, so tries sent at once count no more than it
 * allows. Rows are locked in one order: the code, then the device, then the profile.
 */

import { and, asc, eq, gt, isNotNull, lt, ne, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { device, deviceProfile, session, studentCode, user } from './schema';

/** Tries on one device before the profile is blocked there (CNIL, deliberation 2022-100, § 47). */
export const DEVICE_TRIES = 3;
/** Tries on every device before the profile is locked until a new code (NIST SP 800-63B-4, § 3.2.10). */
export const CODE_TRIES = 10;

export type ProfileState = 'ready' | 'choose' | 'waiting' | 'blocked' | 'locked';

interface ProfileRow {
  failures: number;
  codeWindowUntil: Date | null;
  hash: string | null;
  codeFailures: number | null;
}

/** What the student meets on the device: their code, one to choose, a guardian to ask. */
function stateOf({ failures, codeWindowUntil, hash, codeFailures }: ProfileRow, now: Date): ProfileState {
  if (hash === null) return codeWindowUntil !== null && codeWindowUntil > now ? 'choose' : 'waiting';
  if ((codeFailures ?? 0) >= CODE_TRIES) return 'locked';
  return failures >= DEVICE_TRIES ? 'blocked' : 'ready';
}

/** The outcome of claiming a try: the hash to check it against, or why there is none. */
export type Claim =
  { outcome: 'try'; hash: string; deviceFailures: number; codeFailures: number } | { outcome: 'unknown' | 'no-code' | 'blocked' | 'locked' };

/** The profile's window to choose a code, open and opened for the page that holds this token. */
const windowOf = (deviceId: string, studentId: string, chooseTokenHash: string, now: Date) =>
  and(
    eq(deviceProfile.deviceId, deviceId),
    eq(deviceProfile.studentId, studentId),
    gt(deviceProfile.codeWindowUntil, now),
    eq(deviceProfile.chooseTokenHash, chooseTokenHash),
  );

export function createStudentDevices(db: Db) {
  /** Ends every session the device holds but `keep`: it has just become shared, and a long session would outlive it. */
  const closeSessionsOf = (tx: Pick<Db, 'delete'>, deviceId: string, keep: string | undefined) =>
    tx.delete(session).where(and(eq(session.deviceId, deviceId), keep === undefined ? undefined : ne(session.token, keep)));

  return {
    async findDevice(id: string) {
      const [found] = await db.select({ id: device.id, shared: device.shared }).from(device).where(eq(device.id, id));
      return found;
    },

    async createDevice(id: string, userAgent: string | null) {
      await db.insert(device).values({ id, userAgent });
    },

    /**
     * The student on the device, by a guardian's code: their tries there start again, and a student
     * without a code chooses one until `windowUntil`, by the page that holds the token hashed as
     * `chooseTokenHash`. A second profile makes the device shared, and `shared` makes it so: the
     * sessions it held close, but `keep`'s. Whether it is shared now.
     */
    async addProfile(
      deviceId: string,
      studentId: string,
      { windowUntil, chooseTokenHash, shared, keep }: { windowUntil: Date; chooseTokenHash: string; shared: boolean; keep?: string | undefined },
    ) {
      return db.transaction(async (tx) => {
        const [held] = await tx.select({ shared: device.shared }).from(device).where(eq(device.id, deviceId)).for('update');
        if (!held) throw new Error('The device to add a profile to does not exist');
        await tx
          .insert(deviceProfile)
          .values({ deviceId, studentId, codeWindowUntil: windowUntil, chooseTokenHash })
          .onConflictDoUpdate({
            target: [deviceProfile.deviceId, deviceProfile.studentId],
            set: { failures: 0, codeWindowUntil: windowUntil, chooseTokenHash },
          });
        const others = await tx
          .select({ studentId: deviceProfile.studentId })
          .from(deviceProfile)
          .where(and(eq(deviceProfile.deviceId, deviceId), ne(deviceProfile.studentId, studentId)))
          .limit(1);
        if (!held.shared && (shared || others.length > 0)) {
          await tx.update(device).set({ shared: true }).where(eq(device.id, deviceId));
          await closeSessionsOf(tx, deviceId, keep);
          return true;
        }
        return held.shared;
      });
    },

    /** The profiles the device holds, in the order they were added, each with what its student meets. */
    async listProfiles(deviceId: string, now = new Date()) {
      const rows = await db
        .select({
          id: user.id,
          name: user.name,
          failures: deviceProfile.failures,
          codeWindowUntil: deviceProfile.codeWindowUntil,
          hash: studentCode.hash,
          codeFailures: studentCode.failures,
        })
        .from(deviceProfile)
        .innerJoin(user, eq(user.id, deviceProfile.studentId))
        .leftJoin(studentCode, eq(studentCode.userId, deviceProfile.studentId))
        .where(eq(deviceProfile.deviceId, deviceId))
        .orderBy(asc(deviceProfile.createdAt), asc(user.name));
      return rows.map((row) => ({ id: row.id, name: row.name, state: stateOf(row, now) }));
    },

    /**
     * A try of the student's code on the device, counted before it is checked: the code's row
     * locked, then each count raised in one statement that stops at its ceiling. A profile the
     * device does not hold counts nothing.
     */
    async claimTry(deviceId: string, studentId: string): Promise<Claim> {
      return db.transaction(async (tx) => {
        const [profile] = await tx
          .select({ failures: deviceProfile.failures })
          .from(deviceProfile)
          .where(and(eq(deviceProfile.deviceId, deviceId), eq(deviceProfile.studentId, studentId)));
        if (!profile) return { outcome: 'unknown' };
        const [code] = await tx
          .select({ hash: studentCode.hash, failures: studentCode.failures })
          .from(studentCode)
          .where(eq(studentCode.userId, studentId))
          .for('update');
        if (!code?.hash) return { outcome: 'no-code' };
        if (code.failures >= CODE_TRIES) return { outcome: 'locked' };
        const [counted] = await tx
          .update(deviceProfile)
          .set({ failures: sql`${deviceProfile.failures} + 1` })
          .where(and(eq(deviceProfile.deviceId, deviceId), eq(deviceProfile.studentId, studentId), lt(deviceProfile.failures, DEVICE_TRIES)))
          .returning({ failures: deviceProfile.failures });
        if (!counted) return { outcome: 'blocked' };
        const [everywhere] = await tx
          .update(studentCode)
          .set({ failures: sql`${studentCode.failures} + 1` })
          .where(and(eq(studentCode.userId, studentId), lt(studentCode.failures, CODE_TRIES)))
          .returning({ failures: studentCode.failures });
        if (!everywhere) throw new Error('The code row locked above changed meanwhile');
        return { outcome: 'try', hash: code.hash, deviceFailures: counted.failures, codeFailures: everywhere.failures };
      });
    },

    /** The right code: its tries start again, here and everywhere, and a code said forgotten is found again. */
    async succeeded(deviceId: string, studentId: string) {
      await db.transaction(async (tx) => {
        await tx.update(studentCode).set({ failures: 0, forgottenAt: null }).where(eq(studentCode.userId, studentId));
        await tx
          .update(deviceProfile)
          .set({ failures: 0 })
          .where(and(eq(deviceProfile.deviceId, deviceId), eq(deviceProfile.studentId, studentId)));
      });
    },

    /**
     * Whether a code may be chosen here, read before the code itself is looked at: a device whose
     * window is closed, or a page without its token, learns nothing of the student.
     */
    async mayChoose(deviceId: string, studentId: string, chooseTokenHash: string, now = new Date()) {
      const [open] = await db
        .select({ hash: studentCode.hash })
        .from(deviceProfile)
        .leftJoin(studentCode, eq(studentCode.userId, deviceProfile.studentId))
        .where(windowOf(deviceId, studentId, chooseTokenHash, now));
      return open !== undefined && !open.hash;
    },

    /**
     * The student's first code, or a new one after a forgotten code: only by the page that holds
     * the window's token, while it is open, and while they have none. `shared`: the student said the
     * device is not theirs alone, which closes the sessions it held. False when no code was expected.
     * Locks the code, then the device, then the profile: the order `claimTry` and `addProfile` keep.
     */
    async chooseCode(
      deviceId: string,
      studentId: string,
      hash: string,
      { chooseTokenHash, shared, now = new Date() }: { chooseTokenHash: string; shared: boolean; now?: Date },
    ) {
      return db.transaction(async (tx) => {
        const [code] = await tx.select({ hash: studentCode.hash }).from(studentCode).where(eq(studentCode.userId, studentId)).for('update');
        if (code?.hash) return false;
        const [held] = await tx.select({ shared: device.shared }).from(device).where(eq(device.id, deviceId)).for('update');
        if (!held) return false;
        const [opened] = await tx
          .update(deviceProfile)
          .set({ codeWindowUntil: null, chooseTokenHash: null, failures: 0 })
          .where(windowOf(deviceId, studentId, chooseTokenHash, now))
          .returning({ studentId: deviceProfile.studentId });
        if (!opened) return false;
        await tx
          .insert(studentCode)
          // The first code's moment by the database's clock, which dates the devices it is compared to.
          .values({ userId: studentId, hash, setAt: now, firstSetAt: sql`now()` })
          .onConflictDoUpdate({
            target: studentCode.userId,
            set: { hash, setAt: now, firstSetAt: sql`coalesce(${studentCode.firstSetAt}, excluded.first_set_at)`, failures: 0 },
          });
        if (shared && !held.shared) {
          await tx.update(device).set({ shared: true }).where(eq(device.id, deviceId));
          await closeSessionsOf(tx, deviceId, undefined);
        }
        return true;
      });
    },

    /**
     * « J'ai oublié mon code », on a device that holds the profile: the first moment it was said
     * stays until the code is found again or replaced. Nothing for a student without a code, who has
     * none to forget. False when the device does not hold the profile.
     */
    async forgot(deviceId: string, studentId: string) {
      const [held] = await db
        .select({ studentId: deviceProfile.studentId })
        .from(deviceProfile)
        .where(and(eq(deviceProfile.deviceId, deviceId), eq(deviceProfile.studentId, studentId)));
      if (!held) return false;
      await db
        .update(studentCode)
        .set({ forgottenAt: sql`coalesce(${studentCode.forgottenAt}, now())` })
        .where(and(eq(studentCode.userId, studentId), isNotNull(studentCode.hash)));
      return true;
    },

    /**
     * A guardian's « forgotten » code, spent: the old code stops, every session of the student
     * closes, the windows other devices had open close, the tries start again, and the student is
     * told when it happened; their parents, told the code was forgotten, are told no more.
     */
    async forget(studentId: string, now = new Date()) {
      await db.transaction(async (tx) => {
        await tx
          .insert(studentCode)
          .values({ userId: studentId, hash: null, resetAt: now })
          .onConflictDoUpdate({ target: studentCode.userId, set: { hash: null, failures: 0, resetAt: now, forgottenAt: null } });
        await tx
          .update(deviceProfile)
          .set({ failures: 0, codeWindowUntil: null, chooseTokenHash: null })
          .where(eq(deviceProfile.studentId, studentId));
        await tx.delete(session).where(eq(session.userId, studentId));
      });
    },

    /**
     * Whether a session of `userId` on the device is a short one: the device is shared, or it holds
     * profiles and the user is none of them, a guardian on their child's device. The child who takes
     * it back never finds the guardian's space open.
     */
    async isShortSession(deviceId: string, userId: string) {
      const [found] = await db
        .select({
          shared: device.shared,
          profiles: sql<number>`(select count(*) from ${deviceProfile} where ${deviceProfile.deviceId} = ${device.id})`.mapWith(Number),
          own: sql<number>`(select count(*) from ${deviceProfile} where ${deviceProfile.deviceId} = ${device.id} and ${deviceProfile.studentId} = ${userId})`.mapWith(
            Number,
          ),
        })
        .from(device)
        .where(eq(device.id, deviceId));
      return found !== undefined && (found.shared || (found.profiles > 0 && found.own === 0));
    },

    /** Ends a session, whoever's: the one a device carried when a guardian's code gave it to a child. */
    async closeSession(token: string) {
      await db.delete(session).where(eq(session.token, token));
    },

    /** Ties a session to the device it was opened on; on a shared one, it closes at `expiresAt`. */
    async attachSession(token: string, deviceId: string, expiresAt: Date | undefined) {
      await db
        .update(session)
        .set({ deviceId, ...(expiresAt === undefined ? {} : { expiresAt }) })
        .where(eq(session.token, token));
    },
  };
}

export type StudentDevices = ReturnType<typeof createStudentDevices>;
