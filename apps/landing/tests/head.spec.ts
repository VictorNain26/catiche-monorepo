import { expect, test } from '@playwright/test';
import { PAGES } from './support';

for (const path of PAGES) {
  test(`${path} names its own URL as canonical`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new URL(path, 'https://tomia.fr').href);
  });

  test(`${path} shares its own title and description`, async ({ page }) => {
    await page.goto(path);
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    for (const name of ['og:title', 'twitter:title']) {
      await expect(page.locator(`meta[property="${name}"], meta[name="${name}"]`), name).toHaveAttribute('content', title);
    }
    for (const name of ['og:description', 'twitter:description']) {
      await expect(page.locator(`meta[property="${name}"], meta[name="${name}"]`), name).toHaveAttribute('content', description ?? '');
    }
  });
}

test('the Open Graph image every page names is served', async ({ page, request }) => {
  await page.goto('/');
  const image = new URL((await page.locator('meta[property="og:image"]').getAttribute('content')) ?? '');
  const response = await request.get(image.pathname);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
});
