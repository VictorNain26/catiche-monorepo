import { expect, test } from '@playwright/test';
import { invite } from '../database';
import { addChild, address, birthMonthAged, childPhone, guardian, pairedStudent, signIn } from '../guardian';

test('adding a child asks one question per screen, the birth month in two menus, then says what Tom does before the memory', async ({ page }) => {
  await guardian(page, 'etapes');
  // A household without a child opens on its adding.
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
  await expect(page.getByText('Étape 1 sur 4')).toBeVisible();
  await expect(page.getByLabel('Sa classe', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Son prénom.')).toBeVisible();
  await page.getByLabel('Son prénom', { exact: true }).fill('Inès');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByText('Étape 2 sur 4')).toBeVisible();
  await page.getByLabel('Sa classe', { exact: true }).selectOption({ label: 'Cinquième' });
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByText('Étape 3 sur 4')).toBeVisible();
  // No native month field: two menus every browser shows filled in.
  await expect(page.locator('input[type="month"]')).toHaveCount(0);
  const birth = page.getByRole('group', { name: 'Son mois de naissance' });
  await birth.getByLabel('Mois').selectOption({ label: 'Mars' });
  await page.getByRole('button', { name: 'Précédent' }).click();
  // Going back loses nothing.
  await expect(page.getByLabel('Sa classe', { exact: true })).toHaveValue('cinquieme');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(birth.getByLabel('Mois')).toHaveValue('03');
  const [year] = birthMonthAged(12).split('-');
  await birth.getByLabel('Année').selectOption(year ?? '');
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByText('Étape 4 sur 4')).toBeVisible();
  await expect(page.getByText('Tom pose des questions à Inès')).toBeVisible();
  await page.getByLabel('Proposer que Tom retienne ce qui a résisté').check();
  await page.getByRole('button', { name: 'Ajouter Inès' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Inès' })).toBeVisible();

  // With a child, the adding is a step away, and its way back leads home.
  await page.getByRole('link', { name: 'Retour au foyer' }).click();
  await page.getByRole('link', { name: 'Ajouter un enfant' }).click();
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
  await page.getByRole('link', { name: 'Retour au foyer' }).click();
  await expect(page).toHaveURL(/\/foyer$/);
});

test('a birth month the server would refuse is refused at its own step, and a double click never adds the child', async ({ page }) => {
  await guardian(page, 'trop-jeune');
  // The server takes 5 to 20 years, in UTC: on 15 June 2026, from 2006-01 to 2021-06. The screen
  // reads the date as it opens.
  await page.clock.setFixedTime(new Date('2026-06-15T12:00:00Z'));
  await page.reload();
  await page.getByLabel('Son prénom', { exact: true }).fill('Noé');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByLabel('Sa classe', { exact: true }).selectOption({ label: 'Sixième' });
  await page.getByRole('button', { name: 'Continuer' }).click();

  const birth = page.getByRole('group', { name: 'Son mois de naissance' });
  const years = birth.getByLabel('Année');
  await expect(years.locator('option', { hasText: '2006' })).toHaveCount(1);
  await expect(years.locator('option', { hasText: '2005' })).toHaveCount(0);
  await expect(years.locator('option', { hasText: '2022' })).toHaveCount(0);
  await birth.getByLabel('Mois').selectOption({ label: 'Juillet' });
  await years.selectOption('2021');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Votre enfant a entre 5 et 20 ans')).toBeVisible();
  await expect(page.getByText('Étape 3 sur 4')).toBeVisible();
  await expect(years).toHaveAttribute('aria-invalid', 'true');

  await birth.getByLabel('Mois').selectOption({ label: 'Juin' });
  // The second click lands where « Ajouter Noé » appears: it must not add the child unread.
  await page.getByRole('button', { name: 'Continuer' }).dblclick();
  await expect(page.getByText('Étape 4 sur 4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ajouter Noé' })).toBeVisible();
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
});

