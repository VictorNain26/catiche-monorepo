# Plan — Les composants et l'en-tête des espaces (lot 2, PR 1)

## Problème

Chaque écran refait à la main son lien de retour (« Retour au foyer », souligné, sans icône) et ses
cartes (onze copies des mêmes classes). La refonte (`etudes/2026-10-11/refonte-interface.md`)
veut un retour visible en haut de chaque écran et des éléments communs avant de refaire les
parcours.

## Critères d'acceptation

- [ ] `Card` dans `@repo/ui` (rayon des cartes, bord, fond `card`), qui peut prendre la balise de
      son contenu (`asChild`) ; chaque carte de l'app passe par lui.
- [ ] `Page` porte un en-tête : le retour (icône et texte, cible de 44 px) au-dessus du titre, et
      une action à droite (« Mon compte ») ; le retour précède le titre dans l'ordre de lecture.
- [ ] Chaque écran qui avait un lien de retour ou « Mon compte » le passe à l'en-tête ; aucun nom
      de lien ne change (les e2e s'en servent).
- [ ] Icônes Lucide, au trait de 1,75, jamais seules sans texte.

## Hors périmètre

Les parcours eux-mêmes (PR 2 à 10), l'en-tête de profil et « Changer de profil » (PR 4), les
étapes de formulaire et le sélecteur mois-année (PR 3), le champ de code (PR 2).

## Vérification de bout en bout

`bun run typecheck && bun run lint && bun run test` ; les e2e web (config locale sur le port 3013
tant que le 3012 est tenu) ; chaque écran vu dans Chrome à 390 px, en clair et en sombre.

## Décision humaine

Plan du lot 2 validé par Victor le 2026-10-11 (#484).
