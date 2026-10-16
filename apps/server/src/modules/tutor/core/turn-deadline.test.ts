import { describe, expect, it } from 'bun:test';
import { turnDeadlineMs } from './turn-deadline';

describe('turnDeadlineMs', () => {
  it("adds up the deadlines of a turn's calls in their order, each capped by the client's", () => {
    // The photo (30), the analysis beside the moderation (20), the sheet (20), the diagnosis (8),
    // then two writes (30 each) and their checks (5 each).
    expect(turnDeadlineMs(30_000)).toBe(148_000);
    // A shorter client's deadline caps the calls that have a longer one of their own.
    expect(turnDeadlineMs(10_000)).toBe(10_000 + 10_000 + 10_000 + 8_000 + 2 * (10_000 + 5_000));
  });
});
