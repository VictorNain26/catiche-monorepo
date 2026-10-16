/**
 * The longest a turn holds its session, from the deadlines of its calls in their order: past it,
 * a turn left marked by a crash no longer blocks the session (`repository.startTurn`). The
 * title and the summary run after the session is freed, and count for nothing here.
 */

import { MODERATION_TIMEOUT_MS } from '../../../platform/ai/moderation';
import { ANALYSIS_TIMEOUT_MS } from './analysis';
import { writeDeadlineMs } from './controlled-turn';
import { DIAGNOSIS_TIMEOUT_MS } from './diagnosis';
import { SHEET_TIMEOUT_MS } from './sheet';

/** `clientMs`: the AI client's own deadline, which caps every call (`platform/ai/client.ts`). */
export function turnDeadlineMs(clientMs: number): number {
  const capped = (ms: number) => Math.min(ms, clientMs);
  return (
    // The photo, read first, under the client's deadline alone.
    clientMs +
    // The analysis, started beside the moderation of the student's message.
    Math.max(capped(ANALYSIS_TIMEOUT_MS), MODERATION_TIMEOUT_MS) +
    // The sheet's draws, side by side, then the diagnosis.
    capped(SHEET_TIMEOUT_MS) +
    capped(DIAGNOSIS_TIMEOUT_MS) +
    writeDeadlineMs(clientMs)
  );
}
