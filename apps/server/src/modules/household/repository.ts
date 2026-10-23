/**
 * The only file of the module that touches the database. An adult reaches a student through
 * `studentsOf`, a clause of the query itself, never a comparison after a read
 * (OWASP Authorization Cheat Sheet): a student the adult is not linked to is simply not found.
 */

import { and, desc, eq, gte, inArray, isNull, ne, notExists, type SQL, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { SchoolLevel } from '../../domain/levels';
import type { MemoryAnswer } from '../../domain/memory-consent';
import { device, deviceProfile, session, studentCode, user } from '../../platform/auth/schema';
import { CODE_TRIES, DEVICE_TRIES } from '../../platform/auth/student-devices';
import type { Db } from '../../platform/db/client';
import { adultProfile, guardianship, studentProfile } from './schema';

export interface NewStudent {
  id: string;
  name: string;
  email: string;
  level: SchoolLevel;
  birthMonth: string;
  memoryProposed: boolean;
}

const otherAdult = alias(guardianship, 'other_adult');

export function createHouseholdRepository(db: Db) {
  /** The ids of the students `adultId` is linked to. */
  const studentsOf = (adultId: string) => db.select({ id: guardianship.studentId }).from(guardianship).where(eq(guardianship.adultId, adultId));

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

  /** The profile, on a device, of a student the adult is linked to. */
  const profileOf = (guardianId: string, studentId: string, deviceId: string) =>
    and(eq(deviceProfile.deviceId, deviceId), eq(deviceProfile.studentId, studentId), inArray(deviceProfile.studentId, studentsOf(guardianId)));

  const studentColumns = {
    id: user.id,
    name: user.name,
    level: studentProfile.level,
    birthMonth: studentProfile.birthMonth,
    memoryProposedAt: studentProfile.memoryProposedAt,
    memoryAnswer: studentProfile.memoryAnswer,
  };

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

    /** What the adult has yet to declare: being 18 or over, and the links made before the declaration existed. */
    async missingDeclarations(adultId: string) {
      const [declared] = await db.select({ at: adultProfile.declaredAdultAt }).from(adultProfile).where(eq(adultProfile.userId, adultId));
      const undeclared = await db
        .select({ studentId: guardianship.studentId })
        .from(guardianship)
        .where(and(eq(guardianship.adultId, adultId), isNull(guardianship.declaredAt)))
        .orderBy(guardianship.createdAt);
      return { adult: declared === undefined, guardianOf: undeclared.map(({ studentId }) => studentId) };
    },

    /** The adult declares being 18 or over; the first declaration's date stays. */
    async declareAdult(adultId: string) {
      await db.insert(adultProfile).values({ userId: adultId, declaredAdultAt: new Date() }).onConflictDoNothing();
    },

    /** The adult declares holding parental authority over a student they are linked to; `false` when no such link. */
    async declareGuardian(adultId: string, studentId: string) {
      const declared = await db
        .update(guardianship)
        .set({ declaredAt: sql`coalesce(${guardianship.declaredAt}, now())` })
        .where(and(eq(guardianship.adultId, adultId), eq(guardianship.studentId, studentId)))
        .returning({ studentId: guardianship.studentId });
      return declared.length > 0;
    },

    async listStudents(guardianId: string) {
      return db
        .select(studentColumns)
        .from(user)
        .innerJoin(studentProfile, eq(studentProfile.userId, user.id))
        .where(inArray(user.id, studentsOf(guardianId)))
        .orderBy(user.createdAt);
    },

    async findStudent(guardianId: string, studentId: string) {
      const [student] = await db
        .select(studentColumns)
        .from(user)
        .innerJoin(studentProfile, eq(studentProfile.userId, user.id))
        .where(and(eq(user.id, studentId), inArray(user.id, studentsOf(guardianId))));
      return student;
    },

    /** The student, their profile, and their link to the adult who adds them, declared now. */
    async createStudent(adultId: string, student: NewStudent) {
      await db.transaction(async (tx) => {
        // Waits for the adult's deletion under way, as deleteAccount locks the same row: the link then finds no adult.
        await tx.select({ id: user.id }).from(user).where(eq(user.id, adultId)).for('update');
        await tx.insert(user).values({ id: student.id, name: student.name, email: student.email });
        await tx.insert(studentProfile).values({
          userId: student.id,
          level: student.level,
          birthMonth: student.birthMonth,
          memoryProposedAt: student.memoryProposed ? new Date() : null,
        });
        await tx.insert(guardianship).values({ adultId, studentId: student.id, declaredAt: new Date() });
      });
    },

    /** `false` when the adult is not linked to the student. */
    async updateStudent(
      guardianId: string,
      studentId: string,
      patch: { name?: string | undefined; level?: SchoolLevel | undefined; memoryProposed?: boolean | undefined },
    ) {
      return db.transaction(async (tx) => {
        const [found] = await tx
          .update(user)
          .set({ updatedAt: new Date(), ...(patch.name === undefined ? {} : { name: patch.name }) })
          .where(and(eq(user.id, studentId), inArray(user.id, studentsOf(guardianId))))
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
    async listDevices(guardianId: string, studentId: string) {
      const list = await devices(and(eq(deviceProfile.studentId, studentId), inArray(deviceProfile.studentId, studentsOf(guardianId))));
      const { chosen, locked } = await codeOf(studentId);
      return { devices: list, code: { chosen, locked } };
    },

    /** The signed-in student's own devices, and when a guardian last replaced their code. */
    async listOwnDevices(userId: string) {
      return { devices: await devices(eq(deviceProfile.studentId, userId)), codeResetAt: (await codeOf(userId)).resetAt };
    },

    /** The profile's tries on the device start again; `false` when no such profile of a student the adult is linked to. */
    async unblockDevice(guardianId: string, studentId: string, deviceId: string) {
      const unblocked = await db
        .update(deviceProfile)
        .set({ failures: 0 })
        .where(profileOf(guardianId, studentId, deviceId))
        .returning({ deviceId: deviceProfile.deviceId });
      return unblocked.length > 0;
    },

    /** The device no longer holds the student: their profile there and its sessions go, the device too once empty. `false` when no such profile. */
    async removeDevice(guardianId: string, studentId: string, deviceId: string) {
      return db.transaction(async (tx) => {
        const removed = await tx
          .delete(deviceProfile)
          .where(profileOf(guardianId, studentId, deviceId))
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
     * A user's deletion, in one transaction: the students no other adult follows go with them (their
     * sessions, links and profiles by ON DELETE CASCADE); a student another adult follows stays, with
     * that adult. Locks the user row, as createStudent does: a student created meanwhile waits, then
     * finds no adult.
     */
    async deleteAccount(userId: string) {
      await db.transaction(async (tx) => {
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
        await tx.delete(user).where(
          and(
            inArray(user.id, studentsOf(userId)),
            notExists(
              tx
                .select({ adultId: otherAdult.adultId })
                .from(otherAdult)
                .where(and(eq(otherAdult.studentId, user.id), ne(otherAdult.adultId, userId))),
            ),
          ),
        );
        await tx.delete(user).where(eq(user.id, userId));
      });
    },

    /** The student's sessions, links and profile go with the user row (ON DELETE CASCADE). */
    async deleteStudent(guardianId: string, studentId: string) {
      const deleted = await db
        .delete(user)
        .where(and(eq(user.id, studentId), inArray(user.id, studentsOf(guardianId))))
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
