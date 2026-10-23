/**
 * The household module, wired from its dependencies: its routes, the guard app.ts puts before
 * better-auth, and a user's deletion with what it takes, which main.ts hands to better-auth.
 */

import type { Auth } from '../../platform/auth/auth';
import { createActivationCode, type StudentAccess } from '../../platform/auth/student-sign-in';
import type { Db } from '../../platform/db/client';
import { createHouseholdRepository } from './repository';
import { householdRoutes, meRoutes, studentAuthGuard } from './routes';
import { createHouseholdService, learnerMemory, type MemoryAnswer } from './service';

export function householdModule({ db, auth }: { db: Db; auth: Auth }) {
  const service = createHouseholdService({
    repository: createHouseholdRepository(db),
    createActivationCode: (userId, reason) => createActivationCode(auth, userId, reason),
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
    /** Whether the adult is linked to the student. */
    follows: async (adultId: string, studentId: string) => (await repository.findStudent(adultId, studentId)) !== undefined,
  };
}

export type StudentDirectory = ReturnType<typeof studentDirectory>;

/** What the student sign-in asks of the household, which main.ts hands to better-auth. */
export function studentAccess(db: Db): StudentAccess {
  const repository = createHouseholdRepository(db);
  return {
    follows: studentDirectory(db).follows,
    birthMonth: async (studentId) => (await repository.findProfile(studentId))?.birthMonth ?? null,
  };
}

/** A user's deletion, with the students no other adult follows, in one transaction. */
export function accountDeletion(db: Db) {
  const repository = createHouseholdRepository(db);
  return (userId: string) => repository.deleteAccount(userId);
}
