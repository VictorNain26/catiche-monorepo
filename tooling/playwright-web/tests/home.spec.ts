import { expect, test } from '@playwright/test';

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

test('the brand applies: paper background, Inclusive Sans loaded, no line along the screen', async ({ page }) => {
  await page.goto('/connexion');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', 'rgb(250, 248, 242)');
  // WebKit serialises the computed family unquoted, Chromium quoted.
  await expect(body).toHaveCSS('font-family', /^"?Inclusive Sans"?,/);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "Inclusive Sans"');
  });
  expect(loaded).toBe(true);
  // The exercise book's red margin was tried and dropped (decisions.md, 2026-10-11).
  await expect(page.locator('main')).toHaveCSS('border-left-width', '0px');
});
