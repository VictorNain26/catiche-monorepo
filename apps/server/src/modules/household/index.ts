/**
 * The household module, wired from its dependencies: its routes, the guard app.ts puts before
 * better-auth, and a user's deletion with what it takes, which main.ts hands to better-auth.
 */

import type { Logger } from 'pino';
import type { Auth } from '../../platform/auth/auth';
import { AccountExists, invite, revokeInvitation } from '../../platform/auth/invitation';
import { createStudentDevices } from '../../platform/auth/student-devices';
import type { Mailer } from '../../platform/email/mailer';
import type { StudentAccess } from '../../platform/auth/student-sign-in';
import type { Db } from '../../platform/db/client';
import { keyedBudget } from '../../platform/http/rate-limit';
import { createHouseholdRepository } from './repository';
import { householdRoutes, meRoutes, studentAuthGuard } from './routes';
import { INVITATIONS_PER_DAY, createHouseholdService, learnerMemory, sendEach, type MemoryAnswer } from './service';

export type { AdultRole } from './service';

interface ModuleDeps {
  db: Db;
  auth: Auth;
  mailer: Mailer;
  logger: Logger;
  /** Runs a task after its request has answered: an email's timing tells nothing. */
  background: (task: Promise<unknown>) => void;
  publicUrl: string;
}

export function householdModule({ db, auth, mailer, logger, background, publicUrl }: ModuleDeps) {
  const devices = createStudentDevices(db);
  const service = createHouseholdService({
    repository: createHouseholdRepository(db),
    sharedDevice: (deviceId, userId) => devices.isShortSession(deviceId, userId),
    inviteAddress: async (email, letter) => {
      try {
        await invite({ db, auth }, email, letter);
        return true;
      } catch (error) {
        if (error instanceof AccountExists) return false;
        throw error;
      }
    },
    revokeAddress: (email) => revokeInvitation(db, email),
    // In memory, as the API's own budget: right while the server runs as one instance.
    spendInvitation: keyedBudget({ points: INVITATIONS_PER_DAY, durationSeconds: 24 * 60 * 60 }),
    send: mailer,
    later: (task) => {
      background(
        task().catch((error: unknown) => {
          logger.error({ err: error }, 'Household email not sent');
        }),
      );
    },
    publicUrl,
  });
  return { routes: householdRoutes({ auth, service }), me: meRoutes({ auth, service }), authGuard: studentAuthGuard({ auth, service }) };
}

/**
 * The signed-in student's profile, for the tutor: their learner memory's state and last reset
 * with it; null for anyone who is not a student. The tutor records the student's answer here,
 * and asks whether a guardian may read a student's summary.
 */
export function studentDirectory(db: Db) {
  const repository = createHouseholdRepository(db);
  return {
    async find(userId: string) {
      const profile = await repository.findProfile(userId);
      if (!profile) return null;
      const { birthMonth, memoryProposedAt, memoryAnswer, memoryResetAfter, ...student } = profile;
      return { ...student, memory: learnerMemory({ birthMonth, memoryProposedAt, memoryAnswer, memoryResetAfter }, new Date()) };
    },
    answerMemory: (studentId: string, answer: MemoryAnswer, afterPosition: number) => repository.answerMemory(studentId, answer, afterPosition),
    resetMemory: (studentId: string, afterPosition: number) => repository.resetMemory(studentId, afterPosition),
    /** Whether the adult is linked to the student, as a parent or a relative: they read the student's week. */
    follows: async (adultId: string, studentId: string) => (await repository.findStudent(adultId, studentId)) !== undefined,
  };
}

export type StudentDirectory = ReturnType<typeof studentDirectory>;

/**
 * What better-auth asks of the household, which each entry point hands to `createAuth`: a user's
 * deletion, the student sign-in's answers, and the count of an adult's entries by email.
 */
export function householdAuth(db: Db) {
  const repository = createHouseholdRepository(db);
  const students: StudentAccess = {
    manages: (adultId, studentId) => repository.manages(adultId, studentId),
    birthMonth: async (studentId) => (await repository.findProfile(studentId))?.birthMonth ?? null,
    active: async (studentId) => (await repository.findProfile(studentId)) !== undefined,
  };
  return { deleteUser: accountDeletion(db), students, emailEntered: (adultId: string) => repository.countEmailEntry(adultId) };
}

/**
 * The household's steps of the background sweep (`platform/lifecycle/sweep.ts`), which main.ts
 * hands to it: the deletions of students due, told to their parents; the history past its 90 days;
 * the invitations of adults expired, with the closed beta's invitation of an address nothing
 * waits for any more, once past its own day.
 */
export function householdSweep({ db, mailer }: { db: Db; mailer: Mailer }) {
  const repository = createHouseholdRepository(db);
  return {
    deletions: async (now: Date) => {
      const deleted = await repository.deleteDueStudents(now);
      await Promise.all(
        deleted.map(({ name, parents }) =>
          sendEach(mailer, parents, {
            subject: `Le compte de ${name} est supprimé`,
            text: `Bonjour,\n\nLe compte de ${name} est supprimé. Ses séances sont effacées et ses appareils déconnectés.`,
          }),
        ),
      );
    },
    history: (now: Date) => repository.purgeHistory(now),
    invitations: (now: Date) => repository.purgeInvitations(now),
  };
}

/** A user's deletion, with the students they are the last parent of, in one transaction. */
export function accountDeletion(db: Db) {
  const repository = createHouseholdRepository(db);
  return (userId: string) => repository.deleteAccount(userId);
}
