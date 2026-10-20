/**
 * The student's way in: a short code of their own, that only opens their profile on a device a
 * guardian's code recognised first. NIST calls it an activation secret (SP 800-63B-4, § 3.2.10),
 * the CNIL an unlocking code (deliberation 2022-100, § 45-47): six digits, a blocklist
 * (`domain/student-code.ts`), 3 tries on a device, 10 everywhere, then a guardian's code.
 *
 * - The guardian asks for an activation code (8 characters, 10 minutes, single use, hashed): the
 *   device that sends it gets a signed cookie of its own, which holds nothing but its id, and the
 *   student's profile on it; no session.
 * - A student without a code chooses one there while the window is open; then their code opens
 *   their profile on every device that holds it. A forgotten code is a guardian's code too: the old
 *   one stops, every session of the student closes, and they are told when.
 * - A device shared by a family (the student says so, or it holds a second profile) keeps a
 *   session ten minutes without use, two hours at most, and none past the browser: the guardian's
 *   included, so that a brother or sister who comes next finds it closed.
 *
 * The code is hashed by better-auth's own password hash (scrypt), over an HMAC of the code by a key
 * derived from the auth secret: a copy of the database alone does not give the million codes away.
 * The guardian never learns it. better-auth's own parts do the rest: verification values, sessions,
 * signed cookies, the rate limit by address.
 */

import type { GenericEndpointContext } from '@better-auth/core';
import { runWithTransaction } from '@better-auth/core/context';
import { generateId } from '@better-auth/core/utils/id';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint, createAuthMiddleware, freshSessionMiddleware } from 'better-auth/api';
import { expireCookie, setSessionCookie } from 'better-auth/cookies';
import { makeSignature } from 'better-auth/crypto';
import { z } from 'zod';
import { studentCodeRefusal } from '../../domain/student-code';
import type { Auth } from './auth';
import { CODE_TRIES, DEVICE_TRIES, type StudentDevices } from './student-devices';

export const ACTIVATION_PREFIX = 'student-activation:';
const ACTIVATION_MINUTES = 10;
// Crockford's base32 (https://www.crockford.com/base32.html): no I, L, O or U to misread. Eight
// characters, 40 bits, single use for ten minutes behind a rate limit: under the day the CNIL
// allows a temporary secret (deliberation 2022-100, § 35).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 8;

const MINUTE = 60_000;
/** A session on a shared device: closed ten minutes without use, two hours after it opened at most. */
const IDLE_MINUTES = 10;
const SHARED_MINUTES = 120;
/** The browser keeps a cookie 400 days at most (RFC 6265bis, « Cookie Lifetime Limits »). */
const DEVICE_COOKIE_SECONDS = 400 * 24 * 60 * 60;

/** Why a code is refused, as the web reads it. */
const REFUSALS = {
  format: { status: 'BAD_REQUEST', code: 'CODE_FORMAT', message: 'The code has six digits' },
  easy: { status: 'BAD_REQUEST', code: 'CODE_TOO_EASY', message: 'The code is too easy to guess' },
  birth: { status: 'BAD_REQUEST', code: 'CODE_IS_BIRTH_DATE', message: 'The code is the month and year of birth' },
} as const;

const INVALID_CODE = { code: 'INVALID_CODE', message: 'Invalid code' };
const BLOCKED = { code: 'PROFILE_BLOCKED', message: 'Blocked on this device until a guardian unblocks it' };
const LOCKED = { code: 'PROFILE_LOCKED', message: 'Locked until a new code' };

export type ActivationReason = 'device' | 'forgotten';

/** Uppercase, without spaces or dashes, and Crockford's decoding of the letters read as digits. */
export const normaliseActivationCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');

function generateActivationCode(): string {
  // 256 is a multiple of 32: every character is equally likely.
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}

/** A student's address is the RFC 6761 `.invalid` one better-auth makes for an account without email. */
export const isStudentEmail = (email: string) => email.endsWith('.invalid');

