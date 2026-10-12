# Plan — Les tokens Rive (lot 1, étape 2.1)

## Problème

Le code garde « Grands carreaux » dans l'app et l'identité précédente sur le site
(`landing.css`, Nunito, Caveat) ; la charte Rive (`docs/charte.md`) attend ses tokens avant les
composants (2.3) et les écrans. Victor, le 2026-10-12 : le site prend Rive dans cette PR, même en
ligne sur sa composition actuelle ; les échelles viennent de Leonardo.

## Critères d'acceptation

- [ ] Sept échelles de douze pas, clair et sombre, générées par `@adobe/leonardo-contrast-colors`
      en OKLCH à des contrastes cibles sur le fond (1 à 14:1), autour des couleurs de la charte :
      mist (brume, encre), water (eau), reed (jonc), fur (pelage), green, red, amber. Un script
      (`packages/tokens/scales.mjs`) écrit `scales.css` ; un test vérifie que le fichier est à jour.
- [ ] Les rôles de `theme.css` (noms inchangés) pointent vers les pas ; le sombre ne redéfinit que
      les rôles qui changent de pas. Ajouts : `panel`, `chart-1` à `chart-4`, `--ease-standard`.
- [ ] Le corps à 17 px (`--text-base`), les deux rayons et l'ombre légère de la charte.
- [ ] Fontes par les mêmes variables `--font-brand-*` dans l'app (fontsource) et le site (API de
      fontes d'Astro) : Bricolage Grotesque (axe de graisse seul), Atkinson Hyperlegible Next,
      Atkinson Hyperlegible Mono ; Inclusive Sans, Nunito et Caveat partent.
- [ ] Le site prend `theme.css` ; `landing.css` et `--font-hand` sont supprimés ; la note
      manuscrite devient une note en pelage ; ses tests suivent.
- [ ] `contrast.test.mjs` résout les `var()`, lit l'OKLCH, couvre les graphiques (3:1 sur fond et
      carte) et le jonc ; tout passe dans les deux modes.
- [ ] Docs : interdit de la landing assoupli (CLAUDE.md, `.claude/rules/landing.md`), décision
      dans `decisions.md`, `charte.md` (valeurs, Leonardo), `design-system.md`, roadmap, suivi.
- [ ] Vu dans Chrome : le site et l'app, au téléphone et à l'ordinateur, clair et sombre.

## Hors périmètre

La composition des écrans et du site (étapes 3 et 4), les composants (2.3), le logo et Tom 2D (2.4),
les captures de référence (2.2).

## Vérification de bout en bout

`bun run test` (contrastes, fichier d'échelles à jour), les deux suites e2e, `bun run build`, puis
le site et l'app dans Chrome.

## Décision humaine

Victor, 2026-10-12 : Rive (#493) ; le site dans cette PR ; Leonardo pour les échelles.
