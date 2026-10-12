import { expect, test, type Locator, type Page } from '@playwright/test';
import scales from '@repo/tokens/scales.json' with { type: 'json' };
import { computedColor } from '../colors';
import { recordCspViolations } from '../csp';

// The catalogue of @repo/ui (apps/web/src/routes/catalogue.tsx): every component in its states,
// on invented data, without the API. Each project sees it at its phone width, then at a desktop's.

const DESKTOP = { width: 1440, height: 900 };
const SECTIONS = [
  'Boutons',
  'Champs',
  'Section et liste',
  'Carte',
  'État vide',
  'Squelette',
  'Bandeaux',
  'Dialogue et tiroir',
  'Toast',
  'Graphiques',
  'Repli',
];

const overflows = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

async function box(locator: Locator) {
  const bounds = await locator.boundingBox();
  if (!bounds) throw new Error('the element is not laid out');
  return bounds;
}

async function containsFocus(locator: Locator) {
  return locator.evaluate((element) => element.contains(document.activeElement));
}

for (const scheme of ['light', 'dark'] as const) {
  for (const width of ['phone', 'desktop'] as const) {
    test(`every component renders at ${width} width in ${scheme}, without horizontal scroll`, async ({ page }) => {
      if (width === 'desktop') await page.setViewportSize(DESKTOP);
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto('/catalogue');

      await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des composants' })).toBeVisible();
      for (const name of SECTIONS) await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible();
      await expect(page.getByRole('figure')).toHaveCount(2);
      expect(await overflows(page)).toBe(false);

      // The device's setting decides the mode: the mist of that mode's scale.
      const background = await page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor);
      expect(background).toBe(await computedColor(page, scales[scheme]['mist-1']));
    });
  }
}

test.describe('the shell', () => {
  test('puts its destinations at the bottom of a phone, each an icon and a word of 44 px at least', async ({ page }) => {
    await page.goto('/catalogue');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    const links = nav.getByRole('link');

    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThanOrEqual(5);
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    for (const link of await links.all()) {
      await expect(link).toHaveText(/^\p{L}+$/u);
      await expect(link.locator('svg')).toHaveCount(1);
      expect((await box(link)).height).toBeGreaterThanOrEqual(44);
    }

    const viewport = page.viewportSize();
    const bounds = await box(nav);
    expect(Math.round(bounds.y + bounds.height)).toBe(viewport?.height);
    expect(Math.round(bounds.width)).toBe(viewport?.width);
    await expect(page.getByRole('banner')).toContainText('Catiche');
  });

  test('puts them on the side of a desktop, beside the content', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/catalogue');
    const nav = await box(page.getByRole('navigation', { name: 'Navigation principale' }));
    const main = await box(page.getByRole('main'));

    expect(nav.x).toBe(0);
    expect(nav.x + nav.width).toBeLessThanOrEqual(main.x);
    expect(nav.height).toBeGreaterThan(DESKTOP.height / 2);
  });
});

test('every button of the catalogue is a target of 44 px at least', async ({ page }) => {
  await page.goto('/catalogue');
  for (const button of await page.getByRole('main').getByRole('button').all()) {
    expect((await box(button)).height, await button.innerText()).toBeGreaterThanOrEqual(44);
  }
});

test('the dialog opens from the keyboard, keeps the focus inside, closes on Escape and gives the focus back', async ({ page }) => {
  await page.goto('/catalogue');
  const trigger = page.getByRole('button', { name: 'Ouvrir le dialogue' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Supprimer cette séance ?' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleDescription('Elle disparaît de ton historique. Ce que Tom retient reste.');
  expect(await containsFocus(dialog)).toBe(true);
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press('Tab');
    expect(await containsFocus(dialog)).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('the drawer comes from the bottom edge of a phone and closes with its labelled button', async ({ page }) => {
  await page.goto('/catalogue');
  const trigger = page.getByRole('button', { name: 'Ouvrir le tiroir' });
  await trigger.click();

  const drawer = page.getByRole('dialog', { name: 'Trier les séances' });
  await expect(drawer).toBeVisible();
  expect(await containsFocus(drawer)).toBe(true);
  // At rest, once its entrance is over.
  await expect.poll(async () => drawer.evaluate((element) => element.getAnimations().length)).toBe(0);
  const bounds = await box(drawer);
  expect(Math.round(bounds.y + bounds.height)).toBe(page.viewportSize()?.height);

  await drawer.getByRole('button', { name: 'Fermer' }).click();
  await expect(drawer).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('a toast says what happened, in the notifications region', async ({ page }) => {
  await page.goto('/catalogue');
  await page.getByRole('button', { name: 'Afficher un toast' }).click();

  await expect(page.getByRole('region', { name: /^Notifications/ }).getByText('Le lien est copié.')).toBeVisible();
});

test('a chart gives its message and every value to a screen reader', async ({ page }) => {
  await page.goto('/catalogue');
  const message = 'Léa a travaillé 2 h 10 cette semaine, surtout le mercredi.';

  await expect(page.getByRole('figure', { name: message })).toBeVisible();
  const table = page.getByRole('table', { name: message });
  await expect(table.getByRole('row')).toHaveCount(8);
  await expect(table.getByRole('row').nth(3)).toHaveText('mer.45 min');
});

test.describe('a skeleton', () => {
  const timings = (page: Page) =>
    page
      .locator('[data-skeleton]')
      .first()
      .evaluate((element) =>
        element.getAnimations().map((animation) => [(animation as CSSAnimation).animationName, animation.effect?.getTiming().delay]),
      );

  test('shows nothing for a second, then pulses', async ({ page }) => {
    await page.goto('/catalogue');
    expect(await timings(page)).toEqual([
      ['appear', 1000],
      ['pulse-surface', 1000],
    ]);
  });

  test('does not pulse under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/catalogue');
    expect(await timings(page)).toEqual([['appear', 1000]]);
  });
});

test('the catalogue runs under the CSP of the server, dialog, drawer and toast open, without a single violation', async ({ page }) => {
  const violations = await recordCspViolations(page);
  await page.goto('/catalogue');

  await page.getByRole('button', { name: 'Ouvrir le dialogue' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Ouvrir le tiroir' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Afficher un toast' }).click();
  await expect(page.getByText('Le lien est copié.')).toBeVisible();

  expect(await violations()).toEqual([]);
});

test('the catalogue asks nothing of the API', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url());
  });
  await page.goto('/catalogue');
  await expect(page.getByRole('heading', { level: 1, name: 'Catalogue des composants' })).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(calls).toEqual([]);
});
