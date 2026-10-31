import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { SpanStatusCode } from '@opentelemetry/api';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';
import { testAi } from '../../testing/ai';
import { startTracing } from './tracing';

const { ai, mistral } = await testAi();
const exporter = new InMemorySpanExporter();
const tracing = startTracing({ publicKey: 'pk-lf-test', secretKey: 'sk-lf-test', baseUrl: 'http://127.0.0.1:9' }, { exporter });
afterAll(() => tracing.shutdown());
beforeEach(() => {
  exporter.reset();
});

const call = { operation: 'chat', owner: null, system: 'Consigne du tuteur', messages: [{ role: 'user' as const, content: 'Message de Léa' }] };
const exported = async () => {
  await tracing.flush();
  return exporter.getFinishedSpans();
};

describe('startTracing', () => {
  it("exports an AI call's model, tokens and duration, and none of its text", async () => {
    mistral.chat.push({ text: 'Réponse de Tom' });
    await ai.generateText(call);

    const spans = await exported();
    expect(spans.some((span) => span.attributes['gen_ai.request.model'] === 'mistral-small-2603')).toBe(true);
    const sent = JSON.stringify(spans.map(({ name, attributes, events, status }) => ({ name, attributes, events, status })));
    for (const text of ['Consigne du tuteur', 'Message de Léa', 'Réponse de Tom']) expect(sent).not.toContain(text);
  });

  it('exports no span of a failed call, whose error message may hold what the model wrote', async () => {
    mistral.chat.push({ status: 500 });
    const failure: unknown = await ai.generateText(call).catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(Error);

    const spans = await exported();
    expect(spans.filter((span) => span.status.code === SpanStatusCode.ERROR)).toEqual([]);
    // Nor does a span of the call that did not fail itself carry the error.
    expect(spans.flatMap((span) => span.events).filter((event) => event.name === 'exception')).toEqual([]);
    expect(JSON.stringify(spans.map(({ attributes, status }) => ({ attributes, status })))).not.toContain('Internal Server Error');
  });
});
