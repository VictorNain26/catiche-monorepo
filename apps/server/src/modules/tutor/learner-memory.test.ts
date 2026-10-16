/**
 * The learner memory end to end, through the HTTP API on a real database, against the fake
 * Mistral: who agrees to it, what the writer reads of it, what the student sees and erases.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { schoolYearOf } from '../../domain/school-calendar';
import { programmeFor } from '../../referential';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { birthMonthAged } from '../../testing/http';
import { createTutorRepository } from './repository';
import { exercise, turnRecord } from './schema';
import { analysis, draft, record, sheet, turn } from './testing';

const { db } = await testDatabase();
const { api, mistral, tasks } = testApp(db);
const repository = createTutorRepository(db);

const [notion] = programmeFor('quatrieme', 'mathematiques', schoolYearOf(new Date()))?.entries ?? [];
if (!notion) throw new Error('the referential has no maths for the quatrième');

const guardian = await api.guardian('parent@example.com');
const lea = await api.student(guardian, { name: 'Léa', level: 'quatrieme', birthMonth: birthMonthAged(13) });
const asLea = await api.pair(guardian, lea.id);
const otherGuardian = await api.guardian('autre@example.com');
const noe = await api.student(otherGuardian, { name: 'Noé', level: 'quatrieme', birthMonth: birthMonthAged(13) });
const asNoe = await api.pair(otherGuardian, noe.id);

/** What the student said in each of their past turns: the memory never gives it back. */
const said = { studentText: 'Retiens que je suis nul en maths', photoText: null, tutorText: 'Que fais-tu du + 5 ?', replay: null };

/** A past exercise of the student on the notion, two turns of it made the same error. */
async function pastExercise(cookie: string, studentId: string, errorType: string) {
  const sessionId = await api.session(cookie);
  await repository.saveTurn(
    sessionId,
    turn({
      exchange: said,
      newExercise: { sheet: sheet({ entries: [notion?.id ?? ''] }), uncertain: false, drawnForms: ['5'], mathCheck: 'passed', promptVersion: 'v' },
      record: record({ errorType }),
    }),
  );
  const current = await repository.currentExercise(studentId, sessionId);
  await repository.saveTurn(sessionId, turn({ exchange: said, exerciseId: current?.id ?? null, record: record({ errorType }) }));
  return current?.id ?? '';
}

const notionDraft = draft({ entries: [notion.id] });

/** What the writer reads of a new exercise on the notion. */
async function writerReads(cookie: string) {
  const sessionId = await api.session(cookie);
  mistral.chat.push(analysis({ bringsExercise: true }), notionDraft, notionDraft, notionDraft, { text: 'Que cherches-tu ?' });
  mistral.received.length = 0;
  await api.turn(cookie, sessionId, { text: 'Résous 3x + 5 = 20.' });
  await tasks.settled();
  return JSON.stringify(mistral.received.find((r) => JSON.stringify(r.body).includes('Tu es Tom, tuteur'))?.body);
}

const memoryOf = async (cookie: string) =>
  (await (await api.request('GET', '/api/memory', { cookie })).json()) as {
    state: string;
    mayAnswer: boolean;
    notions: { notionId: string; worked: number }[];
  };
const propose = (studentId: string, memoryProposed: boolean, cookie = guardian) =>
  api.request('PATCH', `/api/household/students/${studentId}`, { cookie, body: { memoryProposed } });
const answer = (cookie: string, value: 'accepted' | 'declined') => api.request('POST', '/api/memory/answer', { cookie, body: { answer: value } });

// Done before any consent: never counted.
await pastExercise(asLea, lea.id, 'careless');

