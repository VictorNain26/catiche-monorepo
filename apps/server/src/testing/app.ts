/**
 * The app of a test, wired as main.ts wires it, on the file's database: the real auth, its emails
 * kept in memory; the real AI client against the fake Mistral; the work after a response tracked,
 * so that a test waits for it. What a test changes, it passes.
 */

import pino from 'pino';
import { createApp, type AppDeps } from '../app';
import { accountDeletion, studentAccess } from '../modules/household';
import { createAuth } from '../platform/auth/auth';
import type { Db } from '../platform/db/client';
import { createBackgroundTasks } from '../platform/lifecycle/background';
import { createLifecycle } from '../platform/lifecycle/shutdown';
import { httpClient, ORIGIN } from './http';
import { memoryMailer } from './mailer';
import { fakeMistral } from './mistral';

/** `origin`: the public origin of the auth and the client; over https, better-auth prefixes its cookies `__Secure-`. */
export function testApp(db: Db, { config = {}, origin = ORIGIN }: { config?: Partial<AppDeps['config']>; origin?: string } = {}) {
  const silent = pino({ level: 'silent' });
  const mistral = fakeMistral();
  const mail = memoryMailer();
  const tasks = createBackgroundTasks();
  const auth = createAuth(
    db,
    { publicUrl: origin, authSecret: 'x'.repeat(32) },
    { mailer: mail.mailer, logger: silent, background: tasks.run, deleteUser: accountDeletion(db), students: studentAccess(db) },
  );
  const app = createApp({
    config: { production: false, webDistDir: undefined, apiRateLimit: 1000, trustedProxyHops: 0, ...config },
    logger: silent,
    db,
    ...mistral.deps(db, silent),
    auth,
    lifecycle: createLifecycle(),
    background: tasks.run,
  });
  return { app, mail, mistral, tasks, api: httpClient(app, mail, db, origin) };
}
