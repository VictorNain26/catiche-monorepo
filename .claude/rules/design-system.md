---
description: Design system — chargé uniquement sur les fichiers d'interface
paths:
  - "apps/landing/**/*.{ts,astro,css}"
  - "apps/web/**/*.{ts,tsx,css}"
  - "packages/ui/**/*.{ts,tsx}"
  - "packages/tokens/**/*.css"
---

# Design system

La direction « Grands carreaux » (`docs/decisions.md`, 2026-10-11) : `packages/tokens/theme.css`,
clair et sombre, Inclusive Sans et Atkinson Hyperlegible Mono ; son usage, `docs/charte.md`. Une
nouvelle direction, pour le site et l'app ensemble, se choisit au lot 1 (`docs/decisions.md`,
2026-10-12) ; d'ici là, la landing garde son identité précédente (`packages/tokens/landing.css`),
que la nouvelle remplace, `landing.css` supprimé. Les composants ne dépendent de l'identité que
par les tokens.

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
