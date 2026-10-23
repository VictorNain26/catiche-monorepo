# Application cible, étape 2, PR 2 : l'entrée de l'adulte et son en-tête

## Décisions de Victor

- **2026-10-23** : `docs/plans/app-cible.md` fait foi (#561, amendé par #563). L'étape 2 se fait
  en plusieurs PR ; la PR 1, le modèle de famille, est mergée (#562).
- **2026-10-23** : l'e-mail d'entrée porte un bouton et un code, valables 15 minutes (question
  tranchée 8) ; l'invitation passe par un e-mail à un bouton, valable 30 jours.
- **2026-10-23** : savoir qui est connecté, partout : « Camille · Votre compte » en haut de chaque
  écran de l'adulte, « ← Vos enfants », « Votre compte » qui dit d'abord à qui il est, la clé
  d'accès proposée à la deuxième entrée par e-mail (#563).
- **2026-10-23** : on ne retouche pas les écrans actuels ; on construit les écrans cibles.

## Contexte

Aujourd'hui, l'adulte entre par un code à 6 chiffres valable 5 minutes, à recopier
(`platform/auth/auth.ts:136-160`). `bun run invite` n'envoie aucun e-mail (`src/invite.ts`) :
Victor doit prévenir la famille lui-même. La première entrée prend trois écrans (`bienvenue`,
`foyer/cle`, `foyer/ajouter` en 4 étapes) et propose la clé d'accès avant même l'enfant. Rien ne
dit sous quel compte on est entré ; « Mon compte » ne montre que les clés, « Retour au foyer » mène
à un écran qui ne s'appelle pas ainsi. Victor l'a vécu en local le 2026-10-23.

Cette PR construit l'entrée de l'adulte (A1, A2, A3), « Votre compte » (A9) et l'en-tête commun.

**Le découpage de la suite change** (§ 8 d'`app-cible.md` mis à jour dans cette PR). La PR « l'entrée
de l'adulte et son accueil » était trop grosse pour une seule PR revue en profondeur. Elle devient :
- **PR 2 (celle-ci)** : l'entrée et l'en-tête ;
- **PR 3** : inviter un adulte, le rôle de proche et ses droits (A8, la liste des adultes) ;
- **PR 4** : relier l'appareil de l'enfant, A4, avec le code de départ de 7 jours et le carré à
  viser ;
- **PR 5** : l'accueil en cartes (A5 complet), « Gérer » (A7), l'historique, la suppression avec
  7 jours d'annulation ;
- **PR 6** : l'enfant (C1, C2, E1 à E4, E6, E7) et la navigation.

## Le changement

### Serveur

**L'e-mail d'entrée, un bouton et un code** (`platform/auth/auth.ts`) :
- `emailOTP` passe à `expiresIn: 15 * 60`. Une seule mécanique sert au bouton et au code : le
  bouton ouvre `<origine>/entrer#<adresse et code>`. Le fragment (`#`) ne part jamais au serveur
  ni dans ses journaux ; la page le lit, entre par `sign-in/email-otp`, puis l'efface de l'adresse.
  Le code reste à usage unique et limité à 3 essais, comme aujourd'hui.
- Le texte d'A2 : objet « Votre lien pour entrer dans Catiche » ; « Entrer dans Catiche » (le
  lien), le code, « Il marche 15 minutes. » ; « Si vous n'avez rien demandé, ignorez ce message :
  personne n'entre sans lui. » Le mailer garde son texte brut ; il rend le lien cliquable dans la
  version HTML (`platform/email/mailer.ts`), sans gabarit.

**L'invitation, un bouton** :
- Le plugin `magicLink` de better-auth (1.7.11, déjà installé), réservé à l'invitation :
  `expiresIn` 30 jours, jeton stocké haché (`storeToken: 'hashed'`), `newUserCallbackURL` vers
  A3. Sa route publique `POST /sign-in/magic-link` entre dans `disabledPaths` : seul le serveur
  émet un lien, depuis l'invitation. La porte d'inscription reste le hook `user.create.before`,
  qui exige l'invitation (`auth.ts:95-99`). À vérifier en premier : qu'un appel interne
  (`auth.api.signInMagicLink`) passe malgré `disabledPaths` ; sinon, l'URL se fabrique avec
  l'utilitaire du plugin, pas à la main.
- `invite(db, email)` (`platform/auth/invitation.ts`) envoie l'e-mail : objet « Votre
  invitation à Catiche » (A8, sans « Nadia » ; sans genre) ; bouton « Accepter l'invitation » ; « Sur un autre appareil ? Ouvrez
  catiche.fr et donnez cette adresse. » ; « L'invitation vaut 30 jours. » `src/invite.ts` reçoit
  le mailer de la config. (Écart à A8 : pas de code dans l'e-mail d'invitation, un code de 30 jours
  serait un mot de passe ; l'adresse invitée suffit sur un autre appareil, par A1.)

**La clé d'accès proposée à la deuxième entrée** :
- `adult_profile` gagne `email_entries` (entier) et `passkey_offer_closed_at` (nullable) ;
  migration 0020, générée.
- Un hook `after` sur `sign-in/email-otp` incrémente `email_entries` pour un adulte.
- `GET /api/me` dit `passkeyOffer: boolean` : au moins 2 entrées par e-mail, aucune clé, l'offre
  pas fermée, et l'appareil pas partagé. `POST /api/me/passkey-offer` la ferme (« Plus tard »).

### Web

- **A1, `routes/connexion.tsx`** : les textes d'A1 ; « Recevoir un e-mail pour entrer » ; le bouton
  « Entrer avec une clé d'accès » disparaît (la saisie automatique du téléphone reste,
  `autoComplete="username webauthn"`).
- **A2, l'étape du code** : « Ouvrez l'e-mail de Catiche », « Nous l'avons envoyé à [adresse].
  Touchez le bouton de l'e-mail, ou tapez son code ici. Il marche 15 minutes. » ; « Renvoyer
  l'e-mail », « Changer d'adresse ». `components/code-form.tsx` suit (15 minutes).
- **`routes/entrer.tsx`**, nouveau : lit le fragment, entre, efface le fragment, mène à `/`.
  Lien expiré ou déjà servi : « Ce lien ne marche plus. » et « Recevoir un nouvel e-mail » (A1
  préremplie).
- **A3, `routes/bienvenue.tsx`**, un seul écran : « Présentez-vous, puis votre enfant ». « Vous » :
  « Votre prénom » (« Votre enfant le verra. »), « J'ai 18 ans ou plus. » ; « Votre enfant » :
  prénom, classe, mois et année, la case d'autorité parentale avec son aide ; « Continuer ».
  Il appelle `updateUser`, `declareAdult`, puis `addStudent`, et mène à la fiche de l'enfant (A4
  viendra en PR 4). `foyer.ajouter.tsx` garde l'ajout d'un enfant suivant, en un écran avec les
  mêmes champs que la partie « Votre enfant ».
- **`routes/foyer.cle.tsx` supprimé** ; la carte de la clé d'accès entre en tête de l'accueil
  quand `me.passkeyOffer`, avec les textes d'A5.
- **L'en-tête de l'adulte** (`components/page.tsx`) : un composant `AdultHeader` remplace les
  `BackLink` « Retour au foyer » et les `HeaderLink` « Mon compte » écrits route par route :
  « ← Vos enfants » (sauf sur l'accueil), « Camille · Votre compte », « Quitter ».
- **L'accueil, `routes/foyer.index.tsx`** : le titre « Suivez les devoirs de vos enfants » et
  l'en-tête. Les cartes restent celles d'aujourd'hui jusqu'à la PR 5.
- **A9, `routes/foyer.compte.tsx`** : « Ce compte est le vôtre » ; « Ce compte est celui de
  [prénom] : [adresse]. » ; la phrase de l'appareil (90 jours, ou partagé) ; « Votre prénom »,
  modifiable ; « Quitter Catiche » ; « Vos clés d'accès » avec la phrase d'A9 et, sauf sur un
  appareil partagé, « Créer une clé d'accès sur cet appareil ». La suppression du compte attend
  la PR 5 (ses conséquences parlent des autres adultes).

### La doc, dans la même PR

- `docs/plans/app-cible.md` : § 8 au nouveau découpage ; A8 sans code dans l'e-mail ; ce qui est
  construit en sort.
- `docs/architecture.md` (l'auth : le lien d'entrée, l'invitation par `magicLink`), `README.md`
  (`bun run invite` envoie l'e-mail), `docs/etat.md` si un point change.

## Les tests, écrits et vus en échec d'abord

Serveur, par l'API sur Postgres (`.claude/rules/testing.md`) :
- l'e-mail d'entrée porte le lien `/entrer#…` et le code ; le code marche encore à 14 minutes,
  plus à 16 (horloge passée en dépendance, pas de `mock.module`) ;
- `invite` envoie l'e-mail ; son lien fait entrer une adresse invitée et mène à A3 ; il ne sert
  qu'une fois ; une adresse sans invitation n'entre pas ; `POST /sign-in/magic-link` répond 404 ;
- `email_entries` compte les entrées par e-mail, pas celles par clé ; `passkeyOffer` suit ses
  quatre conditions ; « Plus tard » la ferme.

Web, `lib/*.test.ts` : la lecture du fragment (adresse et code, fragment absent ou abîmé) ; le
schéma d'A3.

## Hors périmètre

- Inviter un autre adulte, le rôle de proche : PR 3.
- A4 et le code de départ de 7 jours : PR 4.
- Les cartes de l'accueil, « Gérer », l'historique, la suppression : PR 5.
- Les écrans de l'enfant, « Qui fait ses devoirs ? » au départ de « Quitter » : PR 6.

## Vérification

1. Les tests touchés en local ; la suite en CI. `bun run typecheck && bun run lint`, `db:generate`
   sans écart, `db:check`.
2. En local, à 390 et 1280 px dans Chrome :
   - `bun run invite` d'une adresse neuve : l'e-mail (journal du serveur) a son bouton ; le
     bouton mène à A3 ; A3 rempli mène à la fiche de l'enfant ;
   - sortir, entrer par A1 : l'e-mail a un lien et un code ; le lien fait entrer ; le code aussi ;
   - à la deuxième entrée, la carte de la clé d'accès ; « Plus tard » la range ;
   - l'en-tête sur chaque écran adulte ; « Votre compte » dit le prénom et l'adresse.
3. Un test de tâches par un lecteur sans contexte, dans le rôle d'un grand-parent invité :
   entrer, ajouter l'enfant, dire sous quel compte il est, revenir à l'accueil.
4. `/simplify` et `/code-review`, constats retenus corrigés, `ci-ok` vert ; puis Victor regarde
   en local avant le merge.
