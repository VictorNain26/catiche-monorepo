# Plan — L'ajout d'un enfant (lot 2, PR 3, parcours 2)

Écart avec `etudes/2026-10-11/refonte-interface.md` : le parcours 2 se fait en deux PR, l'ajout
ici, la fiche de l'enfant ensuite ; ensemble, la PR serait trop grosse à relire.

## Problème

Le parent ajoute son enfant par un long formulaire posé dans l'accueil du foyer : quatre champs
d'un coup, un mois de naissance que Chrome de bureau affiche vide en tirets (`suivi.md`), la
mémoire proposée sans que le parent sache encore ce que fait Tom.

## Critères d'acceptation

- [ ] Un écran à lui, `/foyer/ajouter`, une question par étape (« Étape 1 sur 4 ») : le prénom, la
      classe, le mois de naissance, puis ce que fait Tom et la proposition de la mémoire ; chaque
      étape se valide avant la suivante, et « Précédent » ramène sans rien perdre.
- [ ] Le mois de naissance en deux menus, mois et année (cinq à vingt ans), plus de champ natif
      `month`.
- [ ] Un foyer sans enfant ouvre directement cet écran ; avec un enfant, « Ajouter un enfant »
      y mène, et le retour ramène au foyer.
- [ ] Après l'ajout, la fiche de l'enfant, qui dit l'étape suivante (comme aujourd'hui).
- [ ] Les mots de Tom sans genre pour l'enfant.

## Hors périmètre

La fiche de l'enfant (PR suivante), les profils et le jumelage (PR 4).

## Vérification de bout en bout

`bun run typecheck && bun run lint && bun run test` ; les e2e web Android (config locale sur le
port 3013) ; l'ajout fait dans Chrome à 390 px, en clair et en sombre.

## Décision humaine

Plan du lot 2 validé par Victor le 2026-10-11 (#484).
