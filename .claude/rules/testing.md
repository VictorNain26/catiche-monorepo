---
description: Runners et emplacement des tests du monorepo — chargé en ouvrant un test
paths:
  - "**/*.test.ts"
  - "**/*.test.mjs"
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
| Landing | Bun | `cd apps/landing && bun run test` | `apps/landing/src/**/<fichier>.test.ts` |

- **Serveur** : un test exerce le vrai code sur une vraie base, jamais un module remplacé.
  `testDatabase()` (`apps/server/src/testing/database.ts`) donne au fichier sa base, copiée
  d'un modèle que le preload migre une fois par lancement (`CREATE DATABASE … TEMPLATE`) et
  supprimée après ; l'app se construit par `testApp` (`apps/server/src/testing/app.ts`), et ses appels passent
  par le client de `testing/http.ts`, celui du harnais. Pas de
  `mock.module` : une dépendance se remplace en la passant.
- **Pas de suite de bout en bout**, jugée trop lente pour ce qu'elle protégeait : le rendu, les parcours dans
  un navigateur et la landing se vérifient dans Chrome avant le merge, puis au staging pour l'app ;
  la landing, sans staging, part en production au merge (`docs/architecture.md`).
