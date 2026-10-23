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
}

interface Deps {
  repository: HouseholdRepository;
  createActivationCode: (userId: string, reason: ActivationReason) => Promise<{ code: string; expiresAt: Date }>;
  /** Whether the user's session on this device is a short one, the device being shared. */
  sharedDevice: (deviceId: string, userId: string) => Promise<boolean>;
}

/** Who a session is: the device it was opened on, when the household knows it. */
interface SignedIn {
  id: string;
  name: string;
  email: string;
  deviceId: string | null;
}

/** The entries by email after which the passkey is offered: the first is the invitation's, or the first code. */
const PASSKEY_OFFER_ENTRIES = 2;

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

export function createHouseholdService({ repository, createActivationCode, sharedDevice }: Deps) {
  const found = async (adultId: string, studentId: string) => {
    const student = await repository.findStudent(adultId, studentId);
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
    async me({ id, name, email, deviceId }: SignedIn) {
      const student = await repository.findProfile(id);
      if (student) return { id, name, role: 'student' as const, level: student.level };
      const [missing, offer, shared] = await Promise.all([
        repository.missingDeclarations(id),
        repository.passkeyOffer(id),
        deviceId === null ? false : sharedDevice(deviceId, id),
      ]);
      return {
        id,
        name,
        role: 'guardian' as const,
        level: null,
        email,
        missing,
        // Whether the session closes after ten minutes without use: on a device a family shares.
        sharedDevice: shared,
        // Offered from the second entry by email, until a passkey exists or the offer is put
        // away; never on a shared device, whose lock a child may know.
        passkeyOffer: offer.emailEntries >= PASSKEY_OFFER_ENTRIES && offer.passkeys === 0 && !offer.closed && !shared,
      };
    },

    /** The adult puts the passkey's offer away: « Votre compte » keeps the making of one. */
    closePasskeyOffer: (userId: string) => repository.closePasskeyOffer(userId),

    /** The adult declares being 18 or over. */
    async declareAdult(userId: string) {
      await assertNotStudent(userId);
      await repository.declareAdult(userId);
    },

    /** The adult declares holding parental authority over a student they are linked to. */
    async declareGuardian(adultId: string, studentId: string) {
      if (!(await repository.declareGuardian(adultId, studentId))) throw new Problem('NOT_FOUND');
    },

    async listStudents(adultId: string) {
      return (await repository.listStudents(adultId)).map(toStudent);
    },

    /** Only from an adult who has declared being 18 or over: with the box ticked here, the parental consent. */
    async createStudent(adultId: string, input: StudentInput) {
      if ((await repository.missingDeclarations(adultId)).adult) throw new Problem('FORBIDDEN', 'la déclaration de majorité');
      const id = generateId();
      await repository.createStudent(adultId, {
        id,
        name: input.name,
        email: createPlaceholderEmail({ identifier: id, namespace: 'student' }),
        level: input.level,
        birthMonth: `${input.birthMonth}-01`,
      });
      return found(adultId, id);
    },

    async updateStudent(
      adultId: string,
      studentId: string,
      patch: { name?: string | undefined; level?: SchoolLevel | undefined; memoryProposed?: boolean | undefined },
    ) {
      // From 15 the child decides alone: the guardian neither proposes nor erases it.
      if (patch.memoryProposed !== undefined && (await found(adultId, studentId)).memory.decidesAlone) throw new Problem('FORBIDDEN');
      if (!(await repository.updateStudent(adultId, studentId, patch))) throw new Problem('NOT_FOUND');
      return found(adultId, studentId);
    },

    /** A code for a new device of the student, or for the code they forgot, which then stops. */
    async activationCode(adultId: string, studentId: string, reason: ActivationReason) {
      await found(adultId, studentId);
      return createActivationCode(studentId, reason);
    },

    listOwnDevices(userId: string) {
      return repository.listOwnDevices(userId);
    },

    async listDevices(adultId: string, studentId: string) {
      await found(adultId, studentId);
      return repository.listDevices(adultId, studentId);
    },

    async unblockDevice(adultId: string, studentId: string, deviceId: string) {
      if (!(await repository.unblockDevice(adultId, studentId, deviceId))) throw new Problem('NOT_FOUND');
    },

    async removeDevice(adultId: string, studentId: string, deviceId: string) {
      if (!(await repository.removeDevice(adultId, studentId, deviceId))) throw new Problem('NOT_FOUND');
    },

    async deleteStudent(adultId: string, studentId: string) {
      if (!(await repository.deleteStudent(adultId, studentId))) throw new Problem('NOT_FOUND');
    },
  };
}

export type HouseholdService = ReturnType<typeof createHouseholdService>;
