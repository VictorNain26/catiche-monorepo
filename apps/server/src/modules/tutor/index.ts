/** The tutor module, wired from its dependencies. */

import type { Logger } from 'pino';
import type { Ai } from '../../platform/ai/client';
import type { Moderation } from '../../platform/ai/moderation';
import type { Auth } from '../../platform/auth/auth';
import type { Db } from '../../platform/db/client';
import { studentDirectory } from '../household';
import { createTutorRepository } from './repository';
import { memoryRoutes, summaryRoutes, tutorRoutes } from './routes';
import { createTutorService } from './service';

export type { TurnStep } from './turn-pipeline';

interface Deps {
  db: Db;
  auth: Auth;
  ai: Ai;
  moderation: Moderation;
  logger: Logger;
  notions: Parameters<typeof createTutorService>[0]['notions'];
  background: (task: Promise<unknown>) => void;
}

export function tutorModule({ db, auth, ai, moderation, logger, notions, background }: Deps) {
  const service = createTutorService({
    repository: createTutorRepository(db),
    students: studentDirectory(db),
    ai,
    moderation,
    logger,
    notions,
    background,
  });
  return { routes: tutorRoutes({ auth, service, logger }), memory: memoryRoutes({ auth, service }), summary: summaryRoutes({ auth, service }) };
}

/** What a student's AI calls cost, in micro-euros, for the harness: a fresh student plays each conversation. */
export function studentCost(db: Db) {
  const repository = createTutorRepository(db);
  return (studentId: string) => repository.spentSince(studentId, new Date(0));
}

/** The records of a session's turns, for the harness, which plays the route as a student does (src/evaluate.ts). */
export function turnRecords(db: Db) {
  const repository = createTutorRepository(db);
  return (sessionId: string) => repository.records(sessionId);
}
