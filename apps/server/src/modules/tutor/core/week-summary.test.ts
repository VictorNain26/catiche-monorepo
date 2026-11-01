import { describe, expect, it } from 'bun:test';
import { weekStart, weekSummary, type WeekMessage } from './week-summary';

const T0 = Date.parse('2026-10-05T17:00:00Z');
const minutes = (n: number) => n * 60_000;
/** An hour after T0: every session below is of the week. */
const NOW = new Date(T0 + minutes(60));

/** A session's messages, `at` in minutes after T0; the session opened with its first message unless `startedAt` says otherwise. */
const session = (sessionId: string, at: number[], startedAt = at[0] ?? 0): WeekMessage[] =>
  at.map((offset) => ({ sessionId, startedAt: new Date(T0 + minutes(startedAt)), at: new Date(T0 + minutes(offset)) }));

describe('weekStart', () => {
  it('is seven days before now', () => {
    expect(weekStart(new Date('2026-10-12T08:30:00Z'))).toEqual(new Date('2026-10-05T08:30:00Z'));
  });
});

describe('weekSummary, the time', () => {
  it('adds the gaps between messages, a gap past ten minutes counted as a pause', () => {
    const summary = weekSummary(session('a', [0, 3, 8, 30, 32]), NOW);
    expect(summary.minutes).toBe(10);
  });

  it('counts a gap of ten minutes exactly, not a second more', () => {
    const at = (ms: number) => ({ sessionId: 'a', startedAt: new Date(T0), at: new Date(T0 + ms) });
    expect(weekSummary([at(0), at(minutes(10))], NOW).minutes).toBe(10);
    expect(weekSummary([at(0), at(minutes(10) + 1000)], NOW).minutes).toBe(0);
  });

  it('counts the first message from the opening of the session, written while the reply is awaited', () => {
    expect(weekSummary(session('a', [6, 6], 0), NOW).minutes).toBe(5);
  });

  it('counts a session opened long before its first message from that message only', () => {
    expect(weekSummary(session('a', [30, 36], 0), NOW).minutes).toBe(5);
  });

  it('never adds a gap between two sessions', () => {
    const summary = weekSummary([...session('a', [0]), ...session('b', [2])], NOW);
    expect(summary).toMatchObject({ minutes: 0, sessions: 2 });
  });

  it('rounds the total time to the nearest five minutes', () => {
    const summary = weekSummary(
      ['a', 'b', 'c', 'd'].flatMap((id) => session(id, [0, 2])),
      NOW,
    );
    expect(summary.minutes).toBe(10);
  });

  it('says nothing of a week without a session', () => {
    expect(weekSummary([], NOW)).toEqual({ minutes: 0, sessions: 0, days: [], tonight: false });
  });
});

describe('weekSummary, the evenings', () => {
  /** A message written at `iso`, alone in its session. */
  const at = (iso: string): WeekMessage => ({ sessionId: iso, startedAt: new Date(iso), at: new Date(iso) });
  const evenings = (now: string, ...messages: string[]) => {
    const { days, tonight } = weekSummary(messages.map(at), new Date(now));
    return { days, tonight };
  };

  it('puts 23:30 and 0:30 in Paris on their own days, in winter time (UTC+1)', () => {
    // Tuesday 13 January 2026, 23:30 then 0:30 in Paris; read on Thursday evening.
    expect(evenings('2026-01-15T20:00:00Z', '2026-01-13T22:30:00Z', '2026-01-13T23:30:00Z')).toEqual({
      days: ['2026-01-13', '2026-01-14'],
      tonight: false,
    });
  });

  it('puts 23:30 and 0:30 in Paris on their own days, in summer time (UTC+2)', () => {
    expect(evenings('2026-07-16T19:00:00Z', '2026-07-14T21:30:00Z', '2026-07-14T22:30:00Z')).toEqual({
      days: ['2026-07-14', '2026-07-15'],
      tonight: false,
    });
  });

  it('counts a day once, in its order, and says when the student worked tonight', () => {
    expect(evenings('2026-01-15T20:00:00Z', '2026-01-15T17:00:00Z', '2026-01-12T17:00:00Z', '2026-01-15T18:00:00Z')).toEqual({
      days: ['2026-01-12', '2026-01-15'],
      tonight: true,
    });
  });

  it('keeps seven calendar days across the change to summer time: one Monday, not two', () => {
    // Monday 29 March 2027 at 0:30 in Paris, the clocks gone forward the night before; Monday 22 at 20:00.
    expect(evenings('2027-03-28T22:30:00Z', '2027-03-22T19:00:00Z', '2027-03-28T22:10:00Z')).toEqual({ days: ['2027-03-29'], tonight: true });
  });

  it('keeps seven calendar days across the change to winter time: the Monday six days back stays', () => {
    // Sunday 25 October 2026 at 23:30 in Paris, the clocks gone back that night; Monday 19 at 20:00.
    expect(evenings('2026-10-25T22:30:00Z', '2026-10-19T18:00:00Z')).toEqual({ days: ['2026-10-19'], tonight: false });
  });

  it('keeps seven days, today included: the same weekday a week ago is out', () => {
    // Thursday 8 January at 22:00 in Paris, within the seven days of hours before Thursday 15 at 21:00.
    expect(evenings('2026-01-15T20:00:00Z', '2026-01-08T21:00:00Z', '2026-01-09T08:00:00Z')).toEqual({ days: ['2026-01-09'], tonight: false });
  });
});
