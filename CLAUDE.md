# Monorepo Catiche

Catiche : un tuteur IA des devoirs pour collégiens, Tom, et un tableau de bord pour le parent.

## Carte

- Pour qui, promesse, principes, périmètre : `docs/vision.md`, qui prime sur tout ; on n'affirme
  que ce qu'on peut prouver.
- Les espaces et les écrans visés : `docs/experience.md` ; l'identité : `docs/charte.md`.
- Le pourquoi de chaque choix : `docs/decisions.md` ; une décision de Victor y entre dans la PR
  qui la suit, jamais seulement dans une mémoire d'agent.
- **Où on en est : `docs/suivi.md`**, à lire avant de reprendre et à réécrire dans la PR qui fait
  avancer. Ordre des lots : `docs/roadmap.md`. Études datées, jamais mises à jour :
  `docs/etudes/`.
- Stack, structure, démarrage : `README.md`. Règles d'une partie du code :
  `.claude/rules/<sujet>.md`, chargées sur ses chemins. Les règles valables pour tous les projets
  (TDD, tests, plan, revue) sont dans `~/.claude/` et ne se répètent pas ici.

## Commandes

Avant un commit : `bun run typecheck && bun run lint`, et `bun run test` quand du code testé
change (Postgres de `docker compose` requis). Formatage : `bun run format`.

## Interdits

- La landing n'appelle jamais le serveur, ni l'auth : `apps/web` est le seul client produit ; elle
  y mène par un simple lien.
- Rien n'entre dans la landing en ligne avant sa refonte avec l'app (lot 1, étape 3), sauf les
  tokens de la charte, un correctif d'honnêteté ou technique (`.claude/rules/landing.md`).
- Jamais un écran construit sans `docs/experience.md` ni la charte : un écran du lot 1 est
  composé au téléphone et à l'ordinateur, pas une colonne de boutons.
- Jamais de push sur `main` : une branche courte, puis une PR, mergée en merge commit (le squash
  est désactivé).
- Jamais un type du serveur réécrit côté client : il vient du client typé de `hono/client`.
- Jamais de `mock.module` (refusé au lint) : une dépendance se remplace en la passant.

## Garde-fous déterministes

- lefthook : format, lint et typecheck avant un commit ; tests et build avant un push.
- CI (`.github/workflows/ci.yml`) : vérifications, tests, e2e, image, sécurité, réunis par
  `ci-ok`, le seul check à exiger, puis les déploiements. La revue de Claude
  (`.github/workflows/claude.yml`) n'en fait pas partie.
