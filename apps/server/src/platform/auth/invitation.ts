/**
 * Closed beta: a guardian's account is created for an invited address only. An invitation is a
 * verification value of better-auth, keyed by the address, spent once its account is created
 * (./auth.ts). Inviting an address again replaces its invitation. The address receives an email
 * whose button lets it in, by better-auth's magic link, which only the server makes (./auth.ts).
 */

import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import type { Auth } from './auth';
import { verification } from './schema';

const INVITATION_PREFIX = 'sign-up-invitation:';
export const INVITATION_DAYS = 30;

// better-auth stores an address in lowercase (api/routes/sign-up.mjs): the invitation is keyed the same way.
export const invitationIdentifier = (email: string) => `${INVITATION_PREFIX}${email.trim().toLowerCase()}`;

/** Where the invitation's link leads: a new account to its first screen; a spent or stale link to the page that says so. */
export const INVITATION_LINK = { callbackURL: '/', newUserCallbackURL: '/bienvenue', errorCallbackURL: '/entrer' } as const;

export async function invite({ db, auth }: { db: Db; auth: Auth }, email: string) {
  const address = email.trim().toLowerCase();
  const identifier = invitationIdentifier(address);
  const expiresAt = new Date(Date.now() + INVITATION_DAYS * 86_400_000);
  await db.transaction(async (tx) => {
    await tx.delete(verification).where(eq(verification.identifier, identifier));
    await tx.insert(verification).values({ id: crypto.randomUUID(), identifier, value: 'invited', expiresAt });
  });
  // A call of the server's own: the route itself is disabled (better-auth enforces `disabledPaths`
  // on requests only, api/index.mjs), so no one else asks for a link.
  await auth.api.signInMagicLink({ body: { email: address, ...INVITATION_LINK }, headers: new Headers() });
  return { expiresAt };
}
