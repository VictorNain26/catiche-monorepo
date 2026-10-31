/**
 * `bun run eval`: replays the scenarios of the evaluation set (src/eval) on the real tutor and the
 * real Mistral, through the real route, as a fresh student each time, so that nothing learned in
 * one conversation reaches the next, its messages written in advance or by a simulated student
 * (eval/student.ts). Writes the transcripts, the code's verdicts (leak, artifact,
 * distress), the judge's (eval/judge.ts) and their rates with Wilson intervals to eval-results/. A composition root, as
 * main.ts: the app is wired here, its emails kept in memory for the guardian's code. Only on a
 * database on this machine: the run creates accounts and deletes those of an earlier run.
 *
 * With Langfuse's keys, the run is traced as main.ts traces, and each conversation is sent with
 * its text and the judge's verdicts as scores (eval/langfuse.ts); `--annotate` puts them in
 * Victor's annotation queues, and `--agreement` alone prints the judge's agreement with him.
 */

import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { LangfuseClient } from '@langfuse/client';
import { like } from 'drizzle-orm';
import { createApp } from './app';
import { loadConfig } from './config';
import type { SchoolLevel } from './domain/levels';
import { dataset, renderTurns, type Check, type StudentTurn } from './eval';
import { z } from 'zod';
import { buildItems, isLocalDatabase, keyOf, lookup, pairOf, VARIANTS, type Item, type Variant } from './eval/items';
import { failedOn, judgeConversation, judgeErrors, judgeRates, questionsFor, type Verdict } from './eval/judge';
import { annotate, conversationTrace, KAPPA_THRESHOLD, readAgreement, scoreConfigs, sendVerdicts, traced } from './eval/langfuse';
import {
  cutShort,
  detectArtifact,
  detectDistress,
  detectLeak,
  paired,
  rates,
  type Paired,
  type Rate,
  type Transcript,
  type TutorTurn,
} from './eval/report';
import { scriptedStudent, simulatedStudent, type Student } from './eval/student';
import { accountDeletion, householdAuth } from './modules/household';
import { studentCost, turnRecords } from './modules/tutor';
import { createAi } from './platform/ai/client';
import { pricing } from './platform/ai/cost';
import { createModeration } from './platform/ai/moderation';
import { createAuth } from './platform/auth/auth';
import { user } from './platform/auth/schema';
import { createDb, type Db } from './platform/db/client';
import { pendingMigrations } from './platform/db/migrations';
import { createBackgroundTasks } from './platform/lifecycle/background';
import { createLifecycle } from './platform/lifecycle/shutdown';
import { createLogger } from './platform/observability/logger';
import { startTracing } from './platform/observability/tracing';
import { notionsFor } from './referential';
import { httpClient } from './testing/http';
import { memoryMailer } from './testing/mailer';

/** The addresses of the run's guardians: RFC 6761 reserves `.test`, which no one receives. */
const EVAL_DOMAIN = '@eval.test';

export interface Harness {
  /** The calls of the web, its emails kept in memory: the run reads the guardian's code there. */
  api: ReturnType<typeof httpClient>;
  records: (sessionId: string) => Promise<{ outcome: string }[]>;
  /** What a student's AI calls cost, in micro-euros. */
  cost: (studentId: string) => Promise<number>;
  /** The work after a reply (a session's title and summary), done before the next step. */
  settled: () => Promise<void>;
}

/** A conversation of the run: played under its variant, with the code's verdicts, the judge's and what both cost. */
interface Conversation extends Item {
  leak: ReturnType<typeof detectLeak>;
  artifact: ReturnType<typeof detectArtifact>;
  distress: ReturnType<typeof detectDistress> | undefined;
  judge: Verdict[] | null;
  cost: { tutorMicroEur: number; studentMicroEur: number; judgeMicroEur: number };
  transcript: Transcript;
  /** Its trace in Langfuse, null without Langfuse's keys. */
  traceId: string | null;
}

/**
 * The A/B of the variants on their pairs: the code's leak, and each question of the judge, which
 * has a `leak` of its own: each verdict under the name of who gives it.
 */
