# Architecture

Ce qui est en place, et comment. Le tuteur : `tuteur.md`.

Tom est le nom de l'IA, pas du produit, qui s'appelle Catiche. Aucun utilisateur réel : aucune
contrainte de rétrocompatibilité, on vise directement la cible.

## Serveur

Monolithe modulaire, dont les règles de dépendance sont vérifiées au lint
(`apps/server/eslint.config.mjs`).

En place (`apps/server/src`) :
- `main.ts`, seule racine de composition, et `migrate.ts` ; `config.ts`, un seul schéma de
  l'environnement ; `app.ts`, `createApp(deps)`.
- `platform/` : `http` (erreurs RFC 9457, en-têtes de sécurité, service du web), `db` (client,
  migrations sous verrou et vérifiées au démarrage), `auth` (better-auth et ses tables),
  `observability` (pino), `lifecycle` (santé, arrêt, et la tâche de fond). La tâche de fond
  (`platform/lifecycle/sweep.ts`) tourne dans le processus, une fois au démarrage puis toutes les
  heures, et appelle les étapes que `main.ts` lui passe (`householdSweep`, `modules/household`) ;
  un verrou consultatif de Postgres, tenu par sa transaction, n'en laisse passer qu'une instance
  à la fois, et l'arrêt attend le passage en cours.
- `modules/household` : le lien entre un adulte et un enfant, qui permet plusieurs adultes par
  enfant, chacun parent ou proche (`guardianship.role`) ; l'élève créé par un adulte sans aucun
  identifiant (ni e-mail, ni mot de passe, ni nom de famille), ses appareils ; les déclarations
  horodatées de l'adulte, majeur et représentant légal de chaque enfant dont il est parent ;
  l'accès de l'adulte à l'élève comme clause de la requête SQL, `studentsOf` pour lire (la fiche,
  la semaine) et `managedBy` pour gérer (le reste, réservé au parent : un proche y reçoit 404),
  une matrice de tests d'accès croisés. Un parent invite un autre adulte, parent ou proche, pour
  un enfant (`adult_invitation`, `POST /api/household/students/:id/invitations`) : une adresse sans
  compte reçoit l'invitation de bêta fermée, dont l'e-mail dit qui invite et pour quel enfant ;
  une adresse avec un compte, un lien vers Catiche ; les autres parents sont prévenus. L'adulte
  l'accepte depuis son premier écran ou son accueil (`GET /api/me`, `invitations`), son adresse
  prouvée par l'e-mail d'entrée ; un parent annule une invitation en attente. Un prénom,
  d'enfant ou d'adulte, tient sur une ligne (`domain/first-name.ts`, et un hook de better-auth
  pour l'adulte) : le mailer fait un lien d'une ligne « libellé : https://… ».
  Un parent retire un proche, un proche se retire lui-même, aucun
  parent ne retire l'autre. Chaque geste d'un adulte sur l'enfant (la liste :
  `domain/child-events.ts`) s'inscrit dans l'historique (`child_event`), dans la transaction du
  geste lui-même, le code de départ compris (`createActivationCode` écrit dans la transaction
  que le repository du foyer lui passe) ; un parent le lit
  sur la durée de `HISTORY_DAYS` (`GET /api/household/students/:id/history`), avec le prénom de l'auteur, que perd
  la ligne d'un adulte parti. La mémoire retirée et le code de départ après un oubli partent aussi
  par e-mail aux autres parents, jamais à un proche. La liste des enfants
  (`GET /api/household/students`) donne à chaque adulte les prénoms des autres parents et, à un
  parent, ce que son accueil signale : un appareil bloqué, le code arrêté partout, la suppression
  demandée. Un parent supprime le compte de l'enfant (`DELETE /api/household/students/:id`) tout
  de suite quand aucun autre parent ne le suit ; sinon la suppression est demandée, les autres
  parents prévenus, et tout parent l'annule pendant `DELETION_DAYS`
  (`domain/student-deletion.ts`) ; passé ce délai, l'enfant est traité comme supprimé par chaque
  lecture (`alive`, `repository/access.ts`), puis la tâche de fond le supprime et prévient ses
  parents. Elle purge aussi l'historique au-delà de `HISTORY_DAYS` et les invitations expirées,
  avec l'invitation de bêta d'une adresse que plus rien n'attend. Les parties du
  repository qui ne tiennent pas dans un fichier vivent dans `repository/`, que lui seul importe. Le résumé de la
  semaine donne aussi les jours, à l'heure de Paris, où l'enfant a écrit à Tom (`days`,
  `tonight`), que chaque adulte lit sans durée ni matière.
