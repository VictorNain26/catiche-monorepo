/**
 * Langfuse for the evaluation (docs/tuteur.md § 7): each played conversation is a trace with its
 * text, synthetic, never a child's; each verdict of the judge a score of it, named by its question;
 * Victor answers the same questions in an annotation queue; the agreement of both is read back.
 * The judge's logic stays in judge.ts, the statistics in stats.ts: Langfuse stores, shows and
 * collects the annotations. Its API through its client (@langfuse/client), its traces through
 * OpenTelemetry (@langfuse/tracing), the SDK's one way to write a trace
 * (langfuse.com/docs/observability/sdk/instrumentation).
 */

import type { LangfuseClient } from '@langfuse/client';
import type { CreateScoreRequest, ScoreConfig, ScoreV3 } from '@langfuse/core';
import { startActiveObservation } from '@langfuse/tracing';
import type { Check, Exercise, Scenario } from './index';
import { situation, type Verdict } from './judge';
import type { Transcript } from './report';
import { cohenKappa } from './stats';

/** A question of the judge counts from this agreement with Victor, a « substantial » one. */
export const KAPPA_THRESHOLD = 0.6;

/** The judge's answers, and Victor's: a categorical score takes the label as its value. */
const ANSWERS = [
  { label: 'oui', value: 1 },
  { label: 'non', value: 0 },
  { label: 'inconnu', value: -1 },
];

/**
 * Plays inside a trace and gives its id. `record` sets the trace's input and output, which mirror
 * those of its root observation (langfuse.com/docs/observability/sdk/instrumentation); the AI
 * calls made meanwhile nest under it, without text as everywhere (platform/ai/client.ts).
 */
export async function traced<T>(
  name: string,
  play: (record: (trace: { input: unknown; output: unknown; metadata: Record<string, unknown> }) => void) => Promise<T>,
): Promise<{ traceId: string; result: T }> {
  return startActiveObservation(name, async (span) => ({ traceId: span.traceId, result: await play((trace) => span.update(trace)) }));
}

/**
 * What Victor reads in the queue, as the judge read it: the situation and the expected behavior,
 * then the conversation as a list of messages, which Langfuse shows as a chat.
 */
export function conversationTrace(scenario: Scenario, exercise: Exercise | null, transcript: Transcript) {
  return {
    input: { situation: situation(scenario, exercise), expectedBehavior: scenario.expectedBehavior },
    output: transcript.turns.flatMap(({ student, text }) => [
      { role: 'user', content: student },
      { role: 'assistant', content: text },
    ]),
  };
}

async function allScoreConfigs(client: LangfuseClient): Promise<ScoreConfig[]> {
  const configs: ScoreConfig[] = [];
  for (let page = 1, pages = 1; page <= pages; page++) {
    const { data, meta } = await client.api.scoreConfigs.get({ page, limit: 100 });
    configs.push(...data);
    pages = meta.totalPages;
  }
  return configs;
}

/**
 * The score config of each question, by its id, created when missing: Victor annotates through it,
 * the judge's score is sent under it. A question keeps one wording under its id, its config's
 * description: a reworded question takes a new id, or the answers to the old wording would count
 * for the new.
 */
export async function scoreConfigs(client: LangfuseClient, questions: readonly Check[]): Promise<Map<string, string>> {
  const existing = new Map((await allScoreConfigs(client)).filter(({ isArchived }) => !isArchived).map((config) => [config.name, config]));
  const ids = new Map<string, string>();
  for (const { id, question } of questions) {
    if (ids.has(id)) continue;
    const found = existing.get(id);
    if (found && found.description !== question) {
      throw new Error(`judge question ${id} was reworded since its score config: give it a new id`);
    }
    const config = found ?? (await client.api.scoreConfigs.create({ name: id, dataType: 'CATEGORICAL', categories: ANSWERS, description: question }));
    ids.set(id, config.id);
  }
  return ids;
}

/**
 * The verdicts of a conversation as scores of its trace, the reason as their comment; a failed call
 * has none. Sent by the API, which answers each one rejected (HTTP 207), not by `score.create`,
 * which only logs a failure (langfuse.com/docs/observability/sdk/upgrade-path/js-v5-to-v6). An id
 * per trace and question: sent again, a score replaces itself.
 */
