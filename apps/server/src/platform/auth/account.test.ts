/**
 * A guardian's account on a real database, through the HTTP API: in by a code sent to their
 * address, the first one creating the account on an invitation; refused alike for any address; and
 * the deletion, by a session opened minutes before, which takes with it the students no other adult
 * follows. A student's `.invalid` address is never sent to.
 */

import { describe, expect, it } from 'bun:test';
import { eq, inArray } from 'drizzle-orm';
import { accountDeletion } from '../../modules/household';
import { adultProfile, guardianship } from '../../modules/household/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { ORIGIN } from '../../testing/http';
import { invitationIdentifier, invite } from './invitation';
import { session, user, verification } from './schema';

const { db } = await testDatabase();
// Behind one proxy, as at Clever Cloud.
const { api, mail, tasks } = testApp(db, { config: { trustedProxyHops: 1 } });

const sendCode = (email: string) => api.request('POST', '/api/auth/email-otp/send-verification-otp', { body: { email, type: 'sign-in' } });
const signIn = (email: string, otp: string) => api.request('POST', '/api/auth/sign-in/email-otp', { body: { email, otp } });
/** The email the address receives once it asks for a code. */
const asked = async (email: string) => {
  const received = mail.next(email);
  expect(await (await sendCode(email)).json()).toEqual({ success: true });
  return received;
};
const accounts = (email: string) => db.select().from(user).where(eq(user.email, email));
const invitations = (email: string) =>
  db
    .select()
    .from(verification)
    .where(eq(verification.identifier, invitationIdentifier(email)));
const expire = (email: string) =>
  db
    .update(verification)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(verification.identifier, invitationIdentifier(email)));

