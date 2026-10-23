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
- L'application cible jusqu'à la soirée comprise (« Prochain chantier »), dont la déclaration
  horodatée de l'adulte et les comptes pour toutes les familles.
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
- **Tom en 3D**, en parallèle, dans le dépôt `tom-mascotte` (plan dans son `docs/plan.md`) : le
  modèle, le pull, le cahier, les poses et des animations souples. Sa dernière PR, ici, intègre
  les livrables à la landing et met à jour `charte.md`.
- **L'application cible (ordre revu par Victor le 2026-10-23)**. La refonte des écrans, la voix
  de l'app et la soirée forment un seul chantier : conçu une fois sur le parcours final, pour ne
  pas refaire deux fois l'accueil de l'enfant, la séance et l'espace de l'adulte. Il se construit
  dans cet ordre, une étape validée avant la suivante :
  1. **Le parcours et les textes**, validés par Victor avant tout code : l'enfant, puis
     l'adulte, soirée comprise, au téléphone et à l'ordinateur, dans les voix de `charte.md`.
     Il part de l'inventaire des écrans actuels (vocabulaire technique, colonne unique,
     doublons, écarts à la charte) et des familles réelles : deux représentants légaux dans
     deux foyers, un beau-parent ou un grand-parent qui suit les devoirs sans être représentant
     légal, une famille d'accueil, un tuteur (Victor, 2026-10-21).
  2. **Le socle, sans IA**, qui remplace les écrans actuels au lieu de les retoucher :
     - l'entrée de l'adulte, avec une déclaration horodatée à la création du compte : majeur, et
       représentant légal des enfants qu'il ajoute (un compte peut en porter plusieurs). Elle
       vaut consentement parental ; la vérification reste proportionnée, sans pièce d'identité
       (CNIL) (Victor, 2026-10-21) ;
     - le modèle de comptes et les mots « parent » et « enfant », revus pour toutes ces familles ;
     - l'entrée de l'enfant par son code, vue au téléphone, avec ses trois finitions : un code
       trop facile refusé dès sa première saisie, « Ajouter cet ordinateur » caché sur un
       ordinateur déjà ajouté, le titre et les prénoms de « Qui fait ses devoirs ? » alignés ;
       l'élève prévenu quand un nouvel appareil porte son profil ;
     - l'espace de l'adulte : la suppression de son compte (le serveur la porte,
       `POST /api/auth/delete-user`), une session fraîche pour un code « oublié » et la
       suppression d'un enfant, comme pour une clé d'accès ;
     - la mise en page de la charte, avec les rôles `accent` et `secondary` du mode sombre
       montés d'un pas pour la landing (#559), et Tom au trait.
  3. **La soirée**, avec le volet IA (`produit.md`, « Ce que fait Catiche ») : l'élève dit ses
     devoirs à l'oral, Tom propose un ordre, découpe en étapes, aide sur un exercice, puis
     récapitule et prépare le cartable. Dans la même PR :
     - le prompt et la réponse de repli suivent `charte.md`, « La voix de Tom », écarts listés
       dans `tuteur.md` § 5, dont l'annonce d'une IA dès la première interaction (AI Act,
       art. 50(1)) ;
     - le micro, que la `Permissions-Policy` du serveur ferme
       (`platform/http/security-headers.ts`), s'ouvre à `self` ; la transcription impose le
       français ;
     - la politique de confidentialité décrit la voix de l'élève ;
     - les formules de Tom : sur Chrome de bureau, chaque formule montre des flèches de
       défilement vertical, son conteneur (`[&_.katex]:overflow-x-auto`,
       `components/tom-text.tsx`) débordant de 6 px en hauteur.
  4. **Le point du soir**, qui remplace le résumé de la semaine. À corriger en passant : le
     résumé montre au parent « Ce qui résiste » même quand l'enfant a refusé la mémoire, alors
     que `/memoire` dit le contraire (`core/week-summary.ts`, `routes/memoire.tsx` du web). La
     politique de confidentialité décrit ses messages.
  5. **Les contrôles gardés d'un soir à l'autre**, et leur révision ramenée les jours d'avant.

  Les bloquants ne freinent pas la construction, seulement l'arrivée du premier élève réel.

## Technique reporté

- La suppression du compte parent se fait sur demande, comme le disent les CGU et la politique de
  confidentialité, jusqu'au socle de l'application cible qui lui donne son bouton.
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
