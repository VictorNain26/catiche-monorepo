/**
 * Mistral calls that are not streamed, through the AI SDK and its Mistral provider: plain text,
 * output validated by a Zod schema (Mistral's `json_schema`, strict), and a loop of the model and
 * its tools. Each call, each step of a loop, is written to `ai_cost` for its student, an answer
 * outside the schema too: it was billed all the same.
 */

import { createMistral, type MistralLanguageModelChatOptions } from '@ai-sdk/mistral';
import {
  generateText as generate,
  isStepCount,
  NoObjectGeneratedError,
  Output,
  ToolLoopAgent,
  TypeValidationError,
  type ToolSet,
  type LanguageModelUsage,
  type AssistantModelMessage,
  type ModelMessage,
  type ToolModelMessage,
} from 'ai';
import type { Logger } from 'pino';
import type { z } from 'zod';
import type { MistralConfig } from '../../config';
import type { ReasoningEffort } from '../../domain/reasoning-effort';
import type { Db } from '../db/client';
import { pricing, type Usage } from './cost';
import { insertCost } from './repository';

/** What a model call answers, as `response.messages` gives it: the assistant's messages and tool results. */
export type ResponseMessage = AssistantModelMessage | ToolModelMessage;

/** Who a call is billed to: a student, or nobody outside a student (evaluation, live tests). */
type Owner = { studentId: string } | null;

export interface TextCall {
  /** What the call is for, written with its cost: `turn-analysis`, `exercise-sheet`… */
  operation: string;
  owner: Owner;
  system: string;
  messages: ModelMessage[];
  temperature?: number;
  /** Ignored with `reasoningEffort: 'high'`: the thinking counts in the output, the timeout bounds the call. */
  maxOutputTokens?: number;
  /** Mistral's prompt cache: stable while the start of the prompt is (docs.mistral.ai/api/endpoint/chat). */
  promptCacheKey?: string;
  reasoningEffort?: ReasoningEffort;
  /** A deadline shorter than the configured one, for a call the turn waits on; never longer. */
  timeoutMs?: number;
}

/**
 * A loop of the model and its tools (`ToolLoopAgent` of the AI SDK): the model calls the tools it
 * is offered, reads what they answer, and ends on words. Its last step offers no tool, so that no
 * limit of steps ends it without a reply.
 */
export interface AgentCall<TOOLS extends ToolSet> {
  operation: string;
  owner: Owner;
  instructions: string;
  messages: ModelMessage[];
  tools: TOOLS;
  maxSteps: number;
  /** The tools the model may call at a step, read again at each: a tool may change what the next allows. */
  activeTools: (step: number) => (keyof TOOLS & string)[] | Promise<(keyof TOOLS & string)[]>;
  promptCacheKey?: string;
}

/** What the loop ends on: the reply, the reasoning behind it, and what each tool answered on the way. */
export interface AgentReply {
  text: string;
  reasoning: string | null;
  toolResults: { toolName: string; output: unknown }[];
}

interface StructuredCall<T> extends TextCall {
  schema: z.ZodType<T>;
  schemaName: string;
  /** Sent as `random_seed`: the same seed gives the same output. */
  seed?: number;
  /** Asks once more, with the validation error, when the answer misses the schema; on by default. */
  repairInvalid?: boolean;
}

export interface Ai {
  /** The dated model every call uses. */
  model: string;
  /** The deadline that caps every call, its retries included. */
  timeoutMs: number;
  /** The text, and the response messages as the model produced them, reasoning included, for a later turn to replay. */
  generateText: (call: TextCall) => Promise<{ text: string; responseMessages: ResponseMessage[] }>;
  generateStructured: <T>(call: StructuredCall<T>) => Promise<{ object: T; usage: Usage }>;
  /** Reasons at each step; each step billed once done, those before a step that fails too. */
  runAgent: <TOOLS extends ToolSet>(call: AgentCall<TOOLS>) => Promise<AgentReply>;
}

function usageOf(usage: LanguageModelUsage | undefined): Usage {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    cachedInputTokens: usage?.inputTokenDetails.cacheReadTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
  };
}

function sum(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  };
}

