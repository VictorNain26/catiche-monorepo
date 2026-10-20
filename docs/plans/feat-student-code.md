# Plan — `feat/student-code`

## Context

Le parent devait générer un code pour chaque appareil, et depuis #547 « un appareil = un enfant ».
L'ordinateur familial partagé ne marchait donc plus pour une fratrie. Un appareil occasionnel
(collège, grands-parents) demandait aussi le parent à chaque fois. Victor, le 2026-10-20 :
« se mettre à la place des familles et de l'ux », avec un code secret propre à l'enfant.

La recherche (`scratchpad/connexion-enfant-2026-10-20.md`) a fixé le modèle :
- un code court n'est sûr que sur un **appareil déjà reconnu**, avec des essais bornés. C'est le
  « secret d'activation » du NIST 800-63B § 3.2.10, et le cas « code de déverrouillage » de la
  CNIL 2022 ;
- c'est aussi le modèle d'ÉduConnect : un code provisoire, puis un code choisi par l'élève, que
  l'établissement ne voit plus.

Rien n'est en production.

## Le parcours

1. **Le parent ajoute l'enfant** (inchangé), puis choisit :
   - « Code pour un nouvel appareil » : 8 caractères, valable 10 min ;
   - ou « Ajouter cet ordinateur », s'il est sur l'ordinateur familial. Le parent étant là,
     l'enfant choisit alors son code tout de suite.
2. **Première fois sur un appareil**, l'enfant :
   - entre le code de son parent ;
   - choisit son code secret de 6 chiffres. Les codes faciles sont refusés : suites,
     répétitions, mois et année de naissance ;
   - répond à « Cet appareil est à toi seul ? ».
3. **Les fois suivantes** : l'écran « Qui fait ses devoirs ? » affiche les prénoms reconnus sur cet
   appareil et l'entrée du parent. L'enfant touche son prénom et tape son code.
   - Sur son appareil à lui, il reste connecté (90 jours, comme aujourd'hui).
   - Sur un appareil partagé, la session dure 2 h au plus et se ferme après 10 min sans activité.
     Le bouton « Changer de profil » ramène à la liste des prénoms.
4. **Un nouvel appareil** se relie avec un code du parent, puis le code de l'enfant.
5. **Code oublié** : le parent génère un code « oublié ». L'enfant choisit un nouveau code ;
   l'ancien cesse de marcher et ses sessions se ferment. À sa prochaine connexion, il voit
   « Ton code a été changé le … ».
6. **Blocage** :
   - après 3 erreurs, le profil est bloqué sur cet appareil seulement, et le parent le débloque ;
   - après 10 erreurs, tous appareils confondus, il faut un code « oublié ».
   - L'écran dit « bloqué : demande à ton parent », distinct de « code faux ».
7. **Le parent sur un appareil partagé** a la même session courte : la fratrie ne doit pas lire
   ses résumés.

## Écrans

Téléphone (≤ 640 px) :

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Qui fait ses devoirs?│   │ Léa                  │   │ Choisis ton code     │
│                      │   │ Ton code             │   │ 6 chiffres que toi   │
│  ┌──────┐ ┌──────┐   │   │  ● ● ● ○ ○ ○         │   │ seul connais.        │
│  │ Léa  │ │ Tom  │   │   │ ┌───┬───┬───┐        │   │  ○ ○ ○ ○ ○ ○         │
│  └──────┘ └──────┘   │   │ │ 1 │ 2 │ 3 │ …      │   │ Pas 123456 ni ta     │
│                      │   │ └───┴───┴───┘        │   │ date de naissance.   │
│ Je suis le parent →  │   │ Pas toi ? Changer    │   │ [ Valider ]          │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

Ordinateur (≥ 1024 px) : la même liste de prénoms en grandes cartes centrées, côte à côte. Le
pavé se tape au clavier, le pavé à l'écran reste là. Côté parent, `/foyer/$studentId` met côte
à côte :
- à gauche, « Codes » : nouvel appareil, code oublié ;
- à droite, « Appareils de Léa » : navigateur, date, état bloqué, avec les actions Débloquer et
  Déconnecter, et « Ajouter cet ordinateur ».

Tout suit `docs/charte.md` et `.claude/rules/design-system.md`, et chaque écran est vérifié dans
Chrome aux deux tailles.

## Serveur (`apps/server/src/platform/auth/`, plugin better-auth)

- **Données**, dans le `schema` du plugin et reportées dans `schema.ts` ; migration par
  `db:generate` :
  - `device(id, shared, created_at)` ;
  - `device_profile(device_id, student_id, failures, code_window_until, created_at,
    last_used_at)`, en cascade ;
  - `student_code(user_id, hash, failures, set_at, reset_at)` ;
  - `session.device_id`, champ ajouté par `additionalFields`, pour fermer les sessions d'un
    appareil.
- **Hash du code** : `ctx.context.password.hash` (scrypt de better-auth) appliqué au HMAC du code
  par un poivre dérivé de `authSecret`.
- **Cookie d'appareil** : signé par `ctx.setSignedCookie`, `httpOnly`, valable 400 jours, il ne
  porte que l'identifiant de l'appareil. Un cookie faux vaut une absence de cookie.
- **Routes** `devicePairing` devient `studentSignIn`, sous `/api/auth/student/*` ajouté à
  `STUDENT_AUTH_PATHS`, avec en plus la limite par IP de better-auth (5 par minute) :
  - `activate` : consomme le code, reconnaît l'appareil, n'ouvre pas de session ;
  - `profiles` : la liste et l'état de chaque profil ;
  - `choose-code` : liste de refus, puis ouverture de la session ;
  - `sign-in` : transaction qui incrémente les compteurs avant de vérifier
    (`UPDATE … WHERE failures < 3 RETURNING`, de même pour `< 10`), pour qu'aucun essai en
    parallèle ne dépasse les plafonds ; un profil étranger passe par une vérification factice ;
  - `add-profiles` : parent, session fraîche (`sensitiveSessionMiddleware`), enfants de son foyer
    seulement.
- **Code d'activation** : le code de jumelage actuel, réutilisé (`createPairingCode`,
  `storeIdentifier` haché, Crockford), dont la valeur porte `{ userId, reason }`.
