/**
 * The profiles a device holds, through the HTTP API on a real database: a session that a summer
 * without use leaves alive on the student's own device; a short one on a shared device, the
 * guardian's too, so that a brother or sister who comes next finds it closed.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { STUDENT_CODE } from '../../testing/http';
import { invite } from './invitation';
import { session } from './schema';

const { db } = await testDatabase();
const { api } = testApp(db);

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
type Device = ReturnType<typeof api.device>;

const sessionsOf = (userId: string) => db.select().from(session).where(eq(session.userId, userId));

/** The session cookie `res` sets, attributes and all: the last one, which the browser keeps. */
const sessionCookie = (res: Response) => res.headers.getSetCookie().findLast((line) => line.startsWith('better-auth.session_token=')) ?? '';

/** A guardian with Léa and Tom, and a device recognised for Léa; `ownDevice`: hers alone. */
async function family(email: string) {
  const guardian = await api.guardian(email);
  const lea = await api.student(guardian);
  const tom = await api.student(guardian, { name: 'Tom', level: 'sixieme' });
  const recognise = async (device: Device, studentId: string) => {
    expect((await device.activate(await api.activationCode(guardian, studentId))).status).toBe(200);
  };
  return { guardian, lea, tom, recognise };
}

describe("the student's own device", () => {
  it('keeps them in ninety days without use', async () => {
    const { lea, recognise } = await family('ete@example.com');
    const tablet = api.device();
    await recognise(tablet, lea.id);
    const res = await tablet.chooseCode(lea.id, STUDENT_CODE, true);
    expect(sessionCookie(res)).toContain(`Max-Age=${String(90 * 24 * 60 * 60)}`);
    const [own] = await sessionsOf(lea.id);
    expect((own?.expiresAt.getTime() ?? 0) - Date.now()).toBeGreaterThan(89 * DAY);
  });
});

describe('a shared device', () => {
  it('opens a session that ends with the browser, ten minutes without use and two hours at most', async () => {
    const { lea, recognise } = await family('partage@example.com');
    const computer = api.device();
    await recognise(computer, lea.id);
    const res = await computer.chooseCode(lea.id, STUDENT_CODE, false);
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).not.toContain('Max-Age');
    expect((await computer.profiles()).shared).toBe(true);
    const [short] = await sessionsOf(lea.id);
    expect((short?.expiresAt.getTime() ?? 0) - Date.now()).toBeLessThanOrEqual(10 * MINUTE);
  });

  it('keeps a session in use alive, never past two hours from its opening', async () => {
    const { lea, recognise } = await family('deux-heures@example.com');
    const computer = api.device();
    await recognise(computer, lea.id);
    await computer.chooseCode(lea.id, STUDENT_CODE, false);

    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() + 2 * MINUTE) })
      .where(eq(session.userId, lea.id));
    expect((await api.request('GET', '/api/me', { cookie: computer.cookie() })).status).toBe(200);
    const [used] = await sessionsOf(lea.id);
    expect((used?.expiresAt.getTime() ?? 0) - Date.now()).toBeGreaterThan(9 * MINUTE);

    const openedAt = new Date(Date.now() - 115 * MINUTE);
    await db
      .update(session)
      .set({ createdAt: openedAt, expiresAt: new Date(Date.now() + MINUTE) })
      .where(eq(session.userId, lea.id));
    expect((await api.request('GET', '/api/me', { cookie: computer.cookie() })).status).toBe(200);
    const [late] = await sessionsOf(lea.id);
    expect(late?.expiresAt.getTime()).toBe(openedAt.getTime() + 120 * MINUTE);
  });

  it('closes once ten minutes pass without use', async () => {
    const { lea, recognise } = await family('inactif@example.com');
    const computer = api.device();
    await recognise(computer, lea.id);
    await computer.chooseCode(lea.id, STUDENT_CODE, false);
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(session.userId, lea.id));
    expect((await api.request('GET', '/api/me', { cookie: computer.cookie() })).status).toBe(401);
  });

  it("becomes shared with a second profile, which closes the first one's long session", async () => {
    const { lea, tom, recognise } = await family('deuxieme-profil@example.com');
    const tablet = api.device();
    await recognise(tablet, lea.id);
    await tablet.chooseCode(lea.id, STUDENT_CODE, true);
    expect(await sessionsOf(lea.id)).toHaveLength(1);

    await recognise(tablet, tom.id);
    const { shared, profiles } = await tablet.profiles();
    expect(shared).toBe(true);
    expect(profiles.map(({ name }) => name)).toEqual(['Léa', 'Tom']);
    expect(await sessionsOf(lea.id)).toEqual([]);
  });

  it('gives the guardian a short session too, whose children then find it closed', async () => {
    const { lea, recognise } = await family('parent-partage@example.com');
    const computer = api.device();
    await recognise(computer, lea.id);
    await computer.chooseCode(lea.id, STUDENT_CODE, false);
    await computer.send('POST', '/api/auth/sign-out', {});

    const res = await computer.signIn('parent-partage@example.com');
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).not.toContain('Max-Age');
    const guardianId = (await api.sessionUser(computer.cookie()))?.id ?? '';
    const [short] = await sessionsOf(guardianId).then((rows) => rows.filter(({ deviceId }) => deviceId !== null));
    expect((short?.expiresAt.getTime() ?? 0) - Date.now()).toBeLessThanOrEqual(10 * MINUTE);
  });

  it('closes the session a guardian left on it when a child enters', async () => {
    const { lea, recognise } = await family('passe-la-main@example.com');
    const computer = api.device();
    await recognise(computer, lea.id);
    await computer.chooseCode(lea.id, STUDENT_CODE, false);
    await computer.send('POST', '/api/auth/sign-out', {});
    await computer.signIn('passe-la-main@example.com');
    const guardianId = (await api.sessionUser(computer.cookie()))?.id ?? '';
    const before = (await sessionsOf(guardianId)).length;

    expect((await computer.enter(lea.id, STUDENT_CODE)).status).toBe(200);
    expect(await sessionsOf(guardianId)).toHaveLength(before - 1);
    expect((await api.sessionUser(computer.cookie()))?.id).toBe(lea.id);
  });
});

