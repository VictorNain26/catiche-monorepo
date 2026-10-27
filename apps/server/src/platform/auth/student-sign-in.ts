/**
 * The student's way in: a short code of their own, that only opens their profile on a device a
 * guardian's code recognised first. NIST calls it an activation secret (SP 800-63B-4, § 3.2.10),
 * the CNIL an unlocking code (deliberation 2022-100, § 45-47): six digits, a blocklist
 * (`domain/student-code.ts`), 3 tries on a device, 10 everywhere, then a guardian's code.
 *
 * - The guardian asks for an activation code (8 characters, single use, hashed; 24 hours for a new
 *   device, 10 minutes after a code forgotten): the
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
import { deleteSessionCookie, expireCookie, setSessionCookie } from 'better-auth/cookies';
import { createHash } from 'node:crypto';
import { makeSignature } from 'better-auth/crypto';
import { z } from 'zod';
import { ACTIVATION_ALPHABET, ACTIVATION_CODE_LENGTH } from '../../domain/activation-code';
import { studentCodeRefusal } from '../../domain/student-code';
import { failureBudget, type FailureBudget } from '../http/rate-limit';
import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client';
import { user, verification } from './schema';
import { CODE_TRIES, DEVICE_TRIES, type StudentDevices } from './student-devices';

export const ACTIVATION_PREFIX = 'student-activation:';

/** The routes by which an email lets an adult in: its code (or its button, which types it), and the invitation's button. */
export const EMAIL_SIGN_INS: readonly string[] = ['/sign-in/email-otp', '/magic-link/verify'];
/** Every route that opens an adult's session: by an email, or by a passkey. */
export const ADULT_SIGN_INS: readonly string[] = [...EMAIL_SIGN_INS, '/passkey/verify-authentication'];
const MINUTE = 60_000;
/** The window to choose a code, once a guardian's code has served. */
const WINDOW_MINUTES = 10;
// Eight characters of Crockford's base32 (`domain/activation-code.ts`), 40 bits, single use behind
// a rate limit, one alive at a time: within the day the CNIL allows a temporary secret
// (deliberation 2022-100, § 35).
/**
 * The starting codes refused in an hour, every address together, past which none is tried. The
 * rate limit by address does not bound a guesser with many addresses; this does: 300 an hour is
 * 7 200 guesses over the 24 hours of a device code, against 2^40 ≈ 1.1 × 10^12 codes, a chance of
 * 7 200 / 2^40 ≈ 6.5 × 10^-9 for one code alive, 6.5 × 10^-5 with 10 000 alive at once. In memory,
 * by instance, as the other budgets.
 */
const ACTIVATION_FAILURES_PER_HOUR = 300;
export const activationFailureBudget = () => failureBudget({ points: ACTIVATION_FAILURES_PER_HOUR, durationSeconds: 60 * 60 });

/** A code for a new device lasts a day; one for a code forgotten, ten minutes. */
const ACTIVATION_LIFETIMES: Record<ActivationReason, number> = { device: 24 * 60 * MINUTE, forgotten: 10 * MINUTE };

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
const NOT_FOUND = { code: 'NOT_FOUND', message: 'Not found' };

const ACTIVATION_REASONS = ['device', 'forgotten'] as const;
export type ActivationReason = (typeof ACTIVATION_REASONS)[number];

/** Uppercase, without spaces or dashes, and Crockford's decoding of the letters read as digits. */
export const normaliseActivationCode = (code: string) => code.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');

function generateActivationCode(): string {
  // 256 is a multiple of 32: every character is equally likely.
  const bytes = crypto.getRandomValues(new Uint8Array(ACTIVATION_CODE_LENGTH));
  return Array.from(bytes, (byte) => ACTIVATION_ALPHABET[byte % ACTIVATION_ALPHABET.length]).join('');
}

/** A student's address is the RFC 6761 `.invalid` one better-auth makes for an account without email. */
export const isStudentEmail = (email: string) => email.endsWith('.invalid');

/**
 * A code that recognises the device that sends it for `userId`: a new device, within a day, so
 * that it can be prepared ahead; or a code forgotten, within ten minutes. It replaces the code given
 * before for the student, whatever its reason: one alive at a time bounds what can be guessed, and a
 * device code shared earlier cannot choose the code a forgotten one clears. The student's row,
 * locked, puts two codes asked at the same moment one after the other. `db` may be a transaction of
 * the caller's, which keeps its own line of the code in it: the household's history.
 */
export async function createActivationCode(db: Pick<Db, 'transaction'>, userId: string, reason: ActivationReason) {
  const code = generateActivationCode();
  const expiresAt = new Date(Date.now() + ACTIVATION_LIFETIMES[reason]);
  // The identifier is hashed, the value is not: it names the student and the reason.
  const replaced = ACTIVATION_REASONS.map((each) => JSON.stringify({ userId, reason: each }));
  await db.transaction(async (tx) => {
    await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update');
    await tx.delete(verification).where(inArray(verification.value, replaced));
    await tx.insert(verification).values({
      id: generateId(32),
      identifier: hashActivationIdentifier(`${ACTIVATION_PREFIX}${code}`),
      value: JSON.stringify({ userId, reason }),
      expiresAt,
    });
  });
  return { code, expiresAt };
}

