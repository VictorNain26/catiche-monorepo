import { describe, expect, it } from 'bun:test';
import { turnDeadlineMs } from './turn-deadline';

describe('turnDeadlineMs', () => {
  it("adds up the deadlines of a turn's calls in their order, and the database's share", () => {
    // 30 s each for the photo and the two writes, 20 s each for the analysis and the sheet, 8 s
    // for the diagnosis, 5 s for each write's moderation, 30 s for the database: 178 s.
    expect(turnDeadlineMs(30_000)).toBe(178_000);
  });

  it("caps each call by the client's deadline, never the moderation, which has its own client", () => {
    // 2 s for the photo, the sheet, the diagnosis and each write; 5 s for the moderation beside the
    // analysis, longer than it now, and for each write's; 30 s for the database: 55 s.
    expect(turnDeadlineMs(2_000)).toBe(55_000);
  });
});
