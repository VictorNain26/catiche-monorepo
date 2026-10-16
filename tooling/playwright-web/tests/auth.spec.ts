import { expect, test } from '@playwright/test';
import { invite } from '../database';
import { address, askCode, guardian, signIn } from '../guardian';
import { codeSince, logMark } from '../server-log';

test('an invited parent gets in by the code their address received, names themselves, and signs out', async ({ page }) => {
  const email = address('parent');
  invite(email);
  await signIn(page, email);
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
  // Signed in but nameless: the household sends them back until they give it.
  await page.goto('/foyer');
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
  await page.getByLabel('Votre prénom').fill('Claire');
  await page.getByRole('button', { name: 'Continuer' }).click();
  // Just in, the session is fresh: the passkey is offered once, with what it changes; later is fine.
  // A screen of its own: read out from its title, and still there after a reload.
  const offer = page.getByRole('heading', { level: 1, name: 'Entrer plus vite la prochaine fois' });
  await expect(offer).toBeVisible();
  await expect(offer).toBeFocused();
  await expect(page.getByText('sans code par e-mail')).toBeVisible();
  await page.reload();
  await expect(offer).toBeVisible();
  await page.getByRole('button', { name: 'Plus tard' }).click();
  // A household without a child opens on the adding of the first one, « Mon compte » at hand.
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
  await expect(page.getByLabel('Son prénom')).toBeVisible();

  await page.getByRole('link', { name: 'Mon compte' }).click();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.goto('/foyer');
  await expect(page).toHaveURL(/\/connexion$/);

  await signIn(page, email);
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
});

test('the sign-in says the beta is closed, checks the address and the code, and refuses a wrong one in French', async ({ page }) => {
  await page.goto('/connexion');
  // The product's name, what it is in a sentence, and Tom told as a program.
  await expect(page).toHaveTitle('Catiche');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrer dans Catiche');
  await expect(page.getByText('Tom, un programme')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Catiche est en bêta fermée' })).toBeVisible();
  // Under 16 px, iOS Safari zooms on the field it focuses.
  expect(Number.parseFloat(await page.getByLabel('Adresse e-mail').evaluate((field) => getComputedStyle(field).fontSize))).toBeGreaterThanOrEqual(16);
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await expect(page.getByText('Une adresse e-mail valide.')).toBeVisible();

  const email = address('maladroit');
  invite(email);
  const code = await askCode(page, email);
  await expect(page.getByRole('region').filter({ hasText: 'vient d’être envoyé' })).toContainText(email);
  const field = page.getByLabel('Le code reçu par e-mail');
  await expect(field).toHaveAttribute('autocomplete', 'one-time-code');
  // Six digits read at a glance: the codes' typeface, large.
  await expect(field).toHaveCSS('font-family', /^"?Atkinson Hyperlegible Mono"?,/);
  expect(Number.parseFloat(await field.evaluate((input) => getComputedStyle(input).fontSize))).toBeGreaterThanOrEqual(24);
  await field.fill('12');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByText('Le code à 6 chiffres reçu par e-mail.')).toBeVisible();
  await field.fill(code === '111111' ? '222222' : '111111');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ce code ne correspond pas. Vérifiez-le, ou demandez-en un nouveau.');
});

test('an address without an invitation is answered as any other, and gets no code', async ({ page }) => {
  await page.goto('/connexion');
  const email = address('sans-invitation');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await expect(page.getByRole('heading', { name: 'Votre code' })).toBeVisible();
  await page.getByLabel('Le code reçu par e-mail').fill('000000');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('alert')).toHaveText('Ce code ne correspond pas. Vérifiez-le, ou demandez-en un nouveau.');
});

test('on the code step, the parent goes back to change the address, then gets in by a new code', async ({ page }) => {
  const mistyped = address('faute-de-frappe');
  invite(mistyped);
  await askCode(page, mistyped);
  await page.getByRole('button', { name: 'Changer d’adresse' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Entrer dans Catiche');
  await expect(page.getByLabel('Adresse e-mail')).toHaveValue('');

  const email = address('renvoi');
  invite(email);
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByRole('button', { name: 'Recevoir mon code' }).click();
  await expect(page.getByRole('region', { name: `Un code à 6 chiffres vient d’être envoyé à ${email}.` })).toBeVisible();
  const mark = logMark();
  await page.getByRole('button', { name: 'Recevoir un nouveau code' }).click();
  await expect(page.getByRole('region', { name: `Un nouveau code vient d’être envoyé à ${email}.` })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText(`Un nouveau code vient d’être envoyé à ${email}.`);
  let code: string | undefined;
  await expect.poll(() => (code = codeSince(mark, email))).toBeDefined();
  await page.getByLabel('Le code reçu par e-mail').fill(code ?? '');
  await page.getByRole('button', { name: 'Entrer' }).click();
  await expect(page.getByRole('heading', { name: 'Bienvenue' })).toBeVisible();
});

test('an error of the sign-in service lands on a page of the app, which leads back to the sign-in', async ({ page }) => {
  // better-auth's own page has an inline style the CSP blocks: the server sends its errors here.
  await page.goto('/api/auth/error?error=boom');
  await expect(page).toHaveURL(/\/erreur-connexion\?error=boom$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('La connexion n’a pas abouti');
  await expect(page.getByRole('alert')).toContainText('un nouveau code vous sera envoyé');
  await page.getByRole('link', { name: 'Aller à la connexion' }).click();
  await expect(page).toHaveURL(/\/connexion$/);
});

// page.route never sees what the service worker answers.
test.describe('with the server failing', () => {
  test.use({ serviceWorkers: 'block' });

  test('a sign-out the server refuses says so, and keeps the parent signed in', async ({ page }) => {
    await guardian(page, 'sortie');

    await page.route('**/api/auth/sign-out', (route) => route.fulfill({ status: 429, json: { code: 'TOO_MANY_REQUESTS' } }));
    await page.getByRole('link', { name: 'Mon compte' }).click();
    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page.getByRole('alert')).toContainText('Trop d’essais');
    await expect(page).toHaveURL(/\/compte$/);
  });

  test('a screen that cannot load says so in French, and loads on a retry', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({ status: 500, contentType: 'application/problem+json', json: { status: 500, code: 'INTERNAL_ERROR' } }),
    );
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Une erreur est survenue' })).toBeVisible();

    await page.unroute('**/api/me');
    await page.getByRole('button', { name: 'Réessayer' }).click();
    await expect(page).toHaveURL(/\/connexion$/);
  });
});
