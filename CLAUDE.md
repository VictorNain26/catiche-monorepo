# Monorepo Catiche

Catiche : un tuteur IA des devoirs pour collégiens, Tom, et un tableau de bord pour le parent.

## Carte

- La direction du produit est à redéfinir (page blanche du 2026-10-19) ; on n'affirme que ce
  qu'on peut prouver.
- Ce qui est en place, et comment : `docs/architecture.md` ; le tuteur : `docs/tuteur.md` ;
  l'identité : `docs/charte.md`.
- **Bloquants, gestes de Victor, technique reporté, surveillance : `docs/etat.md`**, à lire avant
  de reprendre et à mettre à jour dans la PR qui en change un point.
- Stack, structure, démarrage : `README.md`. Règles d'une partie du code :
  `.claude/rules/<sujet>.md`, chargées sur ses chemins. Les règles valables pour tous les projets
  (TDD, tests, plan, revue) sont dans `~/.claude/` et ne se répètent pas ici.

## Commandes

Avant un commit : `bun run typecheck && bun run lint`, et `bun run test` quand du code testé
change (Postgres de `docker compose` requis). Formatage : `bun run format`.

## Interdits

- La landing n'appelle jamais le serveur, ni l'auth : `apps/web` est le seul client produit ; elle
  y mène par un simple lien.
- Rien n'entre dans la landing en ligne jusqu'à la nouvelle direction, sauf les tokens de la
  charte, un correctif d'honnêteté ou technique (`.claude/rules/landing.md`).
- Jamais de push sur `main` : une branche courte, puis une PR, mergée en merge commit (le squash
  est désactivé).
- Jamais un type du serveur réécrit côté client : il vient du client typé de `hono/client`.
- Jamais de `mock.module` (refusé au lint) : une dépendance se remplace en la passant.

## Garde-fous déterministes

- lefthook : format, lint et typecheck avant un commit ; tests et build avant un push.
- CI (`.github/workflows/ci.yml`) : ses jobs réunis par `ci-ok`, le seul check à exiger.
