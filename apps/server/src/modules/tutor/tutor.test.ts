/**
 * The tutor's sessions on a real database, through the HTTP API: only the signed-in student
 * reaches theirs. Then the lock of a turn, and the evening's rows, as the repository keeps them.
 */

import { describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { quotaDayStart } from '../../domain/school-calendar';
import { user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { createTutorRepository } from './repository';
import { evening, homework, message, studySession, upcomingTest } from './schema';

const { db } = await testDatabase();
const { api } = testApp(db);
const repository = createTutorRepository(db);

interface Session {
  id: string;
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
  { sessionId: sessionOfA.id, content: { role: 'user', parts: [{ type: 'text', text: 'J’ai des maths ce soir.' }] } },
  {
    sessionId: sessionOfA.id,
    content: {
      role: 'assistant',
      parts: [
        { type: 'reasoning', text: 'secret' },
        { type: 'text', text: 'Pour quand ?' },
      ],
      metadata: { outcome: 'passed' },
    },
  },
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

  it('gives the text of each message, oldest first, never Tom’s reasoning', async () => {
    const res = await api.request('GET', `/api/sessions/${sessionOfA.id}/messages`, { cookie: asStudentA });
    expect(res.status).toBe(200);
    const messages = (await res.json()) as { role: string; text: string }[];
    expect(messages.map(({ role, text }) => ({ role, text }))).toEqual([
      { role: 'user', text: 'J’ai des maths ce soir.' },
      { role: 'assistant', text: 'Pour quand ?' },
    ]);
    expect(JSON.stringify(messages)).not.toContain('secret');
  });

  it('opens a session with its id, its closing and its opening only', async () => {
    expect(Object.keys(await start(asStudentA)).sort()).toEqual(['closedAt', 'createdAt', 'id']);
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
    await db.insert(message).values({ sessionId: empty.id, content: { role: 'user', parts: [{ type: 'text', text: 'Bonjour' }] } });
    expect((await start(asStudentB)).id).not.toBe(empty.id);
  });

  it('never opens again an empty session of an evening before: it belongs to that evening', async () => {
    const yesterday = await start(asStudentB);
    await db
      .update(studySession)
      .set({ createdAt: new Date(quotaDayStart(new Date()).getTime() - 60_000) })
      .where(eq(studySession.id, yesterday.id));
    expect((await start(asStudentB)).id).not.toBe(yesterday.id);
  });
});

describe('the lock of a turn', () => {
  const TURN_DEADLINE = 3 * 60_000;

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

  it('writes neither message of an exchange that fails', async () => {
    const session = await start(asStudentA);
    const broken = repository.saveExchange(session.id, [
      { role: 'user', parts: [{ type: 'text', text: 'Bonjour' }] },
      // A NUL, which Postgres' jsonb refuses.
      { role: 'assistant', parts: [{ type: 'text', text: 'Bon\u0000soir' }] },
    ]);
    expect(
      await broken.then(
        () => null,
        (error: unknown) => error,
      ),
    ).toBeInstanceOf(Error);
    expect(await repository.listMessages(studentA.id, session.id)).toEqual([]);
  });
});

describe('the evening', () => {
  it('opens one evening per student and day, the same one for each turn', async () => {
    const first = await repository.openEvening(studentA.id, '2026-11-02');
    expect(await repository.openEvening(studentA.id, '2026-11-02')).toBe(first);
    expect(await repository.openEvening(studentA.id, '2026-11-03')).not.toBe(first);
    expect(await repository.eveningPhase(studentA.id, first)).toBe('note');
  });

  it('reads tonight’s plan and the homework left, a rank of another evening as unplanned, a test past as gone', async () => {
    const tonight = await repository.openEvening(studentB.id, '2026-11-02');
    const before = await repository.openEvening(studentB.id, '2026-11-01');
    await db.insert(homework).values([
      { studentId: studentB.id, subject: 'mathematiques', task: 'planned', eveningId: tonight, rank: 1 },
      { studentId: studentB.id, subject: 'francais', task: 'left yesterday', eveningId: before, rank: 1 },
      { studentId: studentB.id, subject: 'svt', task: 'done yesterday', eveningId: before, rank: 2, state: 'done' },
    ]);
    await db.insert(upcomingTest).values([
      { studentId: studentB.id, subject: 'anglais', day: '2026-11-01' },
      { studentId: studentB.id, subject: 'histoire-geo', day: '2026-11-05', topic: 'la Révolution' },
    ]);
    const state = await repository.eveningState(studentB.id, tonight, '2026-11-02');
    expect(state.homework.map(({ task, rank }) => ({ task, rank }))).toEqual([
      { task: 'planned', rank: 1 },
      { task: 'left yesterday', rank: null },
    ]);
    expect(state.tests).toEqual([{ subject: 'histoire-geo', day: '2026-11-05', topic: 'la Révolution' }]);
  });

  it('goes with the student, every row of their evenings with them', async () => {
    const [gone] = await db.insert(user).values({ id: 'gone', name: 'Zoé', email: 'zoe@tom.example' }).returning({ id: user.id });
    const id = await repository.openEvening('gone', '2026-11-02');
    await repository.noteHomework('gone', { subject: 'svt', task: 'schéma', dueOn: null });
    await repository.noteTest('gone', { subject: 'svt', day: '2026-11-04', topic: null });
    await db.delete(user).where(eq(user.id, gone?.id ?? ''));
    expect(await db.select().from(evening).where(eq(evening.id, id))).toEqual([]);
    expect(await db.select().from(homework).where(eq(homework.studentId, 'gone'))).toEqual([]);
    expect(await db.select().from(upcomingTest).where(eq(upcomingTest.studentId, 'gone'))).toEqual([]);
  });
});
