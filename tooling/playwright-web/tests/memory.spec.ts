import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { exercisesOn } from '../database';
import { addChild, guardian, pairedStudent } from '../guardian';

test('a guardian proposes the memory when adding the child, sees its state, and withdraws it', async ({ page }) => {
  await guardian(page, 'memoire');
  await addChild(page, 'Lou', { memory: true });
  await page.getByText('Ce que Tom retient', { exact: true }).click();
  await expect(page.getByText('Proposée : Lou répondra à sa prochaine visite.')).toBeVisible();

  await page.getByRole('button', { name: 'Retirer la mémoire' }).click();
  await expect(page.getByRole('alert')).toContainText('Tom oubliera ce qu’il retient de Lou');
  await page.getByRole('button', { name: 'Retirer et effacer' }).click();
  await expect(page.getByText('Pas proposée : Tom ne retient rien d’une séance à l’autre.')).toBeVisible();
  await page.getByRole('button', { name: 'Proposer la mémoire à Lou' }).click();
  await expect(page.getByText('Proposée : Lou répondra à sa prochaine visite.')).toBeVisible();
});

test('the child is asked on their home, accepts, sees what Tom keeps, then stops it', async ({ page, browser }, testInfo) => {
  await pairedStudent(page, browser, testInfo, 'Max', { memory: true });
  const offer = page.getByRole('region', { name: 'Tom peut retenir ce qui a résisté' });
  await expect(offer).toContainText('Il ne garde rien de ce que tu écris');
  await offer.getByRole('button', { name: 'D’accord' }).click();
  await expect(offer).toBeHidden();
  // The yes is answered, not only taken.
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('C’est noté : Tom retiendra ce qui a résisté.');

  await page.getByRole('link', { name: 'Ce que Tom retient' }).click();
  await expect(page.getByRole('heading', { name: 'Ce que Tom retient' })).toBeVisible();
  await expect(page.getByText('Rien pour l’instant')).toBeVisible();

  await page.getByRole('button', { name: 'Arrêter la mémoire' }).click();
  await expect(page.getByRole('alert')).toContainText('ne retiendra plus rien');
  await page.getByRole('button', { name: 'Arrêter et tout effacer' }).click();
  await expect(page.getByRole('region', { name: 'Tom peut retenir ce qui a résisté' })).toBeVisible();
});

test('a child whose parent did not propose it is not asked', async ({ page, browser }, testInfo) => {
  await pairedStudent(page, browser, testInfo, 'Ana');
  await expect(page.getByRole('region', { name: 'Tom peut retenir ce qui a résisté' })).toBeHidden();
  await page.getByRole('link', { name: 'Ce que Tom retient' }).click();
  await expect(page.getByText('Tom ne retient rien d’une séance à l’autre.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ana, changer de profil' })).toBeVisible();
});

/** Two notions of the referential, as the server reads them, and their wording the student sees. */
function twoNotions() {
  const file = resolve(import.meta.dirname, '../../../apps/server/src/referential/texts/mathematiques-c4-2026.json');
  const { entries } = JSON.parse(readFileSync(file, 'utf8')) as { entries: { id: string; text: string }[] };
  const [first, second] = entries;
  if (!first || !second) throw new Error('the referential has fewer than two notions');
  return [first, second] as const;
}

test('the child marks a notion understood, then erases all Tom keeps, the memory left on', async ({ page, browser }, testInfo) => {
  await pairedStudent(page, browser, testInfo, 'Zoé', { memory: true });
  await page.getByRole('region', { name: 'Tom peut retenir ce qui a résisté' }).getByRole('button', { name: 'D’accord' }).click();
  await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('C’est noté');
  // Two exercises after the yes, as two turns with Tom leave them.
  const { id } = (await (await page.request.get('/api/me')).json()) as { id: string };
  const [understood, kept] = twoNotions();
  await exercisesOn(id, [understood.id, kept.id]);

  await page.getByRole('link', { name: 'Ce que Tom retient' }).click();
  const notions = page.getByRole('listitem');
  await expect(notions).toHaveCount(2);
  await notions.filter({ hasText: understood.text }).getByRole('button', { name: 'J’ai compris' }).click();
  await expect(notions).toHaveCount(1);
  await expect(notions).toContainText(kept.text);
  await page.reload();
  await expect(notions).toHaveCount(1);

  await page.getByRole('button', { name: 'Effacer ce que Tom retient' }).click();
  await expect(page.getByRole('alert')).toHaveText('Tom oubliera tout ce qu’il retient de toi. Tes séances restent.');
  await page.getByRole('button', { name: 'Tout effacer' }).click();
  await expect(page.getByText('Rien pour l’instant')).toBeVisible();
  await expect(notions).toHaveCount(0);
  // Erased, not stopped: Tom goes on keeping what resists.
  await expect(page.getByRole('button', { name: 'Arrêter la mémoire' })).toBeVisible();
});
