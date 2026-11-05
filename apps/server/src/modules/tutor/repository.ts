/**
 * The only file of the module that touches the database. A student reaches a session through
 * `ownSession`, and their evening, homework and tests through `student_id`, a clause of each query
 * itself: another student's row is simply not found (OWASP LLM01: what a tool is given is checked
 * here, never trusted).
 */

import { and, asc, desc, eq, gte, inArray, isNull, lt, notExists, or, sql, sum } from 'drizzle-orm';
import type { DistressSource } from '../../domain/distress';
import type { EveningSubject } from '../../domain/subjects';
import { aiCost } from '../../platform/ai/schema';
import type { Db } from '../../platform/db/client';
import type { EveningPhase, EveningState, HomeworkState } from './core/evening';
import type { TomMessage } from './core/message';
import type { WeekMessage } from './core/week-summary';
import { distressEvent, evening, homework, message, studySession, upcomingTest } from './schema';

type Executor = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

/** A message to store: the UIMessage, its id the row's. */
export type NewMessage = Omit<TomMessage, 'id'>;

async function writeExchange(executor: Executor, sessionId: string, exchange: readonly [NewMessage, NewMessage]) {
  for (const content of exchange) await executor.insert(message).values({ sessionId, content });
}

const ownSession = (studentId: string, sessionId: string) => and(eq(studySession.id, sessionId), eq(studySession.studentId, studentId));
const ownEvening = (studentId: string, eveningId: string) => and(eq(evening.id, eveningId), eq(evening.studentId, studentId));

const sessionColumns = { id: studySession.id, closedAt: studySession.closedAt, createdAt: studySession.createdAt };

