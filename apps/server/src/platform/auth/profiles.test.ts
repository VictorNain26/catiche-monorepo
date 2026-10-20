/**
 * The child's profile on a device, through the HTTP API on a real database: a session that a
 * summer without use leaves alive; a guardian who enters on their child's device, the child's
 * session kept; and a device handed to the child, which keeps no guardian session to switch back to.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { invite } from './invitation';
import { session } from './schema';

const { db } = await testDatabase();
const { api } = testApp(db);

const DAY = 24 * 60 * 60_000;
type Device = ReturnType<typeof api.device>;

/** The sessions this device holds, one per account, as the multi-session plugin lists them. */
async function held(device: Device) {
  const res = await device.send('GET', '/api/auth/multi-session/list-device-sessions');
  expect(res.status).toBe(200);
  return (await res.json()) as { session: { token: string }; user: { id: string } }[];
}
const sessionsOf = (userId: string) => db.select().from(session).where(eq(session.userId, userId));

/** A guardian with Léa, and Léa's own tablet, paired by her guardian's code. */
async function family(email: string) {
  const guardian = await api.guardian(email);
  const guardianId = (await api.sessionUser(guardian))?.id ?? '';
  const lea = await api.student(guardian);
  const tablet = api.device();
  expect((await tablet.redeem(await api.pairingCode(guardian, lea.id))).status).toBe(200);
  return { guardian, guardianId, lea, tablet };
}

describe('a paired device', () => {
  it('stays paired ninety days without use', async () => {
    const { lea } = await family('ete@example.com');
    const [paired] = await sessionsOf(lea.id);
    expect((paired?.expiresAt.getTime() ?? 0) - Date.now()).toBeGreaterThan(89 * DAY);
  });
});

describe("a guardian on their child's device", () => {
  it("enters by their code, and the device keeps the child's session", async () => {
    const { guardianId, lea, tablet } = await family('sur-la-tablette@example.com');
    expect((await tablet.signIn('sur-la-tablette@example.com')).status).toBe(200);
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(guardianId);
    expect((await held(tablet)).map(({ user }) => user.id).sort()).toEqual([guardianId, lea.id].sort());
  });

  it('leaves the device to the child, their session kept, when the guardian leaves it', async () => {
    const { guardianId, lea, tablet } = await family('repart@example.com');
    await tablet.signIn('repart@example.com');
    const own = (await held(tablet)).find(({ user }) => user.id === guardianId)?.session.token ?? '';

    expect((await tablet.send('POST', '/api/auth/multi-session/revoke', { sessionToken: own })).status).toBe(200);
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(lea.id);
    expect(await sessionsOf(guardianId)).toHaveLength(1);
  });

  it('may ask for a passkey sign-in there', async () => {
    const { tablet } = await family('cle-sur-la-tablette@example.com');
    expect((await tablet.send('GET', '/api/auth/passkey/generate-authenticate-options')).status).toBe(200);
  });
});

describe('a device handed to the child', () => {
  it("keeps no guardian session: switching back needs the guardian's code", async () => {
    const { guardianId, lea, tablet } = await family('rend-la-tablette@example.com');
    await tablet.signIn('rend-la-tablette@example.com');
    const sessions = await held(tablet);
    const token = (userId: string) => sessions.find(({ user }) => user.id === userId)?.session.token ?? '';

    expect((await tablet.send('POST', '/api/auth/multi-session/set-active', { sessionToken: token(lea.id) })).status).toBe(200);
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(lea.id);
    expect((await sessionsOf(guardianId)).map(({ token: kept }) => kept)).not.toContain(token(guardianId));
    // Past the household's guard, which a request without an active session crosses: the cookie the
    // device kept of the guardian's session opens nothing.
    const withoutActive = tablet
      .cookie()
      .split('; ')
      .filter((cookie) => !cookie.startsWith('better-auth.session_token='))
      .join('; ');
    const back = await api.request('POST', '/api/auth/multi-session/set-active', {
      cookie: withoutActive,
      body: { sessionToken: token(guardianId) },
    });
    expect(back.status).toBe(401);
  });

  it("closes the guardian's session when the guardian pairs their own phone for the child", async () => {
    const guardian = api.device();
    await invite(db, 'mon-telephone@example.com');
    expect((await guardian.signIn('mon-telephone@example.com')).status).toBe(200);
    const guardianId = (await api.sessionUser(guardian.cookie()))?.id ?? '';
    const lea = await api.student(guardian.cookie());

    expect((await guardian.redeem(await api.pairingCode(guardian.cookie(), lea.id))).status).toBe(200);
    expect((await api.sessionUser(guardian.cookie()))?.id).toBe(lea.id);
    expect(await sessionsOf(guardianId)).toEqual([]);
  });

  it('keeps one cookie per account the device holds, however often the guardian hands it over', async () => {
    const phone = api.device();
    await invite(db, 'souvent@example.com');
    await phone.signIn('souvent@example.com');
    const lea = await api.student(phone.cookie());
    for (let round = 0; round < 3; round++) {
      expect((await phone.redeem(await api.pairingCode(phone.cookie(), lea.id))).status).toBe(200);
      expect((await phone.signIn('souvent@example.com')).status).toBe(200);
    }
    const multi = phone
      .cookie()
      .split('; ')
      .filter((cookie) => cookie.includes('_multi-'));
    expect(multi).toHaveLength(2);
  });

  it("never opens a brother's or sister's space to the child, whatever their class, nor lists the device's sessions", async () => {
    const { guardian, lea, tablet } = await family('fratrie@example.com');
    const tom = await api.student(guardian, { name: 'Tom', level: 'sixieme' });
    expect((await tablet.redeem(await api.pairingCode(guardian, tom.id))).status).toBe(200);
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(tom.id);

    const [leas] = await sessionsOf(lea.id);
    expect((await tablet.send('POST', '/api/auth/multi-session/set-active', { sessionToken: leas?.token ?? '' })).status).toBe(403);
    // A GET the guard refuses goes to the sign-in page (modules/household/routes.ts).
    const listed = await tablet.send('GET', '/api/auth/multi-session/list-device-sessions');
    expect({ status: listed.status, location: listed.headers.get('location') }).toEqual({ status: 302, location: '/connexion' });
    expect((await api.sessionUser(tablet.cookie()))?.id).toBe(tom.id);
  });
});
