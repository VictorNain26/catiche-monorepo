/**
 * A message of a session as the AI SDK's `UIMessage`, the shape its persistence guide stores
 * (`ai/docs/04-ai-sdk-ui/03-chatbot-message-persistence.mdx`): the student's text; Tom's checked
 * text, the reasoning behind a reply that passed, and how the turn ended.
 */

import type { UIMessage } from 'ai';
import { z } from 'zod';

/** Passed the check; replaced by the fixed reply; a distress's fixed reply; any message of a session it closed. */
const TURN_OUTCOMES = ['passed', 'fallback', 'distress', 'closed'] as const;
export type TurnOutcome = (typeof TURN_OUTCOMES)[number];

export const metadataSchema = z.object({ outcome: z.enum(TURN_OUTCOMES) }).optional();

export type TomMessage = UIMessage<z.infer<typeof metadataSchema>>;

/** What a message says, its text parts joined: never its reasoning. */
export const textOf = (message: Pick<TomMessage, 'parts'>) => message.parts.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('');
