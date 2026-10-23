/**
 * The student's way in, through the HTTP API on a real database: a device recognised by a
 * guardian's code, then the code the student chose, with its tries bounded on the device and
 * everywhere; a code forgotten; a guardian who adds their children to the family computer.
 */

import { describe, expect, it } from 'bun:test';
import { verifyPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { guardianship } from '../../modules/household/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { STUDENT_CODE } from '../../testing/http';
import { deviceProfile, session, studentCode, verification } from './schema';
import { ACTIVATION_PREFIX, normaliseActivationCode } from './student-sign-in';

const { db } = await testDatabase();
const { api } = testApp(db);

type Device = ReturnType<typeof api.device>;

const sessionsOf = (userId: string) => db.select().from(session).where(eq(session.userId, userId));
const codeOf = async (userId: string) => (await db.select().from(studentCode).where(eq(studentCode.userId, userId)))[0];
const problem = async (res: Response) => ({ status: res.status, code: ((await res.json()) as { code?: string }).code });

/** A guardian with Léa, and a new device of hers, recognised by her guardian's code. */
async function family(email: string) {
  const guardian = await api.guardian(email);
  const lea = await api.student(guardian);
  const tablet = api.device();
  expect((await tablet.activate(await api.activationCode(guardian, lea.id))).status).toBe(200);
  return { guardian, lea, tablet };
}

/** Léa's code chosen on her tablet, which is hers alone. */
async function withCode(email: string) {
  const found = await family(email);
  expect((await found.tablet.chooseCode(found.lea.id, STUDENT_CODE, true)).status).toBe(200);
  return found;
}

/** `count` wrong codes on `device`, one after the other. */
async function wrong(device: Device, studentId: string, count: number) {
  for (let attempt = 0; attempt < count; attempt++) await device.enter(studentId, '305186');
}

describe('normaliseActivationCode', () => {
  it('uppercases and drops the spaces and dashes a person types', () => {
    expect(normaliseActivationCode(' ab3d-7fgh ')).toBe('AB3D7FGH');
  });

  it("reads the letters O, I and L as the digits they look like (Crockford's base32)", () => {
    expect(normaliseActivationCode('kOmI-2l4o')).toBe('K0M12140');
  });
});

describe("a guardian's activation code", () => {
  it('is stored hashed, never in clear', async () => {
    const guardian = await api.guardian('hache@example.com');
    const lea = await api.student(guardian);
    const code = await api.activationCode(guardian, lea.id);
    const identifiers = (await db.select({ identifier: verification.identifier }).from(verification)).map(({ identifier }) => identifier);
    expect(identifiers.some((identifier) => identifier.includes(code))).toBe(false);
    expect(identifiers.some((identifier) => identifier.startsWith(ACTIVATION_PREFIX))).toBe(false);
  });

  it('serves once, as a person types it, and not once expired', async () => {
    const guardian = await api.guardian('usage-unique@example.com');
    const lea = await api.student(guardian);
    const code = await api.activationCode(guardian, lea.id);
    expect((await api.device().activate(` ${code.slice(0, 4).toLowerCase()}-${code.slice(4)} `)).status).toBe(200);
    expect(await problem(await api.device().activate(code))).toEqual({ status: 400, code: 'INVALID_ACTIVATION_CODE' });

    const late = await api.activationCode(guardian, lea.id);
    await db.update(verification).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await api.device().activate(late)).status).toBe(400);
  });

  it('recognises the device by a signed cookie of 400 days, and opens no session', async () => {
    const guardian = await api.guardian('reconnu@example.com');
    const lea = await api.student(guardian);
    const res = await api.request('POST', '/api/auth/student/activate', { body: { code: await api.activationCode(guardian, lea.id) } });
    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie();
    const deviceCookie = cookies.find((line) => line.startsWith('better-auth.device='));
    expect(deviceCookie).toContain('HttpOnly');
    expect(deviceCookie).toContain(`Max-Age=${String(400 * 24 * 60 * 60)}`);
    expect(cookies.some((line) => line.startsWith('better-auth.session_token='))).toBe(false);
    expect(await sessionsOf(lea.id)).toEqual([]);
  });

  it('lists the student on the device, and nothing on a device whose cookie is forged', async () => {
    const { lea, tablet } = await family('liste@example.com');
    expect(await tablet.profiles()).toEqual({ shared: false, profiles: [{ id: lea.id, name: 'Léa', state: 'choose' }] });

    const [name = '', value = ''] = tablet.cookie().split('=');
    const forged = `${name}=${value.slice(0, -4)}AAAA`;
    const res = await api.request('GET', '/api/auth/student/profiles', { cookie: forged });
    expect(await res.json()).toEqual({ shared: false, profiles: [] });
  });
});

