/**
 * The AI client on a real database, against the fake Mistral: what reaches Mistral, what the
 * student is billed, and how a call ends when Mistral misbehaves.
 */

import { beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import pino from 'pino';
import { z } from 'zod';
import { testDatabase } from '../../testing/database';
import { fakeMistral } from '../../testing/mistral';
import { user } from '../auth/schema';
import { tool } from 'ai';
import { createAi, type AgentCall } from './client';
import { aiCost } from './schema';

const { db } = await testDatabase();
const mistral = fakeMistral();
// The error a call ends on, or null when it answers.
const failure = (call: Promise<unknown>) =>
  call.then(
    () => null,
    (error: unknown) => error,
  );
const lines: Record<string, unknown>[] = [];
const logger = pino({ level: 'warn' }, { write: (line: string) => lines.push(JSON.parse(line) as Record<string, unknown>) });

const STUDENT = 'student-1';
await db.insert(user).values({ id: STUDENT, name: 'Léa', email: 'lea@tom.example' });

beforeEach(async () => {
  mistral.chat.length = 0;
  mistral.received.length = 0;
  lines.length = 0;
  await db.delete(aiCost);
});

const noted: unknown[] = [];
beforeEach(() => {
  noted.length = 0;
});
const tools = {
  note: tool({
    description: 'Note a homework.',
    inputSchema: z.object({ task: z.string() }),
    execute: ({ task }) => {
      noted.push(task);
      return `noté : ${task}`;
    },
  }),
  calculate: tool({ description: 'Calculate.', inputSchema: z.object({ expression: z.string() }), execute: () => '4' }),
};
const agentCall = (overrides: Partial<AgentCall<typeof tools>> = {}): AgentCall<typeof tools> => ({
  operation: 'tom',
  owner: { studentId: STUDENT },
  instructions: 'Tu es Tom.',
  messages: [{ role: 'user', content: 'J’ai les exercices 3 et 4' }],
  tools,
  maxSteps: 3,
  activeTools: () => ['note'],
  ...overrides,
});

const sentBody = (index = 0) => mistral.received.filter((r) => r.path === '/v1/chat/completions')[index]?.body ?? {};
const costs = () => db.select().from(aiCost).where(eq(aiCost.studentId, STUDENT));

describe('the client', () => {
  const ai = createAi({ mistral: mistral.config(), db, logger });

  it('bills the student for the tokens Mistral reports', async () => {
    mistral.chat.push({ text: 'Une fraction', usage: { prompt_tokens: 1000, completion_tokens: 100 } });
    expect((await ai.runAgent(agentCall())).text).toBe('Une fraction');
    // Outside the EU endpoint, no upcharge: 0,00021 $ × 0,85.
    expect(await costs()).toMatchObject([{ operation: 'tom', model: 'mistral-small-2603', inputTokens: 1000, outputTokens: 100, costMicroEur: 179 }]);
  });

  it('bills nobody outside a student', async () => {
    mistral.chat.push({ text: 'ok' });
    await ai.runAgent(agentCall({ owner: null }));
    expect(await db.select().from(aiCost)).toEqual([]);
  });

  it('keeps the answer when the cost cannot be written, and logs it', async () => {
    mistral.chat.push({ text: 'ok' });
    expect((await ai.runAgent(agentCall({ owner: { studentId: 'nobody' } }))).text).toBe('ok');
    expect(lines).toContainEqual(expect.objectContaining({ msg: 'AI cost not written', operation: 'tom' }));
  });

  it('refuses to start on a model without a price, whose calls no quota could bound', () => {
    expect(() => createAi({ mistral: mistral.config({ model: 'mistral-small-2609' }), db, logger })).toThrow('No price');
  });

  it('fails at its deadline when Mistral hangs', async () => {
    const hasty = createAi({ mistral: mistral.config({ timeoutMs: 300 }), db, logger });
    mistral.chat.push('hang');
    const start = performance.now();
    expect(await failure(hasty.runAgent(agentCall()))).toBeInstanceOf(Error);
    expect(performance.now() - start).toBeLessThan(1_000);
  });

  it('retries an unavailable Mistral as many times as configured', async () => {
    const patient = createAi({ mistral: mistral.config({ retryAttempts: 1, timeoutMs: 10_000 }), db, logger });
    mistral.chat.push({ status: 503 }, { text: 'ok' });
    expect((await patient.runAgent(agentCall())).text).toBe('ok');
    expect(mistral.received).toHaveLength(2);
  }, 10_000);

  it('fails on a refusal, without billing', async () => {
    mistral.chat.push({ status: 400 });
    expect(await failure(ai.runAgent(agentCall()))).toBeInstanceOf(Error);
    expect(await costs()).toEqual([]);
  });
});

describe('runAgent', () => {
  const ai = createAi({ mistral: mistral.config(), db, logger });
  const sentTools = (index: number) => ((sentBody(index)['tools'] ?? []) as { function: { name: string } }[]).map((t) => t.function.name);

  it('runs the tools the model calls, then answers in words, each step billed under the operation', async () => {
    mistral.chat.push(
      { toolCalls: [{ name: 'note', input: { task: 'exercices 3 et 4' } }] },
      { text: 'Pour quand ?', reasoning: 'Il manque la date.' },
    );
    const reply = await ai.runAgent(agentCall());
    expect(reply).toMatchObject({ text: 'Pour quand ?', reasoning: 'Il manque la date.' });
    expect(noted).toEqual(['exercices 3 et 4']);
    expect(await costs()).toMatchObject([{ operation: 'tom' }, { operation: 'tom' }]);
    // The second step reads what the tool answered.
    expect(JSON.stringify(sentBody(1)['messages'])).toContain('noté : exercices 3 et 4');
  });

  it('reasons, with the instructions first and the cache key', async () => {
    mistral.chat.push({ text: 'Bonsoir' });
    await ai.runAgent(agentCall({ promptCacheKey: 'session-1' }));
    expect(sentBody()).toMatchObject({
      messages: [{ role: 'system', content: 'Tu es Tom.' }, { role: 'user' }],
      reasoning_effort: 'high',
      prompt_cache_key: 'session-1',
    });
  });

  it('offers at each step the tools it allows, and none at the last, which answers in words', async () => {
    mistral.chat.push(
      { toolCalls: [{ name: 'note', input: { task: 'a' } }] },
      { toolCalls: [{ name: 'calculate', input: { expression: '2+2' } }] },
      { text: 'Voilà.' },
    );
    const reply = await ai.runAgent(agentCall({ activeTools: (step) => (step === 0 ? ['note'] : ['note', 'calculate']) }));
    expect([sentTools(0), sentTools(1), sentTools(2)]).toEqual([['note'], ['note', 'calculate'], []]);
    expect(reply.text).toBe('Voilà.');
  });

  it('gives what each tool answered, for the turn to check the reply against', async () => {
    mistral.chat.push({ toolCalls: [{ name: 'calculate', input: { expression: '2+2' } }] }, { text: 'Et ensuite ?' });
    const reply = await ai.runAgent(agentCall({ activeTools: () => ['calculate'] }));
    expect(reply.toolResults).toEqual([{ toolName: 'calculate', output: '4' }]);
  });

  it('bills the steps done when a later one fails', async () => {
    mistral.chat.push({ toolCalls: [{ name: 'note', input: { task: 'a' } }] }, { status: 500 });
    expect(await failure(ai.runAgent(agentCall()))).toBeInstanceOf(Error);
    expect(await costs()).toHaveLength(1);
  });
});

describe('generateStructured', () => {
  const ai = createAi({ mistral: mistral.config(), db, logger });
  const schema = z.object({ answer: z.number() });
  const structured = (overrides: { repairInvalid?: boolean; seed?: number } = {}) => ({
    operation: 'judge',
    owner: { studentId: STUDENT },
    system: 'Tu juges.',
    messages: [{ role: 'user' as const, content: 'Une conversation' }],
    temperature: 0,
    promptCacheKey: 'judge-1',
    schema,
    schemaName: 'sheet',
    ...overrides,
  });

  it('returns the validated object, Mistral held to the schema', async () => {
    mistral.chat.push({ json: { answer: 42 }, usage: { prompt_tokens: 500, completion_tokens: 20 } });
    expect(await ai.generateStructured(structured({ seed: 7 }))).toEqual({
      object: { answer: 42 },
      usage: { inputTokens: 500, cachedInputTokens: 0, outputTokens: 20 },
    });
    expect(sentBody()).toMatchObject({
      messages: [{ role: 'system', content: 'Tu juges.' }, { role: 'user' }],
      reasoning_effort: 'none',
      temperature: 0,
      prompt_cache_key: 'judge-1',
      random_seed: 7,
      response_format: { type: 'json_schema', json_schema: { name: 'sheet', strict: true } },
    });
  });

  it('asks once more with the validation error, and bills both calls', async () => {
    mistral.chat.push({ json: { answer: 'quarante-deux' } }, { json: { answer: 42 } });
    const result = await ai.generateStructured(structured());
    expect(result.object).toEqual({ answer: 42 });
    expect(result.usage).toEqual({ inputTokens: 2000, cachedInputTokens: 0, outputTokens: 200 });
    expect(JSON.stringify(sentBody(1)['messages'])).toContain('ne respecte pas le schéma attendu');
    expect(await costs()).toHaveLength(2);
  });

  it('fails without asking again when told not to, the answer billed all the same', async () => {
    mistral.chat.push({ json: { answer: 'quarante-deux' } });
    expect(await failure(ai.generateStructured(structured({ repairInvalid: false })))).toBeInstanceOf(Error);
    expect(mistral.received).toHaveLength(1);
    expect(await costs()).toHaveLength(1);
  });

  it('fails when the repair misses the schema too', async () => {
    mistral.chat.push({ json: { answer: 'un' } }, { json: { answer: 'deux' } });
    expect(await failure(ai.generateStructured(structured()))).toBeInstanceOf(Error);
    expect(mistral.received).toHaveLength(2);
  });
});
