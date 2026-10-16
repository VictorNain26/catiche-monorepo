import { expect, test } from '@playwright/test';
import { token } from '../colors';

test('the page a visitor lands on renders in French at phone width, with one h1 and no horizontal scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/connexion$/);

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflows).toBe(false);
  // A screen with nowhere to go back to opens on its title, without an empty band above it.
  await expect(page.locator('main > header').locator(':scope > *')).toHaveCount(1);
});

test('the brand applies: the mist background, Atkinson Hyperlegible Next at 17 px for the text, Bricolage Grotesque for the titles', async ({
  page,
}) => {
  await page.goto('/connexion');
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toBeVisible();

  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', await token(page, 'background'));
  await expect(body).toHaveCSS('font-size', '17px');
  // WebKit serialises the computed family unquoted, Chromium quoted.
  await expect(body).toHaveCSS('font-family', /^"?Atkinson Hyperlegible Next Variable"?,/);
  await expect(title).toHaveCSS('font-family', /^"?Bricolage Grotesque Variable"?,/);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return ['17px "Atkinson Hyperlegible Next Variable"', '800 32px "Bricolage Grotesque Variable"'].map((font) => document.fonts.check(font));
  });
  expect(loaded).toEqual([true, true]);
});
