/**
 * The module's access to the database, with its parts in `repository/`. An adult reaches a
 * student through `studentsOf` to read them, `managedBy` to manage them, a clause of the query
 * itself, never a comparison after a read (OWASP Authorization Cheat Sheet): a student the adult
 * is not linked to, or only as a relative where a parent is needed, is simply not found.
 */

import { and, desc, eq, gt, gte, inArray, isNull, ne, notExists, type SQL, sql } from 'drizzle-orm';
import { HISTORY_DAYS } from '../../domain/child-events';
import type { SchoolLevel } from '../../domain/levels';
import type { MemoryAnswer } from '../../domain/memory-consent';
import { device, deviceProfile, passkey, session, studentCode, user } from '../../platform/auth/schema';
import { CODE_TRIES, DEVICE_TRIES } from '../../platform/auth/student-devices';
import { createActivationCode, type ActivationReason } from '../../platform/auth/student-sign-in';
import type { Db } from '../../platform/db/client';
import { accessOf, asParent, otherAdult, record, type Gesture } from './repository/access';
import { adultsRepository } from './repository/adults';
import { adultProfile, childEvent, guardianship, studentProfile } from './schema';

export interface NewStudent {
  id: string;
  name: string;
  email: string;
  level: SchoolLevel;
  birthMonth: string;
}

/** The browser a device named itself by, which the history names it by. */
const browserOf = async (tx: Pick<Db, 'select'>, deviceId: string) =>
  (await tx.select({ userAgent: device.userAgent }).from(device).where(eq(device.id, deviceId)))[0]?.userAgent ?? null;

