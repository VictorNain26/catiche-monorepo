/**
 * The only file of the module that touches the database. An adult reaches a student through
 * `studentsOf` to read them, `managedBy` to manage them, a clause of the query itself, never a
 * comparison after a read (OWASP Authorization Cheat Sheet): a student the adult is not linked
 * to, or only as a relative where a parent is needed, is simply not found.
 */

import { and, asc, desc, eq, gt, gte, inArray, isNull, ne, notExists, or, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { SchoolLevel } from '../../domain/levels';
import type { MemoryAnswer } from '../../domain/memory-consent';
import { device, deviceProfile, passkey, session, studentCode, user } from '../../platform/auth/schema';
import { CODE_TRIES, DEVICE_TRIES } from '../../platform/auth/student-devices';
import type { Db } from '../../platform/db/client';
import type { AdultRole } from '../../domain/adult-roles';
import { adultInvitation, adultProfile, guardianship, studentProfile } from './schema';

export interface NewStudent {
  id: string;
  name: string;
  email: string;
  level: SchoolLevel;
  birthMonth: string;
}

export interface NewInvitation {
  studentId: string;
  invitedBy: string;
  email: string;
  role: AdultRole;
  expiresAt: Date;
}

const otherAdult = alias(guardianship, 'other_adult');
const inviter = alias(user, 'inviter');

export function createHouseholdRepository(db: Db) {
  /** The ids of the students `adultId` is linked to, as a parent or a relative: what they read. */
  const studentsOf = (adultId: string) => db.select({ id: guardianship.studentId }).from(guardianship).where(eq(guardianship.adultId, adultId));

  /** The ids of the students `adultId` is a parent of: what they manage. */
  const managedBy = (adultId: string) =>
    db
      .select({ id: guardianship.studentId })
      .from(guardianship)
      .where(and(eq(guardianship.adultId, adultId), eq(guardianship.role, 'guardian')));

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
          .where(and(eq(guardianship.adultId, adultId), eq(guardianship.role, 'guardian'), isNull(guardianship.declaredAt)))
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
        .where(and(eq(guardianship.adultId, adultId), eq(guardianship.studentId, studentId), eq(guardianship.role, 'guardian')))
        .returning({ studentId: guardianship.studentId });
      return declared.length > 0;
    },

    listStudents: (adultId: string) => linkedStudents(adultId),

    async findStudent(adultId: string, studentId: string) {
      const [student] = await linkedStudents(adultId, eq(user.id, studentId));
      return student;
    },

    /** Whether the adult is a parent of the student, the only one who manages them. */
    async manages(adultId: string, studentId: string) {
      const [managed] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.id, studentId), inArray(user.id, managedBy(adultId))));
      return managed !== undefined;
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

    /** `false` when the adult is not a parent of the student. */
    async updateStudent(
      adultId: string,
      studentId: string,
      patch: { name?: string | undefined; level?: SchoolLevel | undefined; memoryProposed?: boolean | undefined },
    ) {
      return db.transaction(async (tx) => {
        const [found] = await tx
          .update(user)
          .set({ updatedAt: new Date(), ...(patch.name === undefined ? {} : { name: patch.name }) })
          .where(and(eq(user.id, studentId), inArray(user.id, managedBy(adultId))))
          .returning({ id: user.id });
        if (!found) return false;
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
        return true;
      });
    },

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
      const unblocked = await db
        .update(deviceProfile)
        .set({ failures: 0 })
        .where(profileOf(adultId, studentId, deviceId))
        .returning({ deviceId: deviceProfile.deviceId });
      return unblocked.length > 0;
    },

    /** The device no longer holds the student: their profile there and its sessions go, the device too once empty. `false` when no such profile. */
    async removeDevice(adultId: string, studentId: string, deviceId: string) {
      return db.transaction(async (tx) => {
        const removed = await tx
          .delete(deviceProfile)
          .where(profileOf(adultId, studentId, deviceId))
          .returning({ deviceId: deviceProfile.deviceId });
        if (removed.length === 0) return false;
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
     * finds no adult.
     */
    async deleteAccount(userId: string) {
      await db.transaction(async (tx) => {
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
        // The students too, in one order: another adult of theirs leaving at the same time waits,
        // then finds this adult gone and takes the student, never left without an adult.
        await tx
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.id, studentsOf(userId)))
          .orderBy(user.id)
          .for('update');
        await tx.delete(user).where(
          and(
            inArray(user.id, managedBy(userId)),
            notExists(
              tx
                .select({ adultId: otherAdult.adultId })
                .from(otherAdult)
                .where(and(eq(otherAdult.studentId, user.id), ne(otherAdult.adultId, userId), eq(otherAdult.role, 'guardian'))),
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

    /** Whether an adult with this address is linked to the student already. */
    async followedBy(studentId: string, email: string) {
      const [linked] = await db
        .select({ adultId: guardianship.adultId })
        .from(guardianship)
        .innerJoin(user, eq(user.id, guardianship.adultId))
        .where(and(eq(guardianship.studentId, studentId), eq(user.email, email)));
      return linked !== undefined;
    },

    /**
     * What a parent's invitation says, when the adult is a parent of the student who declared it:
     * their name and address, the student's name, and the other parents' addresses, who are told.
     */
    async invitingParent(adultId: string, studentId: string) {
      const [link] = await db
        .select({ declaredAt: guardianship.declaredAt, studentName: user.name, adultName: inviter.name, adultEmail: inviter.email })
        .from(guardianship)
        .innerJoin(user, eq(user.id, guardianship.studentId))
        .innerJoin(inviter, eq(inviter.id, guardianship.adultId))
        .where(and(eq(guardianship.adultId, adultId), eq(guardianship.studentId, studentId), eq(guardianship.role, 'guardian')));
      if (!link) return undefined;
      const others = await db
        .select({ email: user.email })
        .from(guardianship)
        .innerJoin(user, eq(user.id, guardianship.adultId))
        .where(and(eq(guardianship.studentId, studentId), eq(guardianship.role, 'guardian'), ne(guardianship.adultId, adultId)));
      return { ...link, otherParents: others.map(({ email }) => email) };
    },

    /** The invitation, which replaces the one the address had for the student. */
    async saveInvitation(invitation: NewInvitation) {
      const { invitedBy, role, expiresAt } = invitation;
      await db
        .insert(adultInvitation)
        .values(invitation)
        .onConflictDoUpdate({
          target: [adultInvitation.studentId, adultInvitation.email],
          set: { invitedBy, role, expiresAt, createdAt: new Date() },
        });
    },

    /** The invitations still waiting for the address, the oldest first: for which student, from whom, as what. */
    pendingInvitations(email: string) {
      return db
        .select({
          id: adultInvitation.id,
          studentId: adultInvitation.studentId,
          studentName: user.name,
          invitedBy: inviter.name,
          role: adultInvitation.role,
        })
        .from(adultInvitation)
        .innerJoin(user, eq(user.id, adultInvitation.studentId))
        .innerJoin(inviter, eq(inviter.id, adultInvitation.invitedBy))
        .where(and(eq(adultInvitation.email, email), gt(adultInvitation.expiresAt, sql`now()`)))
        .orderBy(asc(adultInvitation.createdAt));
    },

    /**
     * The adult accepts an invitation to their address, still valid: their link to the student,
     * with its role, a parent's declared now; the invitation spent. Undefined when no such
     * invitation. The invitation's row stays locked until the link exists: the student's deletion
     * meanwhile waits, then takes the link with them.
     */
    async acceptInvitation(adultId: string, email: string, invitationId: string) {
      return db.transaction(async (tx) => {
        const [invitation] = await tx
          .select({ studentId: adultInvitation.studentId, role: adultInvitation.role })
          .from(adultInvitation)
          .where(and(eq(adultInvitation.id, invitationId), eq(adultInvitation.email, email), gt(adultInvitation.expiresAt, sql`now()`)))
          .for('update');
        if (!invitation) return undefined;
        await tx
          .insert(guardianship)
          .values({ adultId, ...invitation, declaredAt: invitation.role === 'guardian' ? new Date() : null })
          .onConflictDoNothing();
        await tx.delete(adultInvitation).where(eq(adultInvitation.id, invitationId));
        return invitation;
      });
    },

    /** The role an invitation to the address offers; undefined when there is none, or it expired. */
    async invitationRole(email: string, invitationId: string) {
      const [invitation] = await db
        .select({ role: adultInvitation.role })
        .from(adultInvitation)
        .where(and(eq(adultInvitation.id, invitationId), eq(adultInvitation.email, email), gt(adultInvitation.expiresAt, sql`now()`)));
      return invitation?.role;
    },

    /** The adult declines an invitation to their address; `false` when no such invitation. */
    async declineInvitation(email: string, invitationId: string) {
      const declined = await db
        .delete(adultInvitation)
        .where(and(eq(adultInvitation.id, invitationId), eq(adultInvitation.email, email)))
        .returning({ id: adultInvitation.id });
      return declined.length > 0;
    },

    /** For a parent of the student: the other adults linked to them, the earliest first, and the invitations still waiting. */
    async adultsOf(adultId: string, studentId: string) {
      const [adults, invitations] = await Promise.all([
        db
          .select({ id: user.id, name: user.name, role: guardianship.role })
          .from(guardianship)
          .innerJoin(user, eq(user.id, guardianship.adultId))
          .where(and(eq(guardianship.studentId, studentId), ne(guardianship.adultId, adultId), inArray(guardianship.studentId, managedBy(adultId))))
          .orderBy(asc(guardianship.createdAt)),
        db
          .select({ id: adultInvitation.id, email: adultInvitation.email, role: adultInvitation.role, createdAt: adultInvitation.createdAt })
          .from(adultInvitation)
          .where(
            and(
              eq(adultInvitation.studentId, studentId),
              gt(adultInvitation.expiresAt, sql`now()`),
              inArray(adultInvitation.studentId, managedBy(adultId)),
            ),
          )
          .orderBy(asc(adultInvitation.createdAt)),
      ]);
      return { adults, invitations };
    },

    /**
     * A relative's link to the student goes: by a parent of the student, or by the relative
     * themselves. Never a parent's. `false` when no such link.
     */
    async removeRelative(adultId: string, studentId: string, relativeId: string) {
      const removed = await db
        .delete(guardianship)
        .where(
          and(
            eq(guardianship.studentId, studentId),
            eq(guardianship.adultId, relativeId),
            eq(guardianship.role, 'relative'),
            or(eq(guardianship.adultId, adultId), inArray(guardianship.studentId, managedBy(adultId))),
          ),
        )
        .returning({ adultId: guardianship.adultId });
      return removed.length > 0;
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
