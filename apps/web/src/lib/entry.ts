/**
 * The sign-in email's button: /entrer with the address and the code after the `#`, which the
 * browser never sends to a server (apps/server/src/platform/auth/auth.ts). The page reads them here.
 */

import { EMAIL_CODE } from './auth';
import { z } from './zod';

const entrySchema = z.object({ email: z.email(), code: z.string().regex(EMAIL_CODE) });

/**
 * The invitation's button: /invitation with better-auth's link after the `#` (its token and where
 * it leads). The page's own button goes on to it; a mail filter that opens the link spends nothing.
 * Null without a token.
 */
export function invitationFromFragment(hash: string) {
  const fields = new URLSearchParams(hash.replace(/^#/, ''));
  return fields.get('token') ? fields.toString() : null;
}

/** The address and the code a fragment carries; null when it is absent, cut or altered. */
export function entryFromFragment(hash: string) {
  const fields = new URLSearchParams(hash.replace(/^#/, ''));
  const entry = entrySchema.safeParse({ email: fields.get('email'), code: fields.get('code') });
  return entry.success ? entry.data : null;
}
