/**
 * /api/household: a signed-in guardian manages the students of their household. Every route
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
import type { AppEnv } from '../../platform/http/env';
import { Problem } from '../../platform/http/problem';
import { jsonBody } from '../../platform/http/validate';
import type { HouseholdService } from './service';

// A student's own routes, and the guardian's ways in: a guardian enters on their child's device,
// which keeps the child's session (multi-session). On the family's phone, a child switches to a
// brother's or sister's session: a device a child uses holds no guardian session to switch to
// (platform/auth/pairing.ts).
const STUDENT_AUTH_PATHS = new Set([
  '/api/auth/device-pairing/redeem',
  '/api/auth/get-session',
  '/api/auth/multi-session/list-device-sessions',
  '/api/auth/multi-session/set-active',
  '/api/auth/sign-out',
  '/api/auth/email-otp/send-verification-otp',
  '/api/auth/sign-in/email-otp',
  '/api/auth/passkey/generate-authenticate-options',
  '/api/auth/passkey/verify-authentication',
]);

const name = z.string().trim().min(1).max(50);

const birthMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'au format AAAA-MM')
  .refine((month) => isStudentBirthMonth(month, new Date()), `un âge de ${String(STUDENT_AGE_YEARS.min)} à ${String(STUDENT_AGE_YEARS.max)} ans`);

const newStudent = z.object({ name, level: schoolLevelSchema, birthMonth, memoryProposed: z.boolean().optional() });
const studentPatch = z
  .object({ name: name.optional(), level: schoolLevelSchema.optional(), memoryProposed: z.boolean().optional() })
  .refine((patch) => patch.name !== undefined || patch.level !== undefined || patch.memoryProposed !== undefined, 'au moins un champ');

/**
 * Before better-auth's handler: a signed-in student is refused every route but STUDENT_AUTH_PATHS.
 * A link opened on their device, a guardian's confirmation link say, goes to the sign-in page,
 * which says whose the device is; the API and the web share one origin.
 */
export function studentAuthGuard({ auth, service }: { auth: Auth; service: HouseholdService }) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!STUDENT_AUTH_PATHS.has(c.req.path)) {
      const session = await auth.api.getSession({ headers: c.req.raw.headers, query: { disableRefresh: true } });
      if (session && (await service.isStudent(session.user.id))) {
        if (c.req.method === 'GET') return c.redirect('/connexion');
        throw new Problem('FORBIDDEN');
      }
    } else if (c.req.path === SWITCH_PATH) {
      await assertSiblingSwitch(auth, service, c.req.raw);
    }
    return next();
  });
}

const SWITCH_PATH = '/api/auth/multi-session/set-active';
const switchBody = z.object({ sessionToken: z.string() });

/**
 * A child switches only to a brother's or sister's profile in 6e or 5e: from the 4e, a child's
 * space opens on no family device (`docs/tuteur.md` § 8), even one that kept it from the 5e. A token
 * the device does not hold is better-auth's to refuse.
 */
async function assertSiblingSwitch(auth: Auth, service: HouseholdService, request: Request) {
  const session = await auth.api.getSession({ headers: request.headers, query: { disableRefresh: true } });
  if (!session || !(await service.isStudent(session.user.id))) return;
  const body = switchBody.safeParse(
    await request
      .clone()
      .json()
      .catch(() => null),
  );
  if (!body.success) return;
  const target = await (await auth.$context).internalAdapter.findSession(body.data.sessionToken);
  if (target && !(await service.isAccompanied(target.user.id))) throw new Problem('FORBIDDEN');
}

/**
 * /api/me: who is signed in, and as what; the web picks its home from it. Their devices too, read
 * here rather than through better-auth's /list-sessions, which wants a session younger than its
 * freshAge: a student's paired device is days old.
 */
export function meRoutes({ auth, service }: { auth: Auth; service: HouseholdService }) {
  return new Hono<SessionEnv>()
    .use(requireSession(auth))
    .get('/', async (c) => c.json(await service.me(c.var.userId, c.var.userName)))
    .get('/devices', async (c) => c.json(await service.listOwnDevices(c.var.userId)));
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
    .post('/students/:id/pairing-code', async (c) => c.json(await service.pairingCode(c.var.userId, c.req.param('id')), 201))
    .get('/students/:id/devices', async (c) => c.json(await service.listDevices(c.var.userId, c.req.param('id'))))
    .delete('/students/:id/devices/:deviceId', async (c) => {
      await service.revokeDevice(c.var.userId, c.req.param('id'), c.req.param('deviceId'));
      return c.body(null, 204);
    })
    .delete('/students/:id', async (c) => {
      await service.deleteStudent(c.var.userId, c.req.param('id'));
      return c.body(null, 204);
    });
}
