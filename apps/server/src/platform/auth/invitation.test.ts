/**
 * The invitation on a real database, through the HTTP API: an email with one button, which opens
 * the web's page that accepts it, and only that page's own button lets the invited address in and
 * leads to its first screen, once, for 30 days. Only the server makes such a link, and never for
 * an address that already has an account.
 */

import { describe, expect, it } from 'bun:test';
import { desc, eq, like } from 'drizzle-orm';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { ORIGIN } from '../../testing/http';
import { AccountExists, invitationIdentifier } from './invitation';
import { user, verification } from './schema';

const { db } = await testDatabase();
const { api, mail } = testApp(db);

/** The link of the address's invitation email, sent by the invitation itself. */
const invited = async (email: string) => {
  const received = mail.next(email);
  await api.invite(email);
  return mail.invitationIn(await received);
};

const accounts = (email: string) => db.select().from(user).where(eq(user.email, email));
const hasSession = (res: Response) => res.headers.getSetCookie().some((cookie) => cookie.startsWith('better-auth.session_token='));

describe('the invitation', () => {
  it('sends the invited address an email with one button, and how to enter elsewhere', async () => {
    const received = mail.next('camille@example.com');
    await api.invite('camille@example.com');
    const email = await received;
    expect(email.subject).toBe('Votre invitation à Catiche');
    expect(email.text).toContain(`Sur un autre appareil ? Ouvrez ${new URL(ORIGIN).host} et donnez cette adresse.`);
    expect(email.text).toContain('L’invitation vaut 30 jours.');
    // No code: one valid 30 days would be a password.
    expect(email.text).not.toMatch(/\b\d{6}\b/);
  });

  // A mail filter (Safe Links, Defender) opens every link of an email before the person does.
  it('leads to the web’s page, its token after the #: opening the link spends nothing', async () => {
    const link = await invited('filtre@example.com');
    expect(`${link.origin}${link.pathname}`).toBe(`${ORIGIN}/invitation`);
    expect(link.search).toBe('');
    expect(new URLSearchParams(link.hash.slice(1)).get('token')).toBeTruthy();
    const scanned = await api.request('GET', `${link.pathname}${link.search}`);
    expect(hasSession(scanned)).toBe(false);
    expect(await accounts('filtre@example.com')).toEqual([]);
    expect((await api.acceptInvitation(link)).headers.get('location')).toBe(`${ORIGIN}/bienvenue`);
  });

  it('lets the invited address in by the page’s button, its account created, and leads to its first screen', async () => {
    const res = await api.acceptInvitation(await invited('lien@example.com'));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${ORIGIN}/bienvenue`);
    expect(hasSession(res)).toBe(true);
    expect((await accounts('lien@example.com'))[0]?.emailVerified).toBe(true);
    expect(
      await db
        .select()
        .from(verification)
        .where(eq(verification.identifier, invitationIdentifier('lien@example.com'))),
    ).toEqual([]);
  });

  it('serves once: accepted again, it lets no one in', async () => {
    const link = await invited('une-fois@example.com');
    expect((await api.acceptInvitation(link)).status).toBe(302);
    const again = await api.acceptInvitation(link);
    expect(again.headers.get('location')).toStartWith(`${ORIGIN}/entrer?error=`);
    expect(hasSession(again)).toBe(false);
  });

  it('lets no one in once the invitation is gone, and creates nothing', async () => {
    const link = await invited('retiree@example.com');
    await db.delete(verification).where(eq(verification.identifier, invitationIdentifier('retiree@example.com')));
    const res = await api.acceptInvitation(link);
    expect(res.headers.get('location')).toStartWith(`${ORIGIN}/entrer?error=`);
    expect(await accounts('retiree@example.com')).toEqual([]);
  });

  it('keeps its link 30 days, stored hashed', async () => {
    const link = await invited('trente@example.com');
    const token = new URLSearchParams(link.hash.slice(1)).get('token') ?? '';
    const [latest] = await db
      .select()
      .from(verification)
      .where(like(verification.identifier, 'magic-link:%'))
      .orderBy(desc(verification.createdAt))
      .limit(1);
    expect(latest?.identifier).not.toContain(token);
    const days = ((latest?.expiresAt.getTime() ?? 0) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('spends the link sent before: inviting again leaves one link that works', async () => {
    const first = await invited('deux-liens@example.com');
    const second = await invited('deux-liens@example.com');
    expect((await api.acceptInvitation(first)).headers.get('location')).toStartWith(`${ORIGIN}/entrer?error=`);
    expect((await api.acceptInvitation(second)).headers.get('location')).toBe(`${ORIGIN}/bienvenue`);
  });

  it('spends the link once the account exists by a code: it is no sign-in for 30 days', async () => {
    const link = await invited('par-code@example.com');
    await api.signIn('par-code@example.com');
    const res = await api.acceptInvitation(link);
    expect(res.headers.get('location')).toStartWith(`${ORIGIN}/entrer?error=`);
    expect(hasSession(res)).toBe(false);
  });

  // A link of 30 days to an existing account would be a way in that nothing ever spends.
  it('refuses an address that already has an account: no link, no email', async () => {
    await api.guardian('deja@example.com');
    const before = mail.sent.length;
    const links = () => db.select().from(verification).where(like(verification.identifier, 'magic-link:%'));
    const linksBefore = (await links()).length;
    const refused: unknown = await api.invite(' Deja@Example.com ').catch((error: unknown) => error);
    expect(refused).toBeInstanceOf(AccountExists);
    expect(mail.sent.length).toBe(before);
    expect((await links()).length).toBe(linksBefore);
  });

  it('has no public route: only the server makes a link', async () => {
    const res = await api.request('POST', '/api/auth/sign-in/magic-link', { body: { email: 'moi@example.com' } });
    expect(res.status).toBe(404);
  });
});
