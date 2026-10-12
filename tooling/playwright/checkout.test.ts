import { describe, expect, test } from 'bun:test';
import { checkoutOf } from './checkout';

const main = checkoutOf('/home/victor/tomai-monorepo');
const worktree = checkoutOf('/home/victor/tomai-monorepo/.claude/worktrees/agent-1');

describe('checkoutOf', () => {
  test('gives a checkout the same database, log, container and ports on every run', () => {
    expect(checkoutOf('/home/victor/tomai-monorepo')).toEqual(main);
  });

  test('gives two checkouts their own database, server log and landing container', () => {
    expect(worktree.database).not.toBe(main.database);
    expect(worktree.serverLog).not.toBe(main.serverLog);
    expect(worktree.landingContainer).not.toBe(main.landingContainer);
  });

  test('never takes the database every checkout used to share', () => {
    for (const root of ['/', '/repo', '/home/runner/work/tomai-monorepo/tomai-monorepo', main.id]) {
      expect(checkoutOf(root).database).not.toBe('tom_e2e');
    }
  });

  test('names a database reset-database.ts accepts', () => {
    expect(main.database).toMatch(/^[a-z_][a-z0-9_]*$/);
  });

  test('puts its ports past the dev servers and below the ephemeral range, the landing next to the web', () => {
    for (let index = 0; index < 500; index++) {
      const { webPort, landingPort } = checkoutOf(`/checkout/${String(index)}`);
      expect(webPort).toBeGreaterThanOrEqual(21_000);
      expect(landingPort).toBe(webPort + 1);
      expect(landingPort).toBeLessThan(32_768);
    }
  });
});
