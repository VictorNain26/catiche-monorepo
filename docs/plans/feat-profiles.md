# Plan — Les profils sur l'appareil de la famille et le jumelage (lot 2, PR 4, parcours 3)

Écart avec `etudes/2026-10-11/refonte-interface.md` : le code de jumelage dit l'heure jusqu'à
laquelle il vaut, pas un compte à rebours : une heure reste juste quand le téléphone se met en
veille, sans minuterie qui tourne.

## Problème

Sur le téléphone de la famille, l'enfant ne voit son profil que dans le titre de son accueil, et
« Changer de profil » est en bas de page ; « Qui utilise Tom ? » ne propose que l'enfant actif,
même quand l'appareil tient le profil d'un frère ou d'une sœur. En 4e et 3e, le parent peut
ouvrir l'espace de l'enfant sur son propre téléphone et y relire ses séances, ce que la vision
réserve à la 6e et à la 5e, sans que l'enfant en soit prévenu. Le code de jumelage se lit dans
une phrase, et l'enfant valide « Relier cet appareil » sans savoir ce que son parent verra.

## Critères d'acceptation

- [ ] Sur chaque écran de l'élève (accueil, séance, ce que Tom retient), l'en-tête montre son
      prénom, lien vers « Qui utilise Tom ? » (« Lou, changer de profil ») ; le lien du bas de
      l'accueil disparaît.
- [ ] « Qui utilise Tom ? » propose chaque enfant que l'appareil tient ; choisir un autre que
      l'actif ouvre son espace. Le parent entre ensuite par sa clé d'accès ou un code.
- [ ] En 4e et 3e, plus d'« Ouvrir l'espace de … sur cet appareil » (décision de Victor du
      2026-10-12, dans `decisions.md`).
- [ ] Le jumelage, côté parent : le QR code plus grand, le code seul en grands caractères mono,
      « Valable jusqu'à HH:MM, une seule fois ».
- [ ] « Relier cet appareil », côté enfant : avant de valider, ce que son parent voit (le résumé,
      pas les conversations) et que chaque appareil relié paraît dans sa liste ; le champ du code
      en grands caractères mono.
- [ ] Tests e2e écrits d'abord et vus rouges.

## Hors périmètre

L'accueil de l'élève refait et sa première ouverture (PR 5), la séance (PR 6).

## Vérification de bout en bout

`bun run typecheck && bun run lint && bun run test` ; les e2e web Android (WebKit en CI) ; dans
Chrome à 390 px, clair et sombre : l'en-tête de l'élève, « Qui utilise Tom ? » avec deux enfants,
le jumelage des deux côtés.

## Décision humaine

Plan du lot 2 validé par Victor le 2026-10-11 (#484) ; en 4e et 3e, pas d'ouverture de l'espace
de l'enfant par le parent, choix de Victor le 2026-10-12.
