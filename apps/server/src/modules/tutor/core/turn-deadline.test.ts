import { describe, expect, it } from 'bun:test';
import { turnDeadlineMs } from './turn-deadline';

describe('turnDeadlineMs', () => {
  it("adds up the database's share, the two moderations and each step of the loop at the client's deadline", () => {
    // 30 s for the database, 5 s for each moderation, 4 steps of 30 s: 160 s.
    expect(turnDeadlineMs(30_000)).toBe(160_000);
    // The fake Mistral's 2 s: 48 s.
    expect(turnDeadlineMs(2_000)).toBe(48_000);
  });
});