describe('the code the student chooses', () => {
  it('opens their session the first time, and is never chosen again over it', async () => {
    const { lea, tablet } = await family('premier-choix@example.com');
    expect((await tablet.chooseCode(lea.id, STUDENT_CODE, true)).status).toBe(200);
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(lea.id);
    expect(await problem(await tablet.chooseCode(lea.id, '920374', true))).toEqual({ status: 403, code: 'CODE_NOT_EXPECTED' });
  });

  it('is chosen only by the page the window was opened for: a brother on the device has not its token', async () => {
    const { lea, tablet } = await family('jeton@example.com');
    expect(await problem(await tablet.chooseCode(lea.id, STUDENT_CODE, true, ''))).toEqual({ status: 403, code: 'CODE_NOT_EXPECTED' });
    expect(await problem(await tablet.chooseCode(lea.id, STUDENT_CODE, true, 'un-jeton-devine'))).toEqual({ status: 403, code: 'CODE_NOT_EXPECTED' });
    expect((await tablet.chooseCode(lea.id, STUDENT_CODE, true)).status).toBe(200);
  });

  it('tells a device whose window is not open nothing of the month of birth', async () => {
    const { guardian, lea } = await family('naissance-cachee@example.com');
    const tom = await api.student(guardian, { name: 'Tom', level: 'sixieme' });
    const other = api.device();
    await other.activate(await api.activationCode(guardian, tom.id));
    const [month, year] = [lea.birthMonth.slice(5), lea.birthMonth.slice(0, 4)];
    expect(await problem(await other.chooseCode(lea.id, `${month}${year}`, true))).toEqual({ status: 403, code: 'CODE_NOT_EXPECTED' });
  });

  it('is not chosen once the window the guardian opened has closed', async () => {
    const { lea, tablet } = await family('fenetre@example.com');
    await db
      .update(deviceProfile)
      .set({ codeWindowUntil: new Date(Date.now() - 1000) })
      .where(eq(deviceProfile.studentId, lea.id));
    expect(await problem(await tablet.chooseCode(lea.id, STUDENT_CODE, true))).toEqual({ status: 403, code: 'CODE_NOT_EXPECTED' });
    expect((await tablet.profiles()).profiles[0]?.state).toBe('waiting');
  });

  it('is refused too easy or the month and year of birth, and said why', async () => {
    const { lea, tablet } = await family('trop-facile@example.com');
    expect(await problem(await tablet.chooseCode(lea.id, '123456', true))).toEqual({ status: 400, code: 'CODE_TOO_EASY' });
    const [month, year] = [lea.birthMonth.slice(5), lea.birthMonth.slice(0, 4)];
    expect(await problem(await tablet.chooseCode(lea.id, `${month}${year}`, true))).toEqual({ status: 400, code: 'CODE_IS_BIRTH_DATE' });
    expect(await problem(await tablet.chooseCode(lea.id, '12345', true))).toEqual({ status: 400, code: 'CODE_FORMAT' });
  });

  it('is stored hashed with a pepper: not the hash of the code alone', async () => {
    const { lea } = await withCode('poivre@example.com');
    const hash = (await codeOf(lea.id))?.hash ?? '';
    expect(hash).not.toContain(STUDENT_CODE);
    expect(await verifyPassword({ hash, password: STUDENT_CODE })).toBe(false);
  });

  it('lets the student in again on that device', async () => {
    const { lea, tablet } = await withCode('encore@example.com');
    await tablet.send('POST', '/api/auth/sign-out', {});
    expect(await api.sessionUser(tablet.cookie())).toBeUndefined();
    expect((await tablet.enter(lea.id, STUDENT_CODE)).status).toBe(200);
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(lea.id);
  });

  it('is asked again on a new device, which the code then opens', async () => {
    const { guardian, lea } = await withCode('nouvel-appareil@example.com');
    const phone = api.device();
    await phone.activate(await api.activationCode(guardian, lea.id));
    expect((await phone.profiles()).profiles[0]?.state).toBe('ready');
    expect((await phone.chooseCode(lea.id, '920374', true)).status).toBe(403);
    expect((await phone.enter(lea.id, STUDENT_CODE)).status).toBe(200);
  });
});

