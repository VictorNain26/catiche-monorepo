/**
 * /api/household: a signed-in adult reads the students they are linked to, and a parent manages
 * them; a relative is refused what manages, as an adult without a link would be. Every route
 * needs a session, and refuses a student. Of better-auth's own routes, a signed-in student reaches
 * only those in STUDENT_AUTH_PATHS: the rest (update-user…) would let them change what their
 * guardian manages.
 */

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { validator } from 'hono/validator';
import { z } from 'zod';
import { ADULT_ROLES } from '../../domain/adult-roles';
import { firstNameSchema } from '../../domain/first-name';
import { schoolLevelSchema } from '../../domain/levels';
import { isStudentBirthMonth, STUDENT_AGE_YEARS } from '../../domain/student-age';
import type { Auth } from '../../platform/auth/auth';
import { normalised } from '../../platform/auth/invitation';
import { freshSession, requireSession, type SessionEnv } from '../../platform/auth/session';
import { ADULT_SIGN_INS, isStudentEmail } from '../../platform/auth/student-sign-in';
import type { AppEnv } from '../../platform/http/env';
import { Problem } from '../../platform/http/problem';
import { jsonBody, uuidParam } from '../../platform/http/validate';
import type { HouseholdService } from './service';

// A student's own routes, and the guardian's ways in: on a device that holds a child's profile, a
// guardian enters too. A brother's or sister's space opens only by their own code
// (`docs/tuteur.md` § 8); adding profiles to a device is the guardian's.
const STUDENT_AUTH_PATHS = new Set([
  '/api/auth/student/activate',
  '/api/auth/student/profiles',
  '/api/auth/student/choose-code',
  '/api/auth/student/sign-in',
  '/api/auth/student/forgot',
  '/api/auth/get-session',
  '/api/auth/sign-out',
  '/api/auth/email-otp/send-verification-otp',
  '/api/auth/passkey/generate-authenticate-options',
  ...ADULT_SIGN_INS.map((path) => `/api/auth${path}`),
]);

const name = firstNameSchema;

const birthMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'au format AAAA-MM')
  .refine((month) => isStudentBirthMonth(month, new Date()), `un âge de ${String(STUDENT_AGE_YEARS.min)} à ${String(STUDENT_AGE_YEARS.max)} ans`);

// The adult's declarations, timestamped, on which the parental consent rests (CNIL): each one is a
// box they tick, never a value the server assumes.
const declaredGuardian = z.literal(true, 'la déclaration d’autorité parentale');
// The memory is proposed from the child's page (the patch), never while adding them.
const newStudent = z.object({ name, level: schoolLevelSchema, birthMonth, declaredGuardian });
const guardianDeclaration = z.object({ declaredGuardian });
const adultDeclaration = z.object({ adult: z.literal(true, 'la déclaration de majorité') });
// The moment the news were read (`GET /api/me/news`), which « Vu » says no more than.
const newsSeen = z.object({ readAt: z.iso.datetime({ offset: true }) });
const studentPatch = z
  .object({ name: name.optional(), level: schoolLevelSchema.optional(), memoryProposed: z.boolean().optional() })
  .refine((patch) => patch.name !== undefined || patch.level !== undefined || patch.memoryProposed !== undefined, 'au moins un champ');

// A new device of the child's, or a code they forgot.
const activationRequest = z.object({ reason: z.enum(['device', 'forgotten']) });

// An adult's address, in lowercase as better-auth stores it; never a student's, which receives nothing.
const adultEmail = z
  .string()
  .transform(normalised)
  .pipe(z.email('une adresse e-mail'))
  .refine((email) => !isStudentEmail(email), 'une adresse e-mail');
const adultInvitation = z.object({ email: adultEmail, role: z.enum(ADULT_ROLES) });
// A student's invitation: anything but a UUID names none, which the database would refuse with an error.
const invitationParams = validator('param', (params: Record<string, string>) => {
  const invitationId = z.uuid().safeParse(params['invitationId']);
  if (!invitationId.success) throw new Problem('NOT_FOUND');
  return { id: params['id'] ?? '', invitationId: invitationId.data };
});
// A parent declares holding parental authority as they accept; a relative has nothing to declare.
const invitationAnswer = z.object({ declaredGuardian: z.literal(true).optional() });

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
 * too, when a guardian last replaced their code, and what changed since their last visit; an
 * adult's declaration of being 18 or over.
 */
export function meRoutes({ auth, service }: { auth: Auth; service: HouseholdService }) {
  return (
    new Hono<SessionEnv>()
      .use(requireSession(auth))
      .get('/', async (c) => c.json(await service.me({ id: c.var.userId, name: c.var.userName, email: c.var.userEmail, deviceId: c.var.deviceId })))
      .get('/devices', async (c) => c.json(await service.listOwnDevices(c.var.userId)))
      // « Depuis ta dernière visite », and its « Vu ».
      .get('/news', async (c) => c.json(await service.news(c.var.userId, c.var.deviceId)))
      .post('/news/seen', jsonBody(newsSeen), async (c) => {
        await service.newsSeen(c.var.userId, new Date(c.req.valid('json').readAt));
        return c.body(null, 204);
      })
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
      // An invitation waiting for the adult's address, accepted or declined.
      .post('/invitations/:id/accept', uuidParam('id'), jsonBody(invitationAnswer), async (c) => {
        await service.assertNotStudent(c.var.userId);
        const { declaredGuardian = false } = c.req.valid('json');
        return c.json(await service.acceptInvitation({ id: c.var.userId, email: c.var.userEmail }, c.req.valid('param').id, declaredGuardian));
      })
      .post('/invitations/:id/decline', uuidParam('id'), async (c) => {
        await service.assertNotStudent(c.var.userId);
        await service.declineInvitation(c.var.userEmail, c.req.valid('param').id);
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
    .post('/students/:id/activation-code', freshSession, jsonBody(activationRequest), async (c) =>
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
    .post('/students/:id/invitations', jsonBody(adultInvitation), async (c) => {
      await service.inviteAdult(c.var.userId, c.req.param('id'), c.req.valid('json'));
      return c.body(null, 204);
    })
    .delete('/students/:id/invitations/:invitationId', invitationParams, async (c) => {
      await service.withdrawInvitation(c.var.userId, c.req.param('id'), c.req.valid('param').invitationId);
      return c.body(null, 204);
    })
    .get('/students/:id/history', async (c) => c.json(await service.history(c.var.userId, c.req.param('id'))))
    .get('/students/:id/adults', async (c) => c.json(await service.listAdults(c.var.userId, c.req.param('id'))))
    .delete('/students/:id/adults/:adultId', async (c) => {
      await service.removeAdult(c.var.userId, c.req.param('id'), c.req.param('adultId'));
      return c.body(null, 204);
    })
    .delete('/students/:id', async (c) => {
      // Deleted at once, or asked for 7 days when another parent follows the child.
      const asked = await service.deleteStudent(c.var.userId, c.req.param('id'));
      return asked ? c.json(asked, 202) : c.body(null, 204);
    })
    .post('/students/:id/deletion/cancel', async (c) => {
      await service.cancelDeletion(c.var.userId, c.req.param('id'));
      return c.body(null, 204);
    });
}