describe("a guardian on their child's own device", () => {
  it('gets a short session there too: the child who takes the device back never finds it open', async () => {
    const { lea, recognise } = await family('sur-sa-tablette@example.com');
    const tablet = api.device();
    await recognise(tablet, lea.id);
    await tablet.chooseCode(lea.id, STUDENT_CODE, true);
    expect((await tablet.profiles()).shared).toBe(false);

    const res = await tablet.signIn('sur-sa-tablette@example.com');
    expect(sessionCookie(res)).not.toContain('Max-Age');
    const guardianId = (await api.sessionUser(tablet.cookie()))?.id ?? '';
    const [short] = (await sessionsOf(guardianId)).filter(({ deviceId }) => deviceId !== null);
    expect((short?.expiresAt.getTime() ?? 0) - Date.now()).toBeLessThanOrEqual(10 * MINUTE);
  });

  it('loses the session the device carried when a code recognises it for the child', async () => {
    const { lea } = await family('mon-telephone-pour-lea@example.com');
    const phone = api.device();
    await phone.signIn('mon-telephone-pour-lea@example.com');
    const guardianId = (await api.sessionUser(phone.cookie()))?.id ?? '';
    const before = (await sessionsOf(guardianId)).length;

    expect((await phone.activate(await api.activationCode(phone.cookie(), lea.id))).status).toBe(200);
    expect(await api.sessionUser(phone.cookie())).toBeUndefined();
    expect(await sessionsOf(guardianId)).toHaveLength(before - 1);
  });
});

describe('signing out', () => {
  it("closes the session and keeps the device's profiles", async () => {
    const { lea, tom, recognise } = await family('deconnexion@example.com');
    const computer = api.device();
    await recognise(computer, lea.id);
    await recognise(computer, tom.id);
    await computer.chooseCode(lea.id, STUDENT_CODE, false);
    expect((await computer.send('POST', '/api/auth/sign-out', {})).status).toBe(200);
    expect(await api.sessionUser(computer.cookie())).toBeUndefined();
    expect((await computer.profiles()).profiles.map(({ name }) => name)).toEqual(['Léa', 'Tom']);
  });
});

describe('a guardian on a device of their own', () => {
  it('keeps a long session', async () => {
    const phone = api.device();
    await invite(db, 'mon-telephone@example.com');
    const res = await phone.signIn('mon-telephone@example.com');
    expect(sessionCookie(res)).toContain('Max-Age');
  });
});