- **Foyer** (`modules/household/`) :
  - `activation-code {reason}` remplace `pairing-code` ;
  - `devices` lit `device_profile` ;
  - `unblock`, et `DELETE` qui ferme le profil et ses sessions ;
  - `/api/me/devices` rend aussi `reset_at`.
- **Liste de refus** dans `domain/student-code.ts`, fonction pure.

## Supprimé

`redeemPairingCode`, `closeSessions`, le hook `multi-session`, `multiSession()`, la règle
« un appareil = un enfant », `multiSessionClient`, `deviceSessionsQuery`, `signOutOfDevice`,
`routes/jumeler.tsx`, `components/qr-code.tsx`, `pairingLink` et `qrPath`, et la dépendance `qr`
avec leurs tests. `profiles.test.ts` et `pairing.test.ts` sont réécrits sur le nouveau modèle.

## Tests, chacun écrit et vu en échec avant le code

- Liste de refus : 000000, 123456, 654321, 121212, 112233, mois et année de naissance ; format à
  6 chiffres.
- Activation :
  - le code est haché, à usage unique, valable 10 min ;
  - `activate` pose un cookie signé sans ouvrir de session ;
  - un cookie falsifié rend une liste vide.
- Choix du code :
  - le premier choix ouvre la session ; un second, hors fenêtre, est refusé ;
  - le hash n'est pas celui du code seul.
- Blocage :
  - 3 échecs bloquent un appareil et pas l'autre ;
  - 10 échecs verrouillent le profil jusqu'au code « oublié » ;
  - 20 essais en parallèle n'en comptent pas plus de 3 ;
  - un profil étranger reçoit la même réponse qu'un mauvais code.
- Durée des sessions : un appareil partagé n'a pas de Max-Age et ferme la session au plus à 2 h ;
  un appareil à soi garde 90 jours ; un deuxième profil rend l'appareil partagé ; le parent sur
  un appareil partagé a une session courte.
- Code oublié : l'ancien code est refusé, les sessions sont fermées, et l'élève voit `reset_at`.
- `add-profiles` : session fraîche, enfant d'un autre foyer refusé, élève refusé.
- La déconnexion garde les profils de l'appareil.
- La matrice d'accès du foyer couvre les nouvelles routes.
- Le web : la liste des profils, le pavé, les états bloqué et verrouillé, et un changement de
  profil qui recharge les autres onglets (`BroadcastChannel`).

