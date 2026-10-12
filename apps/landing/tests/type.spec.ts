import { expect, test } from '@playwright/test';
import { PAGES } from './support';

for (const path of PAGES) {
  test(`${path} sets every title in weight 800`, async ({ page }) => {
    await page.goto(path);
    const light = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main :is(h1, h2, h3)')]
        .filter((el) => getComputedStyle(el).fontWeight !== '800')
        .map((el) => `${el.tagName} ${getComputedStyle(el).fontWeight} ${el.textContent.trim().slice(0, 30)}`),
    );
    expect(light).toEqual([]);
  });
}

test('the brand applies: the mist background, Atkinson Hyperlegible Next at 17 px for the text, Bricolage Grotesque for the titles', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(239, 243, 241)');
  await expect(page.locator('body')).toHaveCSS('font-size', '17px');
  // Astro names each family with a hash: the first family of the stack, checked loaded.
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    const first = (selector: string) =>
      getComputedStyle(document.querySelector(selector) ?? document.body)
        .fontFamily.split(',')[0]
        ?.replaceAll('"', '') ?? '';
    return (
      [
        ['body', '17px'],
        ['h1', '800 32px'],
      ] as const
    ).map(([selector, font]) => {
      const family = first(selector);
      return { family, loaded: document.fonts.check(`${font} "${family}"`) };
    });
  });
  expect(families).toEqual([
    { family: expect.stringMatching(/^Atkinson Hyperlegible Next-[0-9a-f]+$/), loaded: true },
    { family: expect.stringMatching(/^Bricolage Grotesque-[0-9a-f]+$/), loaded: true },
  ]);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`in ${colorScheme} mode, the browser bar takes the page's background`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    const [background, bar] = await page.evaluate((scheme) => {
      const meta = document.querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`);
      const probe = document.createElement('div');
      probe.style.color = meta?.getAttribute('content') ?? '';
      document.body.append(probe);
      return [getComputedStyle(document.body).backgroundColor, getComputedStyle(probe).color];
    }, colorScheme);
    expect(bar).toBe(background);
  });
}

test('in dark mode, the page turns to the night background', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(12, 30, 36)');
});

test('/ gives every section title one size and every card title text-xl', async ({ page }) => {
  await page.setViewportSize({ width: 1441, height: 900 });
  await page.goto('/');
  const sizes = await page.evaluate(() => ({
    h2: [...new Set([...document.querySelectorAll('main h2')].map((el) => getComputedStyle(el).fontSize))],
    h3: [...new Set([...document.querySelectorAll('main h3')].map((el) => getComputedStyle(el).fontSize))],
  }));
  expect(sizes.h2).toHaveLength(1);
  expect(sizes.h3).toEqual(['20px']);
});
