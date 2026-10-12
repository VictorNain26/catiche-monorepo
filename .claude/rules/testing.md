---
description: Runners et emplacement des tests du monorepo — chargé en ouvrant un test
paths:
  - "**/*.test.ts"
  - "**/*.test.mjs"
  - "**/*.spec.ts"
  - "**/playwright.config.*"
  - "apps/server/src/testing/**"
---

# Tests — conventions monorepo

`bun run test` à la racine lance les tests du serveur et des paquets ; ceux du serveur
demandent le Postgres de `docker compose` (`DATABASE_URL`).

| Suite | Runner | Commande | Emplacement |
|-------|--------|----------|-------------|
| Serveur | Bun, Postgres | `cd apps/server && bun test` | à côté du code, `<fichier>.test.ts` |
| Web | Bun | `cd apps/web && bun run test` | `apps/web/src/**/<fichier>.test.ts` |
| Tokens | Bun | `bun run test` | `packages/tokens/contrast.test.mjs` |
| Web, de bout en bout | Playwright | `bunx turbo run test:e2e --filter=@repo/playwright-web` | `tooling/playwright-web/tests/` |
| Landing | Playwright | `bunx turbo run test:e2e --filter=landing` | `apps/landing/tests/` |

- **Serveur** : un test exerce le vrai code sur une vraie base, jamais un module remplacé.
  `testDatabase()` (`apps/server/src/testing/database.ts`) donne au fichier sa base, copiée
  d'un modèle que le preload migre une fois par lancement (`CREATE DATABASE … TEMPLATE`) et
  supprimée après ; l'app se construit par `createApp` avec ses dépendances. Pas de
  `mock.module` : une dépendance se remplace en la passant.
- **Web, de bout en bout** : le paquet `@repo/playwright-web` dépend du web et du serveur, que
  turbo construit d'abord ; Playwright lance le serveur construit, qui sert le web construit, sur
  sa propre base recréée à chaque lancement (`tom_e2e`, sur le Postgres de `docker compose`).
  Projets `iphone` (WebKit), `android` (Chromium) et `desktop` (Chrome de bureau).
- **Navigateurs des deux suites** : ceux de l'image officielle de Playwright, servis par le
  service `playwright` de `docker-compose.yml` ; prérequis en local comme en CI,
  `docker compose up -d --wait postgres playwright`. Le serveur charge le Playwright installé par
  bun au démarrage : après une montée de version, `docker compose up -d --force-recreate --wait
  playwright`. Jamais un navigateur installé sur l'host : le rendu doit être celui de la CI.
- **Captures de référence** : `await expect(page).toHaveScreenshot('<écran>.png')` sur quelques
  états, rangées dans `tests/__screenshots__/<projet>/` de chaque suite ; animations coupées,
  curseur masqué et fontes chargées sont les défauts de Playwright. Une capture qui change se relit
  dans `test-results/` (attendue, reçue, différence), puis se régénère et se commite avec le
  changement : `bunx turbo run test:e2e --filter=<suite> -- --update-snapshots`. Jamais une
  référence générée hors du service `playwright`, ni une tolérance (`maxDiffPixels`, `threshold`)
  pour faire passer une capture.
- **Accessibilité** : `expectAccessible(page)` (`tooling/playwright-web/accessibility.ts`,
  `apps/landing/tests/support.ts`) passe l'état affiché à axe (`@axe-core/playwright`), règles
  WCAG 2.2 A et AA, et échoue sur chaque violation, par règle et élément. Jamais `disableRules` ni
  `exclude` pour taire une violation ; jamais axe sur un état encore en transition.
- **Landing** : servie par le Caddy de production (`apps/landing/Caddyfile`, en conteneur, Docker
  requis) ; mise en page (hiérarchie des titres, aucun défilement horizontal, cibles de 44 px,
  lignes légales, liens soulignés), rendu sans JavaScript et sous mouvement réduit, absence de
  formulaire et de liste d'attente, menu mobile, page 404, en-têtes, redirections, canonical,
  CSP sans refus, axe sur chaque page en clair et en sombre, haut de l'accueil en capture.

Les suites Playwright tournent en CI (jobs `E2E web (Playwright)` et `E2E landing (Playwright)`,
tâche turbo `test:e2e`, sur les paquets touchés), pas avant un commit.

Jamais un test instable dit réparé sans l'avoir vu échouer en répétition avant la correction et
passer après, dans les mêmes conditions (`--repeat-each`, `--retries=0`).
