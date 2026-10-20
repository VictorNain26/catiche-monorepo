---
description: Design system — chargé uniquement sur les fichiers d'interface
paths:
  - "apps/landing/**/*.{ts,astro,css}"
  - "apps/web/**/*.{ts,tsx,css}"
  - "packages/ui/**/*.{ts,tsx}"
  - "packages/tokens/**/*.css"
---

# Design system

La direction « Rive », pour le site et l'app ensemble ; son usage, `docs/charte.md`. Ses tokens
vivent dans
`packages/tokens` : les échelles de `scales.css`, les rôles de `theme.css`, partagés par le site et
l'app. Les composants ne dépendent de l'identité que par les rôles.

## Interdits

- Aucune nouvelle direction visuelle que Victor n'a pas validée.
- Aucune valeur écrite à la main dans `scales.css` : elle se génère par `bun run scales` dans
  `packages/tokens` (`scales.mjs`), et le test vérifie que le fichier est à jour.
- Aucun pas d'échelle dans un composant : un rôle de `theme.css`, et un rôle nouveau y pointe vers
  un pas, avec sa valeur sombre quand le pas change.
- Aucune opacité pour un état désactivé : `disabled` et `disabled-foreground`.
- Aucun « ami », sentiment ou souvenir personnel prêté à Tom dans un texte de l'interface.
- Aucune couleur, durée, rayon ou taille littérale dans un composant : une classe issue de
  `@repo/tokens`, ou un token ajouté à `theme.css`. Seule exception : les valeurs que Motion
  anime (`animate()` dans la landing), et l'état d'entrée qui les attend.
- Aucune paire de tokens associée sans son test de contraste
  (`packages/tokens/contrast.test.mjs`) : texte dans `TEXT` à 4,5:1
  ([WCAG 2.2, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)),
  bordure, anneau de focus ou série de graphique dans `MARKS` à 3:1, dans chaque mode
  ([1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- Aucune cible tactile sous 44 px, aucun défilement horizontal à largeur de téléphone, aucune
  animation qui ignore le mouvement réduit.
- Aucune primitive interactive hors de Base UI (`@base-ui/react` : dialogue, toast, onglets, menu),
  toasts compris : une seule famille dans `@repo/ui`, et aucune qui écrive une balise `<style>`,
  que la CSP stricte refuserait : ni ScrollArea ni Select de Base UI, qui en écrivent une
  (`utils/styles.js`), ni le dialogue de Radix ni `sonner`.
- Aucun graphique en anneau, en camembert ou en 3D, aucune couleur seule porteuse d'une
  information, aucun graphique sans sa phrase et son tableau de valeurs.
- Aucune arche ailleurs que derrière Tom, sur le haut du site et à l'entrée de l'app.

## Un écran n'est pas fini

- sans ses états : vide, chargement, erreur, et hors ligne ou quota quand ils le concernent ;
- sans être vu au téléphone (deux largeurs) et à l'ordinateur, en clair et en sombre ;
- sans un passage au clavier ;
- sans être vu dans Chrome avant son merge, puis au staging pour l'app (la landing n'en a pas).
