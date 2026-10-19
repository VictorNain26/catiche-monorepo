# État

Ce qui reste vrai quelle que soit la direction du produit : les bloquants, les gestes de Victor,
le technique reporté et ce qu'on surveille. Mis à jour le 2026-10-19 ; ce qui est fait en sort.

## Bloquants

| Bloquant | Effet | Comment lever |
|---|---|---|
| Clause des mineurs de Mistral (2.2(c), version du 2026-09-25) | Aucun utilisateur réel de moins de 15 ans | Réponse écrite de Mistral, demandée le 2026-10-11 (ticket « legal request/GDPR ») |
| Zero Data Retention non accordé | Mistral peut garder textes et audio d'élèves | Ouvert seulement en paiement à l'usage ([centre d'aide](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)) ; recevabilité demandée dans le même ticket |
| La marque TOM ([FR 4873204](https://data.inpi.fr/marques/FR4873204)), classes 9, 41 et 42 | Tout nom de produit bâti sur Tom, et peut-être Tom comme mascotte | Avis d'un conseil en propriété industrielle |
| Mistral en mode gratuit : 100 000 tokens par minute, une fiche d'exercice en prend environ 78 000 | Le harnais et deux élèves dans la même minute voient la fiche échouer | Le paiement à l'usage avec un plafond, puis relire Admin › Limites |

## À faire par Victor

- **Comptes à fermer** : le projet Vercel et l'application GitHub Vercel (son check échoue sur
  chaque PR), l'organisation Sentry `home-drx`, le projet Langfuse « tomai » ; vérifier que Koyeb
  ne facture plus rien.
- **Secrets** : `CLAUDE_CODE_OAUTH_TOKEN` (`claude setup-token`) et l'application GitHub Claude,
  pour `.github/workflows/claude.yml` ; supprimer `ANTHROPIC_API_KEY`, `MISTRAL_API_KEY_CI`,
  `SEMGREP_APP_TOKEN`, `KOYEB_API_TOKEN` et `DATABASE_URL`, que rien n'utilise.
- **Double authentification** : celle d'OVH, qui tient le domaine ; chez Scaleway, ce qui reste
  (moyen de paiement, vérification d'identité, double authentification).
- **Dependabot** : classer `inaccurate` les alertes rattachées à `apps/ai-service/uv.lock` et
  `apps/curriculum/uv.lock`, supprimés en `8f5011f`, et signaler le bug au support GitHub.
- **CNIL** : écrire sur l'hébergement de données de santé ; garder une copie du DPA de Clever
  Cloud pour l'AIPD.

## Avant le premier élève réel

- Bugsink auto-hébergé, avec sa base ; les erreurs des navigateurs par le serveur (`tunnel`), sans
  contenu d'élève.
- La base du staging, joignable depuis internet : la placer dans un réseau privé Clever Cloud
  ([Network Groups](https://www.clever.cloud/developers/changelog/2026/05-12-network-groups-console)).
- Clever Cloud à éprouver : un tour long à travers le proxy (délai documenté de 180 s), le délai
  de grâce réel au SIGTERM contre `SHUTDOWN_DEADLINE_MS`, la sonde pour `DRAIN_MS`, le PITR et son
  prix, Postgres 18.4 chez eux contre 18.6 en dev et en CI.
- Les durées de conservation annoncées (`apps/landing/src/pages/confidentialite.astro`, § 7) :
  aucune purge ne tient encore celles du compte inactif ni des journaux.
- L'adresse de la connexion (`platform/http/client-address.ts`, `getConnInfo`) n'est exercée par
  aucun test, faute d'un vrai `Bun.serve`.
- Le préfixe `__Host-` des cookies, quand better-auth le livre
  ([#10806](https://github.com/better-auth/better-auth/issues/10806)).

## Surveillance

- **Jeton de la CLI Clever Cloud** : il expire le 2027-10-08 ; le renouveler avant.
- **Taux de Mistral** (`MISTRAL_USD_TO_EUR`) : le revérifier à chaque facture.
- **Configuration des agents** : élagage mensuel, le prochain le 2026-11-02.
- **TypeScript** figé à 6.0 tant que `typescript-eslint` exige `<6.1.0` ; `@types/node` 24 pour
  les builds Node 24 du web et de la landing.
- **Bun 1.4.2** plante parfois sous `bun test --isolate` (oven-sh/bun#44161).
- **Override de `source-map-js`** (GHSA-68fv-2mgg-jv7q) : le retirer quand `postcss` et
  `@tailwindcss/node` déclarent 1.2.2 ou plus.
- **`@hono/bun`** : adoption faible ; la revérifier avant Hono v5.
- **Catalogs Bun** : les remettre quand renovatebot/renovate#42909 est fusionnée.
- **Bun.SQL** : écarté pour ses bugs de corruption ouverts ; réévaluer quand ils sont fermés.
