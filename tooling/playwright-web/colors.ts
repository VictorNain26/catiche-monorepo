/** Colors as the page computes them, so that a test compares computed styles, never a copied value. */

import { expect, type Page } from '@playwright/test';

/** Any CSS color (a hex, `var(--…)`) as the page computes it, `rgb(…)`. */
export function computedColor(page: Page, value: string) {
  return page.evaluate((color) => {
    const probe = document.createElement('div');
    probe.style.color = color;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, value);
}

/** A color token of packages/tokens/theme.css; an undefined one would compute to the inherited color. */
export async function token(page: Page, name: string) {
  const variable = `--color-${name}`;
  const defined = await page.evaluate((property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(), variable);
  expect(defined, `${variable} is not defined on the page`).not.toBe('');
  return computedColor(page, `var(${variable})`);
}
