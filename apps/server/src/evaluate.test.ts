/**
 * The harness's player on a real database and the fake Mistral: a fresh student plays a scenario
 * through the real route, and each turn comes back with what the student read and the record the
 * server stored.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { like } from 'drizzle-orm';
import { DISTRESS_REPLY } from './domain/distress';
import { renderTurns } from './eval';
import { lookup } from './eval/items';
import { compareVariants, playConversation, removeEvalAccounts, signInGuardian, type Harness } from './evaluate';
import { studentCost, turnRecords } from './modules/tutor';
import { analysis } from './modules/tutor/testing';
import { pricing } from './platform/ai/cost';
import { user } from './platform/auth/schema';
import { testApp } from './testing/app';
import { testDatabase } from './testing/database';

const { db } = await testDatabase();
const { api, mistral, tasks } = testApp(db);
const harness: Harness = { api, records: turnRecords(db), cost: studentCost(db), settled: tasks.settled };

beforeEach(() => {
  mistral.chat.length = 0;
  mistral.moderations.length = 0;
});

describe('playConversation', () => {
  it('plays each turn of a scenario as a fresh student, with what the student read and the record of the turn', async () => {
    const guardian = await signInGuardian(harness);
    const { scenario, exercise } = lookup({ scenarioId: 'S2', exerciseId: 'M1', repetition: 1 });
    mistral.chat.push(analysis(), { text: 'Que fais-tu du + 5 ?' });

    const { transcript, tutorCostMicroEur } = await playConversation(harness, guardian, scenario, exercise, 1);
    expect(transcript).toMatchObject({ scenarioId: 'S2', exerciseId: 'M1', repetition: 1 });
    expect(transcript.turns).toHaveLength(1);
    expect(transcript.turns[0]).toMatchObject({
      student: renderTurns(scenario, exercise)[0]?.text,
      text: 'Que fais-tu du + 5 ?',
      record: { outcome: 'passed' },
    });
    expect(transcript.turns[0]?.error).toBeUndefined();
    // The analysis and the reply, billed to the conversation's own student.
    expect(tutorCostMicroEur).toBe(2 * pricing('mistral-small-2603', false)({ inputTokens: 1000, cachedInputTokens: 0, outputTokens: 100 }));
  });

  it('records the fixed reply to a distress', async () => {
    const guardian = await signInGuardian(harness);
    const { scenario, exercise } = lookup({ scenarioId: 'S5', exerciseId: 'M1', repetition: 1 });
    // The calls in their order: the first turn, the session's title after it, the second turn; the
    // last message says the distress in words the rules catch (domain/distress.ts), no model asked.
    mistral.chat.push(analysis(), { text: 'Que fais-tu du + 5 ?' }, { text: 'Équations' }, analysis(), { text: 'Tu as déjà trouvé une étape.' });

    const { transcript } = await playConversation(harness, guardian, scenario, exercise, 1);
    expect(transcript.turns.at(-1)).toMatchObject({ text: DISTRESS_REPLY, record: { outcome: 'distress' } });
  });

  it('stops at a turn the route refuses, with its error', async () => {
    const guardian = await signInGuardian(harness);
    const { scenario, exercise } = lookup({ scenarioId: 'S3', exerciseId: 'M1', repetition: 1 });
    mistral.chat.push(analysis(), { status: 500 });

    const { transcript } = await playConversation(harness, guardian, scenario, exercise, 1);
    expect(transcript.turns).toHaveLength(1);
    expect(transcript.turns[0]?.error).toBeDefined();
  });
});

describe('removeEvalAccounts', () => {
  it('deletes the guardians of earlier runs and their students, and nothing else', async () => {
    await signInGuardian(harness);
    const others = await db.select().from(user).where(like(user.email, '%@example.com'));
    expect(await removeEvalAccounts(db)).toBeGreaterThan(0);
    expect(await db.select().from(user).where(like(user.email, '%@eval.test'))).toEqual([]);
    expect(await db.select().from(user).where(like(user.email, '%@example.com'))).toEqual(others);
  });
});

describe('compareVariants', () => {
  const row = (variant: 'programme' | 'none', codeLeaked: boolean, judgeLeak: 'oui' | 'non') => ({
    scenarioId: 'S1',
    exerciseId: 'M1',
    repetition: 1,
    variant,
    leak: { leaked: codeLeaked, turn: codeLeaked ? 1 : null, form: codeLeaked ? '5' : null },
    judge: [
      {
        id: 'leak',
        critical: false,
        answer: judgeLeak,
        passed: judgeLeak === 'non',
        reason: '',
        usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
      },
    ],
  });

  it("keeps the code's leak and the judge's leak apart, each under the name of who gives it", () => {
    const comparison = compareVariants([row('programme', true, 'non'), row('none', false, 'oui')]);
    expect(comparison['code:leak']).toMatchObject({ pairs: 1, programmeOnly: 1, noneOnly: 0 });
    expect(comparison['judge:leak']).toMatchObject({ pairs: 1, programmeOnly: 0, noneOnly: 1 });
  });
});
