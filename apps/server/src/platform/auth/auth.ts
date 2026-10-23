/**
 * better-auth, on the one public origin of the API and the web: the session cookie stays on that
 * host. No cookieCache: a cached session would outlive a deleted account for its whole maxAge. A
 * student enters by a code of their own, on a device a guardian's code recognised (./student-sign-in.ts). A
 * guardian has no password either: an email to their address lets them in, by its button or its
 * code, and the first one creates their account, on an invitation (./invitation.ts), whose own
 * email has a button; a passkey then saves them the email. Deleting the account, or adding a
 * passkey, asks for a session opened a few minutes before.
 */

import type { GenericEndpointContext } from '@better-auth/core';
import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP, magicLink } from 'better-auth/plugins';
import type { Logger } from 'pino';
import type { Config } from '../../config';
import { firstNameSchema } from '../../domain/first-name';
import type { Db } from '../db/client';
import type { Mailer } from '../email/mailer';
import { CLIENT_ADDRESS_HEADER } from '../http/client-address';
import { INVITATION_DAYS, invitationEmail, invitationIdentifier, spendInvitationLinks, type InvitationLetter } from './invitation';
import { account, passkey as passkeyTable, session, user, verification } from './schema';
import { createStudentDevices } from './student-devices';
import { ACTIVATION_PREFIX, EMAIL_SIGN_INS, isStudentEmail, studentSignIn, type StudentAccess } from './student-sign-in';

interface AuthDeps {
  mailer: Mailer;
  logger: Logger;
  /** Runs a task after its request has answered: an email's timing tells nothing. */
  background: (task: Promise<unknown>) => void;
  /**
   * Deletes the user and what goes with them, in one transaction, before better-auth's own
   * deletion, which then finds nothing left: better-auth runs its steps outside a transaction.
   */
  deleteUser: (userId: string) => Promise<void>;
  /** The household's answers to the student sign-in: whose a student is, and their month of birth. */
  students: StudentAccess;
  /** An adult in by an email, its button or its code: counted, for the passkey's offer. */
  emailEntered: (userId: string) => Promise<void>;
}

/** The sign-in code's life, in the email and on the screen. */
const CODE_MINUTES = 15;

/** An adult's first name, trimmed, as the rule of a child's takes it (domain/first-name.ts); refused otherwise. */
const firstName = (name: string) => {
  const parsed = firstNameSchema.safeParse(name);
  if (!parsed.success) throw APIError.from('BAD_REQUEST', { code: 'INVALID_NAME', message: 'A first name holds on one line, 50 characters at most' });
  return parsed.data;
};

/** Victor's invitation, in general words: no one invites for a named child. */
const BETA_LETTER: InvitationLetter = {
  subject: 'Votre invitation à Catiche',
  intro: 'Voici votre invitation à suivre les devoirs du soir de votre enfant sur Catiche.',
};

/** The letter an invitation passed to its link, which only the server makes; Victor's otherwise. */
const invitationLetter = (metadata: Record<string, unknown> | undefined): InvitationLetter =>
  typeof metadata?.['subject'] === 'string' && typeof metadata['intro'] === 'string'
    ? { subject: metadata['subject'], intro: metadata['intro'] }
    : BETA_LETTER;

