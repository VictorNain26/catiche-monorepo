# Plan — La qualité : captures de référence, axe, projet ordinateur

Lot 1, étape 2.2 (`roadmap.md`). Pré-vol : `toHaveScreenshot` coupe déjà les animations, masque
le curseur et attend `document.fonts.ready` par défaut (types de `playwright` 1.63.0) ; le point
reporté de `suivi.md` « un projet Playwright à l'ordinateur » devient le critère 4, la composition
des écrans pour lui reste aux étapes 3 et 4.

## Problème

Un écran se dit fini sur des critères que rien ne contrôle : `design-system.md` exige axe vert et
des captures relues, mais aucune suite ne lance axe ni ne compare une capture, et l'app n'est
éprouvée qu'au téléphone. Depuis #503, les navigateurs des deux suites sont ceux de l'image de
Playwright, en local comme en CI : une capture y rend à l'identique.

## Critères d'acceptation

- [ ] `@playwright/test` épinglé à 1.63.0 exactement dans les deux paquets, comme l'image du
      service `playwright` et `bun.lock` ; le groupe `playwright` de Renovate les garde ensemble.
- [ ] `toHaveScreenshot` sur la connexion, le foyer du parent, une séance (web, chaque projet) et
      le haut de l'accueil (landing) ; animations coupées, curseur masqué, fontes chargées ;
      références générées par `--update-snapshots`, commitées.
- [ ] Un helper axe par suite (WCAG 2.2 A et AA), appelé sur les états visités qui comptent ;
      aucune violation masquée par `disableRules` ou `exclude`.
- [ ] Un projet `desktop` dans la suite web ; aucun test affaibli, un test qui ne s'y applique pas
      est écarté avec sa raison.
- [ ] `design-system.md` et `testing.md` nomment la commande des captures et le helper axe.

## Hors périmètre

Les tokens Rive (2.1), qui régénéreront les références ; la composition des écrans à l'ordinateur
(étapes 3 et 4) ; le mode sombre en capture.

## Vérification de bout en bout

`bunx turbo run test:e2e --filter=@repo/playwright-web` et `--filter=landing`, verts en local
puis en CI (`ci-ok`).

## Décision humaine

Étape 2.2 du lot 1, confiée par Victor le 2026-10-12.
