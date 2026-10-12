# Plan — Les navigateurs des suites e2e, servis par l'image de Playwright

## Problème

Le job « E2E web » tourne dans l'image de Playwright (`container:`), tirée de
mcr.microsoft.com à chaque run, sans délai maximal ni nouvel essai. Le 2026-10-12, deux runs de
suite ont vu une couche rester bloquée 13 puis 9 minutes (runs 38238244272, tentatives 1 et 2),
quand les 58 runs d'avant initialisaient en 50 s. En local, WebKit ne démarre pas faute de
bibliothèques système, et les captures prévues en 2.2 demandent le même rendu en local et en CI.

## Critères d'acceptation

- [ ] Les navigateurs viennent de l'image officielle, lancée en Playwright Server
      ([docs](https://playwright.dev/docs/docker)) par un service de `docker-compose.yml`, avec la
      version de Playwright installée par bun ; les deux suites s'y connectent
      (`use.connectOptions`, `exposeNetwork: '<loopback>'`).
- [ ] En CI, les deux jobs e2e tournent sur le runner ; les images se tirent dans une étape bornée
      et relancée ; un job que son paquet ne touche pas ne tire rien.
- [ ] Plus de navigateur installé sur le runner, plus de `E2E_DATABASE_URL` ni de
      `PLAYWRIGHT_BROWSERS_PATH` : la CI prend le Postgres de `docker compose`, comme en local.
- [ ] `.claude/rules/testing.md`, le skill de démarrage et Renovate disent le nouveau chemin.

## Hors périmètre

Les captures de référence, axe et le projet à l'ordinateur (étape 2.2 du lot 1).

## Vérification de bout en bout

En local : `docker compose up -d --wait`, puis les deux suites complètes, `iphone` compris. En
CI : les deux jobs e2e verts, l'étape de tirage visible dans le journal.

## Décision humaine

Victor, 2026-10-12 : le serveur Playwright, en local comme en CI.
