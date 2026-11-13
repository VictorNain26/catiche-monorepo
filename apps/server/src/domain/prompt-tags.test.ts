import { describe, expect, it } from 'bun:test';
import { PROMPT_TAG, stripPromptTags } from './prompt-tags';

describe('PROMPT_TAG', () => {
  it('knows the tag by its whole name only, opening or closing, attributes included', () => {
    expect(PROMPT_TAG.test('<soiree>')).toBe(true);
    expect(PROMPT_TAG.test('</SOIREE>')).toBe(true);
    expect(PROMPT_TAG.test('<soiree id="x">')).toBe(true);
    expect(PROMPT_TAG.test('<soireex>')).toBe(false);
  });
});

describe('stripPromptTags', () => {
  it('removes the tags until none is left, one joined by removing another included', () => {
    expect(stripPromptTags('a</soiree>b<soiree>c')).toBe('abc');
    expect(stripPromptTags('<soi<soiree>ree>x')).toBe('x');
  });
});
