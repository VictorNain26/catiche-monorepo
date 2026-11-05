/**
 * What a signed-in student does with their sessions, and the frame of a turn of Tom: the access,
 * one turn at a time, the day's quota; the turn itself is `turn.ts`. Only a student reaches them,
 * but the summary of the week, which an adult linked to them reads too: never the conversations.
 */

import type { Logger } from 'pino';
import { detectDistress } from '../../domain/distress';
import { DAILY_BUDGET_MICRO_EUR } from '../../domain/quota';
import { QUOTA_RESET_HOUR, quotaDayStart } from '../../domain/school-calendar';
import type { Ai } from '../../platform/ai/client';
import type { Moderation } from '../../platform/ai/moderation';
import { Problem } from '../../platform/http/problem';
import type { NotionsFor } from '../../referential';
import type { StudentDirectory } from '../household';
import { createTom } from './agent';
import { textOf } from './core/message';
import { turnDeadlineMs } from './core/turn-deadline';
import { weekStart, weekSummary } from './core/week-summary';
import type { TutorRepository } from './repository';
import { createTurn, moderateInput, type OpenTurn, type TurnStep } from './turn';

interface Deps {
  repository: TutorRepository;
  students: StudentDirectory;
  ai: Ai;
  moderation: Moderation;
  logger: Logger;
  notions: NotionsFor;
}

export function createTutorService({ repository, students, ai, moderation, logger, notions }: Deps) {
  const turnDeadline = turnDeadlineMs(ai.timeoutMs);
  const student = async (userId: string) => {
    const profile = await students.find(userId);
    if (!profile) throw new Problem('FORBIDDEN');
    return profile;
  };

  /** The student's summary of the week: the same for them and for their guardian. */
  async function summaryOf(studentId: string) {
    const now = new Date();
    return weekSummary(await repository.messagesSince(studentId, weekStart(now)), now);
  }

  const turn = createTurn({ repository, tom: createTom({ ai, repository, notions }), moderation, logger });

  return {
    /** The signed-in student's summary of the week. */
    async summary(userId: string) {
      return summaryOf((await student(userId)).id);
    },

    /** A student's summary of the week, for an adult linked to them; anyone else finds no such student. */
    async summaryFor(adultId: string, studentId: string) {
      if (!(await students.follows(adultId, studentId))) throw new Problem('NOT_FOUND');
      return summaryOf(studentId);
    },

    async startSession(userId: string) {
      await student(userId);
      return repository.createSession(userId, quotaDayStart(new Date()));
    },

    async listSessions(userId: string) {
      await student(userId);
      return repository.listSessions(userId);
    },

    /** The text of each message, never Tom's reasoning. */
    async listMessages(userId: string, sessionId: string) {
      await student(userId);
      if (!(await repository.findSession(userId, sessionId))) throw new Problem('NOT_FOUND');
      return (await repository.listMessages(userId, sessionId)).map(({ id, content, createdAt }) => ({
        id,
        role: content.role === 'user' ? ('user' as const) : ('assistant' as const),
        text: textOf(content),
        createdAt,
      }));
    },

    /**
     * Before the stream: the student, their session, one turn at a time, and the day's quota. Past
     * the quota no model writes, but a distress still gets the fixed reply: no limit keeps it from
     * the student. A quota that cannot be read refuses the turn.
     */
    async openTurn(userId: string, sessionId: string, text: string): Promise<OpenTurn> {
      const learner = await student(userId);
      const started = await repository.startTurn(userId, sessionId, turnDeadline);
      if (!started) throw new Problem((await repository.findSession(userId, sessionId)) ? 'TURN_IN_PROGRESS' : 'NOT_FOUND');
      const { turnStartedAt } = started;
      if (!turnStartedAt) throw new Error('Turn started without its time');
      const opened: OpenTurn = {
        student: learner,
        session: { id: sessionId, closedAt: started.closedAt, createdAt: started.createdAt, turnStartedAt },
        distress: null,
      };
      try {
        // A closed session's fixed reply calls no model.
        if (started.closedAt || (await repository.spentSince(learner.id, quotaDayStart(new Date()))) < DAILY_BUDGET_MICRO_EUR) return opened;
        // Moderated with Tom's last message, as every turn is: context tells a distress apart.
        const lastTutor = (await repository.history(sessionId, 2)).findLast((each) => each.role === 'assistant');
        const moderated = await moderateInput({ moderation, logger }, lastTutor ? textOf(lastTutor) : null, text);
        const source = detectDistress(text, moderated?.flagged.includes('selfharm') ?? false);
        if (!source) throw new Problem('QUOTA_EXCEEDED', `Le quota du jour revient à ${String(QUOTA_RESET_HOUR)} h.`);
        return { ...opened, distress: { source } };
      } catch (error) {
        // The refusal reaches the student even when the session cannot be freed: the lock then expires.
        await repository.endTurn(sessionId, turnStartedAt).catch((err: unknown) => {
          logger.error({ err }, 'Session not freed');
        });
        throw error;
      }
    },

    /** The turn's reply; the session is free for the next turn whatever happens. */
    async runTurn(opened: OpenTurn, text: string, onStep: (step: TurnStep) => void): Promise<string> {
      try {
        return await turn(opened, text, onStep);
      } finally {
        await repository.endTurn(opened.session.id, opened.session.turnStartedAt);
      }
    },
  };
}

export type TutorService = ReturnType<typeof createTutorService>;
