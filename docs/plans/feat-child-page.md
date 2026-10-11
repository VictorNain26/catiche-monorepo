# Plan — La fiche de l'enfant (lot 2, PR 3 suite, fin du parcours 2)

Écart avec `etudes/2026-10-11/refonte-interface.md` : l'écran « Prochaine étape » n'est pas une
route à part ; la fiche de l'enfant le devient tant que rien ne tient son espace, ce qui évite
deux écrans pour une même action.

## Problème

Après l'ajout, le parent arrive sur une fiche qui empile six sections au même niveau : un avis
« Prochaine étape », le bouton d'ouverture, la semaine, les appareils, la mémoire, le prénom et la
classe, la suppression. En 4e, l'étape suivante (relier le téléphone de l'enfant) est loin sous la
semaine, et la suppression du compte s'affiche à côté de tout le reste.

## Critères d'acceptation

- [ ] La classe de l'enfant se lit sous son prénom.
- [ ] Tant qu'aucun appareil ne tient son espace, la fiche ouvre sur la prochaine étape, une
      phrase et son action : « Faire les devoirs avec … » en 6e et 5e ; en 4e et 3e, « Relier le
      téléphone de … », dont le QR code et le code s'affichent là.
- [ ] Une fois l'étape faite : en 6e et 5e, « Faire les devoirs avec … » reste l'action principale ;
      en 4e et 3e, la semaine vient en premier, sans bouton au-dessus.
- [ ] La semaine reste dépliée ; « Ses appareils », « Ce que Tom retient », « Son prénom et sa
      classe » et « Supprimer son compte » se replient (`details`, comme « Tes appareils reliés »
      de l'élève). Ouvrir l'espace de l'enfant sur cet appareil, en 4e et 3e, passe dans « Ses
      appareils ».
- [ ] Le repli devient un composant de `apps/web/src/components`, repris par l'accueil de l'élève.
- [ ] Tests e2e écrits d'abord et vus rouges : l'ordre de la fiche en 4e et en 5e avant et après
      l'étape, les sections repliées.

## Hors périmètre

Le jumelage refait et l'écran « Qui utilise Tom ? » (PR 4), la semaine en écran à part (PR 7), la
suppression déplacée dans « Les données » (PR 8).

## Vérification de bout en bout

`bun run typecheck && bun run lint && bun run test` ; les e2e web Android (config locale sur le
port 3013) ; la fiche vue dans Chrome à 390 px, en clair et en sombre, en 5e et en 4e, avant et
après l'étape.

## Décision humaine

Plan du lot 2 validé par Victor le 2026-10-11 (#484) ; cette PR lancée par Victor le 2026-10-11.
