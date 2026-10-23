# État

Ce qui reste vrai quelle que soit la direction du produit : les bloquants, les gestes de Victor,
le technique reporté et ce qu'on surveille. Mis à jour le 2026-10-23 ; ce qui est fait en sort.

## Bloquants

| Bloquant | Effet | Comment lever |
|---|---|---|
| Clause des mineurs de Mistral (§ 2.2(c), version du 2026-09-25) : deux interdictions, les données personnelles d'un enfant sous l'âge du consentement numérique (15 ans en France), et l'usage par un mineur sans consentement parental. Le consentement du parent lève la seconde, pas la première prise à la lettre | Aucun utilisateur réel de moins de 15 ans | Réponse écrite de Mistral, demandée le 2026-10-11 (ticket « legal request/GDPR ») |
| Zero Data Retention non accordé | Mistral peut garder textes et audio d'élèves | Ouvert seulement en paiement à l'usage ([centre d'aide](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)) ; recevabilité demandée dans le même ticket |
| La marque TOM ([FR 4873204](https://data.inpi.fr/marques/FR4873204)), classes 9, 41 et 42 | Tout nom de produit bâti sur Tom, et peut-être Tom comme mascotte | Avis d'un conseil en propriété industrielle |
| Mistral en mode gratuit : 100 000 tokens par minute, une fiche d'exercice en prend environ 78 000 | Le harnais et deux élèves dans la même minute voient la fiche échouer | Le paiement à l'usage avec un plafond, puis relire Admin › Limites |

## À faire par Victor

- **Comptes à fermer** : le projet Vercel et l'application GitHub Vercel (son check échoue sur
  chaque PR), l'organisation Sentry `home-drx`, le projet Langfuse « tomai » ; vérifier que Koyeb
  ne facture plus rien.
- **Double authentification** : celle d'OVH, qui tient le domaine ; chez Scaleway, ce qui reste
  (moyen de paiement, vérification d'identité, double authentification).
- **Scaleway** : lire et valider les nouvelles « Specific Conditions Services » que la console
  demande (vu le 2026-10-20).
- **Dependabot** : classer `inaccurate` les alertes rattachées à `apps/ai-service/uv.lock` et
  `apps/curriculum/uv.lock`, supprimés en `8f5011f`, et signaler le bug au support GitHub.
- **CNIL** : écrire sur l'hébergement de données de santé ; garder une copie du DPA de Clever
  Cloud pour l'AIPD.
- **Landing** : le texte de « Qui fait Catiche », court et sans photo, si la section doit
  revenir ; rien n'y est écrit sans lui. Les demandes d'invitation arrivent à `contact@`. La
  soirée figée n'a été mesurée que sur des tailles émulées : la regarder sur un vrai iPhone, où
  les barres de Safari peuvent la faire passer en étapes empilées.

## Avant le premier élève réel

- Aucune invitation pour un enfant réel tant que les bloquants (clause Mistral, base du staging
  joignable) ne sont pas levés : les invitations se donnent à la main.
- L'application cible jusqu'à la soirée comprise (« Prochain chantier »), dont les comptes pour
  toutes les familles.
- Bugsink auto-hébergé, avec sa base ; les erreurs des navigateurs par le serveur (`tunnel`), sans
  contenu d'élève.
- La base du staging, joignable depuis internet : la placer dans un réseau privé Clever Cloud
  ([Network Groups](https://www.clever.cloud/developers/changelog/2026/05-12-network-groups-console)).
- Clever Cloud à éprouver : un tour long à travers le proxy (délai documenté de 180 s), le délai
  de grâce réel au SIGTERM contre `SHUTDOWN_DEADLINE_MS`, la sonde pour `DRAIN_MS`, le PITR et son
  prix, la version de Postgres chez eux contre celle de `docker-compose.yml`.
- Après une détresse : la revue humaine qui relit `distress_event` (aucun code ne la lit
  aujourd'hui), son délai et sa trace ; ce que voit l'élève ensuite ; le canal du message au
  parent, avec une table d'envois idempotente.
- Appareils reconnus (`platform/auth/student-devices.ts`) :
  - la ligne d'un appareil (son navigateur) part quand le parent le déconnecte de son dernier
    profil, pas encore à la suppression d'un compte : une purge des appareils sans profil reste à
    écrire, avec celle des comptes inactifs ;
  - le cookie d'appareil n'est posé qu'à l'activation : passé 400 jours, le navigateur l'oublie et il
    faut un nouveau code du parent ; le reposer à chaque entrée réussie ;
  - la limite de better-auth par adresse (5 par minute sur les routes de l'élève) vit en mémoire,
    par instance, et n'est exercée par aucun test : une seule instance, ou son stockage en base.
- Le code de l'élève dans l'analyse d'impact : la CNIL réserve le code court au « dispositif
  matériel détenu en propre » (délibération 2022-100, § 46) ; l'ordinateur de la famille ne l'est
  pas, et s'appuie sur « tout autre mécanisme technique apportant un même niveau de sécurité »
  (appareil reconnu, 3 essais, session courte). C'est une interprétation à écrire, pas une
  conformité littérale.
- Les durées de conservation annoncées (`apps/landing/src/pages/confidentialite.astro`, § 7) :
  aucune purge ne tient encore celles du compte inactif ni des journaux. Celles des e-mails reçus
  à `contact@` se tiennent à la main, dans la boîte Zimbra.
- La landing, à la naissance de la production : ses liens « Se connecter » mènent au staging
  (`APP_URL`, `apps/landing/src/lib/brand.ts`) ; changer cette constante, et le bouton « Demander
  une invitation » (`molecules/request-invitation.astro`) avec les phrases « en préparation » si
  l'inscription s'ouvre.
- L'adresse de la connexion (`platform/http/client-address.ts`, `getConnInfo`) n'est exercée par
  aucun test, faute d'un vrai `Bun.serve`.
- Le préfixe `__Host-` des cookies, quand better-auth le livre
  ([#10806](https://github.com/better-auth/better-auth/issues/10806)).

## Prochain chantier

- **Le passage à `catiche.fr`** est fait le 2026-10-20 (#552) : DNS, envoi Scaleway vérifié,
  applications et dépôt renommés, variables du staging, anciens domaines détachés. Reste, par
  Victor : supprimer l'image GHCR `tomai-server` (Settings du paquet sur GitHub) ; l'ancien
  domaine expire seul le 24 août 2027.
- **La landing est validée par Victor le 2026-10-22**, vue en local (#555, #559).
- **Tom en 3D**, en parallèle, dans le dépôt `tom-mascotte`, qui porte son plan : le
  modèle, le pull, le cahier, les poses et des animations souples. Sa dernière PR, ici, intègre
  les livrables à la landing et met à jour `charte.md`.
- **L'application cible (ordre revu par Victor le 2026-10-23)**. La refonte des écrans, la voix
  de l'app et la soirée forment un seul chantier : conçu une fois sur le parcours final, pour ne
  pas refaire deux fois l'accueil de l'enfant, la séance et l'espace de l'adulte. Il se construit
  dans cet ordre, une étape validée avant la suivante :
  1. **Le parcours et les textes : faits, validés par Victor le 2026-10-23.** Ils sont dans
     `docs/plans/app-cible.md` : les user stories, le modèle de famille, la navigation, chaque
     écran avec ses textes, le tableau avant / après et le découpage en PR. Ce document porte
     le détail des étapes 2 à 5 ; chaque étape en retire ce qu'elle construit.
  2. **Le socle, sans IA** : le modèle de famille et ses droits, l'entrée de l'adulte et de
     l'enfant, l'accueil, « Gérer », la navigation, Tom au trait.
  3. **La soirée**, avec le volet IA et le prompt de Tom.
  4. **Le point du soir**, qui remplace le résumé de la semaine.
  5. **Les contrôles gardés d'un soir à l'autre.**

  Les bloquants ne freinent pas la construction, seulement l'arrivée du premier élève réel.
- **Une famille d'accueil sans délégation ne peut pas ouvrir de compte** : il faut qu'un parent
  ou un tuteur l'ouvre (Victor, 2026-10-23). À revoir si une famille d'accueil le demande.

## Technique reporté

- Une clé d'accès ne se propose pas sur un appareil partagé (`GET /api/me`, `sharedDevice`), mais
  la route d'enregistrement du plugin passkey ne le refuse pas : un appel direct en créerait une.
  Un hook `before` sur `/passkey/generate-register-options`, lisant `isShortSession`
  (`platform/auth/student-devices.ts`), avec son test, fermerait la règle au serveur.

- L'invitation d'un adulte (`POST /api/household/students/:id/invitations`) n'a que le budget
  global de l'API par adresse IP : un parent déclaré peut faire envoyer beaucoup d'e-mails depuis
  le domaine de Catiche. Un plafond par parent et par jour, avec son test, le fermerait avant
  d'ouvrir les invitations au-delà de Victor.
- Une invitation d'adulte expirée (`adult_invitation`) n'est plus lue, mais sa ligne reste, avec
  l'adresse de quelqu'un qui n'est pas entré. La supprimer à l'expiration, par une tâche régulière
  ou à la lecture, avec son test, avant le premier élève réel.
- L'e-mail de suppression invite à répondre (`platform/auth/auth.ts`), mais le mailer ne pose
  aucun `Reply-To` : la réponse irait à `MAIL_FROM`, que personne ne lit ; à faire pointer vers
  `contact@catiche.fr`, avec son test.
- Mémoire : les 1 053 libellés du référentiel restent ceux du programme (« Il utilise… ») ; leur
  réécriture dans les mots de l'élève demande une relecture de Victor avant tout élève réel.
- Harnais : la mesure de référence (11 fuites sur 106 conversations, commit `2f8aeed8`, avant le
  contrôle de sortie) et ses données par conversation, pour comparer cas par cas, sont dans git :
  `git show aaddbb15:docs/etudes/2026-10-06/donnees/results.json` et
  `git show aaddbb15:docs/etudes/2026-10-06/passage-de-fin.md`.

## Surveillance

- **Jeton de la CLI Clever Cloud** : il expire le 2027-10-08 ; le renouveler avant.
- **Secret de l'auth** (`BETTER_AUTH_SECRET`) : le poivre des codes d'élève en dérive, et il
  signe le cookie d'appareil (`platform/auth/student-sign-in.ts`) ; le changer arrête tous les codes
  et fait oublier tous les appareils : chaque élève revient par un code « oublié » de son parent.
- **Les liens des e-mails** : un filtre de messagerie qui ouvre chaque lien (Safe Links,
  Defender) ne dépense rien depuis le 2026-10-23. Le bouton de l'invitation mène à `/invitation`
  et celui de l'e-mail d'entrée à `/entrer`, qui n'agissent qu'au toucher de leur bouton. Si un
  invité tombe malgré tout sur « Ce lien ne marche plus », regarder ce que son filtre exécute.
- **Taux de Mistral** (`MISTRAL_USD_TO_EUR`) : le revérifier à chaque facture.
- **Configuration des agents** : élagage mensuel, le prochain le 2026-11-02.
- **TypeScript** figé à 6.0 tant que `typescript-eslint` exige `<6.1.0` ; `@types/node` 24 pour
  les builds Node 24 du web et de la landing.
- **Bun** (version : `packageManager` de `package.json`) a planté sous `bun test --isolate` en
  1.4.2 (oven-sh/bun#44161) : guetter un « Segmentation fault » en CI.
- **Override de `source-map-js`** (GHSA-68fv-2mgg-jv7q) : le retirer quand `postcss` et
  `@tailwindcss/node` déclarent 1.2.2 ou plus.
- **`@hono/bun`** : adoption faible ; la revérifier avant Hono v5.
- **Catalogs Bun** : les remettre quand renovatebot/renovate#42909 est fusionnée.
- **Bun.SQL** : écarté pour ses bugs de corruption ouverts ; réévaluer quand ils sont fermés.
