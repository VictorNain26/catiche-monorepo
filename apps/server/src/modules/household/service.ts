/**
 * What an adult does with the students they are linked to. A student has no email (the
 * non-routable address better-auth itself makes for an account without one, RFC 6761 `.invalid`)
 * and no password: a code the guardian asks for recognises a device of theirs, then the student
 * enters by a code of their own that the guardian never learns (`platform/auth/student-sign-in.ts`).
 */

import { createPlaceholderEmail } from '@better-auth/core/utils/email';
import { generateId } from '@better-auth/core/utils/id';
import type { SchoolLevel } from '../../domain/levels';
import { memoryConsent, type MemoryAnswer } from '../../domain/memory-consent';

export type { MemoryAnswer };
import type { ActivationReason } from '../../platform/auth/student-sign-in';
import { Problem } from '../../platform/http/problem';
import type { HouseholdRepository } from './repository';

export interface StudentInput {
  name: string;
  level: SchoolLevel;
  birthMonth: string;
  memoryProposed?: boolean | undefined;
}

interface Deps {
  repository: HouseholdRepository;
  createActivationCode: (userId: string, reason: ActivationReason) => Promise<{ code: string; expiresAt: Date }>;
}

type StudentRow = NonNullable<Awaited<ReturnType<HouseholdRepository['findStudent']>>>;

/** The student's learner memory as the tutor reads it; the child answers once the parent proposed it, or alone from 15. */
export function learnerMemory(
  profile: { birthMonth: string; memoryProposedAt: Date | null; memoryAnswer: MemoryAnswer | null; memoryResetAfter: number | null },
  now: Date,
) {
  const { state, mayAnswer } = memoryConsent(
    { birthMonth: profile.birthMonth, proposedAt: profile.memoryProposedAt, answer: profile.memoryAnswer },
    now,
  );
  return { state, mayAnswer, resetAfter: profile.memoryResetAfter ?? 0 };
}

// The date column holds the first day of the month; the API speaks in YYYY-MM.
const toStudent = ({ birthMonth, memoryProposedAt, memoryAnswer, ...student }: StudentRow) => {
  const { state, decidesAlone } = memoryConsent({ birthMonth, proposedAt: memoryProposedAt, answer: memoryAnswer }, new Date());
  return {
    ...student,
    birthMonth: birthMonth.slice(0, 7),
    memory: { proposed: memoryProposedAt !== null, state, decidesAlone },
  };
};

export function createHouseholdService({ repository, createActivationCode }: Deps) {
  const found = async (guardianId: string, studentId: string) => {
    const student = await repository.findStudent(guardianId, studentId);
    if (!student) throw new Problem('NOT_FOUND');
    return toStudent(student);
  };

  const isStudent = (userId: string) => repository.isStudent(userId);

  const assertNotStudent = async (userId: string) => {
    if (await isStudent(userId)) throw new Problem('FORBIDDEN');
  };

  return {
    isStudent,

    /** A student reaches none of the adult's routes. */
    assertNotStudent,

    /**
     * Who is signed in: a student, or else an adult, who may have no student yet; and, for an adult,
     * what they have yet to declare, which the web asks before anything else.
     */
    async me(userId: string, name: string) {
      const student = await repository.findProfile(userId);
      return student
        ? { id: userId, name, role: 'student' as const, level: student.level }
        : { id: userId, name, role: 'guardian' as const, level: null, missing: await repository.missingDeclarations(userId) };
    },

    /** The adult declares being 18 or over. */
    async declareAdult(userId: string) {
      await assertNotStudent(userId);
      await repository.declareAdult(userId);
    },

    /** The adult declares holding parental authority over a student they are linked to. */
    async declareGuardian(adultId: string, studentId: string) {
      if (!(await repository.declareGuardian(adultId, studentId))) throw new Problem('NOT_FOUND');
    },

    async listStudents(guardianId: string) {
      return (await repository.listStudents(guardianId)).map(toStudent);
    },

    async createStudent(guardianId: string, input: StudentInput) {
      const id = generateId();
      await repository.createStudent(guardianId, {
        id,
        name: input.name,
        email: createPlaceholderEmail({ identifier: id, namespace: 'student' }),
        level: input.level,
        birthMonth: `${input.birthMonth}-01`,
        memoryProposed: input.memoryProposed ?? false,
      });
      return found(guardianId, id);
    },

    async updateStudent(
      guardianId: string,
      studentId: string,
      patch: { name?: string | undefined; level?: SchoolLevel | undefined; memoryProposed?: boolean | undefined },
    ) {
      // From 15 the child decides alone: the guardian neither proposes nor erases it.
      if (patch.memoryProposed !== undefined && (await found(guardianId, studentId)).memory.decidesAlone) throw new Problem('FORBIDDEN');
      if (!(await repository.updateStudent(guardianId, studentId, patch))) throw new Problem('NOT_FOUND');
      return found(guardianId, studentId);
    },

    /** A code for a new device of the student, or for the code they forgot, which then stops. */
    async activationCode(guardianId: string, studentId: string, reason: ActivationReason) {
      await found(guardianId, studentId);
      return createActivationCode(studentId, reason);
    },

    listOwnDevices(userId: string) {
      return repository.listOwnDevices(userId);
    },

    async listDevices(guardianId: string, studentId: string) {
      await found(guardianId, studentId);
      return repository.listDevices(guardianId, studentId);
    },

    async unblockDevice(guardianId: string, studentId: string, deviceId: string) {
      if (!(await repository.unblockDevice(guardianId, studentId, deviceId))) throw new Problem('NOT_FOUND');
    },

    async removeDevice(guardianId: string, studentId: string, deviceId: string) {
      if (!(await repository.removeDevice(guardianId, studentId, deviceId))) throw new Problem('NOT_FOUND');
    },

    async deleteStudent(guardianId: string, studentId: string) {
      if (!(await repository.deleteStudent(guardianId, studentId))) throw new Problem('NOT_FOUND');
    },
  };
}

export type HouseholdService = ReturnType<typeof createHouseholdService>;
