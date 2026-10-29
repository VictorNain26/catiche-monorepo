/**
 * `bun run eval`: replays the scenarios of the evaluation set (src/eval) on the real tutor and the
 * real Mistral, through the real route, as a fresh student each time, so that nothing learned in
 * one conversation reaches the next. Writes the transcripts, the code's verdicts (leak, artifact,
 * distress), the judge's (eval/judge.ts) and their rates with Wilson intervals to eval-results/. A composition root, as
 * main.ts: the app is wired here, its emails kept in memory for the guardian's code. Only on a
 * database on this machine: the run creates accounts and deletes those of an earlier run.
 */

import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { like } from 'drizzle-orm';
import { createApp } from './app';
import { loadConfig } from './config';
import { renderTurns, type Exercise, type Scenario, type StudentTurn } from './eval';
import { buildItems, isLocalDatabase, keyOf, lookup } from './eval/items';
import { judgeConversation, judgeErrors, judgeRates } from './eval/judge';
import { cutShort, detectArtifact, detectDistress, detectLeak, rates, type Rate, type Transcript, type TutorTurn } from './eval/report';
import { accountDeletion, householdAuth } from './modules/household';
import { turnRecords } from './modules/tutor';
import { createAi } from './platform/ai/client';
import { createModeration } from './platform/ai/moderation';
import { createAuth } from './platform/auth/auth';
import { user } from './platform/auth/schema';
import { createDb, type Db } from './platform/db/client';
import { pendingMigrations } from './platform/db/migrations';
import { createBackgroundTasks } from './platform/lifecycle/background';
import { createLifecycle } from './platform/lifecycle/shutdown';
import { createLogger } from './platform/observability/logger';
import { httpClient } from './testing/http';
import { memoryMailer } from './testing/mailer';

/** The addresses of the run's guardians: RFC 6761 reserves `.test`, which no one receives. */
const EVAL_DOMAIN = '@eval.test';

export interface Harness {
  /** The calls of the web, its emails kept in memory: the run reads the guardian's code there. */
  api: ReturnType<typeof httpClient>;
  records: (sessionId: string) => Promise<{ outcome: string }[]>;
  /** The work after a reply (a session's title and summary), done before the next step. */
  settled: () => Promise<void>;
}

/** A guardian invited and in by the code their address received: their session's cookie. */
export function signInGuardian(harness: Harness): Promise<string> {
  return harness.api.guardian(`guardian-${crypto.randomUUID().slice(0, 8)}${EVAL_DOMAIN}`);
}