## Commits (une PR, une seule branche)

1. Liste de refus.
2. Schéma et migration.
3. Plugin `studentSignIn` et écrans d'activation et de code, avec dans le même commit les
   suppressions. Le contrat `contract.ts` change pour le serveur et le web à la fois.
4. Ordinateur familial : « Ajouter cet ordinateur », « Changer de profil », inactivité, onglets,
   session courte du parent.
5. Foyer : codes, appareils, déblocage, avis de code changé.
6. Doc et suppression du plan :
   - `architecture.md` § Serveur porte la décision ;
   - `tuteur.md` § 8 ;
   - `produit.md` (« sur son propre appareil ») ;
   - `etat.md`.

## Hors périmètre

La soirée de devoirs, la landing, le résumé de la semaine. Le préfixe `__Host-` des cookies
reste attendu de better-auth (`etat.md`).

## Vérification

- `bun run typecheck && bun run lint` ; tests du serveur sur la base `catiche_dev` ; tests du web.
- Revue dans un contexte neuf avant le merge, centrée sécurité et vie privée de l'enfant.
- Dans Chrome, au téléphone (390 px) et à l'ordinateur (1280 px) :
  - le parent crée deux enfants ;
  - il relie un « téléphone » par code, et l'enfant choisit son code ;
  - il ajoute l'ordinateur pour les deux enfants ;
  - chacun entre avec son code ;
  - 3 erreurs bloquent, et le parent débloque ;
  - un code oublié donne un nouveau code, et l'avis s'affiche ;
  - « Changer de profil » marche entre deux onglets.
- CI `ci-ok` verte, puis merge via `gh api`.

## Avancement

- Faits, poussés sur `feat/student-code` : plan ; liste de refus ; schéma et migration `0016` ;
  plugin `studentSignIn`, foyer, écrans élève et parent, suppressions ; appareil partagé côté web
  (inactivité, onglets) ; doc. Tests serveur et web verts en local ; écrans vus dans Chrome
  (ajout de l'ordinateur, choix du code, changement de profil, blocage à 3 essais).
- Prochaine étape : revue dans un contexte neuf, constats corrigés en nouveaux commits, puis le
  dernier commit supprime ce plan ; attendre `ci-ok` ; ne pas merger (Victor vérifie dans Chrome).

## Écarts à l'exécution (2026-10-20)

Chaque fois, l'option la plus sûre pour l'enfant, ou la seule que better-auth 1.7 permette :

- **Tables hors du `schema` du plugin** : un modèle de better-auth exige une colonne `id`, et son
  adaptateur n'a pas d'incrément atomique. `device`, `device_profile` et `student_code` vivent dans
  `schema.ts`, lues et écrites par le dépôt de la plateforme (`platform/auth/student-devices.ts`) :
  `UPDATE … SET failures = failures + 1 WHERE failures < 3 RETURNING`, la ligne du code verrouillée
  d'abord. Seul `session.deviceId` est un champ du plugin, que better-auth écrit lui-même.
- **Session fraîche** : `sensitiveSessionMiddleware` ne vérifie pas l'âge de la session ;
  `add-profiles` prend `freshSessionMiddleware` (10 minutes, le `freshAge` du compte).
- **`device.user_agent`** ajouté : le parent voit le navigateur de chaque appareil.
- **Code oublié** : l'ancien code s'arrête dès que le code du parent est saisi, pas au choix du
  nouveau. Le choix d'un code n'a qu'une règle : aucun code en place et la fenêtre ouverte ; rien ne
  remplace un code existant sans le parent.
- **Inactivité au serveur** aussi : sur un appareil partagé, chaque lecture de la session repousse
  sa fin de 10 minutes, jamais au-delà de 2 h ; le minuteur du web ne fait que le dire tout de suite.
- **Réponses** : `/api/me/devices` rend `{ devices, codeResetAt }`, et
  `/api/household/students/:id/devices` `{ devices, code: { chosen, locked } }`.
- **Code tapé deux fois** au premier choix : une faute de frappe bloquerait l'enfant.
- **Avis de code changé** : sur l'accueil de l'élève deux semaines, et toujours dans « Tes
  appareils ».
- **Commits** : le serveur entier part avec les écrans du commit 3, chaque commit devant passer le
  typecheck ; le foyer y est aussi.
