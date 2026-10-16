/** better-auth's client, on the server's own origin (`/api/auth`), its session in a cookie. */

import { passkeyClient } from '@better-auth/passkey/client';
import { queryOptions } from '@tanstack/react-query';
import type { BetterAuthClientPlugin } from 'better-auth/client';
import { emailOTPClient, multiSessionClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { DevicePairing } from 'tomai-server/contract';

// The server's device pairing, its endpoints inferred (https://better-auth.com/docs/concepts/plugins).
const devicePairing = { id: 'device-pairing', $InferServerPlugin: {} as DevicePairing } satisfies BetterAuthClientPlugin;

export const authClient = createAuthClient({ plugins: [devicePairing, emailOTPClient(), passkeyClient(), multiSessionClient()] });

/**
 * The sessions this device holds, one per account, as better-auth's multi-session lists them. A
 * choice that rests on them reads them by `queryClient.query`, which throws when the list is
 * refused: nothing is decided blind.
 */
export const deviceSessionsQuery = queryOptions({
  queryKey: ['device-sessions'],
  queryFn: () => authData(authClient.multiSession.listDeviceSessions()),
});

interface AuthError {
  code?: string | undefined;
  status: number;
}

/** A refusal of better-auth, thrown: its message in words a parent reads, its code and status kept. */
export class AuthFailure extends Error {
  readonly code: string | undefined;
  readonly status: number;

  constructor(error: AuthError) {
    super(authMessage(error));
    this.name = 'AuthFailure';
    this.code = error.code;
    this.status = error.status;
  }
}

/** better-auth's data, or its error thrown as an AuthFailure: what a query or a mutation awaits. */
export async function authData<Result extends { data: unknown; error: AuthError | null }>(
  call: Promise<Result>,
): Promise<Extract<Result, { error: null }>['data']> {
  const { data, error } = await call;
  if (error) throw new AuthFailure(error);
  return data;
}

/** better-auth's error codes, in words a parent reads; the server's own message never shows. */
const AUTH_MESSAGES: Partial<Record<string, string>> = {
  INVALID_EMAIL: 'Une adresse e-mail valide.',
  INVALID_OTP: 'Ce code ne correspond pas. Vérifiez-le, ou demandez-en un nouveau.',
  OTP_EXPIRED: 'Ce code a expiré : demandez-en un nouveau.',
  TOO_MANY_ATTEMPTS: 'Trop d’essais avec ce code : demandez-en un nouveau.',
  INVITATION_REQUIRED: 'Cette adresse n’a pas d’invitation, ou elle a expiré.',
  ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED: 'Cet appareil a déjà une clé d’accès pour Catiche.',
  PASSKEY_NOT_FOUND: 'Catiche ne connaît plus cette clé d’accès : entrez avec un code reçu par e-mail.',
  AUTHENTICATION_FAILED: 'Cette clé d’accès n’a pas été reconnue : entrez avec un code reçu par e-mail.',
};

/**
 * The browser's window closed by the person, or left to time out (both a NotAllowedError, which
 * WebAuthn keeps alike), or a pending ceremony replaced by a new one: nothing to say.
 */
export const isCancelled = (error: AuthError) => hasCode(error, 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') || hasCode(error, 'ERROR_CEREMONY_ABORTED');

/** Whether better-auth's error is this one: some of its errors carry no code. */
export const hasCode = (error: AuthError, code: string) => error.code === code;

export function authMessage(error: AuthError): string {
  if (error.status === 429) return 'Trop d’essais. Patientez une minute avant de réessayer.';
  const message = error.code === undefined ? undefined : AUTH_MESSAGES[error.code];
  return message ?? 'Une erreur est survenue. Réessayez dans un instant.';
}
