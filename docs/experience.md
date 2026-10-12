# Expérience

Les espaces de Catiche, ce que chacun montre et d'où vient chaque donnée : la cible, que l'app
rejoint écran par écran au lot 1 (`roadmap.md`, `suivi.md`). Des repères pour concevoir les
écrans, pas leur maquette : la composition et le style viennent de la charte
(`charte.md`), le pourquoi de `vision.md` et de `etudes/2026-10-12/refonte-produit.md`. Chaque
PR qui construit un écran précise le reste dans son plan.

## Pour tous les écrans

- **Une seule identité**, du site à l'app : mêmes couleurs, mêmes fontes, même Tom.
- **Composé au téléphone et à l'ordinateur** : une colonne au téléphone, une vraie mise en page à
  l'ordinateur (tableau de bord sur la largeur, formulaire d'entrée à côté de ce que fait
  Catiche).
- **Une navigation visible** : chaque espace connecté a un en-tête (le logo, le profil actif, le
  compte) et ses onglets, deux à cinq, icône et libellé d'un mot, en bas au téléphone, sur le côté
  à l'ordinateur ; chaque écran secondaire a son retour ; jamais de menu caché seul.
- **Les états conçus avec l'écran** : vide (ce qui viendra et l'action qui le remplit), chargement
  (rien sous une seconde, un squelette au-delà), erreur (au champ, avec quoi faire), hors ligne,
  quota atteint.
- **Des graphiques qu'un parent lit sans effort** : le message en une phrase, des barres partant de
  zéro et étiquetées, le temps de la semaine jour par jour en barres verticales, les matières en
  barres horizontales triées ; jamais d'anneau ni de camembert ; un tableau des valeurs pour les
  lecteurs d'écran (`charte.md`).
- **Des listes pour ce qui se ressemble** (séances, notions, appareils), une carte pour un bloc à
  part ; un seul bouton principal par écran ; une question par écran dans un formulaire.
- **Le parent vouvoyé, l'élève tutoyé** ; un écran ne parle qu'à l'un des deux.
- **Un réglage « Lecture aérée »**, aux espacements de WCAG 1.4.12 (`charte.md`).
- **Prouvé au téléphone et à l'ordinateur** : la suite e2e reçoit un projet à l'ordinateur avec
  les premiers écrans composés pour lui.
- **Tom en 2D au trait** dans l'app, petit, jamais près de l'énoncé, sans émotion qui réagit à
  l'élève ; la 3D sur le site.
- **Aucune donnée inventée** : chaque chiffre affiché se calcule depuis les séances, les messages
  et les exercices ; rien de nouveau n'est collecté pour les tableaux de bord.

## Le site

La vitrine (`apps/landing`), sur le domaine du produit : ce que fait Catiche, pour qui, ce
qu'on prouve, l'offre. « Se connecter » dans l'en-tête mène à l'entrée de l'app, par un simple
lien : le site n'appelle ni le serveur ni l'authentification. Tant que la bêta est fermée, il le
dit, et l'entrée de l'app aussi.

## L'entrée

- **Connexion** : le logo, Tom, une phrase de ce que fait Catiche ; deux portes nettes,
  « Je suis parent » (l'adresse, puis le code reçu, ou la clé d'accès) et « Je relie mon
  appareil » (le code donné par le parent, ou le QR code). L'adresse d'abord, la clé d'accès
  proposée par le navigateur ; le code reçu, à usage unique, qui expire, avec un renvoi.
- **Relier un appareil** : le parent voit qu'il autorise l'appareil de son enfant ; un code court,
  en groupes, sans caractère ambigu, qui expire vite ; chaque appareil relié paraît dans les deux
  espaces et se déconnecte.
- **Première entrée du parent** : son prénom, la clé d'accès proposée, puis l'ajout du premier
  enfant.
- **« Qui utilise Catiche ? »** sur l'appareil de la famille : chaque enfant que l'appareil tient,
  et l'entrée du parent.

## L'espace du parent

Onglets : « Accueil » (le tableau de bord) et « Compte » ; chaque enfant s'ouvre depuis
l'accueil.

- **Tableau de bord** : un bloc par enfant, avec
  - le temps de la semaine, jour par jour, et sa comparaison aux semaines précédentes ;
  - les matières travaillées ;
  - les notions de son programme travaillées, celles qui résistent, celles qui ont cédé ;
  - une question à poser, tournée vers sa façon de chercher, pas vers l'exercice ;
  - la prochaine étape quand il y en a une (relier son téléphone, faire les devoirs avec lui).
  Jamais les conversations, jamais un taux de réussite, jamais une comparaison entre enfants.
- **Fiche d'un enfant** : ses semaines dans le détail, ses appareils, la mémoire proposée, son
  prénom et sa classe.
- **Le point de la semaine** par e-mail, le même contenu que le tableau de bord, lisible sans se
  connecter ; le parent le coupe d'un clic.
- **Compte et données** : prénom, adresse, clés d'accès, second parent, ce qui est gardé,
  l'export, la suppression ; l'abonnement, et « Résilier votre contrat » en ligne, avec un
  récapitulatif, une confirmation et un e-mail qui donne la date de fin.

## L'espace de l'élève

Onglets : « Accueil », « Séances », « Programme », « Semaine » ; ce que Tom retient et ses
appareils s'ouvrent depuis son profil, dans l'en-tête.

- **Accueil** : Tom, la séance à reprendre ou à ouvrir, ses dernières séances.
- **Séances** : toutes ses séances, rangées par matière.
- **Mon programme** : les notions de son année, par matière, celles déjà travaillées, celles
  qui résistent, celles qui ont cédé ; ni note, ni pourcentage, ni comparaison. Il couvre les
  matières du référentiel (`apps/server/src/referential/`).
- **Ma semaine** : le même résumé que son parent lit, dit à l'élève ; il peut demander que son
  parent ne le reçoive plus, avec le consentement, et à partir de 15 ans sa demande s'applique,
  le parent prévenu (`tuteur.md`).
- **Ce que Tom retient** : la mémoire, à lui, effaçable.
- **Mes appareils** : ses appareils reliés, et un mot pour signaler un appareil inconnu.

## La séance

L'écran le plus vu : la bulle de l'élève, le texte de Tom avec sa tête à côté, le champ en bas
avec la photo, l'attente qui dit l'étape en cours et sa durée, les pistes « Pour vous, parent »
en 6e et 5e, les formules ; le quota du jour quand il est atteint. Le comportement de Tom est au
lot 4 (`roadmap.md`).