export async function sendVerdicts(
  client: LangfuseClient,
  traceId: string,
  verdicts: readonly Verdict[],
  configs: ReadonlyMap<string, string>,
): Promise<void> {
  const scores: CreateScoreRequest[] = verdicts.flatMap((verdict) => {
    const configId = configs.get(verdict.id);
    if ('error' in verdict || configId === undefined) return [];
    return [{ id: `${traceId}-${verdict.id}`, traceId, name: verdict.id, value: verdict.answer, configId, comment: verdict.reason }];
  });
  if (scores.length === 0) return;
  const answer = await client.api.scores.create(scores);
  if ('rejected' in answer && answer.rejected > 0) {
    throw new Error(`Langfuse rejected ${String(answer.rejected)} score(s): ${answer.errors.map(({ message }) => message).join('; ')}`);
  }
}

/**
 * A queue per scenario of the run, with its questions only, its conversations in it: Victor
 * answers there what the judge answered. Its name, given back: the run and the scenario.
 */
export async function annotate(
  client: LangfuseClient,
  runName: string,
  scenarios: readonly { scenarioId: string; name: string; questions: readonly Check[]; traceIds: readonly string[] }[],
  configs: ReadonlyMap<string, string>,
): Promise<string[]> {
  const names: string[] = [];
  for (const { scenarioId, name, questions, traceIds } of scenarios) {
    const queueName = `${runName} ${scenarioId}`;
    const scoreConfigIds = questions.flatMap(({ id }) => configs.get(id) ?? []);
    const queue = await client.api.annotationQueues.createQueue({ name: queueName, description: name, scoreConfigIds });
    for (const objectId of traceIds) await client.api.annotationQueues.createQueueItem(queue.id, { objectId, objectType: 'TRACE' });
    names.push(queueName);
  }
  return names;
}

export interface Agreement {
  /** Conversations both the judge and Victor answered the question on. */
  pairs: number;
  kappa: number | null;
  validated: boolean;
}

/** Every score of the questions, the judge's (source API) and Victor's (ANNOTATION), read page by page. */
async function judgeAndVictor(client: LangfuseClient, questionIds: readonly string[]): Promise<ScoreV3[]> {
  const scores: ScoreV3[] = [];
  let cursor: string | undefined;
  do {
    const { data, meta } = await client.api.scores.getMany({
      limit: 100,
      name: questionIds.join(','),
      source: 'API,ANNOTATION',
      dataType: 'CATEGORICAL',
      fields: 'subject',
      ...(cursor !== undefined && { cursor }),
    });
    scores.push(...data);
    cursor = meta.cursor;
  } while (cursor !== undefined);
  return scores;
}

/**
 * Per question, the κ of the judge's answers against Victor's on the traces both answered, over
 * the whole project: an evaluation project holds runs only.
 */
export async function readAgreement(client: LangfuseClient, questionIds: readonly string[]): Promise<Record<string, Agreement>> {
  // Per question, per trace, each one's answer.
  const answers = new Map(questionIds.map((id) => [id, new Map<string, { judge?: string; victor?: string }>()]));
  for (const score of await judgeAndVictor(client, questionIds)) {
    const byTrace = answers.get(score.name);
    if (!byTrace || score.subject?.kind !== 'trace' || typeof score.value !== 'string') continue;
    const entry = byTrace.get(score.subject.id) ?? {};
    entry[score.source === 'ANNOTATION' ? 'victor' : 'judge'] = score.value;
    byTrace.set(score.subject.id, entry);
  }
  return Object.fromEntries(
    [...answers].map(([id, byTrace]) => {
      const pairs = [...byTrace.values()].flatMap(({ judge, victor }) =>
        judge !== undefined && victor !== undefined ? [[judge, victor] as const] : [],
      );
      const kappa = cohenKappa(pairs);
      return [id, { pairs: pairs.length, kappa, validated: kappa !== null && kappa >= KAPPA_THRESHOLD }];
    }),
  );
}
