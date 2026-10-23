/**
 * Who `/api/me` says is signed in, for an adult, through the HTTP API on a real database: their
 * address, whether the device is shared, and the passkey's offer, from the second entry by email,
 * until a passkey exists or the adult puts it away, never on a shared device.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { passkey, user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import type { Email } from '../../platform/email/mailer';
import { adultProfile } from './schema';

const { db } = await testDatabase();
const { api, mail } = testApp(db);

interface AdultMe {
  email: string;
  sharedDevice: boolean;
  passkeyOffer: boolean;
}

const me = async (cookie: string) => (await (await api.request('GET', '/api/me', { cookie })).json()) as AdultMe;
const entriesOf = async (email: string) =>
  (
    await db
      .select({ entries: adultProfile.emailEntries })
      .from(adultProfile)
      .innerJoin(user, eq(user.id, adultProfile.userId))
      .where(eq(user.email, email))
  )[0]?.entries;

/** The invitation's button, opened: the session it opens. */
const acceptInvitation = async (email: string) => {
  const received: Promise<Email> = mail.next(email);
  await api.invite(email);
  const url = new URL(/Accepter l’invitation : (\S+)/.exec((await received).text)?.[1] ?? '');
  const res = await api.request('GET', `${url.pathname}${url.search}`);
  return (
    res.headers
      .getSetCookie()
      .find((cookie) => cookie.startsWith('better-auth.session_token='))
      ?.split(';')[0] ?? ''
  );
};

describe('the entries by email', () => {
  it('count the invitation’s button and each code, and nothing else', async () => {
    const first = await acceptInvitation('compte@example.com');
    expect(await entriesOf('compte@example.com')).toBe(1);
    await api.signIn('compte@example.com');
    expect(await entriesOf('compte@example.com')).toBe(2);
    // A session read, or a refused code, is no entry.
    await api.sessionUser(first);
    await api.request('POST', '/api/auth/sign-in/email-otp', { body: { email: 'compte@example.com', otp: '000000' } });
    expect(await entriesOf('compte@example.com')).toBe(2);
  });

  it('let the adult in even when the count fails', async () => {
    const failing = testApp(db, { auth: { emailEntered: () => Promise.reject(new Error('compte indisponible')) } }).api;
    const cookie = await failing.guardian('sans-compte@example.com');
    expect(await failing.sessionUser(cookie)).toBeDefined();
  });
});

describe("the passkey's offer", () => {
  it('waits for the second entry by email, and tells the address', async () => {
    const first = await api.guardian('deuxieme@example.com');
    expect(await me(first)).toMatchObject({ email: 'deuxieme@example.com', sharedDevice: false, passkeyOffer: false });
    expect((await me(await api.signIn('deuxieme@example.com'))).passkeyOffer).toBe(true);
  });

  it('goes once the adult has a passkey', async () => {
    await api.guardian('avec-cle@example.com');
    const cookie = await api.signIn('avec-cle@example.com');
    const userId = (await api.sessionUser(cookie))?.id ?? '';
    await db.insert(passkey).values({
      id: crypto.randomUUID(),
      publicKey: 'cle',
      userId,
      credentialID: crypto.randomUUID(),
      counter: 0,
      deviceType: 'singleDevice',
      backedUp: false,
    });
    expect((await me(cookie)).passkeyOffer).toBe(false);
  });

  it('goes, for good, once put away', async () => {
    await api.guardian('plus-tard@example.com');
    const cookie = await api.signIn('plus-tard@example.com');
    expect((await api.request('POST', '/api/me/passkey-offer', { cookie })).status).toBe(204);
    expect((await me(cookie)).passkeyOffer).toBe(false);
    expect((await me(await api.signIn('plus-tard@example.com'))).passkeyOffer).toBe(false);
  });

  it('never shows on a shared device, which says so', async () => {
    const parent = await api.guardian('partage@example.com');
    const { id } = await api.student(parent);
    const computer = api.device();
    expect((await computer.activate(await api.activationCode(parent, id))).status).toBe(200);
    expect((await computer.chooseCode(id, '482917', false)).status).toBe(200);
    expect((await computer.send('POST', '/api/auth/sign-out', {})).status).toBe(200);
    expect((await computer.signIn('partage@example.com')).status).toBe(200);
    expect(await me(computer.cookie())).toMatchObject({ sharedDevice: true, passkeyOffer: false });
  });

  it('refuses a student who would put it away', async () => {
    const parent = await api.guardian('parent-eleve@example.com');
    const device = await api.pair(parent, (await api.student(parent)).id);
    expect((await api.request('POST', '/api/me/passkey-offer', { cookie: device })).status).toBe(403);
  });
});
