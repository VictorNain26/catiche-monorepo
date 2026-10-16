/**
 * A turn with a photo of the homework, end to end through the HTTP API on a real database, against
 * the fake Mistral: the photo read, its text given to the sheet and the writer, the photo never
 * kept, and what is refused.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { aiCost } from '../../platform/ai/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { analysis, draft } from './testing';

const { db } = await testDatabase();
const { api, mistral, tasks } = testApp(db);

const guardian = await api.guardian('parent@example.com');
const student = await api.student(guardian, { name: 'Léa', level: 'quatrieme' });
const asStudent = await api.pair(guardian, student.id);

const newSession = () => api.session(asStudent);

const send = async (sessionId: string, body: Record<string, unknown>) => {
  const { status, reply } = await api.turn(asStudent, sessionId, body);
  await tasks.settled();
  return { status, reply };
};

// A PNG's first bytes, in base64: the fake Mistral does not look at the image.
const PHOTO = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).toString('base64');
const brought = analysis({ bringsExercise: true });
const sheetDraft = draft();

describe('a turn with a photo', () => {
  it('reads a photo sent alone, gives its text to the sheet and the writer, keeps no photo, bills its reading', async () => {
    const sessionId = await newSession();
    mistral.chat.push({ text: 'Exercice 3 : Résous 3x + 5 = 20.' }, brought, sheetDraft, sheetDraft, sheetDraft, { text: 'Que cherches-tu ?' });
    expect(await send(sessionId, { image: { mediaType: 'image/png', data: PHOTO } })).toEqual({ status: 200, reply: 'Que cherches-tu ?' });

    const calls = mistral.received.filter((r) => r.path === '/v1/chat/completions').map((r) => JSON.stringify(r.body));
    expect(calls[0]).toContain('data:image/png;base64,');
    // The sheet and the writer read the text, fenced; no later call carries the image.
    expect(calls.filter((call) => call.includes('<attached_file name=\\"photo\\">') && call.includes('Exercice 3'))).toHaveLength(4);
    expect(calls.slice(1).some((call) => call.includes('data:image'))).toBe(false);

    const stored = (await (await api.request('GET', `/api/sessions/${sessionId}/messages`, { cookie: asStudent })).json()) as {
      role: string;
      text: string;
      photo: boolean;
    }[];
    expect(stored.map(({ role, text, photo }) => ({ role, text, photo }))).toEqual([
      { role: 'student', text: '', photo: true },
      { role: 'tutor', text: 'Que cherches-tu ?', photo: false },
    ]);
    const billed = await db.select({ operation: aiCost.operation }).from(aiCost).where(eq(aiCost.studentId, student.id));
    expect(billed.map((row) => row.operation)).toContain('photo-reading');
  });

  it('keeps the text of the photo for the next turns, never the photo', async () => {
    const sessionId = await newSession();
    mistral.chat.push({ text: 'Exercice 1. Exercice 2. Exercice 3 : Conjugue « aller ».' }, brought, sheetDraft, sheetDraft, sheetDraft, {
      text: 'Lequel ?',
    });
    await send(sessionId, { image: { mediaType: 'image/png', data: PHOTO } });
    const before = mistral.received.length;
    mistral.chat.push(analysis(), { text: 'Que dit la consigne ?' });
    expect(await send(sessionId, { text: 'Je bloque à la 3.' })).toEqual({ status: 200, reply: 'Que dit la consigne ?' });
    const writer = JSON.stringify(mistral.received.slice(before).findLast((r) => r.path === '/v1/chat/completions')?.body);
    expect(writer).toContain('<attached_file name=\\"photo\\">\\nExercice 1. Exercice 2. Exercice 3 : Conjugue « aller ».');
    expect(writer).not.toContain('data:image');
  });

  it('never takes a text of the homework on the photo for a distress of the student', async () => {
    const sessionId = await newSession();
    mistral.chat.push({ text: 'Lis le poème : « Je veux mourir, disait le vieux chêne. »' }, analysis(), {
      text: 'Qui parle dans ce poème ?',
    });
    expect(await send(sessionId, { image: { mediaType: 'image/png', data: PHOTO } })).toEqual({ status: 200, reply: 'Qui parle dans ce poème ?' });
  });

  it('refuses a photo too heavy, of another kind, or a message with neither text nor photo', async () => {
    const sessionId = await newSession();
    expect((await send(sessionId, { image: { mediaType: 'image/jpeg', data: 'A'.repeat(4 * 1024 * 1024) } })).status).toBe(413);
    expect((await send(sessionId, { image: { mediaType: 'image/gif', data: PHOTO } })).status).toBe(400);
    expect((await send(sessionId, { text: '' })).status).toBe(400);
  });
});
