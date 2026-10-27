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
import { deletionDue, frenchDay } from '../../domain/student-deletion';

export type { AdultRole, MemoryAnswer };
import type { AdultRole } from '../../domain/adult-roles';
import { invitationEmail, invitationExpiry, type InvitationLetter } from '../../platform/auth/invitation';
import type { ActivationReason } from '../../platform/auth/student-sign-in';
import type { Email, Mailer } from '../../platform/email/mailer';
import { Problem } from '../../platform/http/problem';
import type { HouseholdRepository } from './repository';

/** The role as an email names it, after « comme ». */
const ROLE_WORDS: Record<AdultRole, string> = { guardian: 'parent', relative: 'proche' };

/**
 * Catiche sends each invitation from its own domain: a parent's invitations waiting at once, and
 * sent in a day, withdrawn ones included, enough for a family, never a flood.
 */
const WAITING_INVITATIONS_MAX = 10;
export const INVITATIONS_PER_DAY = 20;

export interface StudentInput {
  name: string;
  level: SchoolLevel;
  birthMonth: string;
}

interface Deps {
  repository: HouseholdRepository;
  /** Whether the user's session on this device is a short one, the device being shared. */
  sharedDevice: (deviceId: string, userId: string) => Promise<boolean>;
  /**
   * The closed beta's invitation of an address without an account, its email saying `letter`
   * above its button; `false`, sending nothing, when the address has an account already.
   */
  inviteAddress: (email: string, letter: InvitationLetter) => Promise<boolean>;
  /** The closed beta's invitation of the address taken back, with its links. */
  revokeAddress: (email: string) => Promise<void>;
  /** One more invitation sent by the adult, `false` once INVITATIONS_PER_DAY are spent. */
  spendInvitation: (adultId: string) => Promise<boolean>;
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

/** One email to each address. */
export async function sendEach(send: Mailer, addresses: readonly string[], email: Omit<Email, 'to'>) {
  await Promise.all(addresses.map((to) => send({ ...email, to })));
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

// The date column holds the first day of the month; the API speaks in YYYY-MM. A deletion asked
// says who asked it, null once they left Catiche, and the day it is done.
const toStudent = <Row extends StudentRow>({
  birthMonth,
  memoryProposedAt,
  memoryAnswer,
  deletionRequestedAt,
  deletionRequestedBy,
  ...student
}: Row) => {
  const { state, decidesAlone } = memoryConsent({ birthMonth, proposedAt: memoryProposedAt, answer: memoryAnswer }, new Date());
  return {
    ...student,
    birthMonth: birthMonth.slice(0, 7),
    memory: { proposed: memoryProposedAt !== null, state, decidesAlone },
    deletion: deletionRequestedAt === null ? null : { by: deletionRequestedBy, dueAt: deletionDue(deletionRequestedAt) },
  };
};

export function createHouseholdService({ repository, sharedDevice, inviteAddress, revokeAddress, spendInvitation, send, later, publicUrl }: Deps) {
  const found = async (adultId: string, studentId: string) => {
    const student = await repository.findStudent(adultId, studentId);
    if (!student) throw new Problem('NOT_FOUND');
    return toStudent(student);
  };

  /** A relative manages nothing: refused as an adult without a link, by a clause of the query. */
  const managed = async (adultId: string, studentId: string) => {
    if (!(await repository.manages(adultId, studentId))) throw new Problem('NOT_FOUND');
  };

  /**
   * A gesture that counts, told to the student's other parents after the answer (`docs/plans/app-cible.md`
   * § 3, « L'historique »): never to its author, nor to a relative. `then`: what the email says after
   * the sentence, the history's link unless it says otherwise.
   */
  const tellOtherParents = (
    adultId: string,
    studentId: string,
    said: (adultName: string, studentName: string) => string,
    then = (studentName: string, link: string) => `.\n\nL’historique de ${studentName}, dans Catiche : ${link}`,
  ) => {
    later(async () => {
      const link = await repository.parentLink(adultId, studentId);
      if (!link) return;
      const sentence = said(link.adultName, link.studentName);
      await sendEach(send, link.otherParents, {
        subject: sentence,
        text: `Bonjour,\n\n${sentence}${then(link.studentName, `${publicUrl}/foyer/${studentId}`)}`,
      });
    });
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
     * Who is signed in: a student, with the first names of their parents, whom their pages name;
     * or else an adult, who may have no student yet, and what they have yet to declare, which the
     * web asks before anything else.
     */
    async me({ id, name, email, deviceId }: SignedIn) {
      const [student, studentGone] = await Promise.all([repository.findProfile(id), isStudent(id)]);
      if (student) return { id, name, role: 'student' as const, level: student.level, parents: await repository.parentsOf(id) };
      // A student whose deletion is due is signed in no more.
      if (studentGone) throw new Problem('UNAUTHENTICATED');
      const [missing, offer, shared, invitations, onlyParentOf] = await Promise.all([
        repository.missingDeclarations(id),
        repository.passkeyOffer(id),
        deviceId === null ? false : sharedDevice(deviceId, id),
        repository.pendingInvitations(email),
        repository.onlyParentOf(id),
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
        // The children the deletion of the adult's account takes with it: « Votre compte » names them.
        onlyParentOf,
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

    /**
     * The adult's students, each with the first names of their other parents, who decide with the
     * adult, and what the home warns a parent of: nothing for a relative.
     */
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
      // Read back as the list gives it: the web puts it there.
      const created = (await repository.listStudents(adultId)).find((student) => student.id === id);
      if (!created) throw new Problem('NOT_FOUND');
      return toStudent(created);
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
      const gestures = await repository.updateStudent(adultId, studentId, patch);
      if (!gestures) throw new Problem('NOT_FOUND');
      if (gestures.includes('memory_withdrawn')) {
        tellOtherParents(adultId, studentId, (adult, student) => `${adult} a retiré ce que Tom retient de ${student}`);
      }
      return found(adultId, studentId);
    },

    /** A code for a new device of the student, or for the code they forgot, which then stops; the other parents are told the latter. */
    async activationCode(adultId: string, studentId: string, reason: ActivationReason) {
      await managed(adultId, studentId);
      const code = await repository.activationCode(adultId, studentId, reason);
      if (reason === 'forgotten') {
        tellOtherParents(adultId, studentId, (adult, student) => `${adult} a demandé un code de départ pour ${student}, qui a oublié son code`);
      }
      return code;
    },

    /** For a parent: what the adults did of the student, the 90 last days. */
    async history(adultId: string, studentId: string) {
      await managed(adultId, studentId);
      return repository.history(adultId, studentId);
    },

    listOwnDevices(userId: string) {
      return repository.listOwnDevices(userId);
    },

    /**
     * What changed for the student since their last « Vu »: a code chosen after a forgotten one,
     * the devices that took their profile, never the one of the request. A student's alone.
     */
    async news(userId: string, deviceId: string | null) {
      const news = await repository.news(userId, deviceId);
      if (!news) throw new Problem('FORBIDDEN');
      return news;
    },

    /** The student's « Vu »: what changed until the news were read is said no more. */
    async newsSeen(userId: string, readAt: Date) {
      if (!(await repository.newsSeen(userId, readAt))) throw new Problem('FORBIDDEN');
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
      const [parent, followed] = await Promise.all([repository.parentLink(adultId, studentId), repository.followedBy(studentId, email)]);
      if (!parent) throw new Problem('NOT_FOUND');
      if (!parent.declaredAt) throw new Problem('FORBIDDEN', 'la déclaration d’autorité parentale');
      if (followed) throw new Problem('INVALID_REQUEST', 'email: cette adresse suit déjà cet enfant');
      if ((await repository.waitingFrom(adultId, studentId, email)) >= WAITING_INVITATIONS_MAX || !(await spendInvitation(adultId))) {
        throw new Problem('RATE_LIMITED');
      }
      await repository.saveInvitation({ studentId, invitedBy: adultId, email, role, expiresAt: invitationExpiry() });
      // Each on one line, as every first name is (domain/first-name.ts): none adds a link to the email.
      const { adultName, studentName } = parent;
      const letter = {
        subject: `${adultName} vous invite sur Catiche, pour ${studentName}`,
        intro: `${adultName} vous invite à suivre les devoirs du soir de ${studentName} sur Catiche.`,
      };
      // After the answer, which then tells nothing of whether the address has an account.
      later(async () => {
        if (!(await inviteAddress(email, letter)))
          await send(invitationEmail(email, letter, `L’invitation vous attend dans Catiche : ${publicUrl}/`));
      });
      later(() =>
        sendEach(send, parent.otherParents, {
          subject: `${adultName} a invité un adulte pour ${studentName}`,
          text: `Bonjour,\n\n${adultName} a invité ${email} pour ${studentName}, comme ${ROLE_WORDS[role]}.\n\nVous verrez dans Catiche quand cette personne sera entrée.`,
        }),
      );
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

    /**
     * A parent deletes the student's account (`app-cible.md`, question tranchée 1): at once, null,
     * when no other parent follows them; else the deletion is asked, and its day, which the other
     * parents are told the first time it is.
     */
    async deleteStudent(adultId: string, studentId: string) {
      const asked = await repository.askDeletion(adultId, studentId, new Date());
      if (!asked) throw new Problem('NOT_FOUND');
      if (asked.deleted) return null;
      const dueAt = deletionDue(asked.requestedAt);
      if (asked.first) {
        tellOtherParents(
          adultId,
          studentId,
          (adult, student) => `${adult} a demandé la suppression du compte de ${student}`,
          (student, link) => `. Elle se fera le ${frenchDay(dueAt)}, sauf si vous l’annulez.\n\nGérer ${student}, dans Catiche : ${link}`,
        );
      }
      return { dueAt };
    },

    /** A parent cancels the deletion asked, its author included; the other parents are told. */
    async cancelDeletion(adultId: string, studentId: string) {
      const cancelled = await repository.cancelDeletion(adultId, studentId);
      if (!cancelled) throw new Problem('NOT_FOUND');
      if (cancelled === 'cancelled') {
        tellOtherParents(adultId, studentId, (adult, student) => `${adult} a annulé la suppression du compte de ${student}`);
      }
    },
  };
}

export type HouseholdService = ReturnType<typeof createHouseholdService>;
