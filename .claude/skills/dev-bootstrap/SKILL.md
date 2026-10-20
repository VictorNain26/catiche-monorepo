---
name: dev-bootstrap
description: Démarrer le monorepo depuis un clone neuf, ou réparer une stack locale qui ne monte pas — postgres, migrations Drizzle. À utiliser quand le serveur refuse de démarrer, qu'une table manque, ou qu'on part d'une base vide.
---

# Réparer une stack locale

Le chemin normal (`bun install`, `bun run setup`, `bun run dev`) : `README.md`, « Démarrage » ;
les migrations locales : `.claude/rules/database-migrations.md`, « Base locale ».

## Rien ne démarre

`bun run dev` lance `docker compose up -d --wait postgres`, puis `db:migrate` du serveur, puis
`turbo run dev` : l'étape qui échoue est la première à regarder. Le serveur tourne sur l'hôte,
pas en conteneur.

## Le serveur refuse de démarrer

Il refuse tant qu'une migration du journal (`apps/server/drizzle/`) n'est pas appliquée, et le
dit dans son log (« Migrations not applied ») : `bun run db:migrate` (`apps/server`).

## `.env` qui suffit à démarrer

Le schéma, ses valeurs par défaut et ses contrôles : `apps/server/src/config.ts`. En dev, seuls
`DATABASE_URL` et `BETTER_AUTH_SECRET` sont requis ; `apps/server/.env.example` donne les
valeurs de la stack locale.

## Les tests

Ceux du serveur tournent sur le même Postgres : chaque fichier crée sa base et la supprime, ce
qui demande un utilisateur autorisé à créer des bases (celui de `docker compose` l'est).
