/**
 * The summary of the week end to end, through the HTTP API on a real database: the student reads
 * theirs, their guardian the same, nobody else; what is older than seven days stays out.
 */

import { describe, expect, it } from 'bun:test';
import { and, eq, gt } from 'drizzle-orm';
import { parisDay } from '../../domain/school-calendar';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { birthMonthAged } from '../../testing/http';
import { guardianship } from '../household/schema';
import type { TurnOutcome } from './core/message';
import { createTutorRepository, type NewMessage } from './repository';
import { message, studySession } from './schema';

const { db } = await testDatabase();
const { api } = testApp(db);
const repository = createTutorRepository(db);

const guardian = await api.guardian('parent@example.com');
const lea = await api.student(guardian, { name: 'Léa', level: 'quatrieme', birthMonth: birthMonthAged(13) });
const asLea = await api.pair(guardian, lea.id);
const otherGuardian = await api.guardian('autre@example.com');
const noe = await api.student(otherGuardian, { name: 'Noé', level: 'quatrieme', birthMonth: birthMonthAged(13) });
const asNoe = await api.pair(otherGuardian, noe.id);

const DAY = 24 * 60 * 60_000;
const ago = (days: number, minutes = 0) => new Date(Date.now() - days * DAY + minutes * 60_000);
/** A turn's two messages, as the turn stores them. */
const exchange = (text: string, outcome: TurnOutcome = 'passed'): [NewMessage, NewMessage] => [
  { role: 'user', parts: [{ type: 'text', text }] },
  { role: 'assistant', parts: [{ type: 'text', text: 'Pour quand ?' }], metadata: { outcome } },
];

/** A session the student opened at `when`. */
async function openSession(cookie: string, when: Date) {
  const id = await api.session(cookie);
  await db.update(studySession).set({ createdAt: when }).where(eq(studySession.id, id));
  return id;
}

/** What `write` stores in the session, dated `when`: the rows just written are the only ones past it. */
async function at(sessionId: string, when: Date, write: () => Promise<void>) {
  await write();
  await db
    .update(message)
    .set({ createdAt: when })
    .where(and(eq(message.sessionId, sessionId), gt(message.createdAt, when)));
  await db
    .update(studySession)
    .set({ closedAt: when })
    .where(and(eq(studySession.id, sessionId), gt(studySession.closedAt, when)));
}

/** A session opened `daysAgo` days ago, a turn at each of `minutes` after it. */
async function sessionWith(cookie: string, daysAgo: number, minutes: number[]) {
  const sessionId = await openSession(cookie, ago(daysAgo));
  for (const offset of minutes) await at(sessionId, ago(daysAgo, offset), () => repository.saveExchange(sessionId, exchange('J’ai des maths')));
  return sessionId;
}

const summaryOf = (cookie: string, path = '/api/summary') => api.request('GET', path, { cookie });

// Eight days ago: out of the week.
await sessionWith(asLea, 8, [0, 5, 10]);
// Yesterday: the first message sent four minutes after opening, two more, then a pause of twenty.
const yesterday = [4, 6, 26].map((offset) => parisDay(ago(1, offset)));
await sessionWith(asLea, 1, [4, 6, 26]);

describe('the summary of the week', () => {
  it('gives the student the time spent and the evenings, of the last seven days only', async () => {
    const res = await summaryOf(asLea);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      minutes: 5,
      sessions: 1,
      // The days in Paris the student wrote to Tom: yesterday's, and not the one eight days ago.
      days: [...new Set(yesterday)],
      tonight: false,
    });
  });

  it('counts no time past a distress, whose messages all get the fixed reply', async () => {
    const max = await api.student(guardian, { name: 'Max', level: 'quatrieme', birthMonth: birthMonthAged(13) });
    const asMax = await api.pair(guardian, max.id);
    const sessionId = await sessionWith(asMax, 1, [0, 4]);
    await at(sessionId, ago(1, 5), () => repository.closeForDistress(max.id, sessionId, 'rules', exchange('Je veux plus', 'distress')));
    for (const offset of [10, 15, 20]) {
      await at(sessionId, ago(1, offset), () => repository.saveExchange(sessionId, exchange('Je veux plus', 'closed')));
    }
    expect(await (await summaryOf(asMax)).json()).toMatchObject({ minutes: 5 });
  });

  it('gives their guardian the same summary', async () => {
    const res = await summaryOf(guardian, `/api/summary/${lea.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(await (await summaryOf(asLea)).json());
  });

  it('gives a second adult linked to the student the same summary', async () => {
    const father = await api.guardian('pere@example.com');
    await db.insert(guardianship).values({ adultId: (await api.sessionUser(father))?.id ?? '', studentId: lea.id, declaredAt: new Date() });
    const res = await summaryOf(father, `/api/summary/${lea.id}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(await (await summaryOf(asLea)).json());
  });

  it('gives a student with no session this week an empty summary', async () => {
    expect(await (await summaryOf(asNoe)).json()).toEqual({ minutes: 0, sessions: 0, days: [], tonight: false });
  });

  it('refuses another guardian, a student asking for another, and a guardian asking as a student', async () => {
    expect((await summaryOf(otherGuardian, `/api/summary/${lea.id}`)).status).toBe(404);
    expect((await summaryOf(asNoe, `/api/summary/${lea.id}`)).status).toBe(404);
    expect((await summaryOf(guardian)).status).toBe(403);
  });

  it('refuses anyone signed out', async () => {
    expect((await api.request('GET', '/api/summary')).status).toBe(401);
    expect((await api.request('GET', `/api/summary/${noe.id}`)).status).toBe(401);
  });
});
