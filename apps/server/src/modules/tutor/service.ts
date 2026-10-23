/**
 * What a signed-in student does with their sessions, and the frame of a turn of the tutor: the
 * access, one turn at a time in a session, the day's quota; the turn itself is the pipeline's
 * (`turn-pipeline.ts`). Only a student reaches them, but the summary of the week, which an adult
 * linked to them reads too: never the conversations.
 */

import type { Logger } from 'pino';
import { detectDistress } from '../../domain/distress';
import type { MemoryAnswer } from '../../domain/memory-consent';
import { DAILY_BUDGET_MICRO_EUR } from '../../domain/quota';
import { QUOTA_RESET_HOUR, quotaDayStart, schoolYearStart } from '../../domain/school-calendar';
import type { Ai } from '../../platform/ai/client';
import type { Moderation } from '../../platform/ai/moderation';
import { Problem } from '../../platform/http/problem';
import { notionText } from '../../referential';
import type { StudentDirectory } from '../household';
import { learnerMemoryBlock, notionMemories, notionView } from './core/memory';
import { turnDeadlineMs } from './core/turn-deadline';
import { weekStart, weekSummary } from './core/week-summary';
import type { TutorRepository } from './repository';
import { createTurnPipeline, moderateInput, type OpenTurn, type Student, type TurnInput, type TurnReply, type TurnStep } from './turn-pipeline';

interface Deps {
  repository: TutorRepository;
  students: StudentDirectory;
  ai: Ai;
  moderation: Moderation;
  logger: Logger;
  /** Work after the reply, which the shutdown waits for: the title, the summary. */
  background: (task: Promise<unknown>) => void;
}

export function createTutorService({ repository, students, ai, moderation, logger, background }: Deps) {
  const turnDeadline = turnDeadlineMs(ai.timeoutMs);
  const student = async (userId: string) => {
    const profile = await students.find(userId);
    if (!profile) throw new Problem('FORBIDDEN');
    return profile;
  };

  /** What the student's exercises before `before` say of `notions` (of every notion when null): what Tom reads, what the student sees. */
  async function memoriesOf(learner: Student, notions: readonly string[] | null, before: number | null) {
    const [past, resets] = await Promise.all([
      repository.pastExercises(learner.id, { since: schoolYearStart(new Date()), after: learner.memory.resetAfter, by: 'start' }, before, notions),
      repository.notionResets(learner.id),
    ]);
    return notionMemories(past, resets);
  }

  /** The student's summary of the week: the same for them and for their guardian. */
  async function summaryOf(studentId: string) {
    const since = weekStart(new Date());
    const [messages, exercises, resets] = await Promise.all([
      repository.messagesSince(studentId, since),
      repository.pastExercises(studentId, { since, after: 0, by: 'turn' }, null, null),
      repository.notionResets(studentId),
    ]);
    return weekSummary(messages, exercises, resets);
  }

  const turn = createTurnPipeline({
    repository,
    ai,
    moderation,
    logger,
    async memoryOf(learner, notions, before) {
      if (learner.memory.state !== 'active' || notions.length === 0) return null;
      return learnerMemoryBlock(notions, await memoriesOf(learner, notions, before));
    },
  });

  return {
    /** What Tom keeps of the student, notion by notion, and whether they may say yes or no to it. */
    async memory(userId: string) {
      const learner = await student(userId);
      const { state, mayAnswer } = learner.memory;
      return { state, mayAnswer, notions: state === 'active' ? (await memoriesOf(learner, null, null)).map(notionView) : [] };
    },

    async answerMemory(userId: string, answer: MemoryAnswer) {
      const learner = await student(userId);
      if (!learner.memory.mayAnswer) throw new Problem('FORBIDDEN');
      // Accepted or declined, the memory starts afresh with the answer: no exercise begun before counts.
      await students.answerMemory(learner.id, answer, await repository.allocatedPosition());
    },

    async resetMemory(userId: string) {
      await students.resetMemory((await student(userId)).id, await repository.allocatedPosition());
    },

    /** The student understood a notion: its earlier exercises no longer count. */
    async resetNotion(userId: string, notionId: string) {
      const learner = await student(userId);
      if (!notionText(notionId)) throw new Problem('NOT_FOUND');
      await repository.resetNotion(learner.id, notionId);
    },

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
      return repository.createSession(userId);
    },

    async listSessions(userId: string) {
      await student(userId);
      return repository.listSessions(userId);
    },

    async listMessages(userId: string, sessionId: string) {
      await student(userId);
      if (!(await repository.findSession(userId, sessionId))) throw new Problem('NOT_FOUND');
      return repository.listMessages(userId, sessionId);
    },

    /**
     * Before the stream: the student, their session, one turn at a time in it, and the day's quota.
     * Past the quota no model writes, but a distress still gets the fixed reply: no limit keeps it
     * from the student. A quota that cannot be read refuses the turn.
     */
    async openTurn(userId: string, sessionId: string, input: TurnInput): Promise<OpenTurn> {
      const learner = await student(userId);
      const started = await repository.startTurn(userId, sessionId, turnDeadline);
      if (!started) throw new Problem((await repository.findSession(userId, sessionId)) ? 'TURN_IN_PROGRESS' : 'NOT_FOUND');
      const { turnStartedAt } = started;
      if (!turnStartedAt) throw new Error('Turn started without its time');
      const opened: OpenTurn = {
        student: learner,
        session: {
          id: sessionId,
          title: started.title,
          subject: started.subject,
          summary: started.summary,
          summaryUntil: started.summaryUntil,
          closedAt: started.closedAt,
          turnStartedAt,
        },
        distress: null,
      };
      try {
        // A closed session's fixed reply calls no model.
        if (started.closedAt || (await repository.spentSince(learner.id, quotaDayStart(new Date()))) < DAILY_BUDGET_MICRO_EUR) return opened;
        // Moderated with the tutor's last message, as every turn is: context tells a distress apart.
        const lastTutorText = (await repository.window(sessionId, 2, null)).findLast((row) => row.role === 'tutor')?.text ?? null;
        const moderated = await moderateInput({ moderation, logger }, lastTutorText, input.text);
        const source = detectDistress(input.text, moderated?.flagged.includes('selfharm') ?? false);
        if (!source) throw new Problem('QUOTA_EXCEEDED', `Le quota du jour revient à ${String(QUOTA_RESET_HOUR)} h.`);
        return { ...opened, distress: { source, flagged: moderated?.flagged ?? null } };
      } catch (error) {
        // The refusal reaches the student even when the session cannot be freed: the lock then expires.
        await repository.endTurn(sessionId, turnStartedAt).catch((err: unknown) => {
          logger.error({ err }, 'Session not freed');
        });
        throw error;
      }
    },

    /** The turn's reply; the session is free for the next turn whatever happens. */
    async runTurn(opened: OpenTurn, input: TurnInput, onStep: (step: TurnStep) => void): Promise<string> {
      const free = () => repository.endTurn(opened.session.id, opened.session.turnStartedAt);
      let reply: TurnReply;
      try {
        reply = await turn(opened, input, onStep);
      } catch (error) {
        await free();
        throw error;
      }
      // The session is free once the reply is stored: the student may answer at once. The title and
      // the summary then run outside the lock, safe without it: the title is asked of the first turn
      // only, and a summary replaces the one it read or nothing. Two may be paid for the same
      // messages when a turn ends while the previous summary runs.
      await free();
      if (reply.after) background(reply.after());
      return reply.text;
    },
  };
}

export type TutorService = ReturnType<typeof createTutorService>;
