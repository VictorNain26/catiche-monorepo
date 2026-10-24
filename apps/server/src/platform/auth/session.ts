/**
 * The signed-in user of a request, read by better-auth from its session cookie on every call:
 * without cookieCache, a revoked session stops at the next request. A session used past better-auth's
 * updateAge is extended, and its new cookie goes out with the response, as get-session does.
 */

import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../http/env';
import { Problem } from '../http/problem';
import type { Auth } from './auth';

/** How long after an entry a sensitive gesture needs no new one: better-auth's `freshAge`, and ours. */
export const FRESH_AGE_SECONDS = 10 * 60;

export interface SessionEnv extends AppEnv {
  /**
   * `deviceId`: the device the session was opened on, when it is one the household knows.
   * `sessionOpenedAt`: when the adult entered, for the gestures that ask a recent entry.
   */
  Variables: AppEnv['Variables'] & { userId: string; userName: string; userEmail: string; deviceId: string | null; sessionOpenedAt: Date };
}

export function requireSession(auth: Auth) {
  return createMiddleware<SessionEnv>(async (c, next) => {
    const { response: session, headers } = await auth.api.getSession({ headers: c.req.raw.headers, returnHeaders: true });
    if (!session) throw new Problem('UNAUTHENTICATED');
    c.set('userId', session.user.id);
    c.set('userName', session.user.name);
    c.set('userEmail', session.user.email);
    c.set('deviceId', session.session.deviceId ?? null);
    c.set('sessionOpenedAt', new Date(session.session.createdAt));
    await next();
    for (const cookie of headers.getSetCookie()) c.res.headers.append('Set-Cookie', cookie);
  });
}

/**
 * A gesture that asks a recent entry (`app-cible.md`, « La confirmation récente »), as better-auth's
 * freshSessionMiddleware asks it of its own routes: past it, SESSION_NOT_FRESH, and the web
 * confirms by a code received by email. After `requireSession`.
 */
export const freshSession = createMiddleware<SessionEnv>(async (c, next) => {
  if (Date.now() - c.var.sessionOpenedAt.getTime() >= FRESH_AGE_SECONDS * 1000) throw new Problem('SESSION_NOT_FRESH');
  await next();
});
