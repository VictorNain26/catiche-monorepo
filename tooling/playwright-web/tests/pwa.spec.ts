import { expect, test } from '@playwright/test';
import { expectAccessible } from '../accessibility';
import { computedColor } from '../colors';

interface Manifest {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: { src: string; sizes: string; type: string }[];
}

test('the manifest makes the app installable, in the colors of the page', async ({ page, request }) => {
  await page.goto('/');

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).not.toBeNull();
  const manifest = (await (await request.get(href ?? '')).json()) as Manifest;
  expect(manifest).toMatchObject({ name: 'Catiche', short_name: 'Catiche', lang: 'fr', start_url: '/', display: 'standalone' });
  expect(manifest.icons.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512']);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toBe(icon.type);
  }

  // The manifest can't read the tokens: its colors must stay those the page computes.
  const pageBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(await computedColor(page, manifest.background_color)).toBe(pageBackground);
  expect(await computedColor(page, manifest.theme_color)).toBe(pageBackground);
});

test.describe('in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('the page turns to the night background', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(12, 30, 36)');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
});

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`in ${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test('the browser bar takes the background the page computes', async ({ page }) => {
      await page.goto('/');
      const pageBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      // index.html can't read the tokens: its theme colors must stay the background the page computes.
      const themeColor = await page.locator(`meta[name="theme-color"][media="(prefers-color-scheme: ${colorScheme})"]`).getAttribute('content');
      expect(await computedColor(page, themeColor ?? '')).toBe(pageBackground);
    });
  });
}

test('the service worker takes the app, and never an /api navigation', async ({ page }) => {
  await page.goto('/');

  const scriptURL = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.scriptURL);
  expect(scriptURL).toMatch(/\/sw\.js$/);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  const route = await page.goto('/une/route/du/client');
  expect(route?.fromServiceWorker()).toBe(true);

  // The route stands in for the server, so that the answer is known. page.route never sees
  // a request the service worker answered itself.
  await page.route('/api/**', (request) => request.fulfill({ status: 200, contentType: 'text/plain', body: 'API' }));
  const api = await page.goto('/api/auth/callback/google');
  expect(api?.fromServiceWorker()).toBe(false);
  expect(await api?.text()).toBe('API');
});
