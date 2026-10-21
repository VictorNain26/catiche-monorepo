# Monorepo Catiche

Catiche : l'aide aux devoirs qui apprend au collégien à s'organiser chaque soir, avec Tom
(direction : `docs/produit.md`). Construit : le tuteur et un résumé de la semaine pour le parent.

## Carte

Dans l'ordre de lecture ; on n'affirme que ce qu'on peut prouver.

- La direction, pour qui et pourquoi : `docs/produit.md`.
- La méthode d'une soirée, tirée des programmes évalués : `docs/methode.md`.
- Ce qui existe déjà : `docs/concurrence.md`, analyse datée ; un complément s'y ajoute en
  section datée, rien ne s'y réécrit.
- Ce qui est en place, et comment : `docs/architecture.md` ; le tuteur : `docs/tuteur.md` ;
  l'identité : `docs/charte.md`.
- **Bloquants, gestes de Victor, technique reporté, surveillance : `docs/etat.md`**, à lire avant
  de reprendre et à mettre à jour dans la PR qui en change un point.
- Une décision de Victor entre, dans la PR qui la suit, dans le document qui porte son sujet
  (`produit.md`, `architecture.md`, `tuteur.md`, `charte.md`, `etat.md`), jamais seulement dans
  une mémoire d'agent.
- Stack, structure, démarrage : `README.md`. Règles d'une partie du code :
  `.claude/rules/<sujet>.md`, chargées sur ses chemins. Les règles valables pour tous les projets
  (TDD, tests, plan, revue) sont dans `~/.claude/` et ne se répètent pas ici.

## Commandes

Avant un commit : `bun run typecheck && bun run lint`, et `bun run test` quand du code testé
change (Postgres de `docker compose` requis). Formatage : `bun run format`.

## Interdits

- La landing n'appelle jamais le serveur, ni l'auth : `apps/web` est le seul client produit ; elle
  y mène par un simple lien.
- Rien n'entre dans la landing en ligne hors de `docs/produit.md`, sauf les tokens de la charte,
  un correctif d'honnêteté ou technique (`.claude/rules/landing.md`).
- Jamais un écran construit sans la charte : il est composé au téléphone et à l'ordinateur, pas
  une colonne de boutons.
- Jamais de push sur `main` : une branche courte, puis une PR, mergée en merge commit (le squash
  est désactivé).
- Jamais un type du serveur réécrit côté client : il vient du client typé de `hono/client`.
- Jamais de `mock.module` (refusé au lint) : une dépendance se remplace en la passant.

## Garde-fous déterministes

- lefthook : format, lint et typecheck avant un commit ; tests et build avant un push.
- CI (`.github/workflows/ci.yml`) : ses jobs réunis par `ci-ok`, le seul check à exiger.
