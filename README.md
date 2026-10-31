# Catiche

L'aide aux devoirs qui apprend au collégien à s'organiser chaque soir, avec Tom
(`docs/produit.md`), de la 6e à la 3e : il l'aide à faire son travail sans le faire à sa place. Construit aujourd'hui : le
tuteur qui aide sur le contenu, et un résumé de la semaine pour le parent, jamais les
conversations. Pré-lancement : aucun utilisateur réel. Staging : https://staging.catiche.fr ;
landing : https://catiche.fr.

## Démarrage

```bash
bun install    # versions de Bun et de Node (la landing) : `engines` de package.json
bun run setup  # .env, BETTER_AUTH_SECRET, postgres, migrations Drizzle
bun run dev    # postgres, migrations, puis server :3000 + landing :3001 + web :3002
```

Un compte parent se crée sur invitation, en bêta fermée comme en production :
`cd apps/server && bun run invite <adresse>` (`bun dist/invite.js <adresse>` dans l'image) envoie
à l'adresse l'e-mail d'invitation, dont le bouton fait entrer (une adresse qui a déjà un compte
est refusée) ; en développement, l'e-mail et son
lien s'écrivent dans le journal de la commande.

Arrêt de l'infra : `bun run dev:down`. `bun run dev` attend que postgres soit prêt et que les
migrations passent ; sinon rien ne démarre.

Bloquants et points ouverts : `docs/etat.md`.

## Structure

```
apps/
├── server/       # Bun + Hono — API backend (3000)
├── landing/      # Astro — vitrine SEO, statique (3001)
└── web/          # Vite + React + TanStack Router — application, téléphone d'abord (3002)

packages/
├── ui/              # Primitives du web, sur Base UI ; ses classes servent aussi la landing (`@repo/ui/classes`)
├── tokens/          # Design tokens CSS (Tailwind v4) partagés
└── eslint-config/   # Config ESLint partagée
```

## Stack

| Couche | Technologies |
|--------|-------------|
| Backend | Bun 1.4, Hono 4, PostgreSQL 18, Drizzle ORM 0.45, pino |
| Landing | Astro 7, statique et sans framework client, TailwindCSS 4, classes de `@repo/ui` ; animations en CSS (liées au défilement) et en Web Animations natives, sans bibliothèque (`apps/landing/src/scripts/evening.ts`) |
| Web | Vite 8 sous Node (le bundler de Bun ne sert ni le plugin de TanStack Router ni la PWA), React 19, TanStack Router, TailwindCSS 4 |
| Auth | Better Auth 1.7 : le gardien entre par un e-mail envoyé à son adresse (son bouton ou son code) ou par une clé d'accès, sans mot de passe, sur invitation pendant la bêta fermée ; l'élève entre par son propre code, sur un appareil que le code du parent a reconnu |
| IA | Mistral Small 4, endpoint UE (`docs/tuteur.md`) |
| Observabilité | Logs pino ; Bugsink, auto-hébergé, pour les erreurs avant la première famille (`docs/architecture.md`, « Observabilité »). Pas d'analytics installée |
| Monorepo | Turborepo, workspaces Bun |
| Déploiement | Clever Cloud, région Paris : `docs/architecture.md`, « Hébergement » et « Environnements et livraison » |

## Commandes

```bash
bun run typecheck && bun run lint  # validation, obligatoire avant commit
bun run format                     # Prettier, vérifié en CI et sur les fichiers indexés
bun run test                       # tests du serveur (Postgres local) et des paquets
bun run build                      # build production
bun run db:generate                # migration SQL d'un changement de schéma
```

Migrations : `.claude/rules/database-migrations.md` ; stack locale : skill `dev-bootstrap`.

Harnais d'évaluation : `cd apps/server && bun run eval [--scenario S2] [--exercise M1] [--repeat 2]` rejoue
le jeu de `src/eval` sur le vrai tuteur et le vrai Mistral, sur la base locale seulement, et écrit
transcriptions, verdicts du code et du juge, et taux avec leur intervalle de Wilson dans
`eval-results/`. `--variant programme --variant none` joue chaque conversation avec et sans le
programme du référentiel, et compare les paires (McNemar exact). Il est payant : le passage
affiche son coût, tuteur et juge, par variante. Avec les clés de Langfuse, le passage y envoie
ses conversations et les verdicts du juge ; `--annotate` les met dans des files d'annotation,
et `bun run eval --agreement`, seul, donne l'accord du juge avec l'annotation
(`docs/tuteur.md` § 7).

## Git

`main` est la seule branche permanente, sans branche par environnement ; la façon d'y entrer est dans `CLAUDE.md`, « Interdits ».

## Documentation

`README.md` (ici) décrit la stack et le démarrage ; `CLAUDE.md` porte les
instructions destinées aux agents, et `.claude/rules/` celles qui ne valent que pour une
partie du code, chargées sur ses chemins.

Dans `docs/`, dans l'ordre de lecture : [produit](./docs/produit.md) (la direction) ·
[méthode](./docs/methode.md) (la soirée de devoirs, d'après les programmes évalués) ·
[concurrence](./docs/concurrence.md) (analyse datée) · [architecture](./docs/architecture.md)
(ce qui est en place) · [tuteur IA](./docs/tuteur.md) · [charte](./docs/charte.md) ·
[état](./docs/etat.md) (bloquants, points ouverts, surveillance).
