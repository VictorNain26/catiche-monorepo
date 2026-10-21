---
description: Landing Astro — chargé uniquement sur apps/landing
paths:
  - "apps/landing/**"
---

# Landing (`apps/landing`)

Vitrine marketing et SEO, statique, en Astro 7, servie par Caddy dans une application statique
Clever Cloud (`apps/landing/Caddyfile`).

- Sans appel au serveur, et rien qui ne vienne de `docs/produit.md` : `CLAUDE.md`, « Interdits ».
- L'appel à l'action est ce qu'un visiteur peut faire aujourd'hui : demander une invitation par
  e-mail (`CONTACT_EMAIL`), ou se connecter à l'application par un lien, dont l'adresse est une
  seule constante (`APP_URL`, `apps/landing/src/lib/brand.ts`), le staging tant que la production
  n'existe pas (`docs/etat.md`). Ni liste d'attente ni formulaire : un formulaire public demande un
  service qui le reçoive.
- Un lien qui quitte catiche.fr, l'application comprise, passe par
  `apps/landing/src/components/atoms/external-link.astro` : nouvel onglet, signalé à l'œil et au
  lecteur d'écran. Un lien interne reste dans l'onglet, pour que le retour arrière marche.
- Les textes suivent `docs/charte.md`, « Les mots ».
- Jamais un mot de soin ni un trouble ciblé : la liste et la raison sont dans `docs/produit.md`,
  « Ce qu'on dit, et ce qu'on ne dit pas ».
- Ce qu'on peut prouver (`CLAUDE.md`, « Carte »), sur la landing : chaque chiffre a une source
  primaire datée, chaque différence face à un concurrent est mesurée, ce qui n'est pas dans
  `produit.md` ne s'écrit pas ; le statut du produit se dit une fois (`docs/charte.md`, « Les
  mots »). Une phrase qu'on ne peut adosser à une source ou à une mesure se retire.
- Jamais de promesse de progrès scolaire ni de meilleures notes, jamais « le seul » ; jamais
  « conforme au cadre d'usage de l'IA du ministère », « agréé » ou « recommandé par l'Éducation
  nationale », « aligné sur les programmes » sans la métrique publiée, ni « fait les devoirs ».
- Preuve sociale réelle seulement : témoignages de vraies familles avec leur accord, chiffres
  sourcés ; jamais un avis, un logo ou un compteur inventé ou anticipé.
- Jamais un cookie non essentiel avant le consentement, ni un bandeau où « Refuser » est moins
  visible qu'« Accepter » ([CNIL](https://www.cnil.fr/en/dark-patterns-cookie-banners-cnil-issues-formal-notice-website-publishers)).
- Jamais de framework client (React ou autre) : la landing est du HTML statique. Un composant qui
  a besoin du navigateur est un élément personnalisé (`customElements.define`) dans le `<script>`
  de son composant, sur l'élément natif quand il existe (`<dialog>` pour le menu, `<details>` pour
  la FAQ). Les classes partagées avec le web viennent de `@repo/ui/classes`.
- Le mouvement anime les illustrations (les écrans, Tom, le surligneur). Un texte peut apparaître
  au défilement, une fois, si son état d'entrée n'est posé que par le script et hors mouvement
  réduit ; sans script, il est visible (`reveal`, `apps/landing/src/styles/global.css`). CSS
  d'abord, le lien au défilement sous
  `@supports (animation-timeline: view())` ; ce que le CSS ne sait pas faire passe par les API
  natives (Web Animations, `IntersectionObserver`) dans `apps/landing/src/scripts/evening.ts`,
  sans bibliothèque. Une vidéo de Tom se joue une fois et dure moins de 5 secondes ; une animation
  plus longue ou en boucle exige un bouton Pause (WCAG 2.2.2).
- Jamais un état d'entrée masqué hors de `@media (prefers-reduced-motion: no-preference)`, ni
  posé par le CSS quand c'est un script qui le lève : ce script le pose lui-même (`data-armed`,
  `apps/landing/src/scripts/evening.ts`), et rien n'attend un script qui ne vient pas. Seule une
  animation en CSS pur, qui ne dépend d'aucun script, part d'un état masqué, si elle se termine
  d'elle-même (le surligneur, `both` avec délai) ou suit le défilement, sous
  `@supports (animation-timeline: view())`. Sans scripts, si un script échoue, ou sous le
  mouvement réduit, même activé en cours de visite, la page s'affiche entière et immobile ; son
  HTML est l'état final.
- Jamais de `<script>` ni de `<style>` en `is:inline`, ni d'attribut `style` : la CSP
  (`security.csp`, `apps/landing/astro.config.mjs`) n'admet que ce qu'Astro a haché.
- Jamais un texte suivi d'une balise qui ouvre la ligne suivante sans `{' '}` : Astro 7 compresse
  le HTML comme du JSX (`compressHTML: 'jsx'`) et colle les deux
  ([guide de migration](https://docs.astro.build/en/guides/upgrade-to/v7/)).
- Jamais un en-tête HTTP, une redirection ou une page d'erreur ailleurs que dans le `Caddyfile` :
  c'est lui que Clever Cloud sert
  ([doc](https://www.clever.cloud/developers/doc/deploy/applications/static/)), et la CI le valide
  avec l'image `caddy` de la version que Clever Cloud annonce, à suivre à la main dans
  `.github/workflows/ci.yml`.