export function compareVariants(conversations: readonly Pick<Conversation, keyof Item | 'leak' | 'judge'>[]): Record<string, Paired> {
  const pairedOn = (flagged: (row: (typeof conversations)[number]) => boolean | null) =>
    paired(conversations.map((row) => ({ pair: pairOf(row), variant: row.variant, flagged: flagged(row) })));
  const questionIds = [...new Set(conversations.flatMap(({ judge }) => (judge ?? []).map(({ id }) => id)))];
  return {
    'code:leak': pairedOn(({ leak }) => (leak ? leak.leaked : null)),
    ...Object.fromEntries(questionIds.map((id) => [`judge:${id}`, pairedOn(({ judge }) => failedOn(judge, id))])),
  };
}

/** A guardian invited and in by the code their address received: their session's cookie. */
export function signInGuardian(harness: Harness): Promise<string> {
  return harness.api.guardian(`guardian-${crypto.randomUUID().slice(0, 8)}${EVAL_DOMAIN}`);
}

/** A new student of the guardian, at the conversation's class, and their device's session cookie. */
async function pairedStudent(harness: Harness, guardian: string, level: SchoolLevel): Promise<{ id: string; device: string }> {
  const { id } = await harness.api.student(guardian, { name: 'Élève', level });
  return { id, device: await harness.api.pair(guardian, id) };
}

/** One student turn through the route, read from its UI message stream as the web reads it. */
async function playTurn(harness: Harness, sessionId: string, device: string, student: StudentTurn): Promise<Omit<TutorTurn, 'record'>> {
  const started = performance.now();
  let text = '';
  let error: string | undefined;
  try {
    const turn = await harness.api.turn(device, sessionId, { text: student.text, ...(student.inputMode && { inputMode: student.inputMode }) });
    text = turn.reply;
    error = turn.status === 200 ? turn.error : `turn: HTTP ${String(turn.status)} ${turn.body}`;
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  await harness.settled();
  return {
    student: student.text,
    ...(student.inputMode && { inputMode: student.inputMode }),
    text,
    durationMs: Math.round(performance.now() - started),
    ...(error !== undefined && { error }),
  };
}

/** The student's next message; a failed simulated student cuts the conversation short, with its error. */
async function nextOf(student: Student, played: readonly Omit<TutorTurn, 'record'>[]): Promise<StudentTurn | { error: string } | null> {
  try {
    return await student.next(played);
  } catch (caught) {
    return { error: `student: ${caught instanceof Error ? caught.message : String(caught)}` };
  }
}

/**
 * A conversation played at a class by a fresh student, each message from `student` after Tom's
 * last reply, each turn with the record the server stored, and what the student's calls cost: the
 * tutor's, its title and summary included.
 */
export async function playConversation(
  harness: Harness,
  guardian: string,
  { scenarioId, exerciseId, repetition }: Pick<Item, 'scenarioId' | 'exerciseId' | 'repetition'>,
  level: SchoolLevel,
  student: Student,
): Promise<{ transcript: Transcript; tutorCostMicroEur: number }> {
  const { id: studentId, device } = await pairedStudent(harness, guardian, level);
  const sessionId = await harness.api.session(device);
  const played: Omit<TutorTurn, 'record'>[] = [];
  for (let said = await nextOf(student, played); said !== null; said = await nextOf(student, played)) {
    const turn = 'error' in said ? { student: '', text: '', durationMs: 0, error: said.error } : await playTurn(harness, sessionId, device, said);
    played.push(turn);
    if (turn.error !== undefined) break;
  }
  // One record per turn the server answered, in their order; the play stops at the first refused.
  const records = await harness.records(sessionId);
  const transcript = {
    scenarioId,
    exerciseId,
    repetition,
    turns: played.map((turn, index) => {
      const record = records[index];
      return { ...turn, record: record ? { outcome: record.outcome } : null };
    }),
  };
  return { transcript, tutorCostMicroEur: await harness.cost(studentId) };
}

/** Deletes the guardians of earlier runs, their households and students with them: their accounts. */
export async function removeEvalAccounts(db: Db): Promise<number> {
  const guardians = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, `%${EVAL_DOMAIN}`));
  const remove = accountDeletion(db);
  for (const { id } of guardians) await remove(id);
  return guardians.length;
}