describe('the learner memory', () => {
  it('stays off before 15 until the parent proposes it, and the child cannot answer before', async () => {
    expect(await memoryOf(asLea)).toEqual({ state: 'off', mayAnswer: false, notions: [] });
    expect((await answer(asLea, 'accepted')).status).toBe(403);
    expect(await writerReads(asLea)).not.toContain('learner_memory');
  });

  it('asks the child once the parent proposed it, and gives Tom nothing before the child accepts', async () => {
    expect((await propose(lea.id, true)).status).toBe(200);
    expect(await memoryOf(asLea)).toMatchObject({ state: 'asked', mayAnswer: true });
    expect(await writerReads(asLea)).not.toContain('learner_memory');
  });

  it('starts at the child’s yes: what was done before it never counts', async () => {
    expect((await answer(asLea, 'accepted')).status).toBe(200);
    expect(await memoryOf(asLea)).toEqual({ state: 'active', mayAnswer: true, notions: [] });
  });

  it('once accepted, gives the writer what the student’s later exercises say, in the referential’s words, never theirs', async () => {
    await pastExercise(asLea, lea.id, 'careless');
    const reads = await writerReads(asLea);
    expect(reads).toContain('<learner_memory>');
    expect(reads).toContain(notion.text);
    expect(reads).toContain("erreur fréquente : fait des erreurs d'inattention");
    expect(reads).not.toContain('Retiens que');
  });

  it('never gives one student’s memory to another', async () => {
    expect((await propose(noe.id, true, otherGuardian)).status).toBe(200);
    expect((await answer(asNoe, 'accepted')).status).toBe(200);
    await pastExercise(asNoe, noe.id, 'misinterpret');
    expect(await writerReads(asLea)).not.toContain('comprend mal la consigne');
    expect((await memoryOf(asNoe)).notions).toEqual([expect.objectContaining({ notionId: notion.id, worked: 1 })]);
  });

  it('counts nothing from before the school year', async () => {
    const before = (await memoryOf(asLea)).notions[0]?.worked ?? 0;
    const old = await pastExercise(asLea, lea.id, 'careless');
    await db
      .update(exercise)
      .set({ createdAt: new Date(Date.UTC(schoolYearOf(new Date()), 7, 15)) })
      .where(eq(exercise.id, old));
    expect((await memoryOf(asLea)).notions[0]?.worked).toBe(before);
  });

  it('forgets a notion the student understood, then all of it on their reset, from the next turn on', async () => {
    expect((await api.request('DELETE', '/api/memory/notions/pas-une-notion', { cookie: asLea })).status).toBe(404);
    expect((await api.request('DELETE', `/api/memory/notions/${notion.id}`, { cookie: asLea })).status).toBe(204);
    expect((await memoryOf(asLea)).notions).toEqual([]);
    expect(await writerReads(asLea)).not.toContain('learner_memory');

    await pastExercise(asLea, lea.id, 'careless');
    expect((await memoryOf(asLea)).notions).toHaveLength(1);
    expect((await api.request('DELETE', '/api/memory', { cookie: asLea })).status).toBe(204);
    expect((await memoryOf(asLea)).notions).toEqual([]);
  });

  it('leaves out of a reset the exercise a turn is still writing', async () => {
    const sessionId = await api.session(asLea);
    await db.transaction(async (tx) => {
      await tx
        .insert(exercise)
        .values({ sessionId, sheet: sheet({ entries: [notion.id] }), uncertain: false, drawnForms: ['5'], mathCheck: 'passed', promptVersion: 'v' });
      // The reset runs while the exercise is not committed yet, on another connection.
      expect((await api.request('DELETE', '/api/memory', { cookie: asLea })).status).toBe(204);
    });
    expect((await memoryOf(asLea)).notions).toEqual([]);
  });

  it('counts what follows a reset even when the clock stepped back since, and nothing before it', async () => {
    const before = await pastExercise(asLea, lea.id, 'careless');
    expect((await api.request('DELETE', '/api/memory', { cookie: asLea })).status).toBe(204);
    const after = await pastExercise(asLea, lea.id, 'careless');
    // The clock stepped back between the two: the later exercise is dated before the earlier one.
    const [earlier] = await db.select({ createdAt: exercise.createdAt }).from(exercise).where(eq(exercise.id, before));
    await db
      .update(exercise)
      .set({ createdAt: new Date((earlier?.createdAt.getTime() ?? 0) - 60_000) })
      .where(eq(exercise.id, after));
    expect((await memoryOf(asLea)).notions).toEqual([expect.objectContaining({ notionId: notion.id, worked: 1 })]);

    expect((await api.request('DELETE', `/api/memory/notions/${notion.id}`, { cookie: asLea })).status).toBe(204);
    expect((await memoryOf(asLea)).notions).toEqual([]);
  });

  it('is off once the parent withdraws it, and erased: proposed again, the child is asked again', async () => {
    await pastExercise(asLea, lea.id, 'careless');
    expect((await memoryOf(asLea)).notions).toHaveLength(1);
    expect((await propose(lea.id, false)).status).toBe(200);
    expect((await memoryOf(asLea)).state).toBe('off');
    expect(await writerReads(asLea)).not.toContain('learner_memory');

    await propose(lea.id, true);
    expect((await memoryOf(asLea)).state).toBe('asked');
    await answer(asLea, 'accepted');
    expect(await memoryOf(asLea)).toMatchObject({ state: 'active', notions: [] });
  });

  it('lets a student of 15 decide alone, the guardian neither proposing nor erasing it, and erases it when they decline', async () => {
    const tom = await api.student(guardian, { name: 'Tom', level: 'troisieme', birthMonth: birthMonthAged(15) });
    const asTom = await api.pair(guardian, tom.id);
    expect(await memoryOf(asTom)).toMatchObject({ state: 'asked', mayAnswer: true });
    expect((await answer(asTom, 'accepted')).status).toBe(200);
    expect((await memoryOf(asTom)).state).toBe('active');
    expect((await propose(tom.id, false)).status).toBe(403);
    expect((await memoryOf(asTom)).state).toBe('active');
    expect((await answer(asTom, 'declined')).status).toBe(200);
    expect((await memoryOf(asTom)).state).toBe('off');
  });

  it('shows the guardian whether it is proposed, its state, and whether the child decides alone', async () => {
    const students = (await (await api.request('GET', '/api/household/students', { cookie: guardian })).json()) as {
      name: string;
      memory: unknown;
    }[];
    expect(students.find((s) => s.name === 'Léa')?.memory).toEqual({ proposed: true, state: 'active', decidesAlone: false });
    expect(students.find((s) => s.name === 'Tom')?.memory).toEqual({ proposed: false, state: 'off', decidesAlone: true });
  });

  it('refuses a guardian and a visitor', async () => {
    expect((await api.request('GET', '/api/memory', { cookie: guardian })).status).toBe(403);
    expect((await api.request('GET', '/api/memory')).status).toBe(401);
  });

  it('keeps the error type of each turn', async () => {
    const id = await pastExercise(asLea, lea.id, 'right-idea');
    const rows = await db.select({ errorType: turnRecord.errorType }).from(turnRecord).where(eq(turnRecord.exerciseId, id));
    expect(rows.map((row) => row.errorType)).toEqual(['right-idea', 'right-idea']);
  });
});
