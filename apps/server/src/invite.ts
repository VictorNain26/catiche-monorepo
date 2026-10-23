/**
 * `bun run invite <email>` (`bun dist/invite.js <email>` in the image): lets that address create a
 * guardian's account, for 30 days, and sends it the invitation's email, whose button lets it in
 * (platform/auth/invitation.ts). The server's configuration: its mailer, its origin and its secret.
 */

import { z } from 'zod';
import { loadConfig } from './config';
import { householdAuth } from './modules/household';
import { createAuth } from './platform/auth/auth';
import { AccountExists, invite } from './platform/auth/invitation';
import { createDb } from './platform/db/client';
import { logMailer, scalewayMailer } from './platform/email/mailer';
import { createBackgroundTasks } from './platform/lifecycle/background';
import { createLogger } from './platform/observability/logger';

const email = z.email().safeParse(Bun.argv[2]);
if (!email.success) {
  console.error('Usage : bun run invite <adresse e-mail>');
  process.exit(1);
}

const config = loadConfig(Bun.env);
const logger = createLogger(config.logLevel);
const { db, close } = createDb(config.databaseUrl, { production: config.production, ca: config.databaseCa, max: 1 });
const tasks = createBackgroundTasks();
// Without the Scaleway settings, outside production, the email is logged, its link with it.
const auth = createAuth(db, config, {
  mailer: config.mail ? scalewayMailer(config.mail) : logMailer(logger),
  logger,
  background: tasks.run,
  ...householdAuth(db),
});
try {
  const { expiresAt } = await invite({ db, auth }, email.data);
  console.log(`Invitation de ${email.data} envoyée, valable jusqu'au ${expiresAt.toISOString()}`);
} catch (error) {
  if (!(error instanceof AccountExists)) throw error;
  console.error(`${email.data} a déjà un compte : elle entre par un e-mail d'entrée.`);
  process.exitCode = 1;
} finally {
  await tasks.settled();
  await close();
}
