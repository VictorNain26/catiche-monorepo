# Plan — `feat/landing-rewrite`

## Context

La landing en ligne (https://tomia.fr) vend encore l'ancien produit : un tuteur des matières qui
ne donne pas la réponse. Ce n'est plus ce que dit `docs/produit.md`, et Galac6 comme ChatGPT le
font déjà gratuitement. Le 2026-10-20, Victor met le volet IA de côté pour l'instant et passe à la
refonte, en commençant par la landing.

Décisions de Victor du même jour :
- plus de « coach » : Catiche « accompagne votre enfant pendant ses devoirs, du début à la fin » ;
  « Tom t'aide à t'organiser » pour l'enfant ; « l'aide aux devoirs » quand il faut un nom ;
- le message et la structure ci-dessous sont validés ;
- pas de polissage visuel : la page doit marcher et parler à de vrais parents
  (mémoire `design-not-final-2026-10-20`).

Le bouton ouvre un e-mail vers `contact@tomia.fr`, l'adresse qui existe déjà. La landing reste
statique : il n'y a pas de serveur de production, et un formulaire public demande un chantier à
part. Cette règle se revoit à la naissance de la production.

La recherche qui fonde la page est dans `scratchpad/landing-recherche-2026-10-20.md` : 16 pages
lues, NN/g, l'autocomplétion Google.

## La page (`apps/landing/src/pages/index.astro`)

Les sections, dans cet ordre, avec les textes validés.

1. **En haut** (`hero.astro`) :
   - étiquette « En préparation : l'application n'est pas encore ouverte » ;
   - titre « Ce soir, votre enfant sait par où commencer. » ;
   - sous-titre « Catiche accompagne votre collégien pendant ses devoirs, du début à la fin :
     savoir quoi faire, s'y mettre, aller au bout, préparer les contrôles. Sans faire le travail à
     sa place. » ;
   - un seul bouton, « Être prévenu de l'ouverture », qui renvoie à la section 9 ;
   - `DemoExchange` (l'échange de maths) est retiré ; `TomIllustration` reste.
2. **Une soirée avec Tom** (`how-it-works.astro` réécrit, étiquette « Ce que nous construisons »),
   en 4 étapes :
   - « Qu'est-ce que tu as ce soir ? » ;
   - un ordre et de petites étapes ;
   - une aide qui ne fait pas à sa place ;
   - le sac de demain, et les contrôles qui reviennent les jours d'avant.
3. **Pour vous, le parent** (`parents.astro`) : « Vous savez que c'est fait, sans lire par-dessus
   son épaule », et la raison (c'est son espace).
4. **Ce que Tom ne fait pas** (nouvelle section courte, remplace `problem.astro`) : il ne fait pas
   les devoirs, ne donne pas la réponse d'un exercice, ne promet pas de meilleures notes, ne
   remplace ni l'enseignant ni le parent.
5. **Les données de votre enfant** (`trust.astro`), avec des faits vérifiés dans la doc avant
   d'être écrits :
   - les modèles de Mistral, sur leur endpoint européen (`tuteur.md` § 2) ;
   - l'hébergement par Clever Cloud à Paris (`architecture.md`) ;
   - un enfant sans adresse e-mail, avec un code que lui seul connaît (`architecture.md`) ;
   - aucune publicité ni revente ;
   - consultation, correction et suppression sur demande.
6. **Sur quoi on s'appuie** (nouvelle) : les gestes viennent de programmes évalués
   (`methode.md`), menés par un adulte ; « ce que donne Tom, nous le mesurerons et le
   publierons ». Pas de chiffre d'effet sur la page.
7. **Où en est Catiche** (remplace `pricing.astro`) :
   - ce qui est construit, dit sans promesse : les comptes du parent et de l'enfant, le code de
     l'enfant, l'aide sur un exercice ;
   - ce qui arrive : la soirée à l'oral, le résumé « c'est fait » ;
   - le prix n'est pas encore fixé.
8. **Les questions des parents** (`faq-data.ts` réécrit) :
   - dès quelle classe ;
   - combien ça coûte ;
   - et Pronote ;
   - et Devoirs faits ;
   - un ordinateur partagé par la famille ;
   - combien de temps par soir ;
   - Tom donne-t-il les réponses ;
   - les données.

   `aide.astro`, qui lit la même FAQ, suit sans changement de code.
9. **En bas** (nouvelle, `id="prevenu"`) : « Écrivez-nous, nous vous préviendrons à
   l'ouverture », un lien `mailto:contact@tomia.fr` avec un objet prérempli, et une ligne sur
   l'usage de l'adresse avec un renvoi à `/confidentialite`.

## Ailleurs dans la landing

- **Navigation** (`molecules/nav-links.astro`) : « Une soirée », « Parents », « Questions » ;
  « Tarifs » disparaît.
- **Titre et description de la page** (`layouts/layout.astro`) : le vocabulaire « aide aux
  devoirs » et « accompagne ».
- **`confidentialite.astro` et `cgu.astro`** : retirer ou réécrire toute mention d'offres
  Gratuit/Complet ou de la liste d'attente ; dire comment l'adresse d'un e-mail reçu à
  `contact@` est utilisée et combien de temps elle est gardée. C'est un correctif d'honnêteté
  (`.claude/rules/landing.md`).
- **Supprimés** :
  - `demo-exchange.astro`, `problem.astro`, `pricing.astro` ;
  - tout composant, toute icône et toute dépendance qui ne servaient qu'à eux (vérifié par grep
    et `knip`).

## Doc et règles

- **`docs/produit.md`** : « coach » devient « accompagne » partout ; la ligne « La réécriture de
  la landing » quitte « Ouvert ».
- **`CLAUDE.md`** : la ligne 3 et l'interdit « Rien n'entre dans la landing… avant sa
  réécriture », qui devient « …hors de `docs/produit.md` ».
- **`README.md`** : l'ouverture du fichier.
- **`.claude/rules/landing.md`** :
  - le gel est levé ;
  - « on n'affirme que ce qu'on prouve » reste ;
  - ajout : le seul appel à l'action est un e-mail tant que la production n'existe pas.
- **`docs/etat.md`** : un formulaire d'inscription à la naissance de la production.

## Hors périmètre

L'application web (accueil de l'enfant, espace du parent), le volet IA et la soirée. Pas de
nouvelle animation, pas de nouvelle illustration, pas de passe de polissage.

## Vérification

- `bun run lint`, `bun run typecheck` et `bun run build` de la landing ; aucun
  `<script is:inline>` ni attribut `style` (CSP).
- Chrome sur `localhost:3003`, à l'ordinateur et au téléphone. Si la fenêtre ne se réduit pas,
  émulation de l'appareil dans les outils de développement. On vérifie :
  - le haut de page se comprend sans défiler ;
  - le bouton descend en section 9 ;
  - le `mailto` s'ouvre ;
  - la navigation et la FAQ (`<details>`) marchent ;
  - la page est lisible sans scripts.
- Revue dans un contexte neuf avant le merge : chaque phrase confrontée à `produit.md`,
  `methode.md`, `architecture.md`, `tuteur.md` et à `landing.md` (rien d'improuvé, aucun mot de
  soin, aucune note promise).
- `ci-ok` vert, puis je montre la page à Victor en local avant de merger, et je merge avec son
  accord (le déploiement de la landing part en production au merge).