describe('the tries of a code', () => {
  it('block the profile on a device after 3 failures, and not on another', async () => {
    const { guardian, lea, tablet } = await withCode('trois-essais@example.com');
    const phone = api.device();
    await phone.activate(await api.activationCode(guardian, lea.id));
    await tablet.send('POST', '/api/auth/sign-out', {});

    expect(await problem(await tablet.enter(lea.id, '305186'))).toEqual({ status: 401, code: 'INVALID_CODE' });
    await wrong(tablet, lea.id, 1);
    expect(await problem(await tablet.enter(lea.id, '305186'))).toEqual({ status: 403, code: 'PROFILE_BLOCKED' });
    expect(await problem(await tablet.enter(lea.id, STUDENT_CODE))).toEqual({ status: 403, code: 'PROFILE_BLOCKED' });
    expect((await tablet.profiles()).profiles[0]?.state).toBe('blocked');

    expect((await phone.enter(lea.id, STUDENT_CODE)).status).toBe(200);
  });

  it('lock the profile everywhere after 10 failures, until a forgotten code', async () => {
    const { guardian, lea, tablet } = await withCode('dix-essais@example.com');
    await tablet.send('POST', '/api/auth/sign-out', {});
    const devices = [tablet];
    for (let index = 0; index < 3; index++) {
      const other = api.device();
      await other.activate(await api.activationCode(guardian, lea.id));
      devices.push(other);
    }
    // 3 + 3 + 3 + 1: the tenth failure, on the last device.
    for (const [index, device] of devices.entries()) await wrong(device, lea.id, index === 3 ? 1 : 3);
    const last = devices[3] ?? tablet;
    expect(await problem(await last.enter(lea.id, STUDENT_CODE))).toEqual({ status: 403, code: 'PROFILE_LOCKED' });
    expect((await last.profiles()).profiles[0]?.state).toBe('locked');

    const fresh = api.device();
    await fresh.activate(await api.activationCode(guardian, lea.id, 'forgotten'));
    expect((await fresh.chooseCode(lea.id, '920374', true)).status).toBe(200);
  });

  it('count no more than 3 of 20 tries sent at once', async () => {
    const { lea, tablet } = await withCode('vingt-essais@example.com');
    await tablet.send('POST', '/api/auth/sign-out', {});
    const answers = await Promise.all(Array.from({ length: 20 }, () => tablet.enter(lea.id, '305186')));
    // Two wrong codes, the third that blocks, and seventeen refused unchecked.
    expect(answers.map(({ status }) => status).sort()).toEqual([401, 401, ...Array.from({ length: 18 }, () => 403)]);
    const [profile] = await db
      .select({ failures: deviceProfile.failures })
      .from(deviceProfile)
      .where(and(eq(deviceProfile.studentId, lea.id)));
    expect(profile?.failures).toBe(3);
    expect((await codeOf(lea.id))?.failures).toBe(3);
  });

  it('start again from naught after a success', async () => {
    const { lea, tablet } = await withCode('reussite@example.com');
    await tablet.send('POST', '/api/auth/sign-out', {});
    await wrong(tablet, lea.id, 2);
    expect((await tablet.enter(lea.id, STUDENT_CODE)).status).toBe(200);
    expect((await codeOf(lea.id))?.failures).toBe(0);
    await tablet.send('POST', '/api/auth/sign-out', {});
    await wrong(tablet, lea.id, 2);
    expect((await tablet.enter(lea.id, STUDENT_CODE)).status).toBe(200);
  });

  it('answer a profile the device does not hold as a wrong code, and count nothing', async () => {
    const { lea, tablet } = await withCode('etranger@example.com');
    const other = await withCode('autre-foyer@example.com');
    await tablet.send('POST', '/api/auth/sign-out', {});
    const foreign = await problem(await tablet.enter(other.lea.id, STUDENT_CODE));
    const mistaken = await problem(await tablet.enter(lea.id, '305186'));
    expect(foreign).toEqual(mistaken);
    expect((await codeOf(other.lea.id))?.failures).toBe(0);
  });
});

