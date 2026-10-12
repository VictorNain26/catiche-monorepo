# Plan — Les composants de `@repo/ui` (lot 1, étape 2.3)

Pré-vol (2026-10-12) : la branche `feat/ui-components` est prise par #486 (mergée), d'où
`feat/ui-component-kit`. Radix Dialog et `sonner` injectent chacun une balise `<style>` à
l'exécution (`react-remove-scroll-bar`, `__insertCSS` de sonner) que la CSP du serveur
(`default-src 'self'`) bloque ; sonner refuse de changer ([#449](https://github.com/emilkowalski/sonner/issues/449)).
Arbitrage : `style-src-elem 'self' 'unsafe-inline'`, les attributs `style` restant bloqués.

## Problème

Les étapes 3 et 4 composent les écrans de l'entrée et des deux espaces ; sans coquille, sans
états ni graphique communs, chaque écran referait les siens (`experience.md`, `charte.md`).

## Critères d'acceptation

- [ ] La coquille : en-tête (logo, profil actif), deux à cinq destinations (icône et libellé d'un
      mot), en bas sous `sm`, en rail de `sm` à `lg`, sur le côté au-delà ; le nombre tenu par le type.
- [ ] Section, liste, carte (container query à l'intérieur), état vide, squelette (invisible avant
      une seconde, sans pulsation sous le mouvement réduit), bandeau (icône et titre par ton).
- [ ] Dialogue et tiroir sur Radix Dialog, bouton « Fermer » libellé ; toasts par `sonner`, sans
      style à lui, aux tokens.
- [ ] Graphique en barres SVG : la phrase au-dessus, barres depuis zéro, étiquettes directes,
      vertical et horizontal trié, `chart-1` à `chart-4` dans l'ordre, légende dès deux séries,
      tableau des valeurs pour les lecteurs d'écran ; testé par `bun test` dans `packages/ui`.
- [ ] Animations et délai en tokens dans `theme.css`, coupées sous le mouvement réduit.
- [ ] Le catalogue : la route `/catalogue` de `apps/web`, sans appel à l'API ni donnée réelle.
      Pourquoi là : la suite e2e visite le build de production, une page de développement seul n'y
      serait pas ; une seconde chaîne (Storybook, Ladle) est écartée par l'étude ; la route est
      découpée par le routeur, sans lien, et ne coûte rien aux autres écrans.
- [ ] e2e sur chaque projet, au téléphone et à 1440 px, clair et sombre : rendu, aucun
      défilement horizontal, cibles de 44 px, coquille placée, clavier et piège du focus du
      dialogue et du tiroir, toast, tableau du graphique, aucune violation de CSP.

## Hors périmètre

Les écrans d'`apps/web` (étapes 3 et 4) ; `Notice` d'`apps/web` recoupe le bandeau et part avec
eux ; axe et captures de référence (2.2) ; le logo (2.4).

## Vérification de bout en bout

`bun run typecheck && bun run lint && bun run test`, la suite e2e web, puis des captures du
catalogue à 390 et 1440 px, clair et sombre.

## Décision humaine

Victor, 2026-10-12 : la roadmap (étape 2.3), Radix et `sonner` (`design-system.md`). La CSP des
styles est à valider par lui dans la PR.