export function createAi({ mistral, db, logger }: { mistral: MistralConfig; db: Db; logger: Logger }): Ai {
  // The key always passed, even empty: the provider would otherwise read MISTRAL_API_KEY itself.
  const provider = createMistral({ baseURL: `${mistral.serverUrl}/v1`, apiKey: mistral.apiKey ?? '' });
  const model = provider(mistral.model);
  // Throws at boot for a model without a price: its calls would escape the quota.
  const costOf = pricing(mistral.model, mistral.euEndpoint);

  /** A failed write is logged, never thrown: the student already has the answer. */
  async function record(call: Pick<TextCall, 'operation' | 'owner'>, usage: Usage): Promise<void> {
    if (!call.owner) return;
    try {
      await insertCost(db, {
        studentId: call.owner.studentId,
        model: mistral.model,
        operation: call.operation,
        ...usage,
        costMicroEur: costOf(usage),
      });
    } catch (err) {
      logger.error({ err, operation: call.operation }, 'AI cost not written');
    }
  }

  const deadline = (call: TextCall) => Math.min(call.timeoutMs ?? Infinity, mistral.timeoutMs);

  function settings(call: TextCall, abortSignal: AbortSignal) {
    const reasoning = call.reasoningEffort ?? 'none';
    return {
      model,
      system: call.system,
      ...(call.temperature === undefined ? {} : { temperature: call.temperature }),
      ...(reasoning === 'high' || call.maxOutputTokens === undefined ? {} : { maxOutputTokens: call.maxOutputTokens }),
      maxRetries: mistral.retryAttempts,
      abortSignal,
      // Traced without any text: no prompt, no student's words, no reply (observability/tracing.ts).
      telemetry: { recordInputs: false, recordOutputs: false, functionId: call.operation },
      providerOptions: {
        mistral: {
          reasoningEffort: reasoning,
          ...(call.promptCacheKey === undefined ? {} : { promptCacheKey: call.promptCacheKey }),
          strictJsonSchema: true,
        } satisfies MistralLanguageModelChatOptions,
      },
    };
  }

  return {
    model: mistral.model,
    timeoutMs: mistral.timeoutMs,

    async generateText(call) {
      const result = await generate({ ...settings(call, AbortSignal.timeout(deadline(call))), messages: call.messages });
      await record(call, usageOf(result.usage));
      return { text: result.text, responseMessages: result.responseMessages };
    },

    async runAgent<TOOLS extends ToolSet>(call: AgentCall<TOOLS>): Promise<AgentReply> {
      const last = call.maxSteps - 1;
      // Over the plain ToolSet: the tools' types serve the caller, the loop only runs them.
      const agent = new ToolLoopAgent<never, ToolSet>({
        model,
        instructions: call.instructions,
        tools: call.tools,
        // The writes of a step run in the order the model wrote them.
        toolCallConcurrency: 1,
        stopWhen: isStepCount(call.maxSteps),
        prepareStep: async ({ stepNumber }) => ({ activeTools: stepNumber >= last ? [] : await call.activeTools(stepNumber) }),
        maxRetries: mistral.retryAttempts,
        // Traced without any text: no instruction, no student's words, no tool's input or output, no reply.
        telemetry: { recordInputs: false, recordOutputs: false, functionId: call.operation },
        providerOptions: {
          mistral: {
            reasoningEffort: 'high',
            ...(call.promptCacheKey === undefined ? {} : { promptCacheKey: call.promptCacheKey }),
          } satisfies MistralLanguageModelChatOptions,
        },
      });
      const result = await agent.generate({
        messages: call.messages,
        timeout: { stepMs: mistral.timeoutMs, totalMs: call.maxSteps * mistral.timeoutMs },
        onStepEnd: (step) => record(call, usageOf(step.usage)),
      });
      return {
        text: result.text,
        reasoning: result.finalStep.reasoningText ?? null,
        toolResults: result.steps.flatMap((step) => step.toolResults.map(({ toolName, output }) => ({ toolName, output: output as unknown }))),
      };
    },

    async generateStructured<T>(call: StructuredCall<T>) {
      // One deadline for the call and its repair.
      const abortSignal = AbortSignal.timeout(deadline(call));
      const attempt = async (messages: ModelMessage[]) => {
        try {
          const result = await generate({
            ...settings(call, abortSignal),
            messages,
            output: Output.object({ schema: call.schema, name: call.schemaName }),
            ...(call.seed === undefined ? {} : { seed: call.seed }),
          });
          const usage = usageOf(result.usage);
          await record(call, usage);
          return { object: result.output, usage };
        } catch (error) {
          if (NoObjectGeneratedError.isInstance(error)) await record(call, usageOf(error.usage));
          throw error;
        }
      };

      try {
        return await attempt(call.messages);
      } catch (error) {
        if (call.repairInvalid === false || !NoObjectGeneratedError.isInstance(error) || !TypeValidationError.isInstance(error.cause)) throw error;
        const repaired = await attempt([
          ...call.messages,
          { role: 'assistant', content: error.text ?? '' },
          { role: 'user', content: `Ta réponse ne respecte pas le schéma attendu : ${error.cause.message}. Renvoie un JSON corrigé.` },
        ]);
        return { object: repaired.object, usage: sum(usageOf(error.usage), repaired.usage) };
      }
    },
  };
}