describe('a forgotten code', () => {
  it('stops the old code, closes every session, and lets the student choose a new one, told of the change', async () => {
    const { guardian, lea, tablet } = await withCode('oublie@example.com');
    const phone = api.device();
    await phone.activate(await api.activationCode(guardian, lea.id, 'forgotten'));
    expect(await sessionsOf(lea.id)).toEqual([]);
    expect((await tablet.enter(lea.id, STUDENT_CODE)).status).toBe(401);
    expect((await phone.profiles()).profiles[0]?.state).toBe('choose');

    expect((await phone.chooseCode(lea.id, '920374', true)).status).toBe(200);
    const res = await api.request('GET', '/api/me/devices', { cookie: phone.cookie() });
    const { codeResetAt } = (await res.json()) as { codeResetAt: string | null };
    expect(Date.parse(codeResetAt ?? '')).toBeGreaterThan(Date.now() - 60_000);
    // The new code opens the other device; the old one no longer.
    expect((await tablet.enter(lea.id, '920374')).status).toBe(200);
  });

  it('closes the windows other devices had open: the new code is chosen where the forgotten code was typed', async () => {
    const { guardian, lea } = await withCode('autres-fenetres@example.com');
    const phone = api.device();
    await phone.activate(await api.activationCode(guardian, lea.id));
    const fresh = api.device();
    await fresh.activate(await api.activationCode(guardian, lea.id, 'forgotten'));
    expect(await problem(await phone.chooseCode(lea.id, '920374', true))).toEqual({ status: 403, code: 'CODE_NOT_EXPECTED' });
    expect((await fresh.chooseCode(lea.id, '920374', true)).status).toBe(200);
  });

  it('tells a student whose code never changed nothing', async () => {
    const { tablet } = await withCode('jamais-change@example.com');
    const res = await api.request('GET', '/api/me/devices', { cookie: tablet.cookie() });
    expect(((await res.json()) as { codeResetAt: string | null }).codeResetAt).toBeNull();
  });
});

/** A guardian invited, in on a device of their own, then declared 18 or over: that device. */
async function guardianOn(email: string) {
  const computer = api.device();
  await api.invite(email);
  expect((await computer.signIn(email)).status).toBe(200);
  expect((await api.request('POST', '/api/me/declarations', { cookie: computer.cookie(), body: { adult: true } })).status).toBe(204);
  return computer;
}

describe('a guardian adds their children to this computer', () => {
  it('lists them on it, shared, and a child without a code chooses one right away', async () => {
    const computer = await guardianOn('ordinateur@example.com');
    const lea = await api.student(computer.cookie());
    const tom = await api.student(computer.cookie(), { name: 'Tom', level: 'sixieme' });
    expect((await computer.addProfiles([lea.id, tom.id])).status).toBe(200);

    const { shared, profiles } = await computer.profiles();
    expect(shared).toBe(true);
    expect(profiles.map(({ name, state }) => ({ name, state }))).toEqual([
      { name: 'Léa', state: 'choose' },
      { name: 'Tom', state: 'choose' },
    ]);
    expect((await computer.chooseCode(tom.id, STUDENT_CODE, true)).status).toBe(200);
  });

  it('asks for a session opened a few minutes before', async () => {
    const computer = await guardianOn('pas-frais@example.com');
    const lea = await api.student(computer.cookie());
    const guardianId = (await api.sessionUser(computer.cookie()))?.id ?? '';
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 11 * 60_000) })
      .where(eq(session.userId, guardianId));
    expect((await computer.addProfiles([lea.id])).status).toBe(403);
  });

  it('lets a second adult linked to the child add them too', async () => {
    const { lea } = await family('premier-adulte@example.com');
    const computer = await guardianOn('second-adulte@example.com');
    await db
      .insert(guardianship)
      .values({ adultId: (await api.sessionUser(computer.cookie()))?.id ?? '', studentId: lea.id, declaredAt: new Date() });
    expect((await computer.addProfiles([lea.id])).status).toBe(200);
    expect((await computer.profiles()).profiles.map(({ id }) => id)).toEqual([lea.id]);
  });

  // A parent links a device, with a code (app-cible.md, question 3): a relative does not.
  it('refuses a relative of the child, as an adult without a link', async () => {
    const { lea } = await family('parent-de-lea@example.com');
    const computer = await guardianOn('grand-mere@example.com');
    await db.insert(guardianship).values({ adultId: (await api.sessionUser(computer.cookie()))?.id ?? '', studentId: lea.id, role: 'relative' });
    expect((await computer.addProfiles([lea.id])).status).toBe(404);
    expect((await computer.profiles()).profiles).toEqual([]);
  });

  it("refuses a child the adult is not linked to, and a student's session", async () => {
    const computer = await guardianOn('pas-le-mien@example.com');
    await api.student(computer.cookie());
    const { lea: stranger, tablet } = await withCode('le-sien@example.com');
    expect((await computer.addProfiles([stranger.id])).status).toBe(404);
    expect((await computer.profiles()).profiles).toEqual([]);
    expect((await tablet.addProfiles([stranger.id])).status).toBe(403);
  });
});
