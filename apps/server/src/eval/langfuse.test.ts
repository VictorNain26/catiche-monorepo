import { afterAll, afterEach, describe, expect, it } from 'bun:test';
import { LangfuseClient } from '@langfuse/client';
import type { ScoreConfig, ScoreV3 } from '@langfuse/core';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';
import { startTracing } from '../platform/observability/tracing';
import type { Check } from './index';
import { lookup } from './items';
import type { Verdict } from './judge';
import { annotate, conversationTrace, readAgreement, scoreConfigs, sendVerdicts, traced } from './langfuse';

interface Received {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
}
type Route = (request: Received) => unknown;

/** Langfuse's public API on this machine: the real client calls it, each request kept. */
function fakeLangfuse(routes: Record<string, Route>) {
  const received: Received[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      const entry = {
        method: request.method,
        path: decodeURIComponent(url.pathname),
        query: url.searchParams,
        body: request.method === 'GET' ? undefined : ((await request.json()) as unknown),
      };
      received.push(entry);
      const route = routes[`${entry.method} ${entry.path}`];
      if (!route) return new Response('not found', { status: 404 });
      const answer = route(entry);
      return answer instanceof Response ? answer : Response.json(answer);
    },
  });
  servers.push(server);
  return { client: new LangfuseClient({ publicKey: 'pk-lf-test', secretKey: 'sk-lf-test', baseUrl: server.url.origin }), received };
}
const servers: ReturnType<typeof Bun.serve>[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.stop(true)));
});

const leak: Check = { id: 'leak', question: "Le tuteur donne-t-il la réponse de l'exercice ?", pass: 'non', critical: false };
const help: Check = { id: 'help', question: "L'aide fait-elle avancer l'élève ?", pass: 'oui', critical: false };
const usage = { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 };

const config = (name: string, description: string, extra: Partial<ScoreConfig> = {}): ScoreConfig => ({
  id: `config-${name}`,
  name,
  description,
  dataType: 'CATEGORICAL',
  isArchived: false,
  projectId: 'project',
  createdAt: '2026-10-31T00:00:00.000Z',
  updatedAt: '2026-10-31T00:00:00.000Z',
  ...extra,
});
const page = (data: unknown[], number: number, totalPages: number) => ({
  data,
  meta: { page: number, limit: 50, totalItems: data.length, totalPages },
});

describe('traced', () => {
  const exporter = new InMemorySpanExporter();
  const tracing = startTracing({ publicKey: 'pk-lf-test', secretKey: 'sk-lf-test', baseUrl: 'http://127.0.0.1:9' }, { exporter });
  afterAll(() => tracing.shutdown());

  it('sends a conversation of the run with its text, as the trace the scores are attached to', async () => {
    const { traceId, result } = await traced('E1/-/1/programme', async (record) => {
      record({ input: { situation: 'Classe : 5e' }, output: [{ role: 'user', content: 'Bonjour Tom' }], metadata: { scenarioId: 'E1' } });
      return 42;
    });
    await tracing.flush();

    expect(result).toBe(42);
    const [span] = exporter.getFinishedSpans();
    expect(span?.name).toBe('E1/-/1/programme');
    expect(span?.spanContext().traceId).toBe(traceId);
    const sent = JSON.stringify(span?.attributes);
    for (const text of ['Classe : 5e', 'Bonjour Tom']) expect(sent).toContain(text);
  });
});

describe('conversationTrace', () => {
  it('shows Victor what the judge read: the situation and expected behavior, then the conversation as a chat', () => {
    const { scenario, exercise } = lookup({ scenarioId: 'S2', exerciseId: 'M1', repetition: 1 });
    const transcript = {
      scenarioId: 'S2',
      exerciseId: 'M1',
      repetition: 1,
      turns: [{ student: 'Je bloque', text: 'Que fais-tu du + 5 ?', durationMs: 1, record: null }],
    };

    const trace = conversationTrace(scenario, exercise, transcript);

    expect(trace.input.situation).toContain(exercise.statement);
    expect(trace.input.expectedBehavior).toBe(scenario.expectedBehavior);
    expect(trace.output).toEqual([
      { role: 'user', content: 'Je bloque' },
      { role: 'assistant', content: 'Que fais-tu du + 5 ?' },
    ]);
  });
});

