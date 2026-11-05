/** The tutor module, wired from its dependencies. */

import type { Logger } from 'pino';
import type { Ai } from '../../platform/ai/client';
import type { Moderation } from '../../platform/ai/moderation';
import type { Auth } from '../../platform/auth/auth';
import type { Db } from '../../platform/db/client';
import { studentDirectory } from '../household';
import { createTutorRepository } from './repository';
import { summaryRoutes, tutorRoutes } from './routes';
import { createTutorService } from './service';

export type { TurnStep } from './turn';

interface Deps {
  db: Db;
  auth: Auth;
  ai: Ai;
  moderation: Moderation;
  logger: Logger;
  notions: Parameters<typeof createTutorService>[0]['notions'];
}

export function tutorModule({ db, auth, ai, moderation, logger, notions }: Deps) {
  const service = createTutorService({ repository: createTutorRepository(db), students: studentDirectory(db), ai, moderation, logger, notions });
  return { routes: tutorRoutes({ auth, service, logger }), summary: summaryRoutes({ auth, service }) };
}

/** What a student's AI calls cost, in micro-euros, for the harness: a fresh student plays each conversation. */
export function studentCost(db: Db) {
  const repository = createTutorRepository(db);
  return (studentId: string) => repository.spentSince(studentId, new Date(0));
}

/** How each of Tom's replies of a session ended, for the harness, which plays the route as a student does (src/evaluate.ts). */
export function turnOutcomes(db: Db) {
  const repository = createTutorRepository(db);
  return (sessionId: string) => repository.outcomes(sessionId);
}
