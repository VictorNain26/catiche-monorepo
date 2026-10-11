# La refonte de l'interface : parcours et ordre (2026-10-11)

Plan du lot 2, demandé par Victor le 2026-10-11 : une refonte complète de l'interface sur la
charte « Grands carreaux » (`charte.md`), pas un repeint (`decisions.md`, « Une refonte complète
de l'interface »). Il part de l'app telle qu'elle est ce jour-là (douze routes dans
`apps/web/src/routes/`), des constats de `etudes/2026-10-08/interfaces.md`, du modèle du foyer
(`etudes/2026-10-07/foyer-eleve-age.md`, § 7) et du mode accompagné
(`etudes/2026-10-08/aide-parentale.md`, § 6). Chaque PR reprend son parcours dans son propre plan
(`.claude/rules/plans-and-agents.md`) ; celui-ci donne la direction et l'ordre.

## Ce qui guide la refonte

- **Deux publics, deux espaces.** Le parent (vouvoyé) gère le foyer et lit la semaine ; l'élève
  (tutoyé) fait ses devoirs. Un écran ne parle qu'à l'un des deux.
- **Le téléphone de la famille, le soir.** En 6e et 5e, la séance se fait sur l'appareil du
  parent ; l'écran se passe de main en main. Le profil actif se voit toujours, et changer de
  profil est un geste explicite.
- **Peu de destinations.** Pas de barre d'onglets : chaque espace a un accueil, d'où partent
  deux ou trois écrans, et chaque écran a un retour visible. Un enfant de 11 ans ne doit jamais
  se demander où il est.
- **Une action principale par écran**, en bas de pouce ; le reste se replie.
- **Tom présent sans être un compagnon** : sa tête à côté de ses messages et sur l'accueil de
  l'élève ; ailleurs, rien. Aucune réaction, aucune célébration (`charte.md`, « Tom »).
- **Les états d'abord** : vide, chargement, erreur, hors ligne, quota atteint se conçoivent avec
  l'écran, pas après.
- **Rien qui n'existe pas** : pas de bouton pour la voix avant le lot 4, pas d'offre payante avant
  le paiement.

## Les parcours

### 1. Le parent entre

*Situation* : le parent a reçu une invitation par e-mail, ouvre le lien sur son téléphone.
*Aujourd'hui* : connexion par code ou clé d'accès, puis « Bienvenue » (prénom) ; la page de
connexion empile deux encadrés et le lien « Tu es élève ? ».
*Après* : une entrée qui dit en une phrase ce qu'est le produit et que la bêta est fermée ; le
code en grands chiffres (police mono), collé automatiquement quand le téléphone le permet
(`autocomplete="one-time-code"`) ; la clé d'accès proposée juste après la première entrée, avec
ce qu'elle change pour lui ; le prénom ; puis directement l'ajout du premier enfant.
*Écrans* : Connexion, Code, Clé d'accès proposée, Prénom, Erreur de connexion.

### 2. Le parent ajoute un enfant

*Situation* : premier soir, ou un deuxième enfant.
*Aujourd'hui* : un formulaire (prénom, classe, mois de naissance, case « mémoire ») ; le champ du
mois s'affiche vide en tirets sur ordinateur (`suivi.md`).
*Après* : trois étapes courtes, une question par écran : le prénom, la classe, le mois de
naissance (deux sélecteurs, mois et année, à la place du contrôle natif). Puis ce que Tom fera et
ne fera pas, et la proposition de la mémoire, expliquée au parent. Enfin, l'étape suivante selon
la classe : « Faire les devoirs avec … » en 6e et 5e, « Relier son téléphone » en 4e et 3e.
*Écrans* : Ajout en trois étapes, Mémoire proposée, Prochaine étape.

### 3. Ce soir : lancer les devoirs

*En 6e et 5e*, sur l'appareil du parent : « Faire les devoirs avec … » passe au profil de
l'enfant, qui choisit « Avec mon parent à côté » ou « Sans mon parent ce soir ». Revenir au
parent demande sa clé ou un code. *Après* : un en-tête qui montre le profil actif et « Changer de
profil » ; un écran « Qui utilise Tom ? » à la place de la page de connexion générique.
*En 4e et 3e*, sur le téléphone de l'enfant : le QR code ou le code à huit caractères. *Après* :
l'écran du parent montre le QR en grand et le code en mono, avec le temps restant ; l'écran de
l'enfant (« Relier cet appareil ») dit ce que son parent verra, avant de valider.
*Écrans* : En-tête de profil, Qui utilise Tom ?, Retour au parent, Jumelage (parent), Relier cet
appareil (enfant).

### 4. L'élève arrive

*Situation* : l'enfant ouvre l'app, seul ou à côté de son parent.
*Aujourd'hui* : l'accueil mêle les séances, la semaine, la mémoire et « Tes appareils reliés ».
*Après* : à la première ouverture, deux écrans, dans ses mots : Tom est un programme qui pose des
questions et ne donne pas la réponse ; ce que son parent voit (la semaine) et ne voit pas (les
conversations). C'est l'information adaptée à l'âge que demande la CNIL (recommandation 6), et le
moment où l'enfant accepte ou non la mémoire proposée par son parent (le double consentement).
Ensuite, l'accueil : un grand bouton pour ouvrir une séance, les séances récentes, et en bas
« Ce que Tom retient » et « Ta semaine ».
*Écrans* : Première ouverture (2), Accueil de l'élève, Ce que Tom retient.