export function createTutorRepository(db: Db) {
  async function eveningPhase(studentId: string, eveningId: string): Promise<EveningPhase> {
    const [row] = await db.select({ phase: evening.phase }).from(evening).where(ownEvening(studentId, eveningId));
    if (!row) throw new Error('Evening not found');
    return row.phase;
  }

  return {
    eveningPhase,

    /**
     * A new session, or the latest one of the evening nothing was said in yet and no first turn
     * runs in: tapping again piles up no empty one, and yesterday's empty one stays yesterday's.
     */
    async createSession(studentId: string, eveningStart: Date) {
      const [empty] = await db
        .select(sessionColumns)
        .from(studySession)
        .where(
          and(
            eq(studySession.studentId, studentId),
            gte(studySession.createdAt, eveningStart),
            isNull(studySession.turnStartedAt),
            notExists(
              db
                .select({ one: sql`1` })
                .from(message)
                .where(eq(message.sessionId, studySession.id)),
            ),
          ),
        )
        .orderBy(desc(studySession.createdAt))
        .limit(1);
      if (empty) return empty;
      const [created] = await db.insert(studySession).values({ studentId }).returning(sessionColumns);
      if (!created) throw new Error('Session not created');
      return created;
    },

    listSessions(studentId: string) {
      return db.select(sessionColumns).from(studySession).where(eq(studySession.studentId, studentId)).orderBy(desc(studySession.createdAt));
    },

    async findSession(studentId: string, sessionId: string) {
      const [found] = await db.select(sessionColumns).from(studySession).where(ownSession(studentId, sessionId));
      return found;
    },

    /** The messages of the student's session, oldest first; none for a session that is not theirs. */
    listMessages(studentId: string, sessionId: string) {
      return db
        .select({ id: message.id, content: message.content, createdAt: message.createdAt })
        .from(message)
        .innerJoin(studySession, eq(studySession.id, message.sessionId))
        .where(ownSession(studentId, sessionId))
        .orderBy(asc(message.position));
    },

    /** The session's last `limit` messages, oldest first: what Tom reads back. */
    async history(sessionId: string, limit: number): Promise<TomMessage[]> {
      const rows = await db
        .select({ id: message.id, content: message.content })
        .from(message)
        .where(eq(message.sessionId, sessionId))
        .orderBy(desc(message.position))
        .limit(limit);
      return rows.reverse().map(({ id, content }) => ({ id, ...content }));
    },

    /**
     * The times of the student's messages since `since`, with their session's opening, grouped by
     * session, in their order; none from the distress that closed a session on.
     */
    async messagesSince(studentId: string, since: Date): Promise<WeekMessage[]> {
      return db
        .select({ sessionId: message.sessionId, startedAt: studySession.createdAt, at: message.createdAt })
        .from(message)
        .innerJoin(studySession, eq(studySession.id, message.sessionId))
        .where(
          and(
            eq(studySession.studentId, studentId),
            gte(message.createdAt, since),
            or(isNull(studySession.closedAt), lt(message.createdAt, studySession.closedAt)),
          ),
        )
        .orderBy(asc(message.sessionId), asc(message.position));
    },

    /**
     * Marks a turn as running in the student's session, and reads the session in the same
     * statement: a session closed by the turn before is seen closed. Undefined when a turn of the
     * student already runs, in this session or another, or when the session is not theirs. A turn
     * marked longer than `staleAfterMs` ago, longer than any turn's calls, was left by a crash and
     * no longer counts.
     */
    async startTurn(studentId: string, sessionId: string, staleAfterMs: number) {
      return db.transaction(async (tx) => {
        // One turn at a time for the student, whatever the session: turns in parallel sessions would
        // all pass the same quota check. The lock serialises this student's starts until the commit.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`turn:${studentId}`}))`);
        const [running] = await tx
          .select({ id: studySession.id })
          .from(studySession)
          .where(
            and(eq(studySession.studentId, studentId), gte(studySession.turnStartedAt, sql`now() - make_interval(secs => ${staleAfterMs / 1000})`)),
          )
          .limit(1);
        if (running) return undefined;
        const [started] = await tx
          .update(studySession)
          // To the millisecond, as a JavaScript Date holds it: endTurn compares it back.
          .set({ turnStartedAt: sql`date_trunc('milliseconds', now())` })
          .where(ownSession(studentId, sessionId))
          .returning({ closedAt: studySession.closedAt, createdAt: studySession.createdAt, turnStartedAt: studySession.turnStartedAt });
        return started;
      });
    },

    /** Frees the session, unless another turn took over a lock this one held too long. */
    async endTurn(sessionId: string, startedAt: Date) {
      await db
        .update(studySession)
        .set({ turnStartedAt: null })
        .where(and(eq(studySession.id, sessionId), eq(studySession.turnStartedAt, startedAt)));
    },

    /** What the student's AI calls cost since an instant, in micro-euros. */
    async spentSince(studentId: string, since: Date) {
      const [row] = await db
        .select({ spent: sum(aiCost.costMicroEur).mapWith(Number) })
        .from(aiCost)
        .where(and(eq(aiCost.studentId, studentId), gte(aiCost.createdAt, since)));
      return row?.spent ?? 0;
    },

    /** A turn answered: the student's message and Tom's, together or not at all. */
    async saveExchange(sessionId: string, exchange: readonly [NewMessage, NewMessage]) {
      await db.transaction((tx) => writeExchange(tx, sessionId, exchange));
    },

    /**
     * A distress: the event, once per session, the session closed, the fixed reply kept with the
     * message. Every later message of the session gets the same reply.
     */
    async closeForDistress(studentId: string, sessionId: string, source: DistressSource, exchange: readonly [NewMessage, NewMessage]) {
      await db.transaction(async (tx) => {
        await tx.insert(distressEvent).values({ studentId, sessionId, detectedBy: source }).onConflictDoNothing();
        await tx
          .update(studySession)
          .set({ closedAt: sql`now()` })
          .where(and(eq(studySession.id, sessionId), isNull(studySession.closedAt)));
        await writeExchange(tx, sessionId, exchange);
      });
    },

    /** How each of Tom's messages of the session ended, in their order: what the harness reads (src/evaluate.ts). */
    async outcomes(sessionId: string) {
      const rows = await db.select({ content: message.content }).from(message).where(eq(message.sessionId, sessionId)).orderBy(asc(message.position));
      return rows.flatMap(({ content }) => (content.role === 'assistant' && content.metadata ? [content.metadata.outcome] : []));
    },

    /** The student's evening of `day`, opened at its first turn. */
    async openEvening(studentId: string, day: string): Promise<string> {
      await db.insert(evening).values({ studentId, day }).onConflictDoNothing();
      const [row] = await db
        .select({ id: evening.id })
        .from(evening)
        .where(and(eq(evening.studentId, studentId), eq(evening.day, day)));
      if (!row) throw new Error('Evening not opened');
      return row.id;
    },

    /** The evening as Tom reads it: its step, tonight's plan and the homework left, the tests from `today` on. */
    async eveningState(studentId: string, eveningId: string, today: string): Promise<Omit<EveningState, 'firstName' | 'today'>> {
      const [phase, rows, tests] = await Promise.all([
        eveningPhase(studentId, eveningId),
        db
          .select({
            id: homework.id,
            subject: homework.subject,
            task: homework.task,
            dueOn: homework.dueOn,
            eveningId: homework.eveningId,
            rank: homework.rank,
            state: homework.state,
          })
          .from(homework)
          .where(and(eq(homework.studentId, studentId), or(eq(homework.state, 'todo'), eq(homework.eveningId, eveningId))))
          .orderBy(asc(homework.createdAt)),
        db
          .select({ subject: upcomingTest.subject, day: upcomingTest.day, topic: upcomingTest.topic })
          .from(upcomingTest)
          .where(and(eq(upcomingTest.studentId, studentId), gte(upcomingTest.day, today)))
          .orderBy(asc(upcomingTest.day)),
      ]);
      // A rank counts for tonight's plan only: one left from another evening is unplanned tonight.
      const homeworkTonight = rows.map(({ eveningId: planned, rank, ...each }) => ({ ...each, rank: planned === eveningId ? rank : null }));
      return { phase, homework: homeworkTonight, tests };
    },

    async noteHomework(studentId: string, noted: { subject: EveningSubject; task: string; dueOn: string | null }) {
      await db.insert(homework).values({ studentId, ...noted });
    },

    /** False when the homework is not the student's. Done, it counts for tonight's evening. */
    async updateHomework(
      studentId: string,
      eveningId: string,
      id: string,
      patch: { task?: string | undefined; dueOn?: string | null | undefined; state?: HomeworkState | undefined },
    ) {
      const updated = await db
        .update(homework)
        .set({
          ...(patch.task === undefined ? {} : { task: patch.task }),
          ...(patch.dueOn === undefined ? {} : { dueOn: patch.dueOn }),
          ...(patch.state === undefined ? {} : { state: patch.state }),
          ...(patch.state === 'done' ? { eveningId: sql`coalesce(${homework.eveningId}, ${eveningId}::uuid)` } : {}),
        })
        .where(and(eq(homework.id, id), eq(homework.studentId, studentId)))
        .returning({ id: homework.id });
      return updated.length > 0;
    },

    /** Tonight's plan in the order of `ids`, all of them the student's homework left to do, or nothing changed. */
    async reorder(studentId: string, eveningId: string, ids: readonly string[]) {
      return db.transaction(async (tx) => {
        const owned = await tx
          .select({ id: homework.id })
          .from(homework)
          .where(and(eq(homework.studentId, studentId), eq(homework.state, 'todo'), inArray(homework.id, [...ids])));
        if (owned.length !== new Set(ids).size || owned.length !== ids.length) return false;
        await tx
          .update(homework)
          .set({ rank: null })
          .where(and(eq(homework.studentId, studentId), eq(homework.eveningId, eveningId), eq(homework.state, 'todo')));
        for (const [index, id] of ids.entries()) {
          await tx
            .update(homework)
            .set({ eveningId, rank: index + 1 })
            .where(and(eq(homework.id, id), eq(homework.studentId, studentId)));
        }
        return true;
      });
    },

    async noteTest(studentId: string, noted: { subject: EveningSubject; day: string; topic: string | null }) {
      await db
        .insert(upcomingTest)
        .values({ studentId, ...noted })
        .onConflictDoUpdate({ target: [upcomingTest.studentId, upcomingTest.subject, upcomingTest.day], set: { topic: noted.topic } });
    },

    async setPhase(studentId: string, eveningId: string, phase: EveningPhase) {
      await db.update(evening).set({ phase }).where(ownEvening(studentId, eveningId));
    },
  };
}

export type TutorRepository = ReturnType<typeof createTutorRepository>;
