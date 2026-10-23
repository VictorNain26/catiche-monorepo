/**
 * The invitation on a real database, through the HTTP API: an email with one button, whose link
 * lets the invited address in and leads to its first screen, once, for 30 days; only the server
 * makes such a link.
 */

import { describe, expect, it } from 'bun:test';
import { desc, eq, like } from 'drizzle-orm';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { ORIGIN } from '../../testing/http';
import type { Email } from '../email/mailer';
import { invitationIdentifier } from './invitation';
import { user, verification } from './schema';

const { db } = await testDatabase();
const { api, mail } = testApp(db);

/** The address's invitation email, sent by the invitation itself. */
const invited = async (email: string) => {
  const received = mail.next(email);
  await api.invite(email);
  return received;
};

/** The link of the invitation's button, as the person's browser opens it, on this origin. */
const linkIn = ({ text }: Email) => {
  const url = /Accepter l’invitation : (\S+)/.exec(text)?.[1];
  if (!url) throw new Error('No link in the invitation');
  return new URL(url);
};

/** The link opened in a browser: the API's answer, a redirection with the session's cookie. */
const open = (link: URL) => api.request('GET', `${link.pathname}${link.search}`);

const accounts = (email: string) => db.select().from(user).where(eq(user.email, email));

describe('the invitation', () => {
  it('sends the invited address an email with one button, and how to enter elsewhere', async () => {
    const email = await invited('camille@example.com');
    expect(email.subject).toBe('Votre invitation à Catiche');
    expect(email.text).toContain(`Sur un autre appareil ? Ouvrez ${new URL(ORIGIN).host} et donnez cette adresse.`);
    expect(email.text).toContain('L’invitation vaut 30 jours.');
    // No code: one valid 30 days would be a password.
    expect(email.text).not.toMatch(/\b\d{6}\b/);
    expect(linkIn(email).origin).toBe(ORIGIN);
  });

  it('lets the invited address in by its link, its account created, and leads to its first screen', async () => {
    const res = await open(linkIn(await invited('lien@example.com')));
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`${ORIGIN}/bienvenue`);
    expect(res.headers.getSetCookie().some((cookie) => cookie.startsWith('better-auth.session_token='))).toBe(true);
    expect((await accounts('lien@example.com'))[0]?.emailVerified).toBe(true);
    expect(
      await db
        .select()
        .from(verification)
        .where(eq(verification.identifier, invitationIdentifier('lien@example.com'))),
    ).toEqual([]);
  });

  it('serves once: opened again, it lets no one in', async () => {
    const link = linkIn(await invited('une-fois@example.com'));
    expect((await open(link)).status).toBe(302);
    const again = await open(link);
    expect(again.headers.get('location')).toStartWith(`${ORIGIN}/entrer?error=`);
    expect(again.headers.getSetCookie().some((cookie) => cookie.startsWith('better-auth.session_token='))).toBe(false);
  });

  it('lets no one in once the invitation is gone, and creates nothing', async () => {
    const link = linkIn(await invited('retiree@example.com'));
    await db.delete(verification).where(eq(verification.identifier, invitationIdentifier('retiree@example.com')));
    const res = await open(link);
    expect(res.headers.get('location')).toStartWith(`${ORIGIN}/entrer?error=`);
    expect(await accounts('retiree@example.com')).toEqual([]);
  });

  it('keeps its link 30 days, stored hashed', async () => {
    const link = linkIn(await invited('trente@example.com'));
    const token = link.searchParams.get('token') ?? '';
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

  it('has no public route: only the server makes a link', async () => {
    const res = await api.request('POST', '/api/auth/sign-in/magic-link', { body: { email: 'moi@example.com' } });
    expect(res.status).toBe(404);
  });
});
