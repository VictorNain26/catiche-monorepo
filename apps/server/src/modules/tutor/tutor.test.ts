/**
 * The tutor's sessions on a real database, through the HTTP API: only the signed-in student
 * reaches theirs. Then the exercise in progress, as the turn reads and writes it.
 */

import { describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import type { ExerciseState } from './core/exercise-turn';
import { createTutorRepository, type ExerciseProgress, type SavedTurn } from './repository';
import { exercise, message, studySession, turnRecord } from './schema';
import { record, sheet as sheetOf, turn } from './testing';

const { db } = await testDatabase();
const { api } = testApp(db);

interface Session {
  id: string;
  title: string | null;
  closedAt: string | null;
  createdAt: string;
}

const guardianA = await api.guardian('a@example.com');
const guardianB = await api.guardian('b@example.com');
const studentA = await api.student(guardianA);
const studentB = await api.student(guardianB);
const asStudentA = await api.pair(guardianA, studentA.id);
const asStudentB = await api.pair(guardianB, studentB.id);

const start = async (cookie: string) => {
  const res = await api.request('POST', '/api/sessions', { cookie });
  expect(res.status).toBe(201);
  return (await res.json()) as Session;
};

const sessionOfA = await start(asStudentA);
await db.insert(message).values([
  { sessionId: sessionOfA.id, role: 'student', text: 'Résous 3x + 5 = 20.' },
  { sessionId: sessionOfA.id, role: 'tutor', text: 'Que cherches-tu ?', modelMessages: [{ role: 'assistant', content: 'secret' }] },
]);

describe('access matrix', () => {
  const routes = [
    { method: 'POST', path: '/api/sessions' },
    { method: 'GET', path: '/api/sessions' },
    { method: 'GET', path: `/api/sessions/${sessionOfA.id}/messages` },
  ];

  it.each(routes)('refuses $method $path to an anonymous visitor, and to a guardian, the student’s own included', async ({ method, path }) => {
    expect((await api.request(method, path)).status).toBe(401);
    expect((await api.request(method, path, { cookie: guardianA })).status).toBe(403);
  });

  it("does not find another student's session, nor one that does not exist", async () => {
    expect((await api.request('GET', `/api/sessions/${sessionOfA.id}/messages`, { cookie: asStudentB })).status).toBe(404);
    expect((await api.request('GET', `/api/sessions/${crypto.randomUUID()}/messages`, { cookie: asStudentA })).status).toBe(404);
    expect((await api.request('GET', '/api/sessions/pas-un-id/messages', { cookie: asStudentA })).status).toBe(404);
  });
});

describe('sessions', () => {
  it('lists the student’s own sessions, the latest first', async () => {
    const later = await start(asStudentA);
    const res = await api.request('GET', '/api/sessions', { cookie: asStudentA });
    expect(res.status).toBe(200);
    expect(((await res.json()) as Session[]).map((session) => session.id)).toEqual([later.id, sessionOfA.id]);
    expect(await (await api.request('GET', '/api/sessions', { cookie: asStudentB })).json()).toEqual([]);
  });

  it('gives the messages of a session, oldest first, never what the model produced', async () => {
    const res = await api.request('GET', `/api/sessions/${sessionOfA.id}/messages`, { cookie: asStudentA });
    expect(res.status).toBe(200);
    const messages = (await res.json()) as { role: string; text: string }[];
    expect(messages.map(({ role, text }) => ({ role, text }))).toEqual([
      { role: 'student', text: 'Résous 3x + 5 = 20.' },
      { role: 'tutor', text: 'Que cherches-tu ?' },
    ]);
    expect(JSON.stringify(messages)).not.toContain('secret');
  });

  it('opens a session without a mode: the child works alone, in 6e as in 3e', async () => {
    const res = await api.request('POST', '/api/sessions', { cookie: asStudentA });
    expect(res.status).toBe(201);
    expect(Object.keys((await res.json()) as Session).sort()).toEqual(['closedAt', 'createdAt', 'id', 'title']);
  });

  it('opens a new session when the empty one has its first turn running', async () => {
    const running = await start(asStudentA);
    await db.update(studySession).set({ turnStartedAt: new Date() }).where(eq(studySession.id, running.id));
    expect((await start(asStudentA)).id).not.toBe(running.id);
    await db.update(studySession).set({ turnStartedAt: null }).where(eq(studySession.id, running.id));
  });

  it('opens the latest session again while nothing was said in it, and a new one once something was', async () => {
    const empty = await start(asStudentB);
    expect((await start(asStudentB)).id).toBe(empty.id);
    await db.insert(message).values({ sessionId: empty.id, role: 'student', text: 'Bonjour' });
    expect((await start(asStudentB)).id).not.toBe(empty.id);
  });
});

describe('the exercise in progress', () => {
  const repository = createTutorRepository(db);
  // Under the four minutes the takeover test marks its turn with.
  const TURN_DEADLINE = 3 * 60_000;
  const sheet = sheetOf();
  const fresh: ExerciseState = {
    sheet,
    uncertain: false,
    drawnForms: ['x = 5', '5'],
    hintLevel: 0,
    stepsDone: 0,
    stuckTurns: 0,
    hints: [],
    solved: false,
  };
  const newExercise: SavedTurn['newExercise'] = { sheet, uncertain: false, drawnForms: ['x = 5', '5'], mathCheck: 'passed', promptVersion: 'v1' };
  const progress = (overrides: Partial<ExerciseProgress> = {}): ExerciseProgress => ({
    hintLevel: 0,
    stuckTurns: 0,
    stepDone: false,
    solved: undefined,
    hint: { level: 0, text: 'h' },
    ...overrides,
  });
  const withExercise = async () => {
    const session = await start(asStudentA);
    await repository.saveTurn(session.id, turn({ newExercise }));
    const current = await repository.currentExercise(studentA.id, session.id);
    if (!current) throw new Error('exercise not created');
    return { sessionId: session.id, exerciseId: current.id };
  };

  it('reads back the exercise a turn brought, at the first level, and none for a session without one', async () => {
    const session = await start(asStudentA);
    expect(await repository.currentExercise(studentA.id, session.id)).toBeUndefined();
    await repository.saveTurn(session.id, turn({ newExercise }));
    expect(await repository.currentExercise(studentA.id, session.id)).toEqual({
      id: expect.any(String) as string,
      position: expect.any(Number) as number,
      ...fresh,
    });
  });

  it("does not read an exercise of another student's session", async () => {
    const { sessionId } = await withExercise();
    expect(await repository.currentExercise(studentB.id, sessionId)).toBeUndefined();
  });

  it('records each turn: the level, the stuck turns, a step done, the hint kept, solved then reopened', async () => {
    const { sessionId, exerciseId } = await withExercise();
    await repository.saveTurn(
      sessionId,
      turn({ exerciseId, progress: progress({ hintLevel: 1, stuckTurns: 1, stepDone: true, hint: { level: 1, text: 'Retranche 5' } }) }),
    );
    await repository.saveTurn(
      sessionId,
      turn({ exerciseId, progress: progress({ hintLevel: 1, stepDone: true, solved: true, hint: { level: 1, text: 'Bravo' } }) }),
    );
    expect(await repository.currentExercise(studentA.id, sessionId)).toMatchObject({
      hintLevel: 1,
      stuckTurns: 0,
      stepsDone: 2,
      solved: true,
      hints: [{ text: 'Retranche 5' }, { text: 'Bravo' }],
    });
    await repository.saveTurn(sessionId, turn({ exerciseId, progress: progress({ hintLevel: 2, solved: false }) }));
    expect(await repository.currentExercise(studentA.id, sessionId)).toMatchObject({ hintLevel: 2, solved: false });
  });

  it('keeps only the last four hints, in their order', async () => {
    const { sessionId, exerciseId } = await withExercise();
    for (const text of ['a', 'b', 'c', 'd', 'e'])
      await repository.saveTurn(sessionId, turn({ exerciseId, progress: progress({ hint: { level: 0, text } }) }));
    expect((await repository.currentExercise(studentA.id, sessionId))?.hints.map((hint) => hint.text)).toEqual(['b', 'c', 'd', 'e']);
  });

  it('refuses a value outside the closed lists of a record and a session', async () => {
    const session = await start(asStudentA);
    // Postgres' invalid_text_representation: the value is not one of the enum's.
    const codeOf = (write: Promise<unknown>) =>
      write.then(
        () => 'written',
        (error: unknown) => (error instanceof Error && error.cause instanceof Error && 'code' in error.cause ? error.cause.code : error),
      );
    const valid = { verdict: 'incorrect', errorType: 'careless', decidedBy: 'mathjs', reasoningEffort: 'high' } as const;
    expect(await codeOf(db.insert(turnRecord).values({ ...record(valid), sessionId: session.id }))).toBe('written');
    for (const column of ['verdict', 'errorType', 'decidedBy', 'reasoningEffort'] as const) {
      const insert = db.insert(turnRecord).values({ ...record(valid), sessionId: session.id, [column]: sql`'not-in-the-list'` });
      expect({ column, code: await codeOf(insert) }).toEqual({ column, code: '22P02' });
    }
  });

  it('writes nothing of a turn that fails: no exercise, no message, no record', async () => {
    const session = await start(asStudentA);
    const broken = turn({ newExercise, record: record({ outcome: 'not-an-outcome' as 'passed' }) });
    expect(
      await repository.saveTurn(session.id, broken).then(
        () => null,
        (error: unknown) => error,
      ),
    ).toBeInstanceOf(Error);
    expect(await repository.currentExercise(studentA.id, session.id)).toBeUndefined();
    expect(await repository.listMessages(studentA.id, session.id)).toEqual([]);
  });

  it("lets a turn take over a session marked longer ago than a turn's deadline, never within it", async () => {
    const session = await start(asStudentA);
    const markedAgo = (seconds: number) =>
      db
        .update(studySession)
        .set({ turnStartedAt: sql`now() - make_interval(secs => ${seconds})` })
        .where(eq(studySession.id, session.id));
    expect(await repository.startTurn(studentA.id, session.id, 60_000)).toBeDefined();
    await markedAgo(50);
    expect(await repository.startTurn(studentA.id, session.id, 60_000)).toBeUndefined();
    await markedAgo(70);
    const taken = await repository.startTurn(studentA.id, session.id, 60_000);
    expect(taken).toBeDefined();
    if (taken?.turnStartedAt) await repository.endTurn(session.id, taken.turnStartedAt);
  });

  it('frees a session only from the turn that holds it, never from one whose lock was taken over', async () => {
    const session = await start(asStudentA);
    const first = await repository.startTurn(studentA.id, session.id, TURN_DEADLINE);
    expect(await repository.startTurn(studentA.id, session.id, TURN_DEADLINE)).toBeUndefined();
    await db
      .update(studySession)
      .set({ turnStartedAt: sql`now() - interval '4 minutes'` })
      .where(eq(studySession.id, session.id));
    const [stale] = await db.select({ at: studySession.turnStartedAt }).from(studySession).where(eq(studySession.id, session.id));
    const second = await repository.startTurn(studentA.id, session.id, TURN_DEADLINE);
    expect(second?.turnStartedAt).toBeInstanceOf(Date);
    if (!stale?.at || !second?.turnStartedAt || !first?.turnStartedAt) throw new Error('turns not started');
    await repository.endTurn(session.id, stale.at);
    expect(await repository.startTurn(studentA.id, session.id, TURN_DEADLINE)).toBeUndefined();
    await repository.endTurn(session.id, second.turnStartedAt);
    expect(await repository.startTurn(studentA.id, session.id, TURN_DEADLINE)).toBeDefined();
  });

  it('writes one summary of two runs that read the same previous one', async () => {
    const session = await start(asStudentA);
    expect(await repository.replaceSummary(session.id, null, 'premier', 10)).toBe(true);
    expect(await repository.replaceSummary(session.id, null, 'second', 12)).toBe(false);
    expect(await repository.replaceSummary(session.id, 10, 'suivant', 20)).toBe(true);
  });

  it('takes the exercise written last, two of them written at the same instant', async () => {
    const session = await start(asStudentA);
    // One statement: both rows get the same now().
    const rows = await db
      .insert(exercise)
      .values([
        { sessionId: session.id, ...newExercise },
        { sessionId: session.id, ...newExercise, sheet: null, uncertain: true, drawnForms: [], mathCheck: 'not-applicable' },
      ])
      .returning({ id: exercise.id, createdAt: exercise.createdAt });
    expect(rows[0]?.createdAt).toEqual(rows[1]?.createdAt);
    expect(await repository.currentExercise(studentA.id, session.id)).toMatchObject({ id: rows[1]?.id, sheet: null, uncertain: true });
  });
});