/** The commit a run comes from, with `-dirty` when the tree holds uncommitted changes. */
const commit = () => Bun.spawnSync(['git', 'describe', '--always', '--dirty', '--exclude=*']).stdout.toString().trim() || 'unknown';

const percent = (value: number) => `${(value * 100).toFixed(1)} %`;
const euros = (microEur: number) => `${(microEur / 1_000_000).toFixed(2)} €`;
const line = ({ scope, flagged, total, low, high }: Rate) => `  ${scope}: ${String(flagged)}/${String(total)} [${percent(low)} – ${percent(high)}]`;

/** Each question of the set once, by its id: the scenarios share the grid's. */
const uniqueQuestions = (questions: readonly Check[]) => [...new Map(questions.map((question) => [question.id, question])).values()];

/** The judge against Victor, per question of the set, from the scores Langfuse holds. */
async function printAgreement(langfuse: LangfuseClient): Promise<number> {
  const ids = uniqueQuestions(dataset.scenarios.flatMap(questionsFor)).map(({ id }) => id);
  console.log(`== judge against Victor (Cohen's κ; a question counts from κ ≥ ${String(KAPPA_THRESHOLD)})`);
  for (const [id, { pairs, kappa, validated }] of Object.entries(await readAgreement(langfuse, ids))) {
    console.log(`  ${id}: ${String(pairs)} pair(s), ${kappa === null ? 'no κ' : `κ = ${kappa.toFixed(2)}`}${validated ? ', validated' : ''}`);
  }
  return 0;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      scenario: { type: 'string', multiple: true },
      exercise: { type: 'string', multiple: true },
      repeat: { type: 'string', default: '1' },
      variant: { type: 'string', multiple: true, default: ['programme'] },
      annotate: { type: 'boolean', default: false },
      agreement: { type: 'boolean', default: false },
    },
  });
  const repeat = Number(values.repeat);
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) {
    console.error('--repeat: a whole number from 1 to 10');
    return 1;
  }
  const parsedVariants = z.array(z.enum(VARIANTS)).safeParse(values.variant);
  if (!parsedVariants.success) {
    console.error(`--variant: ${VARIANTS.join(' or ')}`);
    return 1;
  }
  const variants = [...new Set(parsedVariants.data)];
  const config = loadConfig(Bun.env);
  const langfuse = config.langfuse ? new LangfuseClient({ ...config.langfuse }) : null;
  if ((values.agreement || values.annotate) && !langfuse) {
    console.error('--agreement and --annotate use Langfuse: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY are required.');
    return 1;
  }
  if (values.agreement && langfuse) return printAgreement(langfuse);
  if (!isLocalDatabase(config.databaseUrl)) {
    console.error('eval only runs against a database on this machine: it creates and deletes accounts.');
    return 1;
  }
  if (!config.mistral.apiKey) {
    console.error('eval plays the real tutor: MISTRAL_API_KEY is required.');
    return 1;
  }
  const items = buildItems({ repeat, scenario: values.scenario, exercise: values.exercise, variants });
  if (items.length === 0) {
    console.error('no conversation matches the filters');
    return 1;
  }

  const logger = createLogger('warn');
  // Before any AI call, as main.ts: the calls' latency and tokens, without their text.
  const tracing = config.langfuse ? startTracing(config.langfuse) : null;
  const database = createDb(config.databaseUrl, { production: false, ca: config.databaseCa });
  const tasks = createBackgroundTasks();
  try {
    if ((await pendingMigrations(database.db)).length > 0) {
      console.error('migrations not applied: run `bun run db:migrate` first');
      return 1;
    }
    const inbox = memoryMailer();
    const auth = createAuth(database.db, config, {
      mailer: inbox.mailer,
      logger,
      background: tasks.run,
      ...householdAuth(database.db),
    });
    const ai = createAi({ mistral: config.mistral, db: database.db, logger });
    const moderation = createModeration({ mistral: config.mistral, logger });
    // One app per variant on the same base: `none` draws the sheets without the programme.
    const harnessOf = (variant: Variant): Harness => {
      const app = createApp({
        config,
        logger,
        db: database.db,
        auth,
        mailer: inbox.mailer,
        ai,
        moderation,
        notions: variant === 'none' ? () => null : notionsFor,
        lifecycle: createLifecycle(),
        background: tasks.run,
      });
      return {
        api: httpClient(app, inbox, { db: database.db, auth }, config.publicUrl),
        records: turnRecords(database.db),
        cost: studentCost(database.db),
        settled: tasks.settled,
      };
    };
    // Building an app calls no model: both are built, whatever the run plays.
    const harnesses: Record<Variant, Harness> = { programme: harnessOf('programme'), none: harnessOf('none') };
    const costOf = pricing(config.mistral.model, config.mistral.euEndpoint);

    const runName = `${new Date().toISOString().slice(0, 16).replace(':', 'h')}-${commit()}`;
    // The score config of each question asked, Victor's and the judge's, before the first score.
    const configs = langfuse ? await scoreConfigs(langfuse, uniqueQuestions(items.flatMap((item) => questionsFor(lookup(item).scenario)))) : null;
    const langfuseErrors: string[] = [];

    console.log(`removed ${String(await removeEvalAccounts(database.db))} account(s) of an earlier run`);
    const guardian = await signInGuardian(harnesses.programme);
    const conversations: Conversation[] = [];
    for (const [index, item] of items.entries()) {
      const played = lookup(item);
      const { scenario, exercise } = played;
      const student =
        played.exercise === null
          ? simulatedStudent(ai, played.scenario, `eval-student-${keyOf(item)}`)
          : scriptedStudent(renderTurns(played.scenario, played.exercise));
      const level = played.exercise === null ? played.scenario.level : played.exercise.level;
      const play = async () => {
        const conversation = await playConversation(harnesses[item.variant], guardian, item, level, student);
        return { ...conversation, judge: await judgeConversation(ai, scenario, exercise, conversation.transcript) };
      };
      const {
        traceId,
        result: { transcript, tutorCostMicroEur, judge },
      } = langfuse
        ? await traced(keyOf(item), async (record) => {
            const result = await play();
            record({
              ...conversationTrace(scenario, exercise, result.transcript),
              metadata: { runName, scenarioId: item.scenarioId, variant: item.variant },
            });
            return result;
          })
        : { traceId: null, result: await play() };
      if (langfuse && configs && traceId !== null && judge) {
        await sendVerdicts(langfuse, traceId, judge, configs).catch((caught: unknown) => {
          langfuseErrors.push(`${keyOf(item)}: ${caught instanceof Error ? caught.message : String(caught)}`);
        });
      }
      const judgeMicroEur = (judge ?? []).reduce((sum, verdict) => sum + ('usage' in verdict ? costOf(verdict.usage) : 0), 0);
      const studentMicroEur = costOf(student.usage());
      const verdicts = {
        leak: detectLeak(transcript, exercise, scenario),
        artifact: detectArtifact(transcript),
        distress: scenario.grading.includes('safety') ? detectDistress(transcript) : undefined,
        judge,
      };
      conversations.push({ ...item, ...verdicts, cost: { tutorMicroEur: tutorCostMicroEur, studentMicroEur, judgeMicroEur }, transcript, traceId });
      const failed = cutShort(transcript);
      const leak = verdicts.leak
        ? verdicts.leak.leaked
          ? `leak at turn ${String(verdicts.leak.turn)}: ${String(verdicts.leak.form)}`
          : 'no leak'
        : 'no leak verdict';
      console.log(`${String(index + 1)}/${String(items.length)} ${keyOf(item)} ${leak}${failed ? ' (error)' : ''}`);
    }

    const summarize = (rows: readonly Conversation[]) => ({
      leaks: rates(rows.map(({ scenarioId, leak }) => ({ scenarioId, flagged: leak ? leak.leaked : null }))),
      artifacts: rates(rows.map(({ scenarioId, artifact }) => ({ scenarioId, flagged: artifact ? artifact.found : null }))),
      distressMissed: rates(
        rows.flatMap(({ scenarioId, distress }) => (distress === undefined ? [] : [{ scenarioId, flagged: distress ? !distress.handled : null }])),
      ),
      judge: judgeRates(rows),
      cost: {
        tutorMicroEur: rows.reduce((sum, { cost }) => sum + cost.tutorMicroEur, 0),
        studentMicroEur: rows.reduce((sum, { cost }) => sum + cost.studentMicroEur, 0),
        judgeMicroEur: rows.reduce((sum, { cost }) => sum + cost.judgeMicroEur, 0),
      },
    });
    const byVariant = Object.fromEntries(variants.map((variant) => [variant, summarize(conversations.filter((row) => row.variant === variant))]));
    const comparison = variants.length === VARIANTS.length ? compareVariants(conversations) : null;
    await mkdir('eval-results', { recursive: true });
    const path = `eval-results/${runName}.json`;
    await Bun.write(
      path,
      JSON.stringify(
        { runName, model: config.mistral.model, conversations: items.length, summary: { byVariant, paired: comparison }, results: conversations },
        null,
        2,
      ),
    );

    console.log(`\n${path}`);
    for (const [variant, summary] of Object.entries(byVariant)) {
      console.log(`\n== ${variant}\nleaks:\n${summary.leaks.map(line).join('\n')}\nartifacts:\n${summary.artifacts.map(line).join('\n')}`);
      if (summary.distressMissed.length > 0) console.log(`distress not handled:\n${summary.distressMissed.map(line).join('\n')}`);
      for (const [id, failed] of Object.entries(summary.judge)) {
        console.log(failed.length > 0 ? `judge, ${id} failed:\n${failed.map(line).join('\n')}` : `judge, ${id}: no verdict, every answer unknown`);
      }
      console.log(
        `cost: tutor ${euros(summary.cost.tutorMicroEur)}, simulated student ${euros(summary.cost.studentMicroEur)}, judge ${euros(summary.cost.judgeMicroEur)}`,
      );
    }
    if (comparison) {
      console.log('\n== programme against none (pairs failed by one only, exact McNemar)');
      for (const [id, { pairs, programmeOnly, noneOnly, pValue }] of Object.entries(comparison)) {
        console.log(
          `  ${id}: ${String(pairs)} pairs, programme only ${String(programmeOnly)}, none only ${String(noneOnly)}, p = ${pValue.toFixed(3)}`,
        );
      }
    }
    if (values.annotate && langfuse && configs && tracing) {
      // The traces sent first: each item of a queue names one.
      await tracing.flush();
      const byScenario = new Map<string, { scenarioId: string; name: string; questions: Check[]; traceIds: string[] }>();
      for (const { scenarioId, traceId, judge, ...row } of conversations) {
        // A conversation an error cut short has no verdict to check.
        if (traceId === null || judge === null) continue;
        const { scenario } = lookup({ scenarioId, ...row });
        const entry = byScenario.get(scenarioId) ?? { scenarioId, name: scenario.name, questions: questionsFor(scenario), traceIds: [] };
        entry.traceIds.push(traceId);
        byScenario.set(scenarioId, entry);
      }
      const queues = await annotate(langfuse, runName, [...byScenario.values()], configs);
      console.log(`\nannotation queues in Langfuse: ${queues.join(', ')}`);
    }
    const failedJudgeCalls = judgeErrors(conversations);
    if (failedJudgeCalls > 0) console.error(`${String(failedJudgeCalls)} judge call(s) failed: no verdict for them`);
    const failures = conversations.filter(({ transcript }) => cutShort(transcript));
    if (failures.length > 0) console.error(`${String(failures.length)} conversation(s) cut short by an error: ${failures.map(keyOf).join(', ')}`);
    if (langfuseErrors.length > 0) console.error(`verdicts not sent to Langfuse:\n  ${langfuseErrors.join('\n  ')}`);
    return failures.length > 0 || failedJudgeCalls > 0 || langfuseErrors.length > 0 ? 1 : 0;
  } finally {
    await tasks.settled();
    await database.close();
    // Spans leave in batches: what is left goes before the process exits.
    await tracing?.shutdown();
  }
}

if (import.meta.main) process.exit(await main());
