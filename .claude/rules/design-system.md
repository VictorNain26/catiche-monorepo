---
description: Design system — chargé uniquement sur les fichiers d'interface
paths:
  - "apps/landing/**/*.{ts,astro,css}"
  - "apps/web/**/*.{ts,tsx,css}"
  - "packages/ui/**/*.{ts,tsx}"
  - "packages/tokens/**/*.css"
---

# Design system

La direction « Rive » (`docs/decisions.md`, 2026-10-12), pour le site et l'app ensemble ; son
usage, `docs/charte.md` ; ce que montre chaque écran, `docs/experience.md`. Elle entre dans
`packages/tokens/theme.css` au lot 1, étape 2.1 (`docs/roadmap.md`), qui supprime
`packages/tokens/landing.css` ; d'ici là, le code garde l'identité précédente. Les composants ne
dépendent de l'identité que par les tokens.

## Interdits

- Aucune nouvelle direction visuelle que Victor n'a pas validée.
- Aucun token ajouté au clair sans sa valeur sombre, ni à `landing.css`, gelé, sauf celui qu'un
  composant partagé avec la landing prend, à la valeur qui garde son rendu.
- Aucune opacité pour un état désactivé : `disabled` et `disabled-foreground`.
- Aucun « ami », sentiment ou souvenir personnel prêté à Tom dans un texte de l'interface.
- Aucune couleur, durée, rayon ou taille littérale dans un composant : une classe issue de
  `@repo/tokens`, ou un token ajouté à `theme.css`. Seule exception : les valeurs que Motion
  anime (`animate()` dans la landing), et l'état d'entrée qui les attend.
- Aucune paire de tokens associée sans son test de contraste
  (`packages/tokens/contrast.test.mjs`) : texte dans `PAIRS` à 4,5:1
  ([WCAG 2.2, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)),
  bordure ou anneau de focus dans `CONTROL_PAIRS` à 3:1, dans chaque mode
  ([1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- Aucune cible tactile sous 44 px, aucun défilement horizontal à largeur de téléphone, aucune
  animation qui ignore le mouvement réduit.
- Aucune primitive interactive hors de Radix (dialogue, onglets, tiroir, menu) : une seule famille
  dans `@repo/ui`.
- Aucun graphique en anneau, en camembert ou en 3D, aucune couleur seule porteuse d'une
  information, aucun graphique sans sa phrase et son tableau de valeurs.
- Aucune arche ailleurs que derrière Tom, sur le haut du site et à l'entrée de l'app.

## Un écran n'est pas fini

- sans ses états : vide, chargement, erreur, et hors ligne ou quota quand ils le concernent ;
- sans être vu au téléphone (deux largeurs) et à l'ordinateur, en clair et en sombre ;
- sans `@axe-core/playwright` vert sur chacun de ses états, ni un passage au clavier ;
- sans ses captures de référence relues, une fois l'étape 2.2 du lot 1 faite (`docs/roadmap.md`).
