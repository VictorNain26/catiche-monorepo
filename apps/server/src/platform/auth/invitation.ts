/**
 * Closed beta: a guardian's account is created for an invited address only. An invitation is a
 * verification value of better-auth, keyed by the address, spent once its account is created
 * (./auth.ts). Inviting an address again replaces its invitation. The address receives an email
 * whose button lets it in, by better-auth's magic link, which only the server makes (./auth.ts).
 */

import { and, eq, like, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import type { Auth } from './auth';
import { verification } from './schema';

const INVITATION_PREFIX = 'sign-up-invitation:';
export const INVITATION_DAYS = 30;

// better-auth stores an address in lowercase (api/routes/sign-up.mjs): the invitation is keyed the same way.
const normalised = (email: string) => email.trim().toLowerCase();

export const invitationIdentifier = (email: string) => `${INVITATION_PREFIX}${normalised(email)}`;

/** Where the invitation's link leads: a new account to its first screen; a spent or stale link to the page that says so. */
const INVITATION_LINK = { callbackURL: '/', newUserCallbackURL: '/bienvenue', errorCallbackURL: '/entrer' } as const;

/**
 * The invitation's links still unused for the address: spent once a new one is sent or the account
 * exists, so that no link stays a way in for 30 days. better-auth keys a link by its hashed token
 * and keeps the address in its JSON value (plugins/magic-link).
 */
export const spendInvitationLinks = (db: Db, email: string) =>
  db
    .delete(verification)
    .where(and(like(verification.identifier, 'magic-link:%'), sql`${verification.value}::jsonb ->> 'email' = ${normalised(email)}`));

export async function invite({ db, auth }: { db: Db; auth: Auth }, email: string) {
  const address = normalised(email);
  const identifier = invitationIdentifier(address);
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 86_400_000);
  await db.transaction(async (tx) => {
    await tx.delete(verification).where(eq(verification.identifier, identifier));
    await tx.insert(verification).values({ id: crypto.randomUUID(), identifier, value: 'invited', expiresAt });
  });
  await spendInvitationLinks(db, address);
  // A call of the server's own: the route itself is disabled (better-auth enforces `disabledPaths`
  // on requests only, api/index.mjs), so no one else asks for a link.
  await auth.api.signInMagicLink({ body: { email: address, ...INVITATION_LINK }, headers: new Headers() });
  return { expiresAt };
}
