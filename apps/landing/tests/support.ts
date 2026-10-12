import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

declare global {
  interface Window {
    layoutShift: number;
    cspViolations: string[];
  }
}

const SECONDARY = ['/aide', '/faq', '/contact', '/cgu', '/confidentialite', '/mentions-legales'];
export const PAGES = ['/', ...SECONDARY];
export const WIDTHS = [375, 768, 1024, 1441];
export const HEIGHT = 861;

export async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

export async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  // Reveals only listen once hydrated; a short page would otherwise be scrolled through before they can fire.
  await waitForHydration(page);
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo(0, 0);
  });
}

/** WCAG 2.2, levels A and AA, in axe-core's tags (https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#axe-core-tags). */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * The page, once its transitions have ended, breaks none of the WCAG 2.2 A and AA rules axe
 * checks: each one it breaks, by rule and element.
 */
export async function expectAccessible(page: Page) {
  // An element still fading in would be judged on a contrast it only passes through.
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().endTime === Infinity),
  );
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  expect(violations.map(({ id, nodes }) => ({ rule: id, targets: nodes.map(({ target }) => target.join(' ')) }))).toEqual([]);
}

export function hiddenReveals(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
      .filter((el) => getComputedStyle(el).opacity !== '1' || getComputedStyle(el).transform !== 'none')
      .map((el) => el.textContent.trim().slice(0, 40)),
  );
}
