/**
 * The traces of the AI calls, sent to Langfuse Cloud, EU region (docs/architecture.md,
 * « Observabilité »): the AI SDK's own telemetry, set up as Langfuse documents it
 * (langfuse.com/integrations/frameworks/vercel-ai-sdk), without any text: each call turns its
 * inputs and outputs off (platform/ai/client.ts). A failed call leaves its error message and stack
 * in the span whatever that says, and a validation error puts the model's output there: no span
 * of an error is exported; errors are the logs' (logger.ts). Bun needs the context manager set by
 * hand, or the spans of a call do not nest (@opentelemetry/sdk-trace, README).
 */

import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { TracerProvider, type SpanExporter } from '@opentelemetry/sdk-trace';
import { isDefaultExportSpan, LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { registerTelemetry } from 'ai';
import type { LangfuseConfig } from '../../config';

export interface Tracing {
  flush: () => Promise<void>;
  /** Sends what is left, then stops tracing. */
  shutdown: () => Promise<void>;
}

/** `exporter` replaces Langfuse's, for a test that reads what would be sent. */
export function startTracing(langfuse: LangfuseConfig, { exporter }: { exporter?: SpanExporter } = {}): Tracing {
  const processor = new LangfuseSpanProcessor({
    ...langfuse,
    ...(exporter && { exporter }),
    shouldExportSpan: ({ otelSpan }) => isDefaultExportSpan(otelSpan) && otelSpan.status.code !== SpanStatusCode.ERROR,
  });
  const provider = new TracerProvider({ spanProcessors: [processor] });
  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  trace.setGlobalTracerProvider(provider);
  registerTelemetry(new LangfuseVercelAiSdkIntegration());
  return {
    flush: () => processor.forceFlush(),
    shutdown: async () => {
      await provider.shutdown();
      // Registered globally: a later call is no longer traced.
      globalThis.AI_SDK_TELEMETRY_INTEGRATIONS = undefined;
      trace.disable();
      context.disable();
    },
  };
}