test('the child’s page: their class, the next step first, then the week, the rest folded', async ({ page }) => {
  await guardian(page, 'fiche');
  await addChild(page, 'Léo');
  await expect(page.locator('main > header').getByText('Quatrième', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Prochaine étape', 'Sa semaine']);
  for (const fold of ['Ses appareils', 'Ce que Tom retient', 'Son prénom et sa classe', 'Supprimer son compte']) {
    await expect(page.getByText(fold, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Ouvrir l’espace de Léo sur cet appareil' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Supprimer le compte de Léo' })).toBeHidden();
});

test('a guardian adds a child, changes their class, then deletes their account', async ({ page }) => {
  await guardian(page, 'foyer');
  await addChild(page, 'Léa');

  await page.getByText('Son prénom et sa classe', { exact: true }).click();
  await page.getByLabel('Sa classe', { exact: true }).selectOption({ label: 'Troisième' });
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // The page of a child just added says the next step too.
  await expect(page.getByRole('status').filter({ hasText: 'Enregistré.' })).toHaveText('Enregistré.');
  await page.getByLabel('Son prénom', { exact: true }).fill('Léa-Rose');
  await expect(page.getByText('Enregistré.')).toBeHidden();
  await page.getByLabel('Son prénom', { exact: true }).fill('Léa');

  await page.getByText('Supprimer son compte', { exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer le compte de Léa' }).click();
  await expect(page.getByRole('alert')).toContainText('C’est définitif');
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click();
  // No child left: the household opens on the adding of one.
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
});

test('a QR code on the parent’s phone opens the pairing on the child’s, the code filled in', async ({ page, browser }, testInfo) => {
  await guardian(page, 'qr');
  await addChild(page, 'Nina');
  await page.getByRole('button', { name: 'Relier le téléphone de Nina' }).click();
  await expect(page.getByRole('img', { name: 'QR code pour relier l’appareil de Nina' })).toBeVisible();
  const code = (await page.getByText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/).textContent()) ?? '';

  const phone = await childPhone(browser, testInfo);
  const child = await phone.newPage();
  // A code of digits stays text through the router's search, dash kept.
  await child.goto('/jumeler?code=4821-3907');
  await expect(child.getByLabel('Le code')).toHaveValue('4821-3907');
  // What the QR code holds, opened by the child's camera.
  await child.goto(`/jumeler?code=${code}`);
  await expect(child.getByLabel('Le code')).toHaveValue(code);
  await child.getByRole('button', { name: 'Relier' }).click();
  await expect(child.getByRole('heading', { name: 'Bonjour Nina' })).toBeVisible();
  await phone.close();
});

test('a code pairs the child’s phone, which sees it, and the guardian disconnects it', async ({ page, browser }, testInfo) => {
  await guardian(page, 'jumelage');
  await addChild(page, 'Noé');
  // In 4e, the next step is the child's own phone.
  const step = page.getByRole('region', { name: 'Prochaine étape' });
  await expect(step).toContainText('Noé fait ses devoirs sur son téléphone');
  await step.getByRole('button', { name: 'Relier le téléphone de Noé' }).click();
  const code = await page.getByText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/).textContent();

  const phone = await childPhone(browser, testInfo);
  const child = await phone.newPage();
  await child.goto('/connexion');
  await child.getByRole('link', { name: 'Tu es élève ? Relie cet appareil' }).click();
  await child.getByLabel('Le code').fill(code ?? '');
  await child.getByRole('button', { name: 'Relier' }).click();
  await expect(child.getByRole('heading', { name: 'Bonjour Noé' })).toBeVisible();
  // The sessions first; the devices folded, a tap away.
  await expect(child.getByText('Un appareil que tu ne reconnais pas ?')).toBeHidden();
  await child.getByText('Tes appareils reliés').click();
  await expect(child.getByRole('listitem')).toHaveCount(1);

  // The guardian's page follows the pairing on its own: the step done, the week comes first.
  await expect(page.getByRole('status')).toHaveText('L’appareil de Noé est relié.', { timeout: 10_000 });
  await expect(step).toBeHidden();
  await expect(page.getByText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/)).toBeHidden();
  await page.getByText('Ses appareils', { exact: true }).click();
  await page.getByRole('button', { name: 'Déconnecter' }).click();
  // Unpaired, the step comes back, without the code already spent.
  await expect(step.getByRole('button', { name: 'Relier le téléphone de Noé' })).toBeVisible();
  await expect(page.getByText(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/)).toBeHidden();
  await expect(page.getByText('L’appareil de Noé est relié.')).toBeHidden();

  await child.reload();
  await expect(child).toHaveURL(/\/connexion$/);
  await phone.close();
});

// page.route never sees what the service worker answers.
test.describe('with the session gone', () => {
  test.use({ serviceWorkers: 'block' });

  test('a request refused for a lost session sends the guardian back to the sign-in', async ({ page }) => {
    await guardian(page, 'perdu');
    await page.route('**/api/household/students', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 401, contentType: 'application/problem+json', json: { status: 401, code: 'UNAUTHENTICATED' } })
        : route.fallback(),
    );
    await addChild(page, 'Léo', { level: 'Sixième', lands: false });
    await expect(page).toHaveURL(/\/connexion$/);
  });
});

