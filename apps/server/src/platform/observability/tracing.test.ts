import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { SpanStatusCode } from '@opentelemetry/api';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';
import { tool } from 'ai';
import { z } from 'zod';
import { testAi } from '../../testing/ai';
import type { AgentCall } from '../ai/client';
import { startTracing } from './tracing';

const { ai, mistral } = await testAi();
const exporter = new InMemorySpanExporter();
const tracing = startTracing({ publicKey: 'pk-lf-test', secretKey: 'sk-lf-test', baseUrl: 'http://127.0.0.1:9' }, { environment: 'eval', exporter });
afterAll(() => tracing.shutdown());
beforeEach(() => {
  exporter.reset();
});

const tools = {
  note: tool({ description: 'Note a homework.', inputSchema: z.object({ task: z.string() }), execute: () => 'Devoir noté pour Léa' }),
};
const call: AgentCall<typeof tools> = {
  operation: 'tom',
  owner: null,
  instructions: 'Consigne du tuteur',
  messages: [{ role: 'user', content: 'Message de Léa' }],
  tools,
  maxSteps: 3,
  activeTools: () => ['note'],
};
const exported = async () => {
  await tracing.flush();
  return exporter.getFinishedSpans();
};

describe('startTracing', () => {
  it("exports an agent loop's model, tokens and duration, and none of its text: instructions, messages, tools' inputs and outputs, reply", async () => {
    mistral.chat.push({ toolCalls: [{ name: 'note', input: { task: 'Exercice de Léa' } }] }, { text: 'Réponse de Tom', reasoning: 'Pensée de Tom' });
    await ai.runAgent(call);

    const spans = await exported();
    expect(spans.some((span) => span.attributes['gen_ai.request.model'] === 'mistral-small-2603')).toBe(true);
    // One Langfuse project: the environment keeps production apart from the eval's runs.
    expect(spans.every((span) => span.attributes['langfuse.environment'] === 'eval')).toBe(true);
    const sent = JSON.stringify(spans.map(({ name, attributes, events, status }) => ({ name, attributes, events, status })));
    for (const text of ['Consigne du tuteur', 'Message de Léa', 'Exercice de Léa', 'Devoir noté pour Léa', 'Réponse de Tom', 'Pensée de Tom']) {
      expect(sent).not.toContain(text);
    }
  });

  it('exports no span of a failed call, whose error message may hold what the model wrote', async () => {
    mistral.chat.push({ status: 500 });
    const failure: unknown = await ai.runAgent(call).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);

    const spans = await exported();
    expect(spans.filter((span) => span.status.code === SpanStatusCode.ERROR)).toEqual([]);
    // Nor does a span of the call that did not fail itself carry the error.
    expect(spans.flatMap((span) => span.events).filter((event) => event.name === 'exception')).toEqual([]);
    expect(JSON.stringify(spans.map(({ attributes, status }) => ({ attributes, status })))).not.toContain('Internal Server Error');
  });
});
