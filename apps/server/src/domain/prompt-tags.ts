/**
 * The tag of the evening's block the server writes at the head of the student's message
 * (modules/tutor/turn.ts). No reply that reaches the student may hold it, nor may the student's
 * own words, which could forge a block; the harness looks for it in what the student reads.
 */

export const EVENING_TAG = 'soiree';

/** An opening or closing tag of the block, attributes included. */
export const PROMPT_TAG = new RegExp(`</?${EVENING_TAG}\\b[^>]*>`, 'i');

const PROMPT_TAGS = new RegExp(PROMPT_TAG.source, 'gi');

/** The text without the block's tags, removed until removing one cannot join the text around it into another. */
export function stripPromptTags(content: string): string {
  let stripped = content;
  for (let previous = ''; previous !== stripped;) {
    previous = stripped;
    stripped = stripped.replace(PROMPT_TAGS, '');
  }
  return stripped;
}
