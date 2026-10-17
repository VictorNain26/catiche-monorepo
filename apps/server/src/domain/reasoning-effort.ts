/** Mistral's reasoning efforts a call may ask (`platform/ai/client.ts`), which a turn's record keeps. */
export const REASONING_EFFORTS = ['none', 'high'] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];