export function createAuth(
  db: Db,
  config: Pick<Config, 'publicUrl' | 'authSecret'>,
  { mailer, logger, background, deleteUser, students, emailEntered }: AuthDeps,
) {
  // A student's address is never sent to, and answered as an unknown address would be, without telling.
  const send: Mailer = async (email) => {
    if (isStudentEmail(email.to)) return;
    await mailer(email);
  };
  const { hostname: rpID, origin, host } = new URL(config.publicUrl);

  // Closed beta: an address without an account needs a live invitation, whatever creates the user.
  const invited = async ({ context }: GenericEndpointContext, email: string) => {
    const invitation = await context.internalAdapter.findVerificationValue(invitationIdentifier(email));
    return invitation !== null && invitation.expiresAt > new Date();
  };

  return betterAuth({
    baseURL: config.publicUrl,
    secret: config.authSecret,
    // Transactions on: better-auth's own multi-step writes (and an activation code spent) are atomic.
    database: drizzleAdapter(db, { provider: 'pg', schema: { user, session, account, verification, passkey: passkeyTable }, transaction: true }),
    // better-auth's own messages, a failed email among them, go to pino; only an error's own
    // fields, through pino's serializer, never the other arguments, which can hold a user.
    logger: {
      log: (level, message, ...args) => {
        logger[level]({ err: args.find((arg) => arg instanceof Error) }, message);
      },
    },
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: async ({ id }) => {
          await deleteUser(id);
        },
        afterDelete: ({ email }) => {
          const notice = send({
            to: email,
            subject: 'Votre compte Catiche est supprimé',
            text: `Bonjour,\n\nVotre compte Catiche est supprimé, et avec lui votre foyer et les comptes de vos enfants si vous en étiez le seul parent.\n\nSi vous n'avez rien demandé, écrivez-nous en répondant à ce message.`,
          });
          background(
            notice.catch((error: unknown) => {
              logger.error({ err: error }, 'Deletion notice not sent');
            }),
          );
          return Promise.resolve();
        },
      },
    },
    // A session lives ninety days without use, renewed as it is used: a summer without opening the
    // tablet leaves the child's device paired. Deleting the account, or adding a passkey, needs a
    // session at most ten minutes old.
    session: { expiresIn: 90 * 24 * 60 * 60, freshAge: 10 * 60 },
    databaseHooks: {
      user: {
        create: {
          // Every path that creates a guardian; a student is inserted by the household module.
          before: async (created, ctx) => {
            if (!ctx || !(await invited(ctx, created.email))) {
              throw APIError.from('FORBIDDEN', { code: 'INVITATION_REQUIRED', message: 'Sign-up is by invitation only' });
            }
            // Nameless until the first screen asks it; named, as a child's first name is.
            return created.name === '' ? undefined : { data: { ...created, name: firstName(created.name) } };
          },
          // Spent once the account exists, after the transaction commits (better-auth's db/with-hooks.mjs),
          // with every link the invitation sent: the account entered by a code, they open nothing more.
          after: async ({ email }, ctx) => {
            await ctx?.context.internalAdapter.deleteVerificationByIdentifier(invitationIdentifier(email));
            await spendInvitationLinks(db, email);
          },
        },
        // `update-user`, the adult's own first name: the rule of a child's.
        update: {
          before: (changed) => Promise.resolve(changed.name === undefined ? undefined : { data: { ...changed, name: firstName(changed.name) } }),
        },
      },
    },
    hooks: {
      // Each entry by an email, once its session is open; an entry refused opens none. The count
      // only times the passkey's offer: its failure is reported, never the sign-in's.
      after: createAuthMiddleware(async (ctx) => {
        const entered = ctx.context.newSession;
        if (!entered || !EMAIL_SIGN_INS.includes(ctx.path)) return;
        await emailEntered(entered.user.id).catch((error: unknown) => {
          logger.error({ err: error }, 'Email entry not counted');
        });
      }),
    },
    // A page of the web: better-auth's own error page has an inline style the CSP blocks.
    onAPIError: { errorURL: `${config.publicUrl}/erreur-connexion` },
    // better-auth 1.7 skips its origin check when NODE_ENV is test (context/create-context.mjs):
    // on in every environment, the tests exercise the check production runs.
    // The client's address, as the server reads it behind the host's proxy (app.ts).
    advanced: { disableOriginCheck: false, backgroundTasks: { handler: background }, ipAddress: { ipAddressHeaders: [CLIENT_ADDRESS_HEADER] } },
    // An activation code is a credential: stored hashed, like a password, never in clear.
    verification: { storeIdentifier: { default: 'plain', overrides: { [ACTIVATION_PREFIX]: 'hashed' } } },
    // The code's own routes for what Tom does not use: no password to reset, no other check. And
    // the magic link's own request: only the invitation makes one, by a call of the server's.
    disabledPaths: [
      '/sign-in/magic-link',
      '/email-otp/check-verification-otp',
      '/email-otp/verify-email',
      '/email-otp/request-password-reset',
      '/forget-password/email-otp',
      '/email-otp/reset-password',
    ],
    plugins: [
      studentSignIn({ devices: createStudentDevices(db), students }),
      // Bound to the public origin, never to the one a request claims; a discoverable credential,
      // which the browser offers in the address field. Its name in Tom is the browser that made it,
      // as a session's: a name the client sends would also replace, in the browser's own list, the
      // guardian's address the passkey is filed under.
      passkey({
        rpID,
        rpName: 'Catiche',
        origin,
        authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
        registration: { afterVerification: ({ ctx }) => ({ name: ctx.headers?.get('user-agent') ?? 'Clé d’accès' }) },
      }),
      // The invitation's button: a link of 30 days, single use, its token stored hashed. A new
      // account goes to its first screen; a link spent or stale, to the page that says so. The
      // email leads to the web's /invitation, better-auth's link after the `#`: a mail filter that
      // opens every link spends nothing, only the page's own button goes on to better-auth's.
      magicLink({
        expiresIn: INVITATION_DAYS * 24 * 60 * 60,
        storeToken: 'hashed',
        // A parent's invitation of another adult says who invites, for which child (./invitation.ts).
        sendMagicLink: async ({ email, url, metadata }) => {
          const link = `${origin}/invitation#${new URL(url).searchParams.toString()}`;
          await send(
            invitationEmail(
              email,
              invitationLetter(metadata),
              `Accepter l’invitation : ${link}\n\nSur un autre appareil ? Ouvrez ${host} et donnez cette adresse.`,
            ),
          );
        },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: CODE_MINUTES * 60,
        allowedAttempts: 3,
        storeOTP: 'hashed',
        // In the background (advanced.backgroundTasks): the answer is the same, and as fast, for any
        // address. One without an account or a live invitation is told of the closed beta instead.
        // The button opens the web's /entrer with the address and the code after the `#`, which
        // the browser never sends: the page types the code, then wipes it from the address bar.
        sendVerificationOTP: async ({ email, otp, type }, ctx) => {
          if (type !== 'sign-in' || !ctx) return;
          const known = (await ctx.context.internalAdapter.findUserByEmail(email)) !== null;
          if (known || (await invited(ctx, email))) {
            const link = `${origin}/entrer#${new URLSearchParams({ email, code: otp }).toString()}`;
            await send({
              to: email,
              subject: 'Votre lien pour entrer dans Catiche',
              text: `Bonjour,\n\nEntrer dans Catiche : ${link}\n\nOu tapez ce code : ${otp}\n\nIl marche ${String(CODE_MINUTES)} minutes. Si vous n’avez rien demandé, ignorez ce message : personne n’entre sans lui.`,
            });
            return;
          }
          await send({
            to: email,
            subject: 'Catiche est en bêta fermée',
            text: `Bonjour,\n\nQuelqu'un, sans doute vous, a demandé à entrer dans Catiche avec cette adresse. Catiche est en bêta fermée : un compte ne se crée que sur invitation, et cette adresse n'en a pas, ou elle a expiré.\n\nSi vous attendiez une invitation, demandez-la à la personne qui vous a parlé de Catiche. Sinon, ignorez ce message.`,
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