describe('sign-in by code', () => {
  it("creates an invited address's account at its first code, the address proven, the invitation spent", async () => {
    await invite(db, ' Nouvelle@Example.com ');
    const email = await asked('nouvelle@example.com');
    // The parent reads the product's name, Catiche; Tom is the tutor inside it. The code stays out of
    // the subject, which a locked phone shows in its notifications.
    expect(email.subject).toBe('Votre code pour entrer dans Catiche');
    expect(email.text).toContain('pour entrer dans Catiche');
    const res = await signIn('nouvelle@example.com', mail.codeIn(email));
    expect(res.status).toBe(200);
    expect((await accounts('nouvelle@example.com'))[0]?.emailVerified).toBe(true);
    expect(await invitations('nouvelle@example.com')).toEqual([]);
  });

  it('records the address the proxy appended, never one the client wrote before it', async () => {
    await invite(db, 'adresse@example.com');
    const otp = mail.codeIn(await asked('adresse@example.com'));
    const res = await api.request('POST', '/api/auth/sign-in/email-otp', {
      body: { email: 'adresse@example.com', otp },
      headers: { 'X-Forwarded-For': '198.51.100.7, 203.0.113.50' },
    });
    expect(res.status).toBe(200);
    const [opened] = await db
      .select({ ipAddress: session.ipAddress })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .where(eq(user.email, 'adresse@example.com'));
    expect(opened?.ipAddress).toBe('203.0.113.50');
  });

  it('lets a known address in by its code, with no invitation left', async () => {
    await api.guardian('connu@example.com');
    const cookie = await api.signIn('connu@example.com');
    expect(await api.sessionUser(cookie)).toBeDefined();
  });

  it('tells an address without account nor invitation of the closed beta, with no code, and creates nothing', async () => {
    const email = await asked('inconnu@example.com');
    expect(email.subject).toBe('Catiche est en bêta fermée');
    expect(email.text).not.toContain('Tom');
    expect(email.subject + email.text).not.toMatch(/\b\d{6}\b/);
    expect((await signIn('inconnu@example.com', '000000')).status).toBe(400);
    expect(await accounts('inconnu@example.com')).toEqual([]);
  });

  it('tells an expired invitation of the closed beta', async () => {
    await invite(db, 'en-retard@example.com');
    await expire('en-retard@example.com');
    expect((await asked('en-retard@example.com')).subject).toBe('Catiche est en bêta fermée');
  });

  it('creates no account once the invitation has expired, even with a valid code', async () => {
    await invite(db, 'trop-tard@example.com');
    const email = await asked('trop-tard@example.com');
    await expire('trop-tard@example.com');
    const res = await signIn('trop-tard@example.com', mail.codeIn(email));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { code: string }).code).toBe('INVITATION_REQUIRED');
    expect(await accounts('trop-tard@example.com')).toEqual([]);
  });

  it("answers a student's address as any other, sending it nothing", async () => {
    const parent = await api.guardian('parent-eleve@example.com');
    const { id } = await api.student(parent);
    const [student] = await db.select({ email: user.email }).from(user).where(eq(user.id, id));
    const sentBefore = mail.sent.length;
    expect(await (await sendCode(student?.email ?? '')).json()).toEqual({ success: true });
    await tasks.settled();
    expect(mail.sent.length).toBe(sentBefore);
  });

  it('refuses the right code after three wrong ones', async () => {
    await invite(db, 'maladroit@example.com');
    const code = mail.codeIn(await asked('maladroit@example.com'));
    const wrong = code === '111111' ? '222222' : '111111';
    for (let attempt = 0; attempt < 3; attempt++) expect((await signIn('maladroit@example.com', wrong)).status).toBe(400);
    expect((await signIn('maladroit@example.com', code)).status).toBe(403);
    expect(await accounts('maladroit@example.com')).toEqual([]);
  });

  it('stores the code hashed, never in clear', async () => {
    await invite(db, 'secret@example.com');
    const code = mail.codeIn(await asked('secret@example.com'));
    const rows = await db
      .select({ value: verification.value })
      .from(verification)
      .where(eq(verification.identifier, 'sign-in-otp-secret@example.com'));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).not.toContain(code);
  });

  it('has no password: its routes are gone', async () => {
    await invite(db, 'mot-de-passe@example.com');
    const signUp = await api.request('POST', '/api/auth/sign-up/email', {
      body: { name: 'Parent', email: 'mot-de-passe@example.com', password: 'un mot de passe solide' },
    });
    expect(signUp.status).toBeGreaterThanOrEqual(400);
    expect((await api.request('POST', '/api/auth/email-otp/reset-password', { body: {} })).status).toBe(404);
    expect(await accounts('mot-de-passe@example.com')).toEqual([]);
  });

  it('keeps one invitation per address, inviting again replacing it', async () => {
    await invite(db, 'deux-fois@example.com');
    const { expiresAt } = await invite(db, 'deux-fois@example.com');
    expect((await invitations('deux-fois@example.com')).map((row) => row.expiresAt)).toEqual([expiresAt]);
  });
});