test('on the family phone, the parent opens the child’s space without a code, and enters back by their own', async ({ page }) => {
  const email = await guardian(page, 'famille');
  await addChild(page, 'Zoé');
  const devices = page.getByText('Ses appareils', { exact: true });
  const openZoe = page.getByRole('button', { name: 'Ouvrir l’espace de Zoé sur cet appareil' });
  await devices.click();
  await openZoe.click();
  await expect(page.getByRole('heading', { name: 'Bonjour Zoé' })).toBeVisible();
  // A child does not cut themselves off by mistake: their parent unpairs a device.
  await expect(page.getByRole('button', { name: /déconnecter/i })).toHaveCount(0);

  await page.getByRole('link', { name: 'Changer de profil' }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  // A choice of who uses Tom, not the generic sign-in.
  await expect(page.getByRole('heading', { level: 1, name: 'Qui utilise Tom ?' })).toBeVisible();
  await expect(page.getByText('Catiche est en bêta fermée')).toBeHidden();
  await page.getByRole('link', { name: 'C’est Zoé' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Zoé' })).toBeVisible();
  await page.getByRole('link', { name: 'Changer de profil' }).click();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/foyer$/);
  // Leaving, the parent hands the phone back: Zoé's space stays on it.
  await page.getByRole('link', { name: 'Mon compte' }).click();
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Zoé' })).toBeVisible();

  await page.getByRole('link', { name: 'Changer de profil' }).click();
  await signIn(page, email);
  await expect(page).toHaveURL(/\/foyer$/);
  await page.getByRole('link', { name: /^Zoé/ }).click();
  // A device holds Zoé's space: no step left, the week first.
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Sa semaine']);
  await devices.click();
  await openZoe.click();
  await expect(page.getByRole('heading', { name: 'Bonjour Zoé' })).toBeVisible();
  // The same session, switched back to: no second pairing.
  await expect(page.getByText(/^Relié le /)).toHaveCount(1);
});

test('a parent first entering on a device that holds a child’s space is offered no passkey its lock would open', async ({ page }) => {
  await guardian(page, 'appareil-partage');
  await addChild(page, 'Zoé');
  await page.getByText('Ses appareils', { exact: true }).click();
  await page.getByRole('button', { name: 'Ouvrir l’espace de Zoé sur cet appareil' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Zoé' })).toBeVisible();
  await page.getByRole('link', { name: 'Changer de profil' }).click();

  const other = address('autre-parent');
  invite(other);
  await signIn(page, other);
  await page.getByLabel('Votre prénom').fill('Sam');
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page).toHaveURL(/\/foyer\/ajouter$/);
  await expect(page.getByRole('heading', { name: 'Entrer plus vite la prochaine fois' })).toHaveCount(0);
});

test('in 5e, the parent does the homework with the child on the family phone, and pairs no device of the child’s', async ({ page }) => {
  await guardian(page, 'accompagne');
  await addChild(page, 'Lou', { level: 'Cinquième' });
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Prochaine étape', 'Sa semaine']);
  const step = page.getByRole('region', { name: 'Prochaine étape' });
  await expect(step).toContainText('À chaque séance, Lou choisit');
  await page.getByText('Ses appareils', { exact: true }).click();
  await expect(page.getByRole('button', { name: /^Relier/ })).toHaveCount(0);
  await expect(page.getByText('En 6e et 5e, Lou travaille sur l’appareil de la famille')).toBeVisible();

  await step.getByRole('button', { name: 'Faire les devoirs avec Lou' }).click();
  await expect(page.getByRole('heading', { name: 'Bonjour Lou' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Avec mon parent à côté' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sans mon parent ce soir' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nouvelle séance' })).toHaveCount(0);
  // The child knows what their parent can see on this device.
  await expect(
    page.getByText('Quand tu travailles sur l’appareil de ta famille, ton parent peut ouvrir ton espace et relire tes séances.'),
  ).toBeVisible();
});

test('the parent’s home: a card per child with their week, the adding a link away, the next step until it is done', async ({ page }) => {
  await guardian(page, 'accueil');
  // No child yet: the adding is open.
  await expect(page.getByLabel('Son prénom', { exact: true })).toBeVisible();
  await addChild(page, 'Léo');
  await expect(page.getByRole('region', { name: 'Prochaine étape' })).toContainText('Léo fait ses devoirs sur son téléphone');

  await page.getByRole('link', { name: 'Retour au foyer' }).click();
  const card = page.getByRole('link', { name: /^Léo/ });
  await expect(card).toContainText('Quatrième');
  await expect(card).toContainText('Pas de séance ces sept derniers jours');
  await expect(page.getByLabel('Son prénom', { exact: true })).toBeHidden();
  await addChild(page, 'Lou', { level: 'Cinquième' });
  await expect(page.getByRole('region', { name: 'Prochaine étape' })).toContainText('À chaque séance, Lou choisit');
  // Done once a device holds the child's space, the step goes.
  await page.getByRole('button', { name: 'Faire les devoirs avec Lou' }).click();
  await page.getByRole('link', { name: 'Changer de profil' }).click();
  await expect(page.getByRole('heading', { name: 'Qui utilise Tom ?' })).toBeVisible();
});

test('« Mon compte » holds the passkeys and the sign-out, out of the home', async ({ page }) => {
  await guardian(page, 'compte');
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Mon compte' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mon compte' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vos clés d’accès' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toBeVisible();

  // The way back sits in the screen's header, above the title and read before it, with an icon
  // that is not read out; a finger reaches it.
  const back = page.getByRole('link', { name: 'Retour au foyer' });
  const header = page.locator('main > header');
  await expect(header.getByRole('link', { name: 'Retour au foyer' })).toBeVisible();
  await expect(back.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  expect((await back.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  const order = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a')].find((a) => a.textContent === 'Retour au foyer');
    const title = document.querySelector('h1');
    return link && title ? link.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order).toBeTruthy();
  // It leads away from this page: never announced as the current one.
  await expect(back).not.toHaveAttribute('aria-current');
});

// page.route never sees what the service worker answers.
test.describe('with a week of work', () => {
  test.use({ serviceWorkers: 'block' });
  const week = {
    minutes: 35,
    sessions: 2,
    subjects: [
      { subject: 'mathematiques', minutes: 25 },
      { subject: 'francais', minutes: 10 },
    ],
    resisting: [
      { notionId: 'n', label: 'Résoudre une équation', worked: 2, lastSolved: false, lastHelp: 'avec un indice', watch: 'mal lire la consigne' },
    ],
  };

  test('the parent reads the week of their child: subjects, time, what resists, a question to ask', async ({ page }) => {
    await guardian(page, 'semaine');
    await page.route('**/api/summary/*', (route) => route.fulfill({ json: week }));
    await addChild(page, 'Léo');
    const summary = page.getByRole('region', { name: 'Sa semaine' });
    await expect(summary).toContainText('Léo a travaillé environ 35 min, en 2 séances, ces sept derniers jours.');
    await expect(summary).toContainText('Maths : environ 25 min');
    await expect(summary).toContainText('Résoudre une équation');
    await expect(summary).toContainText('La dernière fois : pas encore résolue, avec un indice. À surveiller : mal lire la consigne.');
    await expect(summary).toContainText('Demandez à Léo de vous montrer un exercice sur « Résoudre une équation », et où ça coince.');
  });

  test('the child reads the same week, told to them, and knows their parent sees it', async ({ page, browser }, testInfo) => {
    await pairedStudent(page, browser, testInfo, 'Ines');
    await page.route('**/api/summary', (route) => route.fulfill({ json: week }));
    await page.reload();
    const summary = page.getByRole('region', { name: 'Ta semaine' });
    await expect(summary).toContainText('Tu as travaillé environ 35 min, en 2 séances, ces sept derniers jours.');
    await expect(summary).toContainText('Résoudre une équation');
    // The same question, said to the child, never the adult's sentence.
    await expect(summary).toContainText('Ton parent peut te demander de lui montrer un exercice sur « Résoudre une équation », et où ça coince.');
    await expect(summary).not.toContainText('Demandez à');
    await expect(summary).toContainText('Ton parent voit ce même résumé.');
  });

  test('a week that cannot load says so, and leaves the child’s page', async ({ page }) => {
    await guardian(page, 'semaine-panne');
    await page.route('**/api/summary/*', (route) => route.fulfill({ status: 500, contentType: 'application/problem+json', json: { status: 500 } }));
    await addChild(page, 'Léo');
    await expect(page.getByRole('region', { name: 'Sa semaine' })).toContainText('Le résumé de la semaine n’a pas pu se charger.', {
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: 'Relier le téléphone de Léo' })).toBeVisible();
  });
});

test('a week without a session says so, to the parent and to the child', async ({ page, browser }, testInfo) => {
  const phone = await childPhone(browser, testInfo);
  const parent = await phone.newPage();
  await guardian(parent, 'semaine-vide');
  await addChild(parent, 'Ana');
  await expect(parent.getByRole('region', { name: 'Sa semaine' })).toContainText('Ana n’a pas ouvert de séance ces sept derniers jours.');
  await phone.close();
  await pairedStudent(page, browser, testInfo, 'Eva');
  await expect(page.getByRole('region', { name: 'Ta semaine' })).toContainText('Pas de séance ces sept derniers jours.');
});