export function createHouseholdRepository(db: Db) {
  const { studentsOf, managedBy, otherParents, lockFor } = accessOf(db);

  /** The student's row, and the adult's link to them, which says the adult's role. */
  const linkOf = (adultId: string) => and(eq(guardianship.studentId, user.id), eq(guardianship.adultId, adultId));

  /**
   * The devices that hold a student's profile, matching `where`, the newest first: their browser,
   * when the profile was added and last opened, whether the device is shared and the profile
   * blocked there. Never a token nor an address.
   */
  const devices = (where: SQL | undefined) =>
    db
      .select({
        id: device.id,
        userAgent: device.userAgent,
        shared: device.shared,
        createdAt: deviceProfile.createdAt,
        blocked: gte(deviceProfile.failures, DEVICE_TRIES).mapWith(Boolean),
      })
      .from(deviceProfile)
      .innerJoin(device, eq(device.id, deviceProfile.deviceId))
      .where(where)
      .orderBy(desc(deviceProfile.createdAt));

  /** Whether the student has chosen a code, whether too many tries locked it, and when a guardian last replaced it. */
  const codeOf = async (studentId: string) => {
    const [code] = await db
      .select({ hash: studentCode.hash, failures: studentCode.failures, resetAt: studentCode.resetAt })
      .from(studentCode)
      .where(eq(studentCode.userId, studentId));
    return { chosen: Boolean(code?.hash), locked: (code?.failures ?? 0) >= CODE_TRIES, resetAt: code?.resetAt ?? null };
  };

  /** The profile, on a device, of a student the adult is a parent of. */
  const profileOf = (adultId: string, studentId: string, deviceId: string) =>
    and(eq(deviceProfile.deviceId, deviceId), eq(deviceProfile.studentId, studentId), inArray(deviceProfile.studentId, managedBy(adultId)));

  const studentColumns = {
    id: user.id,
    name: user.name,
    level: studentProfile.level,
    birthMonth: studentProfile.birthMonth,
    memoryProposedAt: studentProfile.memoryProposedAt,
    memoryAnswer: studentProfile.memoryAnswer,
  };

  /** The students the adult is linked to, matching `where`, with the adult's role for each. */
  const linkedStudents = (adultId: string, where?: SQL) =>
    db
      .select({ ...studentColumns, role: guardianship.role })
      .from(user)
      .innerJoin(studentProfile, eq(studentProfile.userId, user.id))
      .innerJoin(guardianship, linkOf(adultId))
      .where(where)
      .orderBy(user.createdAt);

  return {
    ...adultsRepository(db),

    /** A user is a student when they have a student's profile. */
    async isStudent(userId: string) {
      const [profile] = await db.select({ userId: studentProfile.userId }).from(studentProfile).where(eq(studentProfile.userId, userId));
      return profile !== undefined;
    },

    /** A student's own profile; undefined for anyone who is not a student. */
    async findProfile(studentId: string) {
      const [student] = await db
        .select({ ...studentColumns, memoryResetAfter: studentProfile.memoryResetAfter })
        .from(user)
        .innerJoin(studentProfile, eq(studentProfile.userId, user.id))
        .where(eq(user.id, studentId));
      return student;
    },

    /** What the adult has yet to declare: being 18 or over, and a parent's links made before the declaration existed. */
    async missingDeclarations(adultId: string) {
      const [[declared], undeclared] = await Promise.all([
        db.select({ at: adultProfile.declaredAdultAt }).from(adultProfile).where(eq(adultProfile.userId, adultId)),
        db
          .select({ studentId: guardianship.studentId })
          .from(guardianship)
          .where(and(eq(guardianship.adultId, adultId), asParent(), isNull(guardianship.declaredAt)))
          .orderBy(guardianship.createdAt),
      ]);
      return { adult: !declared?.at, guardianOf: undeclared.map(({ studentId }) => studentId) };
    },

    /** The adult declares being 18 or over; the first declaration's date stays. */
    async declareAdult(adultId: string) {
      await db
        .insert(adultProfile)
        .values({ userId: adultId, declaredAdultAt: new Date() })
        .onConflictDoUpdate({ target: adultProfile.userId, set: { declaredAdultAt: sql`coalesce(${adultProfile.declaredAdultAt}, now())` } });
    },

    /** An email let the adult in once more (a student has no address that receives one). */
    async countEmailEntry(adultId: string) {
      await db
        .insert(adultProfile)
        .values({ userId: adultId, emailEntries: 1 })
        .onConflictDoUpdate({ target: adultProfile.userId, set: { emailEntries: sql`${adultProfile.emailEntries} + 1` } });
    },

    /**
     * What the passkey's offer reads of the adult: their entries by email, their passkeys, and
     * whether they put it away.
     */
    async passkeyOffer(adultId: string) {
      const [profile] = await db
        .select({
          emailEntries: adultProfile.emailEntries,
          closed: sql<boolean>`${adultProfile.passkeyOfferClosedAt} IS NOT NULL`,
          passkeys: sql<number>`(select count(*) from ${passkey} where ${passkey.userId} = ${adultProfile.userId})`.mapWith(Number),
        })
        .from(adultProfile)
        .where(eq(adultProfile.userId, adultId));
      return profile ?? { emailEntries: 0, closed: false, passkeys: 0 };
    },

    /** The adult puts the passkey's offer away; the first date stays. */
    async closePasskeyOffer(adultId: string) {
      await db
        .update(adultProfile)
        .set({ passkeyOfferClosedAt: sql`coalesce(${adultProfile.passkeyOfferClosedAt}, now())` })
        .where(eq(adultProfile.userId, adultId));
    },

    /** A parent declares holding parental authority over a student; `false` when no such link. */
    async declareGuardian(adultId: string, studentId: string) {
      const declared = await db
        .update(guardianship)
        .set({ declaredAt: sql`coalesce(${guardianship.declaredAt}, now())` })
        .where(and(eq(guardianship.adultId, adultId), eq(guardianship.studentId, studentId), asParent()))
        .returning({ studentId: guardianship.studentId });
      return declared.length > 0;
    },

    /**
     * The students the adult is linked to, in four queries whatever their number: each with the
     * first names of their other parents, who decide with the adult, and what the home warns a
     * parent of, the devices where too many tries blocked them and whether their code stopped
     * everywhere; a relative, who manages neither, is warned of nothing.
     */
    async listStudents(adultId: string) {
      const [students, parents, blocked, locked] = await Promise.all([
        linkedStudents(adultId),
        otherParents(adultId),
        db
          .select({ studentId: deviceProfile.studentId, id: device.id, userAgent: device.userAgent })
          .from(deviceProfile)
          .innerJoin(device, eq(device.id, deviceProfile.deviceId))
          .where(and(inArray(deviceProfile.studentId, managedBy(adultId)), gte(deviceProfile.failures, DEVICE_TRIES)))
          .orderBy(desc(deviceProfile.createdAt)),
        db
          .select({ studentId: studentCode.userId })
          .from(studentCode)
          .where(and(inArray(studentCode.userId, managedBy(adultId)), gte(studentCode.failures, CODE_TRIES))),
      ]);
      const of = <Row extends { studentId: string }>(rows: readonly Row[], id: string) => rows.filter(({ studentId }) => studentId === id);
      return students.map((student) => ({
        ...student,
        parents: of(parents, student.id).map(({ name }) => name),
        alerts: {
          blockedDevices: of(blocked, student.id).map(({ id, userAgent }) => ({ id, userAgent })),
          codeLocked: of(locked, student.id).length > 0,
        },
      }));
    },

    async findStudent(adultId: string, studentId: string) {
      const [student] = await linkedStudents(adultId, eq(user.id, studentId));
      return student;
    },

    /** Whether the adult is a parent of the student, the only one who manages them. */
    async manages(adultId: string, studentId: string) {
      const [link] = await db
        .select({ adultId: guardianship.adultId })
        .from(guardianship)
        .where(and(eq(guardianship.adultId, adultId), eq(guardianship.studentId, studentId), asParent()));
      return link !== undefined;
    },

    /** The student, their profile, and their link to the adult who adds them, declared now. */
    async createStudent(adultId: string, student: NewStudent) {
      await db.transaction(async (tx) => {
        // Waits for the adult's deletion under way, as deleteAccount locks the same row: the link then finds no adult.
        await tx.select({ id: user.id }).from(user).where(eq(user.id, adultId)).for('update');
        await tx.insert(user).values({ id: student.id, name: student.name, email: student.email });
        await tx.insert(studentProfile).values({ userId: student.id, level: student.level, birthMonth: student.birthMonth });
        await tx.insert(guardianship).values({ adultId, studentId: student.id, declaredAt: new Date() });
      });
    },

    /**
     * The gestures the patch makes, in the history with it: a value saved unchanged makes none.
     * Undefined when the adult is not a parent of the student.
     */
    async updateStudent(
      adultId: string,
      studentId: string,
      patch: { name?: string | undefined; level?: SchoolLevel | undefined; memoryProposed?: boolean | undefined },
    ) {
      return db.transaction(async (tx) => {
        await lockFor(tx, adultId, studentId);
        const [current] = await tx
          .select({ name: user.name, level: studentProfile.level, proposedAt: studentProfile.memoryProposedAt })
          .from(user)
          .innerJoin(studentProfile, eq(studentProfile.userId, user.id))
          .where(and(eq(user.id, studentId), inArray(user.id, managedBy(adultId))))
          .for('update');
        if (!current) return undefined;
        const proposed = current.proposedAt !== null;
        const gestures: Gesture[] = [];
        if (patch.name !== undefined && patch.name !== current.name) gestures.push({ kind: 'name_changed', detail: { name: patch.name } });
        if (patch.level !== undefined && patch.level !== current.level) gestures.push({ kind: 'level_changed', detail: { level: patch.level } });
        if (patch.memoryProposed !== undefined && patch.memoryProposed !== proposed) {
          gestures.push({ kind: patch.memoryProposed ? 'memory_proposed' : 'memory_withdrawn' });
        }
        await tx
          .update(user)
          .set({ updatedAt: new Date(), ...(patch.name === undefined ? {} : { name: patch.name }) })
          .where(eq(user.id, studentId));
        const now = new Date();
        await tx
          .update(studentProfile)
          .set({
            updatedAt: now,
            ...(patch.level === undefined ? {} : { level: patch.level }),
            // Withdrawn, the child's answer goes with it: proposed again, it is asked again, and the
            // acceptance starts the memory afresh.
            ...(patch.memoryProposed === undefined
              ? {}
              : patch.memoryProposed
                ? { memoryProposedAt: sql`coalesce(${studentProfile.memoryProposedAt}, now())` }
                : { memoryProposedAt: null, memoryAnswer: null }),
          })
          .where(eq(studentProfile.userId, studentId));
        await record(tx, studentId, adultId, gestures);
        return gestures.map(({ kind }) => kind);
      });
    },

    /** A starting code the adult asks for the student, and its line in the history, in one transaction. */
    activationCode: (adultId: string, studentId: string, reason: ActivationReason) =>
      db.transaction(async (tx) => {
        await lockFor(tx, adultId, studentId);
        const code = await createActivationCode(tx, studentId, reason);
        await record(tx, studentId, adultId, [{ kind: reason === 'device' ? 'device_code' : 'forgotten_code' }]);
        return code;
      }),

    /** For a parent of the student: the gestures of the 90 last days, the newest first, with the first name of who made each. */
    history: (adultId: string, studentId: string) =>
      db
        .select({ id: childEvent.id, kind: childEvent.kind, detail: childEvent.detail, actor: user.name, createdAt: childEvent.createdAt })
        .from(childEvent)
        .leftJoin(user, eq(user.id, childEvent.actorId))
        .where(
          and(
            eq(childEvent.studentId, studentId),
            inArray(childEvent.studentId, managedBy(adultId)),
            gt(childEvent.createdAt, sql`now() - make_interval(days => ${HISTORY_DAYS})`),
          ),
        )
        .orderBy(desc(childEvent.id)),

    /** The student's devices and the state of their code, as their guardian reads them; never the code. */
    async listDevices(adultId: string, studentId: string) {
      const list = await devices(and(eq(deviceProfile.studentId, studentId), inArray(deviceProfile.studentId, managedBy(adultId))));
      const { chosen, locked } = await codeOf(studentId);
      return { devices: list, code: { chosen, locked } };
    },

    /** The signed-in student's own devices, and when a guardian last replaced their code. */
    async listOwnDevices(userId: string) {
      return { devices: await devices(eq(deviceProfile.studentId, userId)), codeResetAt: (await codeOf(userId)).resetAt };
    },

    /** The profile's tries on the device start again; `false` when no such profile of a student the adult is a parent of. */
    async unblockDevice(adultId: string, studentId: string, deviceId: string) {
      return db.transaction(async (tx) => {
        await lockFor(tx, adultId, studentId);
        const unblocked = await tx
          .update(deviceProfile)
          .set({ failures: 0 })
          .where(profileOf(adultId, studentId, deviceId))
          .returning({ deviceId: deviceProfile.deviceId });
        if (unblocked.length === 0) return false;
        await record(tx, studentId, adultId, [{ kind: 'device_unblocked', detail: { device: await browserOf(tx, deviceId) } }]);
        return true;
      });
    },

    /** The device no longer holds the student: their profile there and its sessions go, the device too once empty. `false` when no such profile. */
    async removeDevice(adultId: string, studentId: string, deviceId: string) {
      return db.transaction(async (tx) => {
        await lockFor(tx, adultId, studentId);
        const removed = await tx
          .delete(deviceProfile)
          .where(profileOf(adultId, studentId, deviceId))
          .returning({ deviceId: deviceProfile.deviceId });
        if (removed.length === 0) return false;
        await record(tx, studentId, adultId, [{ kind: 'device_removed', detail: { device: await browserOf(tx, deviceId) } }]);
        await tx.delete(session).where(and(eq(session.userId, studentId), eq(session.deviceId, deviceId)));
        // A device left without a profile keeps nothing, its browser included: its sessions go with it (ON DELETE CASCADE).
        await tx
          .delete(device)
          .where(
            and(
              eq(device.id, deviceId),
              notExists(tx.select({ deviceId: deviceProfile.deviceId }).from(deviceProfile).where(eq(deviceProfile.deviceId, deviceId))),
            ),
          );
        return true;
      });
    },

    /**
     * A user's deletion, in one transaction: the students they are the last parent of go with them
     * (their sessions, links, profiles and invitations by ON DELETE CASCADE), their relatives'
     * links too, since no one would manage them; a student another parent follows stays, with that
     * parent. Locks the user row, as createStudent does: a student created meanwhile waits, then
     * finds no adult. `NO KEY UPDATE`, as a gesture's `lockFor`: a row that holds them as a key,
     * written meanwhile with a lock of its own, does not wait for this one.
     */
    async deleteAccount(userId: string) {
      await db.transaction(async (tx) => {
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('no key update');
        // The students too, in one order: another adult of theirs leaving at the same time waits,
        // then finds this adult gone and takes the student, never left without an adult.
        await tx
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.id, studentsOf(userId)))
          .orderBy(user.id)
          .for('no key update');
        await tx.delete(user).where(
          and(
            inArray(user.id, managedBy(userId)),
            notExists(
              tx
                .select({ adultId: otherAdult.adultId })
                .from(otherAdult)
                .where(and(eq(otherAdult.studentId, user.id), ne(otherAdult.adultId, userId), asParent(otherAdult.role))),
            ),
          ),
        );
        await tx.delete(user).where(eq(user.id, userId));
      });
    },

    /** The student's sessions, links, invitations and profile go with the user row (ON DELETE CASCADE). */
    async deleteStudent(adultId: string, studentId: string) {
      const deleted = await db
        .delete(user)
        .where(and(eq(user.id, studentId), inArray(user.id, managedBy(adultId))))
        .returning({ id: user.id });
      return deleted.length > 0;
    },

    /**
     * The student's answer to the learner memory, which starts afresh with it either way, in one
     * statement: accepted, no exercise up to `afterPosition` counts; declined, what it kept is gone.
     */
    async answerMemory(studentId: string, answer: MemoryAnswer, afterPosition: number) {
      await db
        .update(studentProfile)
        .set({ memoryAnswer: answer, memoryResetAfter: afterPosition, updatedAt: new Date() })
        .where(eq(studentProfile.userId, studentId));
    },

    /** The learner memory starts afresh: no exercise up to `afterPosition` counts. */
    async resetMemory(studentId: string, afterPosition: number) {
      await db.update(studentProfile).set({ memoryResetAfter: afterPosition, updatedAt: new Date() }).where(eq(studentProfile.userId, studentId));
    },
  };
}

export type HouseholdRepository = ReturnType<typeof createHouseholdRepository>;