/**
 * A starting code's identifier as it is stored, and as better-auth looks it up (`storeIdentifier`
 * in auth.ts): a SHA-256, so that the table holds no code in clear.
 */
export const hashActivationIdentifier = (identifier: string) => createHash('sha256').update(identifier).digest('base64url');

/** The window's token as the profile keeps it: a SHA-256, the token itself being 190 random bits. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

const activation = z.object({ userId: z.string(), reason: z.enum(ACTIVATION_REASONS) });

/** When a session on a shared device closes: ten minutes from now, never past two hours from its opening. */
const sharedDeadline = (openedAt: Date, now: Date) =>
  new Date(Math.min(openedAt.getTime() + SHARED_MINUTES * MINUTE, now.getTime() + IDLE_MINUTES * MINUTE));

/**
 * What the plugin asks of the household: whether an adult is a parent of a student, who alone adds
 * their devices, the student's month of birth, whether the student may still enter, which a
 * deletion fallen due ends before the sweep takes them, and the first names of their parents, the
 * earliest first, whom a profile names to ask (never a relative).
 */
export interface StudentAccess {
  manages: (adultId: string, studentId: string) => Promise<boolean>;
  birthMonth: (studentId: string) => Promise<string | null>;
  active: (studentId: string) => Promise<boolean>;
  parents: (studentId: string) => Promise<string[]>;
}

const studentCodeSchema = z.string().max(16);

