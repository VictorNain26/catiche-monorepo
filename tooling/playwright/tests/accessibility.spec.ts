import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from '../accessibility';

/** A page of its own: a title, a language, a main landmark, and what the test puts in it. */
function show(page: Page, body: string, style = '') {
  return page.setContent(
    `<!doctype html><html lang="fr"><head><title>Essai</title><style>body{background:#fff;color:#111}${style}</style></head><body><main><h1>Essai</h1>${body}</main></body></html>`,
  );
}

/** Adds a class to the element once the page has painted it: its transition then runs. */
function transition(page: Page, selector: string, className: string) {
  return page.evaluate(
    ([target, added]) =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            document.querySelector(target)?.classList.add(added);
            resolve();
          });
        });
      }),
    [selector, className] as const,
  );
}

// Past the helper's wait for transitions (accessibility.ts), well before the test's own timeout.
const PROMPTLY = 8_000;

test('passes a page that breaks no rule', async ({ page }) => {
  await show(page, '<p>Bonjour</p><button type="button">Envoyer</button>');
  await expectAccessible(page);
});

test('fails a page that breaks a rule, naming the rule and the element', async ({ page }) => {
  await show(page, '<p class="pale">Bonjour</p>', '.pale{color:#ddd}');
  // axe names an element by its shortest unique selector.
  await expect(expectAccessible(page)).rejects.toThrow('color-contrast on p');
});

test('judges a button on the colors its transition ends on, not those it passes through', async ({ page }) => {
  await show(
    page,
    '<button type="button">Envoyer</button>',
    'button{color:#ccc;background:#fff;border:0;transition:color 1.5s,background-color 1.5s}button.ready{color:#fff;background:#0b4f5c}',
  );
  await transition(page, 'button', 'ready');
  await expectAccessible(page);
});

for (const [held, style] of [
  ['an endless animation', '@keyframes turn{to{transform:rotate(1turn)}}.spinner{animation:turn 1s linear infinite}'],
  ['a scroll-driven animation', '@keyframes grow{to{transform:scaleX(1)}}.spinner{animation:grow linear;animation-timeline:scroll()}'],
] as const) {
  test(`is not held by ${held}`, async ({ page }) => {
    await show(page, '<div class="spinner" aria-hidden="true">·</div>', style);
    const start = Date.now();
    await expectAccessible(page);
    expect(Date.now() - start).toBeLessThan(PROMPTLY);
  });
}

test('is not held by an animation at a standstill', async ({ page }) => {
  await show(page, '<div class="slide" aria-hidden="true">·</div>');
  await page.evaluate(() => {
    const animation = document.querySelector('.slide')?.animate({ opacity: [0, 1] }, 1_000);
    if (animation) animation.playbackRate = 0;
  });
  const start = Date.now();
  await expectAccessible(page);
  expect(Date.now() - start).toBeLessThan(PROMPTLY);
});

test('fails, naming it, on a transition that does not end in time', async ({ page }) => {
  await show(page, '<p class="slow">Bonjour</p>', '.slow{transition:color 60s}.slow.moved{color:#222}');
  await transition(page, '.slow', 'moved');
  const start = Date.now();
  await expect(expectAccessible(page)).rejects.toThrow('transition of color on p.slow.moved');
  expect(Date.now() - start).toBeLessThan(PROMPTLY);
});
