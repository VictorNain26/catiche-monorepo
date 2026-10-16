import { expect, test, type Page, type Route } from '@playwright/test';
import { invite } from '../database';
import { addChild, address, guardian, signIn } from '../guardian';

// On the family phone, a sign-out, a parent's first entry and the opening of a child's space each
// rest on the sessions the device holds: their list refused, none of them is decided blind.
// page.route never sees what the service worker answers.
test.use({ serviceWorkers: 'block' });

const LIST = '**/api/auth/multi-session/list-device-sessions';
const refuse = (page: Page) => page.route(LIST, (route: Route) => route.fulfill({ status: 500, json: {} }));
const FAILED = 'Une erreur est survenue. Réessayez dans un instant.';

/** A guardian who opened their child's space on this phone, then came back by their code: their address. */
async function backFromTheChild(page: Page, name: string, child: string) {
  const email = await guardian(page, name);
  await addChild(page, child, { level: 'Sixième' });
  await page.getByRole('button', { name: `Faire les devoirs avec ${child}` }).click();
  await expect(page.getByRole('heading', { name: `Bonjour ${child}` })).toBeVisible();
  await page.getByRole('link', { name: `${child}, changer de profil` }).click();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/foyer$/);
  return email;
}

test('a sign-out whose device sessions cannot load says so, and closes no one’s session', async ({ page }) => {
  await backFromTheChild(page, 'sortie-panne', 'Lou');
  await page.getByRole('link', { name: 'Mon compte' }).click();

  await refuse(page);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('alert')).toHaveText(FAILED);
  await expect(page).toHaveURL(/\/foyer\/compte$/);
  // The list back, the sign-out takes the parent's session alone: Lou's stays on the device.
  await page.unroute(LIST);
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Lou' })).toBeVisible();
});

test('a parent first entering, the device sessions refused, is told so and never offered a passkey blind', async ({ page }) => {
  await guardian(page, 'bienvenue-panne');
  await addChild(page, 'Zoé', { level: 'Cinquième' });
  await page.getByRole('button', { name: 'Faire les devoirs avec Zoé' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Zoé' })).toBeVisible();
  await page.getByRole('link', { name: 'Changer de profil' }).click();
  const other = address('autre-parent-panne');
  invite(other);
  await signIn(page, other);

  await refuse(page);
  await page.getByLabel('Votre prénom').fill('Sam');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('alert')).toHaveText(FAILED);
  await expect(page).toHaveURL(/\/bienvenue$/);
  await page.unroute(LIST);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
  await expect(page.getByRole('heading', { name: 'Entrer plus vite la prochaine fois' })).toHaveCount(0);
});

test('opening the child’s space again, the device sessions refused, says so and pairs no second session', async ({ page }) => {
  await backFromTheChild(page, 'ouvrir-panne', 'Lou');
  await page.getByRole('link', { name: /^Lou/ }).click();

  await refuse(page);
  await page.getByRole('button', { name: 'Faire les devoirs avec Lou' }).click();
  await expect(page.getByRole('alert')).toHaveText(FAILED);
  await expect(page.getByRole('heading', { level: 1, name: 'Lou' })).toBeVisible();
  // The list back, the device opens the session it holds: Lou has one device, not two.
  await page.unroute(LIST);
  await page.getByRole('button', { name: 'Faire les devoirs avec Lou' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Lou' })).toBeVisible();
  await expect(page.getByText(/^Relié le /)).toHaveCount(1);
});