export function studentSignIn({
  devices,
  students,
  failedActivations,
}: {
  devices: StudentDevices;
  students: StudentAccess;
  /** The starting codes refused, every address together (`activationFailureBudget`). */
  failedActivations: FailureBudget;
}) {
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
   * A window to choose a code, for the page that opened it alone: the token goes to that page, its
   * hash to the profile. A brother or sister who touches the name on the list has it not.
   */
  const openWindow = async (deviceId: string, studentId: string, options: { shared: boolean; keep?: string | undefined }) => {
    const chooseToken = generateId(32);
    const windowUntil = new Date(Date.now() + WINDOW_MINUTES * MINUTE);
    await devices.addProfile(deviceId, studentId, { windowUntil, chooseTokenHash: hashToken(chooseToken), ...options });
    return chooseToken;
  };

  /**
   * Opens the student's session on the device, in place of the one the request carried, whoever's:
   * a device given to a child keeps no guardian session. Short on a shared device.
   */
  const openSession = async (ctx: GenericEndpointContext, studentId: string, deviceId: string, shared: boolean) => {
    const { internalAdapter } = ctx.context;
    const carried = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
    const user = await internalAdapter.findUserById(studentId);
    if (!user || !(await students.active(studentId))) throw APIError.from('UNAUTHORIZED', INVALID_CODE);
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
          if (await failedActivations.spent()) {
            throw APIError.from('TOO_MANY_REQUESTS', { code: 'TOO_MANY_ACTIVATIONS', message: 'Too many codes refused, try again later' });
          }
          const spent = await runWithTransaction(ctx.context.adapter, async () => {
            // consumeVerificationValue deletes the code and returns nothing once it has expired.
            const verification = await internalAdapter.consumeVerificationValue(`${ACTIVATION_PREFIX}${normaliseActivationCode(ctx.body.code)}`);
            const parsed = activation.safeParse(verification ? JSON.parse(verification.value) : null);
            return parsed.success ? parsed.data : null;
          });
          if (!spent || !(await internalAdapter.findUserById(spent.userId))) {
            await failedActivations.fail();
            throw APIError.from('BAD_REQUEST', { code: 'INVALID_ACTIVATION_CODE', message: 'Invalid or expired code' });
          }
          if (spent.reason === 'forgotten') await devices.forget(spent.userId);
          // The device goes to the child: a session it carried, a guardian's say, ends with it.
          const carried = await ctx.getSignedCookie(ctx.context.authCookies.sessionToken.name, ctx.context.secret);
          if (carried) {
            await devices.closeSession(carried);
            deleteSessionCookie(ctx);
          }
          const device = await ensureDevice(ctx);
          const chooseToken = await openWindow(device.id, spent.userId, { shared: false });
          return ctx.json({ studentId: spent.userId, chooseToken });
        },
      ),

      /**
       * The profiles of this device, each with what its student meets and the parents to ask;
       * nothing without a device. The parents go only to a device that holds the profile.
       */
      listStudentProfiles: createAuthEndpoint('/student/profiles', { method: 'GET' }, async (ctx) => {
        const device = await requestDevice(ctx);
        if (!device) return ctx.json({ shared: false, profiles: [] });
        const profiles = await devices.listProfiles(device.id);
        const [active, parents] = await Promise.all([
          Promise.all(profiles.map(({ id }) => students.active(id))),
          Promise.all(profiles.map(({ id }) => students.parents(id))),
        ]);
        return ctx.json({
          shared: device.shared,
          profiles: profiles.map((profile, index) => ({ ...profile, parents: parents[index] ?? [] })).filter((_, index) => active[index]),
        });
      }),

      /**
       * The student's code, chosen by the page that holds the window's token, while the window lasts
       * and while they have none: it opens their session. `ownDevice` false makes the device shared.
       * Whether a code is expected is read first: a page without the window learns nothing more.
       */
      chooseStudentCode: createAuthEndpoint(
        '/student/choose-code',
        {
          method: 'POST',
          body: z.object({ studentId: z.string().max(64), code: studentCodeSchema, ownDevice: z.boolean(), chooseToken: z.string().max(64) }),
        },
        async (ctx) => {
          const { studentId, code, ownDevice, chooseToken } = ctx.body;
          const device = await requestDevice(ctx);
          const notExpected = APIError.from('FORBIDDEN', { code: 'CODE_NOT_EXPECTED', message: 'No code is to be chosen here' });
          const chooseTokenHash = hashToken(chooseToken);
          if (!device || !(await devices.mayChoose(device.id, studentId, chooseTokenHash))) throw notExpected;
          const refusal = studentCodeRefusal(code, (await students.birthMonth(studentId)) ?? '');
          if (refusal) throw APIError.from(REFUSALS[refusal].status, REFUSALS[refusal]);
          const hash = await ctx.context.password.hash(await peppered(ctx, code));
          if (!(await devices.chooseCode(device.id, studentId, hash, { chooseTokenHash, shared: !ownDevice }))) throw notExpected;
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
       * « J'ai oublié mon code », on a device that holds the profile: the student's parents are
       * told, once, until one of them gives a « forgotten » code or the student finds theirs again.
       */
      forgotStudentCode: createAuthEndpoint('/student/forgot', { method: 'POST', body: z.object({ studentId: z.string().max(64) }) }, async (ctx) => {
        const device = await requestDevice(ctx);
        const { studentId } = ctx.body;
        if (!device || !(await students.active(studentId)) || !(await devices.forgot(device.id, studentId))) {
          throw APIError.from('NOT_FOUND', NOT_FOUND);
        }
        return ctx.json({ success: true });
      }),

      /**
       * A parent adds their children to this device, a family computer (never a relative): shared
       * from now, their own session short on it, and a child without a code chooses one here.
       */
      addStudentProfiles: createAuthEndpoint(
        '/student/add-profiles',
        { method: 'POST', body: z.object({ studentIds: z.array(z.string().max(64)).min(1).max(10) }), use: [freshSessionMiddleware] },
        async (ctx) => {
          const { session } = ctx.context.session;
          for (const studentId of ctx.body.studentIds) {
            if (!(await students.manages(session.userId, studentId))) throw APIError.from('NOT_FOUND', NOT_FOUND);
          }
          const device = await ensureDevice(ctx);
          const chooseTokens: Record<string, string> = {};
          for (const studentId of ctx.body.studentIds)
            chooseTokens[studentId] = await openWindow(device.id, studentId, { shared: true, keep: session.token });
          const deadline = sharedDeadline(new Date(), new Date());
          await devices.attachSession(session.token, device.id, deadline);
          await setSessionCookie(ctx, { session: { ...session, expiresAt: deadline }, user: ctx.context.session.user }, true);
          return ctx.json({ shared: true, chooseTokens });
        },
      ),
    },
    hooks: {
      after: [
        {
          // A guardian entering on a recognised device: the session is the device's, short on a
          // shared one or on their child's, so that the child who takes it back never finds it open.
          matcher: (ctx) => ctx.path !== undefined && ADULT_SIGN_INS.includes(ctx.path),
          handler: createAuthMiddleware(async (ctx) => {
            const created = ctx.context.newSession;
            const device = created ? await requestDevice(ctx) : undefined;
            if (!created || !device) return;
            if (!(await devices.isShortSession(device.id, created.user.id))) {
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
          // A short session in use: ten more minutes, never past two hours from its opening.
          matcher: (ctx) => ctx.path === '/get-session',
          handler: createAuthMiddleware(async (ctx) => {
            const returned: unknown = ctx.context.returned;
            const read = z
              .object({
                session: z.object({ token: z.string(), deviceId: z.string().nullish(), createdAt: z.coerce.date(), expiresAt: z.coerce.date() }),
                user: z.object({ id: z.string() }),
              })
              .safeParse(returned);
            const deviceId = read.success ? read.data.session.deviceId : undefined;
            if (!read.success || !deviceId || !(await devices.isShortSession(deviceId, read.data.user.id))) return;
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
        pathMatcher: (path: string) =>
          ['/student/activate', '/student/choose-code', '/student/sign-in', '/student/forgot', '/student/add-profiles'].includes(path),
        window: 60,
        max: 5,
      },
    ],
  } satisfies BetterAuthPlugin;
}
