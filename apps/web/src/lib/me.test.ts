import { describe, expect, it } from 'bun:test';
import { isRecentReset } from './me';

describe('isRecentReset', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  it('tells of a code a parent replaced within two weeks', () => {
    expect(isRecentReset('2026-10-20T11:59:00Z', now)).toBe(true);
    expect(isRecentReset('2026-10-07T12:00:00Z', now)).toBe(true);
  });

  it('no longer on the home past two weeks, nor for a code never replaced', () => {
    expect(isRecentReset('2026-10-05T12:00:00Z', now)).toBe(false);
    expect(isRecentReset(null, now)).toBe(false);
  });
});