/** A new student of the guardian, at the exercise's level, and their device's session cookie. */
async function pairedStudent(harness: Harness, guardian: string, exercise: Exercise): Promise<string> {
  const { id } = await harness.api.student(guardian, { name: 'Élève', level: exercise.level });
  return harness.api.pair(guardian, id);
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

/** A scenario played on an exercise by a fresh student, each turn with the record the server stored. */
export async function playConversation(
  harness: Harness,
  guardian: string,
  scenario: Scenario,
  exercise: Exercise,
  repetition: number,
): Promise<Transcript> {
  const device = await pairedStudent(harness, guardian, exercise);
  const sessionId = await harness.api.session(device);
  const played: Omit<TutorTurn, 'record'>[] = [];
  for (const student of renderTurns(scenario, exercise)) {
    const turn = await playTurn(harness, sessionId, device, student);
    played.push(turn);
    if (turn.error !== undefined) break;
  }
  // One record per turn the server answered, in their order; the play stops at the first refused.
  const records = await harness.records(sessionId);
  return {
    scenarioId: scenario.id,
    exerciseId: exercise.id,
    repetition,
    turns: played.map((turn, index) => {
      const record = records[index];
      return { ...turn, record: record ? { outcome: record.outcome } : null };
    }),
  };
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
const line = ({ scope, flagged, total, low, high }: Rate) => `  ${scope}: ${String(flagged)}/${String(total)} [${percent(low)} – ${percent(high)}]`;

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      scenario: { type: 'string', multiple: true },
      exercise: { type: 'string', multiple: true },
      repeat: { type: 'string', default: '1' },
    },
  });
  const repeat = Number(values.repeat);
  if (!Number.isInteger(repeat) || repeat < 1 || repeat > 10) {
    console.error('--repeat: a whole number from 1 to 10');
    return 1;
  }
  const config = loadConfig(Bun.env);
  if (!isLocalDatabase(config.databaseUrl)) {
    console.error('eval only runs against a database on this machine: it creates and deletes accounts.');
    return 1;
  }
  if (!config.mistral.apiKey) {
    console.error('eval plays the real tutor: MISTRAL_API_KEY is required.');
    return 1;
  }
  const items = buildItems({ repeat, scenario: values.scenario, exercise: values.exercise });
  if (items.length === 0) {
    console.error('no conversation matches the filters');
    return 1;
  }

  const logger = createLogger('warn');
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
    const app = createApp({
      config,
      logger,
      db: database.db,
      auth,
      mailer: inbox.mailer,
      ai,
      moderation,
      lifecycle: createLifecycle(),
      background: tasks.run,
    });
    const harness: Harness = {
      api: httpClient(app, inbox, { db: database.db, auth }, config.publicUrl),
      records: turnRecords(database.db),
      settled: tasks.settled,
    };

    console.log(`removed ${String(await removeEvalAccounts(database.db))} account(s) of an earlier run`);
    const guardian = await signInGuardian(harness);
    const conversations = [];
    for (const [index, item] of items.entries()) {
      const { scenario, exercise } = lookup(item);
      const transcript = await playConversation(harness, guardian, scenario, exercise, item.repetition);
      const verdicts = {
        leak: detectLeak(transcript, exercise, scenario),
        artifact: detectArtifact(transcript),
        distress: scenario.grading.includes('safety') ? detectDistress(transcript) : undefined,
        judge: await judgeConversation(ai, scenario, exercise, transcript),
      };
      conversations.push({ ...item, ...verdicts, transcript });
      const failed = cutShort(transcript);
      const leak = verdicts.leak
        ? verdicts.leak.leaked
          ? `leak at turn ${String(verdicts.leak.turn)}: ${String(verdicts.leak.form)}`
          : 'no leak'
        : 'no leak verdict';
      console.log(`${String(index + 1)}/${String(items.length)} ${keyOf(item)} ${leak}${failed ? ' (error)' : ''}`);
    }

    const summary = {
      leaks: rates(conversations.map(({ scenarioId, leak }) => ({ scenarioId, flagged: leak ? leak.leaked : null }))),
      artifacts: rates(conversations.map(({ scenarioId, artifact }) => ({ scenarioId, flagged: artifact ? artifact.found : null }))),
      distressMissed: rates(
        conversations.flatMap(({ scenarioId, distress }) =>
          distress === undefined ? [] : [{ scenarioId, flagged: distress ? !distress.handled : null }],
        ),
      ),
      judge: judgeRates(conversations),
    };
    const runName = `${new Date().toISOString().slice(0, 16).replace(':', 'h')}-${commit()}`;
    await mkdir('eval-results', { recursive: true });
    const path = `eval-results/${runName}.json`;
    await Bun.write(
      path,
      JSON.stringify({ runName, model: config.mistral.model, conversations: items.length, summary, results: conversations }, null, 2),
    );

    console.log(`\n${path}\nleaks:\n${summary.leaks.map(line).join('\n')}\nartifacts:\n${summary.artifacts.map(line).join('\n')}`);
    if (summary.distressMissed.length > 0) console.log(`distress not handled:\n${summary.distressMissed.map(line).join('\n')}`);
    for (const [id, failed] of Object.entries(summary.judge)) {
      console.log(failed.length > 0 ? `judge, ${id} failed:\n${failed.map(line).join('\n')}` : `judge, ${id}: no verdict, every answer unknown`);
    }
    const failedJudgeCalls = judgeErrors(conversations);
    if (failedJudgeCalls > 0) console.error(`${String(failedJudgeCalls)} judge call(s) failed: no verdict for them`);
    const failures = conversations.filter(({ transcript }) => cutShort(transcript));
    if (failures.length > 0) console.error(`${String(failures.length)} conversation(s) cut short by an error: ${failures.map(keyOf).join(', ')}`);
    return failures.length > 0 || failedJudgeCalls > 0 ? 1 : 0;
  } finally {
    await tasks.settled();
    await database.close();
  }
}

if (import.meta.main) process.exit(await main());
