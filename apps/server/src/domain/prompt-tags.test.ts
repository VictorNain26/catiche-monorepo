import { describe, expect, it } from 'bun:test';
import { PROMPT_TAG } from './prompt-tags';

const TEMPLATES = new Bun.Glob('modules/tutor/**/*.ts');
const SOURCE = new URL('..', import.meta.url).pathname;

// A closing tag is never TypeScript (a generic opens, it never closes with `</`), so every one in
// the tutor's sources is a tag a template writes into the prompt.
async function closingTags(): Promise<Set<string>> {
  const tags = new Set<string>();
  for await (const path of TEMPLATES.scan(SOURCE)) {
    if (path.endsWith('.test.ts')) continue;
    for (const [tag] of (await Bun.file(SOURCE + path).text()).matchAll(/<\/[a-z_]+>/g)) tags.add(tag.slice(2, -1));
  }
  return tags;
}

describe('PROMPT_TAG', () => {
  it('knows every tag the tutor writes into its prompts', async () => {
    const tags = await closingTags();
    expect(tags.size).toBeGreaterThan(10);
    expect([...tags].filter((name) => !PROMPT_TAG.test(`<${name}>`))).toEqual([]);
  });

  it('knows a tag by its whole name only', () => {
    expect(PROMPT_TAG.test('<learner_memory>')).toBe(true);
    expect(PROMPT_TAG.test('<learner_memoryx>')).toBe(false);
  });
});
