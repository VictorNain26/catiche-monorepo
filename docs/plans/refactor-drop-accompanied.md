# Plan : supprimer le mode accompagné (6e-5e)

Décision de Victor (2026-10-20) : « l'enfant a son espace à lui » dès la 6e. Comme aujourd'hui
en 4e-3e, l'élève travaille sur son propre appareil relié par un code ; le parent ne voit plus les
conversations et n'ouvre plus le profil de l'enfant sur l'appareil familial ; il garde le résumé
de la semaine (réécrit plus tard en « c'est fait », hors de cette PR). Aucune donnée en
production : pas de rétrocompatibilité. Réduire la codebase.

## Nouveau comportement

- **Tous niveaux, de la 6e à la 3e, un seul parcours** : le parent demande un code depuis la page
  de l'enfant (« Relier le téléphone de … », puis « Relier un autre appareil ») ; le code ouvre
  une session de l'élève sur l'appareil qui le saisit. Le serveur ne refusait déjà le jumelage à
  aucun niveau : seul le web le cachait avant la 4e.
- **Une séance n'a plus de mode** : `POST /api/sessions` sans corps ; la séance ne porte plus
  `accompanied`, Tom ne donne plus de pistes au parent (`data-cue` disparaît du flux).
- **`/api/me` et la liste des élèves** ne portent plus `accompanied`.
- **Sur un appareil, un enfant n'ouvre jamais l'espace d'un autre** : la garde du foyer ne laisse
  plus à un élève connecté ni `multi-session/set-active` ni `multi-session/list-device-sessions`
  (403) ; `assertSiblingSwitch` et `isAccompanied` disparaissent. Le parent qui entre sur
  l'appareil de son enfant et le lui rend (`set-active` depuis la session du parent, qui ferme
  alors la sienne) reste possible : c'est l'appareil de l'enfant, la session y était déjà.
- **Choix le plus strict, fait seul** : un appareil qui tient déjà la session d'un enfant (ex.
  l'appareil familial d'un enfant de 5e) n'est plus qu'un appareil de l'enfant parmi les autres,
  visible de l'enfant et du parent, que le parent déconnecte ; le serveur ne distingue pas un
  appareil « familial ». Un enfant n'y bascule plus vers le profil d'un frère ou d'une sœur
  (refus ci-dessus, à tous les niveaux). Aucune donnée en production : rien à migrer.
- La protection qui reste contre un parent qui saisirait lui-même le code sur son téléphone est
  celle de la 4e-3e aujourd'hui : chaque appareil relié est une session que l'enfant voit dans
  sa liste (`platform/auth/pairing.ts`). Le web ne le propose plus.

## Fichiers et interfaces touchés

Serveur (`apps/server/src`) :
- supprimés : `modules/tutor/core/parent-cues.ts` et son test ;
- `domain/levels.ts` : `isAccompaniedLevel` retiré ;
- `modules/tutor/schema.ts` : colonnes `accompanied`, `parent_cues`, `last_parent_cue` et enum
  `parent_cue_kind` retirées ; migration par `bun run db:generate` ;
- `modules/tutor/routes.ts` : `POST /` sans corps, plus de partie `data-cue` ;
- `modules/tutor/service.ts` : `startSession(userId)`, `runTurn` rend `{ text }` ;
- `modules/tutor/turn-pipeline.ts` : plus de calcul de piste ; `OpenTurn.session` sans les trois
  champs ;
- `modules/tutor/repository.ts` : `createSession(studentId)` rend la dernière séance vide sans la
  modifier, `SavedTurn.parentCue` retiré ;
- `modules/household/service.ts`, `routes.ts` : `accompanied`, `isAccompanied`,
  `assertSiblingSwitch` retirés ; `STUDENT_AUTH_PATHS` sans `set-active` ni
  `list-device-sessions` ;
- `testing/http.ts` : `api.session(cookie)`.

Web (`apps/web/src`) :
- `lib/chat.ts` : `startSession()` sans argument, `ChatMessage` sans `cue` ;
- `routes/index.tsx` : un seul bouton « Nouvelle séance » ;
- `routes/seance.$sessionId.tsx` : plus de carte « Pour vous, parent » ;
- `routes/foyer.$studentId.tsx` : `OpenHere` supprimé, jumelage proposé à tous les niveaux ;
- `routes/connexion.tsx` : `Children` réduit à l'enfant actif, plus de bascule ni de liste des
  sessions de l'appareil pour un élève.

Doc : `docs/tuteur.md` § 8 réécrit (renvois au code), `docs/produit.md` (« c'est fait »).

## Tests (TDD, vus en échec d'abord)

- `platform/auth/profiles.test.ts` : un enfant ne bascule pas vers la session d'un frère ou d'une
  sœur que l'appareil tient (403, les deux en 5e), ni ne liste les sessions de l'appareil (403) ;
  les cas « bascule permise » et « refusée après la 5e » supprimés.
- `modules/tutor/tutor.test.ts` : `POST /api/sessions` sans corps → 201, sans `accompanied` ;
  les cas du mode et de l'enum `last_parent_cue` supprimés.
- `modules/household/household.test.ts` : `/api/me` sans `accompanied` (égalité exacte) ; le cas
  « travaille sur l'appareil de la famille » supprimé.
- `modules/tutor/turn.test.ts` : les cas des pistes supprimés.

## Hors périmètre

- La réécriture du résumé de la semaine en « c'est fait ».
- Le prompt de 6e (`SIXIEME`) et le raisonnement par niveau : inchangés.
- Le cadre ministériel « usage autonome à partir de la 4e » (`tuteur.md` § 9) : la ligne reste,
  le point est remonté à Victor.

## Vérification de bout en bout

`bun run typecheck && bun run lint` ; tests ciblés (`profiles`, `household`, `tutor`, `turn`,
`summary`) sur le Postgres local ; `db:generate` ne produit plus rien après la migration ;
`git grep -n -i -e accompan -e parent-cue -e parent_cue -e parentCue -e OpenHere -e data-cue`
ne trouve plus que les migrations passées ; CI `ci-ok` verte.
