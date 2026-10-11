# Suivi

Où on en est, réécrit dans chaque PR qui fait avancer ; ce qui est fini en sort (git, les PR et
`decisions.md` le gardent). L'ordre : `roadmap.md`.

## Où on en est

- **Mis à jour le** 2026-10-11.
- **Nouvel ordre** (`decisions.md`, 2026-10-11) : l'identité et l'app d'abord, Tom ensuite ; les
  lots sont renumérotés (`roadmap.md`).
- **Lot en cours : 1, l'identité, et le lot 2 commence** : Victor a choisi le nom, « Catiche »,
  et la direction, « Grands carreaux » aux fontes d'« Instrument » (`decisions.md`, 2026-10-11),
  après les études (`etudes/2026-10-11/`) et l'essai sur les vrais écrans
  ([comparatif](https://claude.ai/artifact/8x3Qm6x1NiQiVMrJhyYbJ8)). Les fondations de la charte
  sont posées (`charte.md`). Restent le logo de Catiche et Tom au trait. Le lot 2 suit
  `etudes/2026-10-11/refonte-interface.md`, en dix PR.
- **Déjà dans l'app**, aux couleurs et aux fontes de la charte : le mode accompagné en 6e et 5e,
  la séance, les accueils élève et parent, l'écran du résumé, le jumelage par QR code, la photo
  de l'exercice. Le lot 2 refait entièrement ces écrans.
- **Lot 2, en dix PR** (`etudes/2026-10-11/refonte-interface.md`) : faites, la PR 1 (l'en-tête
  des écrans, `Card` dans `@repo/ui`) et la PR 2 (l'entrée du parent : Catiche dit en une phrase,
  le code en grand, la clé d'accès proposée après le prénom ; le nom dans l'onglet, le manifeste,
  les e-mails et la clé d'accès) et la PR 3 (l'ajout d'un enfant, une question par écran, le mois
  de naissance en deux menus ; puis la fiche de l'enfant, ouverte sur la prochaine étape, le reste
  replié par `Fold` de `@repo/ui`) et la PR 4 (le profil de l'élève dans l'en-tête, « Qui
  utilise Tom ? » avec chaque enfant que l'appareil tient, le jumelage des deux côtés ; en 4e et
  3e, plus d'ouverture de l'espace de l'enfant par le parent) ; la suivante, la PR 5, l'élève
  arrive et ce que Tom retient. La marge rouge du cahier est retirée (`decisions.md`) : la tête de Tom,
  que l'étude place « dans la marge » à la séance, se pose à côté de ses messages.
- **Lot 4 en attente** : le harnais `bun run eval` est mergé ; son passage unique attend le
  paiement à l'usage de Mistral (bloquant ci-dessous). Le premier essai s'est arrêté à 3
  conversations sur 104 et ne compte pas comme mesure. Référence de comparaison : 11 fuites sur
  106, le 2026-10-06 (`etudes/2026-10-06/passage-de-fin.md`, données dans
  `etudes/2026-10-06/donnees/results.json`).
- **En ligne** : le staging, https://staging.tomia.fr, déployé à chaque merge ; la landing,
  https://tomia.fr, gelée jusqu'au lot 3 sauf correctif d'honnêteté ou technique.
- **PR ouvertes** : `gh pr list`.

## Bloquants

| Bloquant | Effet | Comment lever |
|---|---|---|
| Mistral en mode gratuit : 100 000 tokens par minute, une fiche d'exercice en prend environ 78 000 | Le harnais et deux élèves dans la même minute voient la fiche échouer | Le paiement à l'usage, que Victor reporte au lot 4 (2026-10-11) ; puis relire Admin › Limites |
| Zero Data Retention non accordé | Mistral peut garder textes et audio d'élèves | Ouvert seulement en paiement à l'usage ([centre d'aide](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)) ; sa recevabilité est demandée au support (ticket « legal request/GDPR » du 2026-10-11) |
| Clause des mineurs de Mistral (2.2(c), version du 2026-09-25) | Aucun utilisateur réel de moins de 15 ans | Réponse écrite de Mistral, demandée le 2026-10-11 dans le même ticket ; réponse attendue par e-mail |
| La marque TOM ([FR 4873204](https://data.inpi.fr/marques/FR4873204)), en vigueur en classes 9, 41 et 42 | Tout nom de produit bâti sur Tom, et peut-être Tom comme mascotte | Avis d'un conseil en propriété industrielle (`etudes/2026-10-11/nom.md`) |

## À faire par Victor

- **Catiche** : acheter catiche.fr et catiche.app ; une recherche de similarité INPI, puis le
  dépôt de la marque (classes 9, 41 et 42) ; des identifiants Instagram et TikTok (@catiche est
  pris) ; l'avis d'un conseil en propriété industrielle sur Tom face à la marque TOM.
- **Mistral** : lire la réponse du support (ticket du 2026-10-11) ; au lot 4, activer le paiement
  à l'usage avec un plafond, demander le Zero Data Retention, vérifier Admin › API ›
  Confidentialité.
- **Comptes à fermer** : le projet Vercel et l'application GitHub Vercel (son check échoue sur
  chaque PR), l'organisation Sentry `home-drx`, le projet Langfuse « tomai » ; vérifier que Koyeb
  ne facture plus rien ; supprimer les secrets de dépôt `KOYEB_API_TOKEN` et `DATABASE_URL`.
- **Sécurité des comptes** : la double authentification d'OVH, qui tient le domaine ; chez
  Scaleway, ce qui reste (moyen de paiement, vérification d'identité, double authentification).
- **CNIL** : écrire sur l'hébergement de données de santé, avec le texte de
  `etudes/2026-10-07/hebergement.md` ; garder une copie du DPA de Clever Cloud pour l'AIPD.
- **Dependabot** : classer `inaccurate` les alertes rattachées à `apps/ai-service/uv.lock` et
  `apps/curriculum/uv.lock`, supprimés en `8f5011f`, et signaler le bug au support GitHub.
- **Vérifications** : Tom dans le hero sur un iPhone (Safari, sans fond noir) ; un e-mail à
  contact@tomia.fr depuis une autre adresse que Gmail ; le lundi 2026-10-12, que Renovate a
  ouvert les mises à jour en attente (#310) ; les plugins Claude Code à jour
  (`claude plugin marketplace update`, puis `claude plugin update <nom>`).

## Reporté

Constats hors du périmètre de la PR qui les a trouvés, rangés par moment ; le plan de la PR
concernée les reprend (`.claude/rules/plans-and-agents.md`).

**Avant le premier élève réel**
- Bugsink auto-hébergé, avec sa base, environ 10 à 12 € HT par mois ; les erreurs des navigateurs
  par le serveur (`tunnel`), sans contenu d'élève (`etudes/2026-10-07/hebergement.md`).
- La base du staging, joignable depuis internet : la placer dans un réseau privé Clever Cloud
  ([Network Groups](https://www.clever.cloud/developers/changelog/2026/05-12-network-groups-console)).
- Clever Cloud à éprouver : un tour long à travers le proxy (délai documenté de 180 s), le délai
  de grâce réel au SIGTERM contre `SHUTDOWN_DEADLINE_MS`, la sonde pour `DRAIN_MS`, le PITR et son
  prix, Postgres 18.4 chez eux contre 18.6 en dev et en CI.
- `platform/http/client-address.ts` n'est exercé par aucun test, faute d'un vrai `Bun.serve`.
- Le préfixe `__Host-` des cookies, quand better-auth le livre
  ([#10806](https://github.com/better-auth/better-auth/issues/10806)).

**Lot 2, l'app**
- Les formules de Tom : sur Chrome de bureau, chaque formule montre des flèches de défilement
  vertical, son conteneur (`[&_.katex]:overflow-x-auto`, `components/tom-text.tsx`) débordant de
  6 px en hauteur ; vu le 2026-10-11, KaTeX 0.16 comme 0.19.
- Mémoire : les 1 053 libellés du référentiel restent ceux du programme (« Il utilise… »),
  présentés « Au programme » ; leur réécriture dans les mots de l'élève demande une relecture
  de Victor entrée par entrée, avant la bêta fermée.
- Résumé de la semaine : son arrêt à la demande de l'élève, avec le consentement ; un envoi par
  e-mail n'est pas décidé.
- Appareils de l'élève : le prévenir quand un nouvel appareil est relié.
- Client web : mesures sur un vrai iPhone et un Android.

**Lot 3, le site**
- La landing reçoit `packages/tokens/theme.css` et la fonte de la charte ; `landing.css` se
  supprime.
- Image Open Graph, tests de la landing qui gardent l'identité rejetée (`signs.spec.ts`,
  `type.spec.ts`, `hero.spec.ts`), une application de preview par PR.

**Lot 4, Tom**
- Tom qui se dit programme : un scénario où l'élève demande s'il est humain ou parle de lui ; la
  grille de Victor a quatre questions, une cinquième se décide avec lui avant le passage.
- Référentiel : sciences, histoire-géographie et anglais ; des exercices inspirés des sujets du
  brevet (`etudes/2026-10-01/education-nationale.md`).
- Niveau de langue : trouver une mesure validée de la lisibilité d'un texte français pour
  collégiens avant de le réintroduire.
- Le juge : l'échantillon d'accord et les cas construits de l'ancien juge sont supprimés ; ils se
  récupèrent dans git (`apps/server/src/eval/`, avant le 2026-10-08) si le nouveau juge en a
  l'usage.
- Après une détresse : la revue humaine, son délai et sa trace ; ce que voit l'élève ensuite ; le
  canal du message au parent (`decisions.md`, « Ouvertes »), avec une table d'envois idempotente.
- Voix : la `Permissions-Policy` interdit le micro, à ouvrir à `self` ; la transcription impose le
  français, un oral de langue déclare sa langue.

## Surveillance

Conditions à guetter, sans PR tant qu'elles ne se déclenchent pas.

- **E2E instables en local** (2026-10-09) : sous la suite complète, « the button gets a parent in
  with their passkey » et « a paired student opens a session » ont échoué une fois chacun, puis
  passé seuls à chaque relance. Si la CI les voit échouer, en chercher la cause (attente, charge).
- **Jeton de la CLI Clever Cloud** : il expire le 2027-10-08 ; le renouveler avant.
- **Taux de Mistral** (`MISTRAL_USD_TO_EUR`, 0,85 le 2026-10-06) : le revérifier à chaque
  facture ; un écart change chaque coût et chaque quota.
- **Configuration des agents** : élagage mensuel, le prochain le 2026-11-02.
- **TypeScript** figé à 6.0 tant que `typescript-eslint` exige `<6.1.0` ; TypeScript 7 pas avant ;
  `typescript-eslint` 8.71 active `no-unsafe-enum-assignment`. `@types/node` 24 pour les builds
  Node 24 du web et de la landing.
- **Bun 1.4.2** plante parfois sous `bun test --isolate` (oven-sh/bun#44161) : guetter un
  « Segmentation fault » en CI.
- **Override de `source-map-js`** (GHSA-68fv-2mgg-jv7q) : le retirer quand `postcss` et
  `@tailwindcss/node` déclarent 1.2.2 ou plus.
- **`@hono/bun`** : adoption faible ; la revérifier avant Hono v5.
- **Catalogs Bun** : les remettre quand renovatebot/renovate#42909 est fusionnée.
- **Bun.SQL** : écarté pour ses bugs de corruption ouverts ; réévaluer quand ils sont fermés.
