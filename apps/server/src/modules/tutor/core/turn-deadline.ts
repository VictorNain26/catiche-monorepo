/**
 * The longest a turn holds its session, from the deadlines of its calls in their order: past it,
 * a turn left marked by a crash no longer blocks the session (`repository.startTurn`).
 */

import { MODERATION_TIMEOUT_MS } from '../../../platform/ai/moderation';

/** The steps of Tom's loop at most: tools on the first ones, words on the last. */
export const MAX_STEPS = 4;

/**
 * The database's share of a turn, which no deadline bounds: the reads before the calls, the cost
 * written after each step, the tools' writes, the turn's transaction.
 */
const DATABASE_MS = 30_000;

/** `clientMs`: the AI client's own deadline, which caps each step (`platform/ai/client.ts`). */
export const turnDeadlineMs = (clientMs: number): number =>
  // The student's message moderated, the steps, then the reply moderated.
  DATABASE_MS + 2 * MODERATION_TIMEOUT_MS + MAX_STEPS * clientMs;
