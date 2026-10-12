import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.2, levels A and AA, in axe-core's tags (https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#axe-core-tags). */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** The screen as it stands breaks none of the WCAG 2.2 A and AA rules axe checks: each one it breaks, by rule and element. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  expect(violations.map(({ id, nodes }) => ({ rule: id, targets: nodes.map(({ target }) => target.join(' ')) }))).toEqual([]);
}
