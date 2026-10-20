# État

Ce qui reste vrai quelle que soit la direction du produit : les bloquants, les gestes de Victor,
le technique reporté et ce qu'on surveille. Mis à jour le 2026-10-20 ; ce qui est fait en sort.

## Bloquants

| Bloquant | Effet | Comment lever |
|---|---|---|
| Clause des mineurs de Mistral (2.2(c), version du 2026-09-25) | Aucun utilisateur réel de moins de 15 ans | Réponse écrite de Mistral, demandée le 2026-10-11 (ticket « legal request/GDPR ») |
| Zero Data Retention non accordé | Mistral peut garder textes et audio d'élèves | Ouvert seulement en paiement à l'usage ([centre d'aide](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)) ; recevabilité demandée dans le même ticket |
| La marque TOM ([FR 4873204](https://data.inpi.fr/marques/FR4873204)), classes 9, 41 et 42 | Tout nom de produit bâti sur Tom, et peut-être Tom comme mascotte | Avis d'un conseil en propriété industrielle |
| Mistral en mode gratuit : 100 000 tokens par minute, une fiche d'exercice en prend environ 78 000 | Le harnais et deux élèves dans la même minute voient la fiche échouer | Le paiement à l'usage avec un plafond, puis relire Admin › Limites |

## À faire par Victor

- **Comptes à fermer** : le projet Vercel et l'application GitHub Vercel (son check échoue sur
  chaque PR), l'organisation Sentry `home-drx`, le projet Langfuse « tomai » ; vérifier que Koyeb
  ne facture plus rien.
- **Double authentification** : celle d'OVH, qui tient le domaine ; chez Scaleway, ce qui reste
  (moyen de paiement, vérification d'identité, double authentification).
- **Scaleway** : lire et valider les nouvelles « Specific Conditions Services » que la console
  demande (vu le 2026-10-20).
- **Dependabot** : classer `inaccurate` les alertes rattachées à `apps/ai-service/uv.lock` et
  `apps/curriculum/uv.lock`, supprimés en `8f5011f`, et signaler le bug au support GitHub.
- **CNIL** : écrire sur l'hébergement de données de santé ; garder une copie du DPA de Clever
  Cloud pour l'AIPD.

## Avant le premier élève réel

- Bugsink auto-hébergé, avec sa base ; les erreurs des navigateurs par le serveur (`tunnel`), sans
  contenu d'élève.
- La base du staging, joignable depuis internet : la placer dans un réseau privé Clever Cloud
  ([Network Groups](https://www.clever.cloud/developers/changelog/2026/05-12-network-groups-console)).
- Clever Cloud à éprouver : un tour long à travers le proxy (délai documenté de 180 s), le délai
  de grâce réel au SIGTERM contre `SHUTDOWN_DEADLINE_MS`, la sonde pour `DRAIN_MS`, le PITR et son
  prix, la version de Postgres chez eux contre celle de `docker-compose.yml`.
- Après une détresse : la revue humaine qui relit `distress_event` (aucun code ne la lit
  aujourd'hui), son délai et sa trace ; ce que voit l'élève ensuite ; le canal du message au
  parent, avec une table d'envois idempotente.
- Appareils de l'élève : le prévenir quand un nouvel appareil porte son profil ; aujourd'hui il le
  voit seulement dans sa liste.
- Appareils reconnus (`platform/auth/student-devices.ts`) :
  - la ligne d'un appareil (son navigateur) part quand le parent le déconnecte de son dernier
    profil, pas encore à la suppression d'un compte : une purge des appareils sans profil reste à
    écrire, avec celle des comptes inactifs ;
  - le cookie d'appareil n'est posé qu'à l'activation : passé 400 jours, le navigateur l'oublie et il
    faut un nouveau code du parent ; le reposer à chaque entrée réussie ;
  - la limite de better-auth par adresse (5 par minute sur les routes de l'élève) vit en mémoire,
    par instance, et n'est exercée par aucun test : une seule instance, ou son stockage en base.
- Sessions de parent : un code « oublié » et la suppression d'un enfant ne demandent pas de session
  fraîche ; à exiger comme pour une clé d'accès, si un parent laisse sa session ouverte.
- Le code de l'élève dans l'analyse d'impact : la CNIL réserve le code court au « dispositif
  matériel détenu en propre » (délibération 2022-100, § 46) ; l'ordinateur de la famille ne l'est
  pas, et s'appuie sur « tout autre mécanisme technique apportant un même niveau de sécurité »
  (appareil reconnu, 3 essais, session courte). C'est une interprétation à écrire, pas une
  conformité littérale.
- Les durées de conservation annoncées (`apps/landing/src/pages/confidentialite.astro`, § 7) :
  aucune purge ne tient encore celles du compte inactif ni des journaux. Celles des e-mails reçus
  à `contact@` se tiennent à la main, dans la boîte Zimbra.
- La landing, à la naissance de la production : son bouton et « Se connecter » mènent au staging
  (`APP_URL`, `apps/landing/src/lib/brand.ts`) ; changer cette constante, et la phrase sur
  l'invitation si l'inscription s'ouvre.
- L'adresse de la connexion (`platform/http/client-address.ts`, `getConnInfo`) n'est exercée par
  aucun test, faute d'un vrai `Bun.serve`.
- Le préfixe `__Host-` des cookies, quand better-auth le livre
  ([#10806](https://github.com/better-auth/better-auth/issues/10806)).

## Prochain chantier

- **Le passage à `catiche.fr`** est fait le 2026-10-20 (#552) : DNS, envoi Scaleway vérifié,
  applications et dépôt renommés, variables du staging, anciens domaines détachés. Reste, par
  Victor : supprimer l'image GHCR `tomai-server` (Settings du paquet sur GitHub) ; l'ancien
  domaine expire seul le 24 août 2027.
- **L'ordre décidé par Victor (2026-10-20)**, un chantier après l'autre :
  1. **La restructuration de la landing** : en PR (`feat/landing-v2`), selon les décisions de
     Victor du 2026-10-21 ; le texte de « Qui fait Catiche » attend ses mots.
  2. **La refonte de l'application**, pensée depuis le parent et l'enfant réels. Il faut d'abord
     un parcours et des textes validés, puis l'écran à l'ordinateur comme au téléphone. Un
     inventaire des écrans actuels est fait : vocabulaire technique, colonne unique, doublons,
     écarts à la charte.
  3. **La soirée de devoirs à l'oral et le point du soir** (`produit.md`), avec le volet IA.
- **À vérifier, relevé par l'inventaire** : le résumé montre au parent « Ce qui résiste » même
  quand l'enfant a refusé la mémoire, alors que `/memoire` dit le contraire
  (`core/week-summary.ts`, `routes/memoire.tsx` du web).
- Pour la soirée : le micro, que la `Permissions-Policy` du serveur
  ferme (`platform/http/security-headers.ts`), s'ouvre à `self` ; la transcription impose le
  français.

## Technique reporté

- La suppression du compte parent : le serveur la porte (`POST /api/auth/delete-user`, session de
  moins de 10 minutes), mais le web n'a pas de bouton ; d'ici là, elle se fait sur demande, comme
  le disent les CGU et la politique de confidentialité.
- L'e-mail de suppression invite à répondre (`platform/auth/auth.ts`), mais le mailer ne pose
  aucun `Reply-To` : la réponse irait à `MAIL_FROM`, que personne ne lit ; à faire pointer vers
  `contact@catiche.fr`, avec son test.
- Code de l'élève, vu dans Chrome le 2026-10-20 à l'ordinateur seulement (la fenêtre ne s'est
  pas réduite à la largeur d'un téléphone) : à revoir au téléphone. Trois finitions :
  - un code trop facile n'est refusé qu'après sa seconde saisie, au lieu de la première ;
  - « Ajouter cet ordinateur » reste proposé sur un ordinateur déjà ajouté ;
  - le titre de « Qui fait ses devoirs ? » est aligné à gauche, et les prénoms au centre.
- Les formules de Tom : sur Chrome de bureau, chaque formule montre des flèches de défilement
  vertical, son conteneur (`[&_.katex]:overflow-x-auto`, `components/tom-text.tsx`) débordant de
  6 px en hauteur.
- Mémoire : les 1 053 libellés du référentiel restent ceux du programme (« Il utilise… ») ; leur
  réécriture dans les mots de l'élève demande une relecture de Victor avant tout élève réel.
- Harnais : la mesure de référence (11 fuites sur 106 conversations, commit `2f8aeed8`, avant le
  contrôle de sortie) et ses données par conversation, pour comparer cas par cas, sont dans git :
  `git show aaddbb15:docs/etudes/2026-10-06/donnees/results.json` et
  `git show aaddbb15:docs/etudes/2026-10-06/passage-de-fin.md`.

## Surveillance

- **Jeton de la CLI Clever Cloud** : il expire le 2027-10-08 ; le renouveler avant.
- **Secret de l'auth** (`BETTER_AUTH_SECRET`) : le poivre des codes d'élève en dérive, et il
  signe le cookie d'appareil (`platform/auth/student-sign-in.ts`) ; le changer arrête tous les codes
  et fait oublier tous les appareils : chaque élève revient par un code « oublié » de son parent.
- **Taux de Mistral** (`MISTRAL_USD_TO_EUR`) : le revérifier à chaque facture.
- **Configuration des agents** : élagage mensuel, le prochain le 2026-11-02.
- **TypeScript** figé à 6.0 tant que `typescript-eslint` exige `<6.1.0` ; `@types/node` 24 pour
  les builds Node 24 du web et de la landing.
- **Bun** (version : `packageManager` de `package.json`) a planté sous `bun test --isolate` en
  1.4.2 (oven-sh/bun#44161) : guetter un « Segmentation fault » en CI.
- **Override de `source-map-js`** (GHSA-68fv-2mgg-jv7q) : le retirer quand `postcss` et
  `@tailwindcss/node` déclarent 1.2.2 ou plus.
- **`@hono/bun`** : adoption faible ; la revérifier avant Hono v5.
- **Catalogs Bun** : les remettre quand renovatebot/renovate#42909 est fusionnée.
- **Bun.SQL** : écarté pour ses bugs de corruption ouverts ; réévaluer quand ils sont fermés.