describe('scoreConfigs', () => {
  it("creates the config of each question that has none, the judge's answers as its categories and the question as its description", async () => {
    const { client, received } = fakeLangfuse({
      'GET /api/public/score-configs': ({ query }) =>
        query.get('page') === '2'
          ? page([config('leak', leak.question)], 2, 2)
          : page([config('help', 'an archived wording', { isArchived: true })], 1, 2),
      'POST /api/public/score-configs': ({ body }) => config((body as { name: string }).name, help.question),
    });

    const configs = await scoreConfigs(client, [leak, help, leak]);

    expect(configs).toEqual(
      new Map([
        ['leak', 'config-leak'],
        ['help', 'config-help'],
      ]),
    );
    expect(received.filter(({ method }) => method === 'POST').map(({ body }) => body)).toEqual([
      {
        name: 'help',
        dataType: 'CATEGORICAL',
        categories: [
          { label: 'oui', value: 1 },
          { label: 'non', value: 0 },
          { label: 'inconnu', value: -1 },
        ],
        description: help.question,
      },
    ]);
  });

  it('refuses a question reworded under its id: the answers given to the old wording would count for the new', async () => {
    const { client } = fakeLangfuse({ 'GET /api/public/score-configs': () => page([config('leak', 'an older wording')], 1, 1) });

    expect(scoreConfigs(client, [leak])).rejects.toThrow('leak');
  });
});

describe('sendVerdicts', () => {
  const verdicts: Verdict[] = [
    { id: 'leak', critical: false, answer: 'non', passed: true, reason: 'Tom ne donne que des pistes.', usage },
    { id: 'help', critical: false, error: 'timeout' },
  ];
  const configs = new Map([
    ['leak', 'config-leak'],
    ['help', 'config-help'],
  ]);

  it("sends each verdict as a score of the trace, under its question's config, the reason as its comment", async () => {
    const { client, received } = fakeLangfuse({
      'POST /api/public/scores': () => new Response(JSON.stringify({ message: 'Accepted' }), { status: 202 }),
    });

    await sendVerdicts(client, 'trace-1', verdicts, configs);

    // A failed call has no verdict: nothing is sent for it.
    expect(received.map(({ body }) => body)).toEqual([
      [{ id: 'trace-1-leak', traceId: 'trace-1', name: 'leak', value: 'non', configId: 'config-leak', comment: 'Tom ne donne que des pistes.' }],
    ]);
  });

  it('throws when Langfuse rejects a score, with its reason', async () => {
    const { client } = fakeLangfuse({
      'POST /api/public/scores': () => Response.json({ accepted: 0, rejected: 1, errors: [{ message: 'value not in config' }] }, { status: 207 }),
    });

    expect(sendVerdicts(client, 'trace-1', verdicts, configs)).rejects.toThrow('value not in config');
  });
});

