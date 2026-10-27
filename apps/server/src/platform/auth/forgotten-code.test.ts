/**
 * « J'ai oublié mon code », through the HTTP API on a real database: said from a device that
 * holds the profile, kept once until a parent's « forgotten » code is spent or the student enters.
 * What the parents read of it: `modules/household/listing.test.ts`.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { problem, STUDENT_CODE } from '../../testing/http';
import { studentCode } from './schema';

const { db } = await testDatabase();
const { api } = testApp(db);

const forgottenAt = async (userId: string) =>
  (await db.select({ at: studentCode.forgottenAt }).from(studentCode).where(eq(studentCode.userId, userId)))[0]?.at ?? null;

/** A guardian with Léa, and a new device of hers, recognised by her guardian's code; her code chosen there if `code`. */
async function family(email: string, { code }: { code: boolean }) {
  const guardian = await api.guardian(email);
  const lea = await api.student(guardian);
  const tablet = api.device();
  expect((await tablet.activate(await api.activationCode(guardian, lea.id))).status).toBe(200);
  if (code) {
    expect((await tablet.chooseCode(lea.id, STUDENT_CODE, true)).status).toBe(200);
    await tablet.send('POST', '/api/auth/sign-out', {});
  }
  return { guardian, lea, tablet };
}

describe('« J’ai oublié mon code »', () => {
  it('tells the parents once, however many times it is touched', async () => {
    const { lea, tablet } = await family('oubli-prevenu@example.com', { code: true });
    expect((await tablet.forgot(lea.id)).status).toBe(200);
    const first = await forgottenAt(lea.id);
    expect(first).toBeInstanceOf(Date);
    expect((await tablet.forgot(lea.id)).status).toBe(200);
    expect(await forgottenAt(lea.id)).toEqual(first);
  });

  it('is refused without a device, and to a device that does not hold the profile', async () => {
    const { lea } = await family('oubli-sans-appareil@example.com', { code: true });
    const other = await family('oubli-autre-foyer@example.com', { code: false });
    const bare = await api.request('POST', '/api/auth/student/forgot', { body: { studentId: lea.id } });
    expect(await problem(bare)).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(await problem(await other.tablet.forgot(lea.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(await forgottenAt(lea.id)).toBeNull();
  });

  it('is said no more once a parent’s « forgotten » code is spent', async () => {
    const { guardian, lea, tablet } = await family('oubli-code-parent@example.com', { code: true });
    await tablet.forgot(lea.id);
    expect(await forgottenAt(lea.id)).toBeInstanceOf(Date);
    expect((await tablet.activate(await api.activationCode(guardian, lea.id, 'forgotten'))).status).toBe(200);
    expect(await forgottenAt(lea.id)).toBeNull();
  });

  it('is said no more once the student enters by their code', async () => {
    const { lea, tablet } = await family('oubli-retrouve@example.com', { code: true });
    await tablet.forgot(lea.id);
    expect(await forgottenAt(lea.id)).toBeInstanceOf(Date);
    expect((await tablet.enter(lea.id, STUDENT_CODE)).status).toBe(200);
    expect(await forgottenAt(lea.id)).toBeNull();
  });

  it('says nothing of a student who has no code yet', async () => {
    const { lea, tablet } = await family('oubli-sans-code@example.com', { code: false });
    expect((await tablet.forgot(lea.id)).status).toBe(200);
    expect(await forgottenAt(lea.id)).toBeNull();
  });
});