- `platform/email` : l'envoi d'un e-mail, Scaleway TEM par son SDK en production, le journal en
  développement. Le gardien n'a pas de mot de passe : il entre par un e-mail envoyé à son adresse
  (plugin `email-otp`), dont le bouton mène à `/entrer` avec l'adresse et le code après le `#`, que
  le navigateur n'envoie à aucun serveur : la page l'efface de la barre d'adresse et n'entre
  qu'au toucher de « Entrer ». Le premier crée son compte sur invitation
  (`platform/auth/invitation.ts`, refusée à une adresse qui a déjà un compte), qui envoie elle-même
  un e-mail à un bouton : il mène à `/invitation`, le lien du plugin `magic-link` après le `#`, et
  seul le bouton de cette page le suit. Ce lien sert une fois et seul le serveur l'émet (sa route
  publique est dans `disabledPaths`, que better-auth n'applique qu'aux requêtes). Il entre aussi par une clé d'accès (`@better-auth/passkey`, liée à l'origine
  publique), que l'accueil propose à partir de sa deuxième entrée par e-mail, hors appareil
  partagé (`GET /api/me`, `passkeyOffer`). Une clé se crée,
  et le compte se supprime (`POST /api/auth/delete-user`, depuis « Votre compte »), depuis une
  session ouverte il y a moins de 10 minutes ; la suppression emporte les enfants dont l'adulte
  est le dernier parent (`GET /api/me`, `onlyParentOf`, que l'écran nomme avant), leurs proches
  n'en gardant pas le lien. L'élève n'a pas de clé : le garde du foyer lui
  ferme les routes de better-auth, sauf les siennes et celles par où son parent entre sur son
  appareil. Une session vit 90 jours sans usage, sauf sur un appareil partagé. Les envois partent
  après la réponse (`platform/lifecycle/background.ts`), que l'arrêt attend.
- `modules/tutor` : les séances, le tour (`POST /api/sessions/:id/messages`), qui dit ses étapes à
  l'élève pendant l'attente (parties `data-step` transitoires du flux) et échoue fermé, le
  quota par élève, le résumé et le titre en tâche de fond, la mémoire d'apprentissage
  (`/api/memory`), le résumé de la semaine (`/api/summary`) ; ses règles dans `tuteur.md`.
- `platform/ai` : les appels à Mistral et à sa modération, le coût de chacun.
- `platform/auth/student-sign-in.ts` : l'entrée de l'élève par son propre code (décision de Victor,
  2026-10-20), sur le modèle du « secret d'activation » du NIST (SP 800-63B-4, § 3.2.10) et du
  « code de déverrouillage » de la CNIL (délibération 2022-100, § 45-47) :
  - un code de départ du gardien, à usage unique et haché, un seul vivant par enfant (sa
    durée : `createActivationCode`), reconnaît l'appareil par un cookie signé qui ne
    porte que son identifiant, sans ouvrir de session ; le web le montre aussi en carré à viser,
    un lien qui le porte après le `#` (`apps/web/src/lib/activation.ts`) ;
  - l'élève y choisit un code de 6 chiffres, refusé trop facile (`domain/student-code.ts`), que le
    gardien ne voit jamais ; ce code n'ouvre son profil que sur un appareil qui le porte ;
  - les essais se comptent avant d'être vérifiés (`platform/auth/student-devices.ts`) : 3 sur un
    appareil, puis le gardien débloque ; 10 partout, puis il faut un code « oublié » du gardien, qui
    arrête l'ancien code, ferme les sessions de l'élève, et que l'élève voit daté ;
  - le hachage est celui des mots de passe de better-auth, sur un HMAC du code par une clé dérivée
    du secret de l'auth : une copie de la base seule ne livre pas le million de codes ;
  - un appareil partagé (l'élève le dit, ou il porte un deuxième profil) garde une session dix
    minutes sans usage, deux heures au plus, et jamais au-delà du navigateur ; celle du gardien
    aussi, pour que la fratrie ne lise pas son espace.
- `domain/` (niveaux, matières), `referential/` (outil et textes officiels), `eval/` (jeu
  d'évaluation, données seules) ; `testing/` (une base de test par fichier).
- Les frontières sont vérifiées au lint (`eslint-plugin-boundaries`), jusqu'aux couches d'un
  module : routes, service, repository.

## Client web

**Pensé d'abord pour le téléphone** : chaque parcours se conçoit et se prouve à largeur de
téléphone ; l'ordinateur a sa propre mise en page, pas une colonne étirée.

En place (`apps/web`) :
- Application monopage Vite + React + TanStack Router, Tailwind sur les tokens `@repo/tokens`.
- Servie par Hono sur la même origine que l'API (`apps/server/src/platform/http/web-client.ts`) : cookie de
  session limité à l'hôte, sans CORS ni blocage de Safari, un seul déploiement. Le serveur lit le
  build dans `WEB_DIST_DIR`, que l'image Docker embarque ; une navigation hors de `/api` sans
  fichier reçoit `index.html`, un fichier absent reste un 404. Assets hachés en cache
  `immutable`, le reste en `no-cache` revalidé par ETag ; fichiers compressés au build. CSP
  `default-src 'self'` sur toutes les réponses, `no-store` sur `/api`. En dev, le proxy de Vite
  envoie `/api/` et `/health` au serveur, et l'origine de Vite est la base de better-auth : une
  seule origine aussi.
- Après un déploiement, un onglet ouvert qui demande un morceau disparu de son ancien build se
  recharge une fois sur le nouveau (TanStack Router, `lazyRouteComponent`).
- Installable (PWA, `vite-plugin-pwa`) : manifest et service worker, qui ne met en cache que le
  build, jamais une réponse `/api`, et laisse passer les navigations `/api`.
  Photo, voix et push passeront par le web, sans application native en V1.

- Client typé : le serveur émet ses déclarations (`build:types`, seul point d'entrée
  `apps/server/src/contract.ts`), que turbo construit avant le typecheck et le lint du web ; le
  web les lit par `hc<AppType>` et `parseResponse` de `hono/client`, une erreur par `isProblem`
  (`apps/web/src/lib/api.ts`). Aucun type du serveur n'est réécrit côté client.
- Données par TanStack Query, formulaires par react-hook-form et Zod, celui-ci en mode
  `jitless` : sa sonde `new Function` serait une violation de la CSP.
- Primitives `@repo/ui`, sur Base UI ; le chat par `useChat` de
  `@ai-sdk/react`, qui lit le protocole du serveur (`apps/web/src/lib/chat.ts`).

## Observabilité

- **En place** : logs pino avec le `requestId` de chaque requête et un sérialiseur d'erreurs en
  liste blanche (aucun texte d'élève). Les erreurs iront à Bugsink, auto-hébergé chez Clever Cloud,
  juste avant la première vraie famille ; les traces OpenTelemetry attendent un besoin mesuré.
- **À tenir dès leur retour** : l'AI SDK écrit le message d'erreur dans le span quel que soit
  `recordInputs`, et une erreur de validation y met la sortie du modèle ; les messages d'erreur
  se réécrivent avant tout export.
- **Cible** : traces et métriques sans identifiant ni texte, logs avec `trace_id`, rétentions
  courtes, accès réservé.

## Hébergement

Tout chez Clever Cloud, région Paris. L'image du serveur
sert l'API et le web ; la landing, en Astro, vit dans une application statique à part. L'e-mail
part de Scaleway TEM, la boîte de contact est chez OVH, les photos iront dans Cellar.

- **Staging** : https://staging.catiche.fr, l'application `catiche-staging` (Docker nano) et sa base
  `catiche-staging-db` (PostgreSQL 18, `XXS_TNY`, disque chiffré, certificat épinglé par
  `DATABASE_CA`). Le proxy de Clever Cloud ajoute l'adresse réelle à droite de
  `X-Forwarded-For` : le serveur fait confiance à `TRUSTED_PROXY_HOPS` sauts (1 au staging) pour
  son rate limit et pour better-auth (`platform/http/client-address.ts`). L'e-mail part de
  `mail.catiche.fr`, par une clé limitée à l'envoi.
- **Landing** : https://catiche.fr, l'application statique `catiche-landing`, servie par Caddy
  (`apps/landing/Caddyfile`).
- **Contact** : `contact@catiche.fr`, une boîte Zimbra hébergée par OVH en France.
- **Production** : elle naît avec la première vraie famille.

### Environnements et livraison

Décidé par Victor le 2026-10-08. Une seule branche durable, `main` ; deux environnements, qui sont
deux applications Clever Cloud, chacune avec sa base et ses clés :

- **Staging** (la préproduction) : chaque merge sur `main`, `ci-ok` vert, y déploie l'image que la
  CI a construite et testée, désignée par son digest. On y teste dans les conditions du cloud
  (proxy, Postgres, vrai Mistral) ce que le local ne montre pas.
- **Production** : la même image, au même digest, après l'approbation de Victor (environnement
  GitHub `production`, relecteur requis). Elle naît avec la première vraie famille ; d'ici là, seul
  le staging existe.
- **Landing** : directement en production, sans staging (Victor, 2026-10-08). Chaque merge sur
  `main`, `ci-ok` vert, envoie à son application statique ce que la CI a construit,
  son `Caddyfile` et `dist/` (job `deploy-landing`, environnement GitHub `landing`).

Les clés de chaque environnement vivent dans son environnement GitHub : le déploiement du staging
n'a pas celles de la production. Pas de branche par environnement : une branche longue retarde
l'intégration (la recherche DORA lie les meilleures performances aux branches courtes,
[dora.dev](https://dora.dev/capabilities/trunk-based-development/)), et chaque environnement
reconstruirait une image que personne n'a testée, là où l'image se construit une fois et ne change
que par sa configuration ([12factor.net](https://12factor.net/build-release-run)). Clever Cloud ne
fait que tirer l'image : il ne construit rien, et les secrets ne passent pas au build.

**Une seule relecture par branche** (2026-10-20) : celle d'avant le merge, dans un contexte neuf,
que décrit `~/.claude/CLAUDE.md`. Sur GitHub, Claude ne relit pas
chaque PR : il ne répond qu'à `@claude` dans un commentaire (`.github/workflows/claude.yml`), sur
l'abonnement de Victor, qui sert aussi aux sessions.