/** A code that recognises, within ten minutes, the device that sends it for `userId`: a new device, or a code forgotten. */
export async function createActivationCode(auth: Auth, userId: string, reason: ActivationReason) {
  const code = generateActivationCode();
  const expiresAt = new Date(Date.now() + ACTIVATION_MINUTES * MINUTE);
  const value = JSON.stringify({ userId, reason });
  await (await auth.$context).internalAdapter.createVerificationValue({ identifier: `${ACTIVATION_PREFIX}${code}`, value, expiresAt });
  return { code, expiresAt };
}

const activation = z.object({ userId: z.string(), reason: z.enum(['device', 'forgotten']) });

/** When a session on a shared device closes: ten minutes from now, never past two hours from its opening. */
const sharedDeadline = (openedAt: Date, now: Date) =>
  new Date(Math.min(openedAt.getTime() + SHARED_MINUTES * MINUTE, now.getTime() + IDLE_MINUTES * MINUTE));

/** What the plugin asks of the household: whether a student is the guardian's, and their month of birth. */
export interface StudentAccess {
  inHousehold: (guardianId: string, studentId: string) => Promise<boolean>;
  birthMonth: (studentId: string) => Promise<string | null>;
}

const studentCodeSchema = z.string().max(16);

export function studentSignIn({ devices, students }: { devices: StudentDevices; students: StudentAccess }) {
  const deviceCookie = (ctx: GenericEndpointContext) => ctx.context.createAuthCookie('device', { maxAge: DEVICE_COOKIE_SECONDS });

  /** The device the request's signed cookie names; none for a cookie forged, or for a device gone. */
  const requestDevice = async (ctx: GenericEndpointContext) => {
    const id = await ctx.getSignedCookie(deviceCookie(ctx).name, ctx.context.secret);
    return id ? devices.findDevice(id) : undefined;
  };

  /** The device of the request, or a new one, its cookie set. */
  const ensureDevice = async (ctx: GenericEndpointContext) => {
    const found = await requestDevice(ctx);
    if (found) return found;
    const id = generateId(32);
    await devices.createDevice(id, ctx.headers?.get('user-agent') ?? null);
    const { name, attributes } = deviceCookie(ctx);
    await ctx.setSignedCookie(name, id, ctx.context.secret, attributes);
    return { id, shared: false };
  };

  /** The code, through an HMAC by a key of its own derived from the auth secret: the pepper. */
  const peppered = async (ctx: GenericEndpointContext, code: string) =>
    makeSignature(code, await makeSignature('catiche:student-code:v1', ctx.context.secret));

  // A hash to check against when there is none, so that a profile the device does not hold takes as long as a wrong code.
  let decoy: Promise<string> | undefined;

  /**
   * Opens the student's session on the device, in place of the one the request carried, whoever's:
   * a device given to a child keeps no guardian session. Short on a shared device.
   */
  const openSession = async (ctx: GenericEndpointContext, studentId: string, deviceId: string, shared: boolean) => {
    const { internalAdapter } = ctx.context;
    const carried = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
    const user = await internalAdapter.findUserById(studentId);
    if (!user) throw APIError.from('UNAUTHORIZED', INVALID_CODE);
    const now = new Date();
    const created = shared
      ? await internalAdapter.createSession(studentId, true, { deviceId, expiresAt: sharedDeadline(now, now) }, true)
      : await internalAdapter.createSession(studentId, false, { deviceId });
    if (carried && carried !== created.token) await internalAdapter.deleteSession(carried);
    if (!shared) expireCookie(ctx, ctx.context.authCookies.dontRememberToken);
    await setSessionCookie(ctx, { session: created, user }, shared);
    return ctx.json({ user: { id: user.id, name: user.name } });
  };

  return {
    id: 'student-sign-in',
    // The device a session was opened on, which closes the sessions of a device as it becomes shared.
    schema: { session: { fields: { deviceId: { type: 'string', required: false, input: false } } } },
    endpoints: {
      /** The guardian's code, spent: the device is recognised for the student, a window opens for a code to choose. */
      activateStudentDevice: createAuthEndpoint(
        '/student/activate',
        { method: 'POST', body: z.object({ code: z.string().max(32) }) },
        async (ctx) => {
          const { internalAdapter } = ctx.context;
          const spent = await runWithTransaction(ctx.context.adapter, async () => {
            // consumeVerificationValue deletes the code and returns nothing once it has expired.
            const verification = await internalAdapter.consumeVerificationValue(`${ACTIVATION_PREFIX}${normaliseActivationCode(ctx.body.code)}`);
            const parsed = activation.safeParse(verification ? JSON.parse(verification.value) : null);
            return parsed.success ? parsed.data : null;
          });
          if (!spent || !(await internalAdapter.findUserById(spent.userId))) {
            throw APIError.from('BAD_REQUEST', { code: 'INVALID_ACTIVATION_CODE', message: 'Invalid or expired code' });
          }
          if (spent.reason === 'forgotten') await devices.forget(spent.userId);
          const device = await ensureDevice(ctx);
          await devices.addProfile(device.id, spent.userId, { windowUntil: new Date(Date.now() + ACTIVATION_MINUTES * MINUTE), shared: false });
          return ctx.json({ studentId: spent.userId });
        },
      ),

      /** The profiles of this device, each with what its student meets; nothing without a device. */
      listStudentProfiles: createAuthEndpoint('/student/profiles', { method: 'GET' }, async (ctx) => {
        const device = await requestDevice(ctx);
        if (!device) return ctx.json({ shared: false, profiles: [] });
        return ctx.json({ shared: device.shared, profiles: await devices.listProfiles(device.id) });
      }),

      /**
       * The student's code, chosen while the window a guardian's code opened lasts and while they
       * have none: it opens their session. `ownDevice` false makes the device shared.
       */
      chooseStudentCode: createAuthEndpoint(
        '/student/choose-code',
        { method: 'POST', body: z.object({ studentId: z.string().max(64), code: studentCodeSchema, ownDevice: z.boolean() }) },
        async (ctx) => {
          const { studentId, code, ownDevice } = ctx.body;
          const device = await requestDevice(ctx);
          const notExpected = APIError.from('FORBIDDEN', { code: 'CODE_NOT_EXPECTED', message: 'No code is to be chosen here' });
          if (!device) throw notExpected;
          const refusal = studentCodeRefusal(code, (await students.birthMonth(studentId)) ?? '');
          if (refusal) throw APIError.from(REFUSALS[refusal].status, REFUSALS[refusal]);
          const hash = await ctx.context.password.hash(await peppered(ctx, code));
          if (!(await devices.chooseCode(device.id, studentId, hash, { shared: !ownDevice }))) throw notExpected;
          return openSession(ctx, studentId, device.id, device.shared || !ownDevice);
        },
      ),

      /**
       * The student's code, on a device that holds their profile: the try is counted before it is
       * checked. A profile the device does not hold gets the answer of a wrong code, as slowly.
       */
      signInStudent: createAuthEndpoint(
        '/student/sign-in',
        { method: 'POST', body: z.object({ studentId: z.string().max(64), code: studentCodeSchema }) },
        async (ctx) => {
          const { studentId, code } = ctx.body;
          const device = await requestDevice(ctx);
          const claim = device ? await devices.claimTry(device.id, studentId) : ({ outcome: 'unknown' } as const);
          if (claim.outcome === 'blocked') throw APIError.from('FORBIDDEN', BLOCKED);
          if (claim.outcome === 'locked') throw APIError.from('FORBIDDEN', LOCKED);
          const password = await peppered(ctx, code);
          if (claim.outcome !== 'try' || !device) {
            decoy ??= ctx.context.password.hash('decoy');
            await ctx.context.password.verify({ hash: await decoy, password });
            throw APIError.from('UNAUTHORIZED', INVALID_CODE);
          }
          if (!(await ctx.context.password.verify({ hash: claim.hash, password }))) {
            // The try that reaches a ceiling says so: the student is not left typing to a closed door.
            if (claim.codeFailures >= CODE_TRIES) throw APIError.from('FORBIDDEN', LOCKED);
            if (claim.deviceFailures >= DEVICE_TRIES) throw APIError.from('FORBIDDEN', BLOCKED);
            throw APIError.from('UNAUTHORIZED', INVALID_CODE);
          }
          await devices.succeeded(device.id, studentId);
          return openSession(ctx, studentId, device.id, device.shared);
        },
      ),

      /**
       * The guardian adds children of their household to this device, a family computer: shared
       * from now, their own session short on it, and a child without a code chooses one here.
       */
      addStudentProfiles: createAuthEndpoint(
        '/student/add-profiles',
        { method: 'POST', body: z.object({ studentIds: z.array(z.string().max(64)).min(1).max(10) }), use: [freshSessionMiddleware] },
        async (ctx) => {
          const { session } = ctx.context.session;
          for (const studentId of ctx.body.studentIds) {
            if (!(await students.inHousehold(session.userId, studentId)))
              throw APIError.from('NOT_FOUND', { code: 'NOT_FOUND', message: 'Not found' });
          }
          const device = await ensureDevice(ctx);
          const windowUntil = new Date(Date.now() + ACTIVATION_MINUTES * MINUTE);
          for (const studentId of ctx.body.studentIds)
            await devices.addProfile(device.id, studentId, { windowUntil, shared: true, keep: session.token });
          const deadline = sharedDeadline(new Date(), new Date());
          await devices.attachSession(session.token, device.id, deadline);
          await setSessionCookie(ctx, { session: { ...session, expiresAt: deadline }, user: ctx.context.session.user }, true);
          return ctx.json({ shared: true });
        },
      ),
    },
    hooks: {
      after: [
        {
          // A guardian entering on a recognised device: the session is the device's, short on a shared one.
          matcher: (ctx) => ctx.path === '/sign-in/email-otp' || ctx.path === '/passkey/verify-authentication',
          handler: createAuthMiddleware(async (ctx) => {
            const created = ctx.context.newSession;
            const device = created ? await requestDevice(ctx) : undefined;
            if (!created || !device) return;
            if (!device.shared) {
              await devices.attachSession(created.session.token, device.id, undefined);
              return;
            }
            const deadline = sharedDeadline(new Date(), new Date());
            await devices.attachSession(created.session.token, device.id, deadline);
            // After the sign-in's own cookie, of 90 days: the browser keeps the last one.
            await setSessionCookie(ctx, { session: { ...created.session, expiresAt: deadline }, user: created.user }, true);
          }),
        },
        {
          // A session on a shared device in use: ten more minutes, never past two hours from its opening.
          matcher: (ctx) => ctx.path === '/get-session',
          handler: createAuthMiddleware(async (ctx) => {
            const returned: unknown = ctx.context.returned;
            const read = z
              .object({
                session: z.object({ token: z.string(), deviceId: z.string().nullish(), createdAt: z.coerce.date(), expiresAt: z.coerce.date() }),
              })
              .safeParse(returned);
            const deviceId = read.success ? read.data.session.deviceId : undefined;
            if (!read.success || !deviceId || !(await devices.findDevice(deviceId))?.shared) return;
            const { token, createdAt, expiresAt } = read.data.session;
            const deadline = sharedDeadline(createdAt, new Date());
            if (Math.abs(deadline.getTime() - expiresAt.getTime()) < MINUTE) return;
            await ctx.context.internalAdapter.updateSession(token, { expiresAt: deadline });
          }),
        },
      ],
    },
    // Keyed by the client's address, which better-auth reads behind the host's proxy once its
    // trusted hops are set (docs/architecture.md, « Hébergement », TRUSTED_PROXY_HOPS).
    rateLimit: [
      {
        pathMatcher: (path: string) => ['/student/activate', '/student/choose-code', '/student/sign-in', '/student/add-profiles'].includes(path),
        window: 60,
        max: 5,
      },
    ],
  } satisfies BetterAuthPlugin;
}