describe('annotate', () => {
  it("opens a queue per scenario of the run, with its questions only, and puts the scenario's conversations in it", async () => {
    const { client, received } = fakeLangfuse({
      'POST /api/public/annotation-queues': ({ body }) => ({ id: `queue-${(body as { name: string }).name}` }),
      'POST /api/public/annotation-queues/queue-run E1/items': () => ({ id: 'item' }),
      'POST /api/public/annotation-queues/queue-run E2/items': () => ({ id: 'item' }),
    });
    const configs = new Map([
      ['leak', 'config-leak'],
      ['help', 'config-help'],
    ]);

    const queues = await annotate(
      client,
      'run',
      [
        { scenarioId: 'E1', name: 'La soirée', questions: [leak, help], traceIds: ['t1', 't2'] },
        { scenarioId: 'E2', name: 'Le contrôle', questions: [help], traceIds: ['t3'] },
      ],
      configs,
    );

    expect(queues).toEqual(['run E1', 'run E2']);
    expect(received.map(({ path, body }) => ({ path, body }))).toEqual([
      { path: '/api/public/annotation-queues', body: { name: 'run E1', description: 'La soirée', scoreConfigIds: ['config-leak', 'config-help'] } },
      { path: '/api/public/annotation-queues/queue-run E1/items', body: { objectId: 't1', objectType: 'TRACE' } },
      { path: '/api/public/annotation-queues/queue-run E1/items', body: { objectId: 't2', objectType: 'TRACE' } },
      { path: '/api/public/annotation-queues', body: { name: 'run E2', description: 'Le contrôle', scoreConfigIds: ['config-help'] } },
      { path: '/api/public/annotation-queues/queue-run E2/items', body: { objectId: 't3', objectType: 'TRACE' } },
    ]);
  });
});

describe('readAgreement', () => {
  const score = (name: string, source: 'API' | 'ANNOTATION', trace: string, value: string): ScoreV3 => ({
    id: `${name}-${source}-${trace}`,
    projectId: 'project',
    name,
    source,
    dataType: 'CATEGORICAL',
    value,
    timestamp: '2026-10-31T00:00:00.000Z',
    environment: 'default',
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
    subject: { kind: 'trace', id: trace },
  });

  it("gives per question the κ of the judge's answers and Victor's on the conversations both answered, read page by page", async () => {
    const { client, received } = fakeLangfuse({
      'GET /api/public/v3/scores': ({ query }) =>
        query.get('cursor') === 'next'
          ? {
              data: [
                score('leak', 'API', 't3', 'oui'),
                score('leak', 'ANNOTATION', 't3', 'oui'),
                score('leak', 'API', 't4', 'non'),
                score('leak', 'ANNOTATION', 't4', 'non'),
              ],
              meta: { limit: 100 },
            }
          : {
              data: [
                score('leak', 'API', 't1', 'non'),
                score('leak', 'ANNOTATION', 't1', 'non'),
                score('leak', 'API', 't2', 'oui'),
                score('leak', 'ANNOTATION', 't2', 'non'),
                // Victor has not annotated t5 yet, nor the judge given help on t1: no pair.
                score('leak', 'API', 't5', 'oui'),
                score('help', 'ANNOTATION', 't1', 'oui'),
              ],
              meta: { limit: 100, cursor: 'next' },
            },
    });

    const agreement = await readAgreement(client, ['leak', 'help']);

    // 3 agreements in 4 pairs, the judge 2 oui 2 non, Victor 1 oui 3 non: κ = (0.75 − 0.5) / 0.5.
    expect(agreement).toEqual({ leak: { pairs: 4, kappa: 0.5, validated: false }, help: { pairs: 0, kappa: null, validated: false } });
    const [first] = received;
    expect(Object.fromEntries(first?.query ?? [])).toEqual({
      limit: '100',
      name: 'leak,help',
      source: 'API,ANNOTATION',
      dataType: 'CATEGORICAL',
      fields: 'subject',
    });
    expect(received[1]?.query.get('cursor')).toBe('next');
  });

  it('validates a question from κ ≥ 0.6', async () => {
    const { client } = fakeLangfuse({
      'GET /api/public/v3/scores': () => ({
        data: [
          score('leak', 'API', 't1', 'non'),
          score('leak', 'ANNOTATION', 't1', 'non'),
          score('leak', 'API', 't2', 'oui'),
          score('leak', 'ANNOTATION', 't2', 'oui'),
        ],
        meta: { limit: 100 },
      }),
    });

    expect(await readAgreement(client, ['leak'])).toEqual({ leak: { pairs: 2, kappa: 1, validated: true } });
  });
});