### 5. La séance

*Situation* : l'écran le plus vu ; l'élève écrit, photographie son énoncé, attend, lit Tom.
*Aujourd'hui* : refait le 2026-10-09 (champ en bas, photo, attente expliquée, formules) ; restent
les flèches de défilement des formules (`suivi.md`).
*Après* : son apparence sur la charte. La bulle de l'élève et le texte de Tom, sa tête dans la
marge ; le champ en bas, avec la photo ; l'attente qui dit l'étape en cours et sa durée ; les
pistes « Pour vous, parent » distinguées du texte de Tom ; les formules sans flèches. Le
comportement de Tom (ses réponses, la voix) reste au lot 4.
*Écrans* : Séance, Photo (aperçu avant envoi), Quota du jour atteint.

### 6. La semaine

*Situation* : le parent, le dimanche soir ; l'élève, quand il veut.
*Aujourd'hui* : le résumé (matières, temps, ce qui résiste, une question à poser) dans la fiche
enfant et sur l'accueil de l'élève.
*Après* : un écran à part, le même texte des deux côtés, avec ce qui résiste au surligneur ; côté
parent, la question à poser à l'enfant mise en avant ; côté élève, l'arrêt du résumé à sa
demande, avec ce que cela change (`tuteur.md`).
*Écrans* : Semaine (parent), Ta semaine (élève).

### 7. Le compte et les données

*Après* : côté parent, « Mon compte » (prénom, adresse, clés d'accès, déconnexion), « Le
foyer » (enfants, second parent), « Les données » (ce qui est gardé, l'export, la suppression
de l'enfant ou du compte), avec des confirmations dans la page plutôt que des fenêtres. Côté
élève, ses appareils reliés et un mot pour signaler un appareil inconnu à son parent.
*Écrans* : Mon compte, Le foyer, Les données, Tes appareils.

### 8. Le second parent

*Situation* : l'autre titulaire de l'autorité parentale veut voir la semaine, ou s'opposer.
*Après* : le premier parent l'invite par son adresse ; le second entre par le parcours 1, voit le
foyer et la semaine, et peut retirer un consentement (la mémoire) ; chacun voit qui a fait quoi.
Le double consentement sous 15 ans engage les deux (`decisions.md`, « Le second parent »).
*Écrans* : Inviter un parent, Invitation reçue, Consentements du foyer.

### 9. Le paiement

*Après le choix du fournisseur et du statut juridique* (`decisions.md`, « Ouvertes ») : Gratuit et
Complet expliqués en coût réel ; le quota du jour atteint dit quand il revient et ce que change
Complet ; l'abonnement sans piège (sans engagement, prévenu avant chaque prélèvement, résiliable
en deux gestes). *Écrans* : Offres, Paiement, Abonnement, Quota atteint.

## Les composants

À construire dans `@repo/ui` avant les écrans, chacun avec ses états (repos, focus, désactivé,
erreur) en clair et en sombre : l'en-tête de l'espace (profil actif, retour) ; la page et ses
sections ; la carte et la ligne de liste ; l'état vide ; le message d'erreur et l'avis ; la
confirmation dans la page ; les étapes d'un formulaire ; le sélecteur mois-année ; le champ de
code (mono, collage automatique) ; le message de Tom et la bulle de l'élève ; le champ de la
séance. Icônes : Lucide, déjà installé, au trait de 1,75, jamais seules sans texte.

## Les rendus de Tom

Faits dans Blender en arrière-plan depuis `tom.blend` (`charte.md`), quand l'écran qui les montre
se construit :
- la tête actuelle, à côté de ses messages et sur l'accueil de l'élève : elle suffit ;
- Tom en pied, neutre, pour la première ouverture de l'élève (parcours 4) ;
- Tom qui lit, pour l'attente de la séance (parcours 5) ;
- Tom au trait, en une couleur, pour les icônes et le logo, une fois le nom choisi.

## L'ordre des PR

En cascade, chacune vue dans Chrome à 390 px, en clair et en sombre, avec ses tests e2e :
1. Les composants et l'en-tête des espaces.
2. Le parent entre (parcours 1).
3. Le parent ajoute un enfant, la fiche de l'enfant (parcours 2).
4. Les profils sur l'appareil de la famille et le jumelage (parcours 3).
5. L'élève arrive, ce que Tom retient (parcours 4).
6. La séance (parcours 5).
7. La semaine (parcours 6).
8. Le compte et les données (parcours 7).
9. Le second parent et le double consentement complet (parcours 8).
10. Le paiement (parcours 9), après le fournisseur et le statut juridique.

Le nom du produit n'apparaît que dans l'entrée du parent et le titre des pages : il s'y pose
quand il est choisi, sans bloquer les PR 1 et 3 à 10.

## Questions ouvertes

- Le lien d'invitation du second parent, et ce qu'il peut faire d'autre que retirer un
  consentement : à trancher dans le plan de la PR 9, avec l'avis d'un conseil sur l'autorité
  parentale (`etudes/2026-10-07/foyer-eleve-age.md`, § 8).
- Le fournisseur de paiement et le statut juridique (`decisions.md`, « Ouvertes »).
