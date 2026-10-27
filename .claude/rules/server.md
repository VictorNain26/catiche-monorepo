---
paths:
  - "apps/server/**"
---

# Serveur (`apps/server`)

Ce qui est en place : `docs/architecture.md` ; ses règles de dépendance : `eslint.config.mjs`.
Tuteur : `docs/tuteur.md`. Stack locale : skill `dev-bootstrap`. Appel IA : skill
`mistral-stack`. Migrations : `.claude/rules/database-migrations.md`. Tests :
`.claude/rules/testing.md`.

## Interdits

- Jamais recréer à côté ce que la refonte du code n'a pas reconstruit : il revient de
  l'historique (`048676b4`) avec l'étape qui l'utilise.
- Jamais lire l'environnement hors des points d'entrée (`ENTRY_POINTS` dans `eslint.config.mjs`,
  refusé au lint) : la config (`src/config.ts`) et les dépendances se passent
  en paramètre, aucun état global importé.
- Jamais un try/catch dans une route ni un corps d'erreur écrit à la main : on lève
  `new Problem(code, detail?)` (`platform/http/problem.ts`, RFC 9457), et un message interne ne
  sort jamais.
- Jamais `db` hors d'un repository ; jamais deux tables touchées hors d'un `db.transaction`. La
  plateforme lit et écrit ses propres tables dans son propre code, jamais celles d'un module.
- Jamais une route `/api` montée après `webClient` : la page répondrait à sa place.
- Jamais de contenu d'élève dans un log ; le logger est pino, contexte en premier argument
  (`logger.error({ err }, 'message')`).
- Jamais un import qui contourne les frontières de `eslint.config.mjs` ; une zone nouvelle s'y
  déclare dans la PR qui la crée.

## Pièges vérifiés

- Le Postgres de Clever Cloud présente un certificat auto-signé, propre à chaque base :
  `verify-full` contre les autorités du système le refuse. Il s'épingle par `DATABASE_CA`
  (`platform/db/client.ts`), nom d'hôte vérifié.
- better-auth 1.7 désactive son contrôle d'origine sous `NODE_ENV=test`
  (`context/create-context.mjs`) : `platform/auth/auth.ts` le force, sans quoi les tests ne
  vérifient pas ce que la production fait.
- postgres.js 3.4 ne vérifie pas le certificat avec `ssl: 'require'` : la production passe
  `'verify-full'` (`platform/db/client.ts`).
- `bun build` fige `process.env.*` au build : le code lit `Bun.env`.
- Bun ferme une connexion inactive après 10 s par défaut, ce qui couperait un flux :
  `idleTimeout: 30` (`src/main.ts`).
