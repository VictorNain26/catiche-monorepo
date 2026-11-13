/**
 * The summary of the week, which the guardian and the student read alike (`docs/tuteur.md` § 8):
 * the time spent and the evenings. Written by the code from timestamps, never by a model: no
 * word of the student nor of Tom enters it.
 */

import { parisDay } from '../../../domain/school-calendar';

const WEEK_MS = 7 * 24 * 60 * 60_000;
/** A longer gap between two moments of a session is a pause, not time spent. */
const PAUSE_MS = 10 * 60_000;
const ROUND_MINUTES = 5;

/** The summary covers the seven days before now, read on a Monday morning as on a Sunday evening. */
export const weekStart = (now: Date) => new Date(now.getTime() - WEEK_MS);

/** A message of the week, and when its session opened. */
export interface WeekMessage {
  sessionId: string;
  startedAt: Date;
  at: Date;
}

const roundedMinutes = (ms: number) => Math.round(ms / 60_000 / ROUND_MINUTES) * ROUND_MINUTES;

/**
 * `messages` grouped by session, each session's in their order. A turn stores the student's
 * message and the reply together, once the reply is written: the session's opening times its
 * first message, and the reading of the last reply is not counted.
 */
export function weekSummary(messages: readonly WeekMessage[], now: Date) {
  const sessions = new Map<string, WeekMessage[]>();
  for (const message of messages) {
    const session = sessions.get(message.sessionId);
    if (session) session.push(message);
    else sessions.set(message.sessionId, [message]);
  }

  let total = 0;
  for (const session of sessions.values()) {
    const [first] = session;
    if (!first) continue;
    const times = [first.startedAt, ...session.map((message) => message.at)].map((date) => date.getTime());
    for (let index = 1; index < times.length; index++) {
      const gap = (times[index] ?? 0) - (times[index - 1] ?? 0);
      if (gap <= PAUSE_MS) total += gap;
    }
  }
  return { minutes: roundedMinutes(total), sessions: sessions.size, ...evenings(messages, now) };
}

/**
 * The days, in Paris, the student wrote to Tom, the earliest first: the seven last, today
 * included, so that no weekday comes twice; and whether today is one of them. Every adult of the
 * student reads them, without a time nor a subject (`docs/plans/app-cible.md`, A5).
 */
function evenings(messages: readonly WeekMessage[], now: Date) {
  const today = parisDay(now);
  // Six calendar days before today, not 144 hours: a change of clocks makes a day of 23 or 25.
  const [year = 0, month = 1, day = 1] = today.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, day - 6)).toISOString().slice(0, 10);
  const days = [...new Set(messages.map(({ at }) => parisDay(at)))].filter((each) => each >= first && each <= today).sort();
  return { days, tonight: days.includes(today) };
}
