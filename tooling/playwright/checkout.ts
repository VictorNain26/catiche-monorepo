/**
 * What keeps the e2e suites of two checkouts of the repository (worktrees) apart on one machine:
 * a database, a server log, a landing container and ports of their own, derived from the
 * checkout's path, the same on every run. Two checkouts that shared them reset each other's
 * database mid-run.
 */

import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// Ports from 21000 to 30991: past the dev servers (3000s, 3030, 5173, 5432), below Linux's
// ephemeral range (32768 and up), where an outgoing connection could hold one.
const FIRST_PORT = 21_000;
const SLOTS = 1_000;

export function checkoutOf(root: string) {
  const digest = createHash('sha256').update(root).digest();
  const id = digest.toString('hex').slice(0, 8);
  const webPort = FIRST_PORT + (digest.readUInt32BE(0) % SLOTS) * 10;
  return {
    id,
    webPort,
    landingPort: webPort + 1,
    database: `tom_e2e_${id}`,
    serverLog: join(tmpdir(), `tom-e2e-${id}-server.log`),
    landingContainer: `landing-e2e-${id}`,
  };
}

/** This checkout's: the repository root is two levels up. */
export const checkout = checkoutOf(resolve(import.meta.dirname, '../..'));
