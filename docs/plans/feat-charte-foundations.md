# Plan — Les fondations de la charte « Grands carreaux »

## Problème

Victor a choisi le nom « De sa main » et la direction « Grands carreaux » aux fontes
d'« Instrument » (`decisions.md`, 2026-10-11). L'app porte encore « Cahier du soir » (Andika, rayons
ronds) ; le bouton désactivé, à 50 % d'opacité, perd son contraste (`suivi.md`, lot 1). Le lot 2
refait chaque écran : il lui faut d'abord des tokens, des composants et une charte écrite.

## Critères d'acceptation

- [ ] `packages/tokens/theme.css` porte la palette claire et sombre de l'essai A', Inclusive Sans
      pour le texte et les titres, Atkinson Hyperlegible Mono pour les codes, les rayons, l'ombre
      du bouton, la marge rouge ; chaque paire de texte passe 4,5:1 (`contrast.test.mjs`).
- [ ] Un état désactivé en tokens (fond et texte, paire testée à 4,5:1) remplace l'opacité de 50 %
      dans `@repo/ui` (bouton, champ, sélection, case).
- [ ] Boutons et champs prennent `rounded-control` ; les titres s'arrêtent au gras (700).
- [ ] La marge rouge borde chaque écran de l'app (`components/page.tsx`), pas la landing.
- [ ] Andika quitte l'app ; la landing garde son rendu (deux tokens ajoutés à `landing.css` aux
      valeurs d'aujourd'hui).
- [ ] `docs/charte.md` : principes, couleurs par rôle, typographie, formes, Tom, ton des mots,
      mouvement, états, accessibilité ; elle renvoie aux tokens sans recopier leurs valeurs.

## Hors périmètre

Le logo et les rendus de Tom (Blender), les icônes, la refonte des écrans (lot 2), les flèches de
défilement des formules (lot 2), la landing (lot 3).

## Vérification de bout en bout

`bun run typecheck && bun run lint && bun run test`, les e2e web Android
(`tooling/playwright-web`) et landing ; les cinq écrans vus dans Chrome à 390 px, en clair et en
sombre.

## Décision humaine

Nom et direction : Victor, 2026-10-11. Le découpage de la charte en PR : à confirmer en revue.
