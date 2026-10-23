/**
 * /api/household: a signed-in adult manages the students they are linked to. Every route
 * needs a session, and refuses a student. Of better-auth's own routes, a signed-in student reaches
 * only those in STUDENT_AUTH_PATHS: the rest (update-user…) would let them change what their
 * guardian manages.
 */

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { schoolLevelSchema } from '../../domain/levels';
import { isStudentBirthMonth, STUDENT_AGE_YEARS } from '../../domain/student-age';
import type { Auth } from '../../platform/auth/auth';
import { requireSession, type SessionEnv } from '../../platform/auth/session';
import { ADULT_SIGN_INS } from '../../platform/auth/student-sign-in';
import type { AppEnv } from '../../platform/http/env';
import { Problem } from '../../platform/http/problem';
import { jsonBody } from '../../platform/http/validate';
import type { HouseholdService } from './service';

// A student's own routes, and the guardian's ways in: on a device that holds a child's profile, a
// guardian enters too. A brother's or sister's space opens only by their own code
// (`docs/tuteur.md` § 8); adding profiles to a device is the guardian's.
const STUDENT_AUTH_PATHS = new Set([
  '/api/auth/student/activate',
  '/api/auth/student/profiles',
  '/api/auth/student/choose-code',
  '/api/auth/student/sign-in',
  '/api/auth/get-session',
  '/api/auth/sign-out',
  '/api/auth/email-otp/send-verification-otp',
  '/api/auth/passkey/generate-authenticate-options',
  ...ADULT_SIGN_INS.map((path) => `/api/auth${path}`),
]);

const name = z.string().trim().min(1).max(50);

const birthMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'au format AAAA-MM')
  .refine((month) => isStudentBirthMonth(month, new Date()), `un âge de ${String(STUDENT_AGE_YEARS.min)} à ${String(STUDENT_AGE_YEARS.max)} ans`);

// The adult's declarations, timestamped, on which the parental consent rests (CNIL): each one is a
// box they tick, never a value the server assumes.
const declaredGuardian = z.literal(true, 'la déclaration d’autorité parentale');
const newStudent = z.object({ name, level: schoolLevelSchema, birthMonth, memoryProposed: z.boolean().optional(), declaredGuardian });
const guardianDeclaration = z.object({ declaredGuardian });
const adultDeclaration = z.object({ adult: z.literal(true, 'la déclaration de majorité') });
const studentPatch = z
  .object({ name: name.optional(), level: schoolLevelSchema.optional(), memoryProposed: z.boolean().optional() })
  .refine((patch) => patch.name !== undefined || patch.level !== undefined || patch.memoryProposed !== undefined, 'au moins un champ');

// A new device of the child's, or a code they forgot.
const activationRequest = z.object({ reason: z.enum(['device', 'forgotten']) });

/**
 * Before better-auth's handler: a signed-in student is refused every route but STUDENT_AUTH_PATHS.
 * A link opened on their device, a guardian's confirmation link say, goes back to their own space;
 * the API and the web share one origin.
 */
export function studentAuthGuard({ auth, service }: { auth: Auth; service: HouseholdService }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!STUDENT_AUTH_PATHS.has(c.req.path)) {
      const session = await auth.api.getSession({ headers: c.req.raw.headers, query: { disableRefresh: true } });
      if (session && (await service.isStudent(session.user.id))) {
        if (c.req.method === 'GET') return c.redirect('/');
        throw new Problem('FORBIDDEN');
      }
    }
    return next();
  });
}

/**
 * /api/me: who is signed in, and as what; the web picks its home from it. A student's devices
 * too, and when a guardian last replaced their code; an adult's declaration of being 18 or over.
 */
export function meRoutes({ auth, service }: { auth: Auth; service: HouseholdService }) {
  return (
    new Hono<SessionEnv>()
      .use(requireSession(auth))
      .get('/', async (c) => c.json(await service.me({ id: c.var.userId, name: c.var.userName, email: c.var.userEmail, deviceId: c.var.deviceId })))
      .get('/devices', async (c) => c.json(await service.listOwnDevices(c.var.userId)))
      .post('/declarations', jsonBody(adultDeclaration), async (c) => {
        await service.declareAdult(c.var.userId);
        return c.body(null, 204);
      })
      // « Plus tard » on the passkey's offer.
      .post('/passkey-offer', async (c) => {
        await service.assertNotStudent(c.var.userId);
        await service.closePasskeyOffer(c.var.userId);
        return c.body(null, 204);
      })
  );
}

export function householdRoutes({ auth, service }: { auth: Auth; service: HouseholdService }) {
  const guardianOnly = createMiddleware<SessionEnv>(async (c, next) => {
    await service.assertNotStudent(c.var.userId);
    await next();
  });

  return new Hono<SessionEnv>()
    .use(requireSession(auth), guardianOnly)
    .get('/students', async (c) => c.json(await service.listStudents(c.var.userId)))
    .post('/students', jsonBody(newStudent), async (c) => c.json(await service.createStudent(c.var.userId, c.req.valid('json')), 201))
    .patch('/students/:id', jsonBody(studentPatch), async (c) =>
      c.json(await service.updateStudent(c.var.userId, c.req.param('id'), c.req.valid('json'))),
    )
    .post('/students/:id/declaration', jsonBody(guardianDeclaration), async (c) => {
      await service.declareGuardian(c.var.userId, c.req.param('id'));
      return c.body(null, 204);
    })
    .post('/students/:id/activation-code', jsonBody(activationRequest), async (c) =>
      c.json(await service.activationCode(c.var.userId, c.req.param('id'), c.req.valid('json').reason), 201),
    )
    .get('/students/:id/devices', async (c) => c.json(await service.listDevices(c.var.userId, c.req.param('id'))))
    .post('/students/:id/devices/:deviceId/unblock', async (c) => {
      await service.unblockDevice(c.var.userId, c.req.param('id'), c.req.param('deviceId'));
      return c.body(null, 204);
    })
    .delete('/students/:id/devices/:deviceId', async (c) => {
      await service.removeDevice(c.var.userId, c.req.param('id'), c.req.param('deviceId'));
      return c.body(null, 204);
    })
    .delete('/students/:id', async (c) => {
      await service.deleteStudent(c.var.userId, c.req.param('id'));
      return c.body(null, 204);
    });
}
