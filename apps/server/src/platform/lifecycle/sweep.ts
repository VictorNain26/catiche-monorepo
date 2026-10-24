/**
 * The work that runs on its own, in the process: every hour, and once at the start, each step is
 * called with the clock's date. The steps are the modules' own (main.ts wires them), the sweep
 * only calls them. Several instances may run: a pass takes a Postgres advisory lock first
 * (https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS), held by its
 * transaction, and an instance that finds it taken skips its pass. The shutdown waits for the
 * pass under way, as it does for the background tasks.
 */

import { sql } from 'drizzle-orm';
import type { Logger } from 'pino';
import type { Db } from '../db/client';

/** A step of the sweep: its failure is logged, and the next steps still run. */
type SweepStep = (now: Date) => Promise<void>;

interface SweepDeps {
  db: Db;
  logger: Logger;
  /** Called in this order, each by its name in the logs. */
  steps: Record<string, SweepStep>;
  clock?: () => Date;
  everyMs?: number;
}

const HOUR_MS = 60 * 60_000;

export function createSweep({ db, logger, steps, clock = () => new Date(), everyMs = HOUR_MS }: SweepDeps) {
  let timer: Timer | undefined;
  let running: Promise<boolean> | null = null;

  /** One pass, under the lock; `false` when another instance holds it. */
  const pass = () =>
    db.transaction(async (tx) => {
      const [lock] = await tx.execute<{ locked: boolean }>(sql`SELECT pg_try_advisory_xact_lock(hashtext('catiche_sweep')) AS locked`);
      if (!lock?.locked) return false;
      const now = clock();
      for (const [name, step] of Object.entries(steps)) {
        await step(now).catch((error: unknown) => {
          logger.error({ err: error, step: name }, 'Sweep step failed');
        });
      }
      return true;
    });

  /** A pass, unless one is under way: the next tick finds it done. */
  const tick = () => {
    if (running) return;
    running = pass()
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Sweep failed');
        return false;
      })
      .finally(() => {
        running = null;
      });
  };

  return {
    pass,
    start: () => {
      tick();
      timer = setInterval(tick, everyMs);
    },
    /** No pass starts any more; resolves once the one under way is done. */
    stop: async () => {
      clearInterval(timer);
      await running;
    },
  };
}