describe('the error page', () => {
  it("is the web's, not better-auth's own, whose inline style the CSP blocks", async () => {
    const res = await api.request('GET', '/api/auth/error?error=boom');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${ORIGIN}/erreur-connexion?error=boom`);
  });
});

describe('account deletion', () => {
  it('takes the students it is the only adult of and their devices with it, from a session just opened', async () => {
    const email = 'depart@example.com';
    const parent = await api.guardian(email);
    const student = await api.student(parent);
    const device = await api.pair(parent, student.id);
    const parentId = (await api.sessionUser(parent))?.id ?? '';

    const notice = mail.next(email);
    expect((await api.request('POST', '/api/auth/delete-user', { cookie: parent, body: {} })).status).toBe(200);
    expect(await accounts(email)).toEqual([]);
    expect(await db.select().from(user).where(eq(user.id, student.id))).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, student.id))).toEqual([]);
    expect(await db.select().from(guardianship).where(eq(guardianship.adultId, parentId))).toEqual([]);
    expect(await db.select().from(adultProfile).where(eq(adultProfile.userId, parentId))).toEqual([]);
    expect(await api.sessionUser(device)).toBeUndefined();
    expect(await api.sessionUser(parent)).toBeUndefined();
    const sent = await notice;
    expect(sent.subject).toBe('Votre compte Catiche est supprimé');
    expect(sent.text).toContain('Votre compte Catiche est supprimé');
  });

  it('keeps a student another adult follows, with their devices, and takes the one it alone follows', async () => {
    const parent = await api.guardian('depart-a-deux@example.com');
    const other = await api.guardian('reste@example.com');
    const shared = await api.student(parent, { name: 'Léa' });
    const alone = await api.student(parent, { name: 'Tom' });
    const device = await api.pair(parent, shared.id);
    const otherId = (await api.sessionUser(other))?.id ?? '';
    await db.insert(guardianship).values({ adultId: otherId, studentId: shared.id, declaredAt: new Date() });

    expect((await api.request('POST', '/api/auth/delete-user', { cookie: parent, body: {} })).status).toBe(200);
    expect(await db.select({ id: user.id }).from(user).where(eq(user.id, shared.id))).toEqual([{ id: shared.id }]);
    expect(await db.select().from(user).where(eq(user.id, alone.id))).toEqual([]);
    expect(await db.select({ adultId: guardianship.adultId }).from(guardianship).where(eq(guardianship.studentId, shared.id))).toEqual([
      { adultId: otherId },
    ]);
    expect((await api.sessionUser(device))?.id).toBe(shared.id);
    const list = (await (await api.request('GET', '/api/household/students', { cookie: other })).json()) as { id: string }[];
    expect(list.map(({ id }) => id)).toEqual([shared.id]);
  });

  it('takes a student whose two adults leave at the same time, never leaving them without an adult', async () => {
    const deleteAccount = accountDeletion(db);
    // Five pairs, set up at once: one pair alone could leave in turn by chance.
    const pairs = await Promise.all(
      [0, 1, 2, 3, 4].map(async (pair) => {
        const [first, second] = await Promise.all([
          api.guardian(`ensemble-${String(pair)}-a@example.com`),
          api.guardian(`ensemble-${String(pair)}-b@example.com`),
        ]);
        const [student, firstUser, secondUser] = await Promise.all([api.student(first), api.sessionUser(first), api.sessionUser(second)]);
        const adults = [firstUser?.id ?? '', secondUser?.id ?? ''];
        await db.insert(guardianship).values({ adultId: adults[1] ?? '', studentId: student.id, declaredAt: new Date() });
        return { studentId: student.id, adults };
      }),
    );
    await Promise.all(pairs.flatMap(({ adults }) => adults.map((adultId) => deleteAccount(adultId))));
    const students = pairs.map(({ studentId }) => studentId);
    expect(await db.select({ id: user.id }).from(user).where(inArray(user.id, students))).toEqual([]);
  });

  it('refuses a session opened more than ten minutes ago, and keeps the account', async () => {
    const email = 'prudent@example.com';
    const parent = await api.guardian(email);
    const parentId = (await api.sessionUser(parent))?.id ?? '';
    await db
      .update(session)
      .set({ createdAt: new Date(Date.now() - 11 * 60_000) })
      .where(eq(session.userId, parentId));
    expect((await api.request('POST', '/api/auth/delete-user', { cookie: parent, body: {} })).status).toBe(400);
    expect(await accounts(email)).toHaveLength(1);
    expect(await api.sessionUser(parent)).toBeDefined();
  });

  it('deletes a guardian who never created a student', async () => {
    const email = 'seul@example.com';
    const parent = await api.guardian(email);
    expect((await api.request('POST', '/api/auth/delete-user', { cookie: parent, body: {} })).status).toBe(200);
    expect(await accounts(email)).toEqual([]);
  });
});
