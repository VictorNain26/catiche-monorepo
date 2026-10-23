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

export type { AdultRole, MemoryAnswer };
import type { AdultRole } from '../../domain/adult-roles';
import { invitationEmail, invitationExpiry, type InvitationLetter } from '../../platform/auth/invitation';
import type { ActivationReason } from '../../platform/auth/student-sign-in';
import type { Mailer } from '../../platform/email/mailer';
import { Problem } from '../../platform/http/problem';
import type { HouseholdRepository } from './repository';

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** The role as an email names it, after « comme ». */
const ROLE_WORDS: Record<AdultRole, string> = { guardian: 'parent', relative: 'proche' };

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
  /**
   * The closed beta's invitation of an address without an account, its email saying `letter`
   * above its button; `false`, sending nothing, when the address has an account already.
   */
  inviteAddress: (email: string, letter: InvitationLetter) => Promise<boolean>;
  /** The closed beta's invitation of the address taken back, with its links. */
  revokeAddress: (email: string) => Promise<void>;
  send: Mailer;
  /** Runs a task after the request has answered, its failure logged. */
  later: (task: () => Promise<void>) => void;
  /** The public address of Catiche, where an invitation waits for an adult who has an account. */
  publicUrl: string;
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

export function createHouseholdService({
  repository,
  createActivationCode,
  sharedDevice,
  inviteAddress,
  revokeAddress,
  send,
  later,
  publicUrl,
}: Deps) {
  const found = async (adultId: string, studentId: string) => {
    const student = await repository.findStudent(adultId, studentId);
    if (!student) throw new Problem('NOT_FOUND');
    return toStudent(student);
  };

  /** A relative manages nothing: refused as an adult without a link, by a clause of the query. */
  const managed = async (adultId: string, studentId: string) => {
    if (!(await repository.manages(adultId, studentId))) throw new Problem('NOT_FOUND');
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
      const [missing, offer, shared, invitations] = await Promise.all([
        repository.missingDeclarations(id),
        repository.passkeyOffer(id),
        deviceId === null ? false : sharedDevice(deviceId, id),
        repository.pendingInvitations(email),
      ]);
      return {
        id,
        name,
        role: 'adult' as const,
        level: null,
        email,
        missing,
        // The invitations waiting for the address the adult entered by: an email proved it.
        invitations,
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
      if (patch.memoryProposed !== undefined) {
        await managed(adultId, studentId);
        if ((await found(adultId, studentId)).memory.decidesAlone) throw new Problem('FORBIDDEN');
      }
      if (!(await repository.updateStudent(adultId, studentId, patch))) throw new Problem('NOT_FOUND');
      return found(adultId, studentId);
    },

    /** A code for a new device of the student, or for the code they forgot, which then stops. */
    async activationCode(adultId: string, studentId: string, reason: ActivationReason) {
      await managed(adultId, studentId);
      return createActivationCode(studentId, reason);
    },

    listOwnDevices(userId: string) {
      return repository.listOwnDevices(userId);
    },

    async listDevices(adultId: string, studentId: string) {
      await managed(adultId, studentId);
      return repository.listDevices(adultId, studentId);
    },

    /**
     * A parent who declared the link invites an adult for the student, as a parent or a relative.
     * An address without an account receives the closed beta's invitation, whose button lets it
     * in; one with an account, a link to Catiche, where the invitation waits. The other parents
     * are told.
     */
    async inviteAdult(adultId: string, studentId: string, { email, role }: { email: string; role: AdultRole }) {
      const [parent, followed] = await Promise.all([repository.invitingParent(adultId, studentId), repository.followedBy(studentId, email)]);
      if (!parent) throw new Problem('NOT_FOUND');
      if (!parent.declaredAt) throw new Problem('FORBIDDEN', 'la déclaration d’autorité parentale');
      if (followed) throw new Problem('INVALID_REQUEST', 'email: cette adresse suit déjà cet enfant');
      await repository.saveInvitation({ studentId, invitedBy: adultId, email, role, expiresAt: invitationExpiry() });
      // On one line each: the mailer makes a line « label : https://… » a link, which a name on
      // several lines would forge (platform/email/mailer.ts).
      const adultName = oneLine(parent.adultName);
      const studentName = oneLine(parent.studentName);
      const letter = {
        subject: `${adultName} vous invite sur Catiche, pour ${studentName}`,
        intro: `${adultName} vous invite à suivre les devoirs du soir de ${studentName} sur Catiche.`,
      };
      // After the answer, which then tells nothing of whether the address has an account.
      later(async () => {
        if (!(await inviteAddress(email, letter)))
          await send(invitationEmail(email, letter, `L’invitation vous attend dans Catiche : ${publicUrl}/`));
      });
      for (const to of parent.otherParents) {
        later(() =>
          send({
            to,
            subject: `${adultName} a invité un adulte pour ${studentName}`,
            text: `Bonjour,\n\n${adultName} a invité ${email} pour ${studentName}, comme ${ROLE_WORDS[role]}.\n\nVous verrez dans Catiche quand cette personne sera entrée.`,
          }),
        );
      }
    },

    /**
     * The adult accepts an invitation to their address: linked to the student with its role, once
     * they declared being 18 or over, and, for a parent, holding parental authority.
     */
    async acceptInvitation(adult: { id: string; email: string }, invitationId: string, declaredGuardian: boolean) {
      if ((await repository.missingDeclarations(adult.id)).adult) throw new Problem('FORBIDDEN', 'la déclaration de majorité');
      const accepted = await repository.acceptInvitation(adult.id, adult.email, invitationId, declaredGuardian);
      if (accepted === 'undeclared') throw new Problem('INVALID_REQUEST', 'declaredGuardian: la déclaration d’autorité parentale');
      if (!accepted) throw new Problem('NOT_FOUND');
      return { studentId: accepted.studentId };
    },

    async declineInvitation(email: string, invitationId: string) {
      if (!(await repository.declineInvitation(email, invitationId))) throw new Problem('NOT_FOUND');
    },

    /**
     * A parent withdraws an invitation still waiting: a mistyped address keeps no way to the
     * child, nor, once no other child's invitation waits for it, into the closed beta.
     */
    async withdrawInvitation(adultId: string, studentId: string, invitationId: string) {
      const withdrawn = await repository.withdrawInvitation(adultId, studentId, invitationId);
      if (!withdrawn) throw new Problem('NOT_FOUND');
      if (!withdrawn.stillInvited) await revokeAddress(withdrawn.email);
    },

    /** For a parent: the other adults of the student, and the invitations still waiting. */
    async listAdults(adultId: string, studentId: string) {
      await managed(adultId, studentId);
      return repository.adultsOf(adultId, studentId);
    },

    /** A parent removes a relative, or a relative themselves; never a parent. */
    async removeAdult(adultId: string, studentId: string, removedId: string) {
      if (!(await repository.removeRelative(adultId, studentId, removedId))) throw new Problem('NOT_FOUND');
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
