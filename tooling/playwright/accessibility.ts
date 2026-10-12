import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.2, levels A and AA, in axe-core's tags (https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#axe-core-tags). */
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** How long a state may take to settle once a test has reached it. */
const SETTLE_MS = 5_000;

/**
 * The animations and transitions on their way that have not ended within SETTLE_MS, described.
 * Only what ends by itself is waited for: an endless animation, one at a standstill
 * (`playbackRate` 0) or one driven by scrolling is a state of the screen, not a passage.
 */
function unsettled(page: Page) {
  return page.evaluate(async (timeout) => {
    const settling = document
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === 'running' &&
          animation.playbackRate !== 0 &&
          animation.timeline === document.timeline &&
          animation.effect?.getComputedTiming().endTime !== Infinity,
      );
    const ended = Promise.all(settling.map((animation) => animation.finished.catch(() => undefined)));
    await Promise.race([ended, new Promise((resolve) => setTimeout(resolve, timeout))]);
    return settling
      .filter((animation) => animation.playState === 'running')
      .map((animation) => {
        const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
        const what =
          animation instanceof CSSTransition
            ? `transition of ${animation.transitionProperty}`
            : animation instanceof CSSAnimation
              ? `animation ${animation.animationName}`
              : 'animation';
        return `${what} on ${target ? [target.tagName.toLowerCase(), ...target.classList].join('.') : 'no element'}`;
      });
  }, SETTLE_MS);
}

/**
 * The screen, once its transitions have ended, breaks none of the WCAG 2.2 A and AA rules axe
 * checks: each one it breaks, by rule and element.
 */
export async function expectAccessible(page: Page) {
  // A button still fading from its disabled colors would be judged on a contrast it only passes through.
  expect(await unsettled(page), `still running ${String(SETTLE_MS)} ms after the state was reached`).toEqual([]);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  expect(violations.map(({ id, nodes }) => `${id} on ${nodes.map(({ target }) => target.join(' ')).join(', ')}`)).toEqual([]);
}
