/**
 * The suite's own database, this checkout's, recreated each run, on the Postgres of
 * docker-compose.yml, locally as in CI. A test sets in it what no screen gives: an invitation,
 * which the server's own command makes.
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkout } from '@repo/playwright/checkout';

export const DATABASE_URL = `postgresql://tomai_dev:tomai_dev_password@localhost:5432/${checkout.database}`;

/** Invites the address, as an operator does, by the built server's command. */
export function invite(email: string) {
  execFileSync('bun', ['--no-env-file', 'dist/invite.js', email], {
    cwd: resolve(import.meta.dirname, '../../apps/server'),
    env: { ...process.env, DATABASE_URL },
    stdio: 'pipe',
  });
}
