import { expect, test, type Locator, type Page } from '@playwright/test';
import scales from '@repo/tokens/scales.json' with { type: 'json' };
import { computedColor, token } from '../colors';
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
      await expect(page.getByRole('figure')).toHaveCount(3);
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

  test('keeps its header above the side navigation once the page scrolls', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto('/catalogue');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // The router restores the scroll once the page is in: scroll until it stays.
    await expect
      .poll(() =>
        page.evaluate(() => {
          window.scrollTo(0, window.innerHeight);
          return window.scrollY;
        }),
      )
      .toBeGreaterThan(0);

    const logo = await box(page.getByRole('banner').getByText('Catiche'));
    const onTop = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x ?? 0, y ?? 0)?.closest('header') !== null,
      [logo.x + logo.width / 2, logo.y + logo.height / 2],
    );
    expect(onTop).toBe(true);
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
  // Past the last control, the focus lands on a guard of Base UI that sends it back inside, on
  // WebKit a moment later: the trap is what the focus ends on.
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press('Tab');
    await expect.poll(() => containsFocus(dialog)).toBe(true);
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
  await expect(table.getByRole('row').nth(3)).toHaveText('mer.45');
  await expect(table.getByRole('columnheader').nth(1)).toHaveText('Temps (minutes)');
});

// The narrowest phone of WCAG 1.4.10, where a card is about 250 px wide.
test.describe('on a phone of 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  const textBoxes = (figure: Locator) =>
    figure.evaluate((element) =>
      [...element.querySelectorAll('svg text, [data-chart-label]')].map((text) => {
        const { left, right, top, bottom } = text.getBoundingClientRect();
        return { text: text.textContent, left, right, top, bottom };
      }),
    );

  test('the labels of a chart never overlap, with two series of days as with one', async ({ page }) => {
    await page.goto('/catalogue');
    const figures = page.getByRole('figure');
    await expect(figures).toHaveCount(3);

    for (const figure of await figures.all()) {
      const boxes = await textBoxes(figure);
      for (const [i, a] of boxes.entries()) {
        for (const b of boxes.slice(i + 1)) {
          const overlap = a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
          expect(overlap, `« ${a.text} » over « ${b.text} »`).toBe(false);
        }
      }
    }
  });

  test('no label of a chart passes the inner edge of its card', async ({ page }) => {
    await page.goto('/catalogue');
    for (const figure of await page.getByRole('figure').all()) {
      const edge = await figure
        .locator('xpath=..')
        .evaluate((card) => card.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(card).paddingRight));
      for (const label of await textBoxes(figure)) {
        expect(label.right, label.text).toBeLessThanOrEqual(edge + 0.5);
      }
    }
    expect(await overflows(page)).toBe(false);
  });
});

test('a card sized by its content keeps the width of its content', async ({ page }) => {
  await page.goto('/catalogue');
  const content = page.getByText('À la taille de son contenu');
  const card = await box(content.locator('xpath=..'));

  // The width the words take, even when their box is squeezed to nothing.
  expect(card.width).toBeGreaterThanOrEqual(await content.evaluate((text) => text.scrollWidth));
});

test('a card that is a container lays out its inside by its own width', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/catalogue');
  const side = async (name: string) => {
    const title = await box(page.getByRole('heading', { level: 3, name }));
    const link = await box(page.getByRole('link', { name: 'Voir la fiche' }).and(page.locator(`[href="#fiche-${name}"]`)));
    return link.x > title.x + title.width ? 'beside' : 'under';
  };

  expect(await side('Léa')).toBe('under');
  expect(await side('Noé')).toBe('beside');
});

test('a banner is a region named by its title, and an error banner an alert', async ({ page }) => {
  await page.goto('/catalogue');

  await expect(page.getByRole('region', { name: 'La bêta est fermée' })).toContainText('Les inscriptions ouvrent');
  await expect(page.getByRole('alert').filter({ hasText: 'La séance n’a pas pu s’ouvrir' })).toBeVisible();
});

test('the notifications region is in every page from its load, before any toast', async ({ page }) => {
  await page.goto('/connexion');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await expect(page.getByRole('region', { name: 'Notifications' })).toBeAttached();
});

test('an icon is 24 px, in a large button as in a fold, its stroke 2 px whatever its size', async ({ page }) => {
  await page.goto('/catalogue');
  const icons = [page.getByRole('button', { name: 'Ajouter un enfant' }).locator('svg'), page.getByText('Ce que Tom retient').locator('svg')];

  for (const icon of icons) {
    const { width, height } = await box(icon);
    expect([width, height]).toEqual([24, 24]);
    await expect(icon).toHaveAttribute('stroke-width', '2');
    await expect(icon.locator(':scope > *').first()).toHaveAttribute('vector-effect', 'non-scaling-stroke');
  }
});

test.describe('with a mouse', () => {
  test.use({ hasTouch: false, isMobile: false, viewport: DESKTOP });

  test('a line of a list hovered keeps its words readable', async ({ page }) => {
    await page.goto('/catalogue');
    const line = page.getByRole('link', { name: /Les fractions égales/ });
    await line.hover();

    await expect(line).toHaveCSS('background-color', await token(page, 'accent'));
    await expect(line.getByText('Mathématiques · mardi')).toHaveCSS('color', await token(page, 'accent-muted-foreground'));
  });

  test('the drawer comes from the right edge of a desktop', async ({ page }) => {
    await page.goto('/catalogue');
    await page.getByRole('button', { name: 'Ouvrir le tiroir' }).click();
    const drawer = page.getByRole('dialog', { name: 'Trier les séances' });
    await expect.poll(async () => drawer.evaluate((element) => element.getAnimations().length)).toBe(0);

    const bounds = await box(drawer);
    expect(Math.round(bounds.x + bounds.width)).toBe(DESKTOP.width);
    expect(Math.round(bounds.height)).toBe(DESKTOP.height);
  });
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
