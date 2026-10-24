import { describe, expect, it } from 'bun:test';
import pino from 'pino';
import { testDatabase } from '../../testing/database';
import { createSweep } from './sweep';

const { db } = await testDatabase();
const logger = pino({ level: 'silent' });

describe('the background sweep', () => {
  it('runs each step with the clock’s date, and goes on past a step that fails', async () => {
    const now = new Date('2026-10-31T09:00:00Z');
    const ran: string[] = [];
    const sweep = createSweep({
      db,
      logger,
      clock: () => now,
      steps: {
        first: (at) => {
          ran.push(`first ${at.toISOString()}`);
          return Promise.reject(new Error('boom'));
        },
        second: (at) => {
          ran.push(`second ${at.toISOString()}`);
          return Promise.resolve();
        },
      },
    });
    expect(await sweep.pass()).toBe(true);
    expect(ran).toEqual([`first ${now.toISOString()}`, `second ${now.toISOString()}`]);
  });

  it('is made by one instance at a time: the lock lets one of two passes run', async () => {
    const release = Promise.withResolvers<undefined>();
    const started = Promise.withResolvers<undefined>();
    let runs = 0;
    const step = async () => {
      runs += 1;
      started.resolve(undefined);
      await release.promise;
    };
    // Two instances, each with its own sweep, on the same database.
    const [one, two] = [0, 1].map(() => createSweep({ db, logger, steps: { step } }));
    const first = one?.pass();
    await started.promise;
    expect(await two?.pass()).toBe(false);
    release.resolve(undefined);
    expect(await first).toBe(true);
    expect(runs).toBe(1);
    // Released, the next pass takes the lock.
    expect(await two?.pass()).toBe(true);
  });

  it('passes once at its start, and its stop waits for the pass under way', async () => {
    const release = Promise.withResolvers<undefined>();
    const started = Promise.withResolvers<undefined>();
    let done = false;
    const sweep = createSweep({
      db,
      logger,
      everyMs: 60 * 60_000,
      steps: {
        step: async () => {
          started.resolve(undefined);
          await release.promise;
          done = true;
        },
      },
    });
    sweep.start();
    await started.promise;
    const stopped = sweep.stop().then(() => done);
    release.resolve(undefined);
    expect(await stopped).toBe(true);
  });
});
