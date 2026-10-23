# L'application cible : le parcours et les textes

Étape 1 du chantier « l'application cible » (`docs/etat.md`, « Prochain chantier »). Ce document
fixe, avant tout code, ce que chacun doit pouvoir faire (les user stories), puis par quels écrans
et avec quels mots. Les étapes 2 à 5 le construisent ; chacune retire d'ici ce qu'elle a mis dans
le code, qui fait foi ensuite. La dernière le supprime.

Relu le 2026-10-23 par sept lecteurs sans contexte : un adulte en garde alternée, un collégien de
5ᵉ, un vérificateur des faits et de la charte, un expert UX et accessibilité, un expert de la
simplicité, puis deux tests de tâches sur la carte des écrans (une élève de 6ᵉ, une grand-mère
de 71 ans). Leurs constats retenus sont intégrés.

## Décisions de Victor

- **2026-10-23** : la refonte de l'app, sa voix et la soirée forment un seul chantier, conçu une
  fois sur le parcours final.
- **2026-10-23, le modèle de famille** : plusieurs adultes, deux foyers. Chaque adulte a son
  compte. Le représentant légal qui ajoute un enfant peut inviter un autre adulte. Les
  représentants légaux décident ; les autres adultes reçoivent la soirée montrée. Un enfant peut
  avoir deux maisons.
- **2026-10-23, le fond** : la section « Questions tranchées », en fin de document.
- **2026-10-23, la simplicité** : des user stories d'abord ; une navigation comprise par un enfant
  et par un adulte peu habitué aux écrans ; le moins d'écrans et de choix possible.
- **2026-10-23, qui est connecté** (après l'essai de l'app : « on comprend pas si on est connecté
  ou non, à qui », « on comprend pas les clés d'accès ») : le prénom de l'adulte en haut de
  chacun de ses écrans, un retour nommé comme l'écran où il mène, « Votre compte » qui dit d'abord
  à qui il est, et une clé d'accès expliquée par ce qu'elle évite : attendre un e-mail.
- **Avant** : le point du soir (`produit.md`, 2026-10-21) ; la déclaration du majeur et du
  représentant légal, qui vaut consentement parental, avec une vérification proportionnée sans
  pièce d'identité (CNIL) (2026-10-21) ; l'espace de l'enfant ouvert par son
  propre code (`tuteur.md` § 8) ; les comptes sur invitation ; les deux voix (`charte.md`).

## 1. Les personnes et les cas

**L'élève**, de la 6ᵉ à la 3ᵉ. Il travaille sur son téléphone, sur une tablette, ou sur
l'ordinateur de la famille, qu'il partage parfois avec un frère ou une sœur. Il n'a pas d'adresse
e-mail sur Catiche : il entre par son prénom et son code.

**Les adultes.** Deux rôles, et seulement deux :

- **Parent ou tuteur** (le représentant légal) : il déclare exercer l'autorité parentale, ou une
  tutelle, sur cet enfant. Il décide pour lui (§ 3).
- **Proche** : un beau-parent, un grand-parent, une assistante familiale, un voisin qui garde le
  soir. Il reçoit la soirée que l'enfant lui montre, et voit les soirs où l'enfant a travaillé.

L'enfant ne voit jamais ces deux mots : il voit des prénoms.

**Les cas que le parcours doit tenir** :

| Cas | Ce qui doit marcher |
|---|---|
| Léa, 5ᵉ, en garde alternée : une semaine chez sa mère Nadia, une chez son père Karim | Les deux sont parents. Chacun voit ce que l'autre change. Ce mardi, chez son père, elle lui montre sa soirée. |
| Noah, 4ᵉ, vit avec sa mère et son beau-père, qui rentre le premier | Le beau-père est un proche. Il reçoit la soirée et fait le geste demandé. |
| Inès, 6ᵉ, gardée le mercredi par sa grand-mère Monique | Monique est une proche, peu à l'aise avec les écrans. Inès travaille sur la tablette de la maison. |
| Sami, 3ᵉ, en famille d'accueil | L'assistante familiale est une proche ; un parent ou tuteur ouvre le compte (question tranchée 4). |
| Un adulte rentré tard | Il voit la soirée quand il arrive ; l'enfant trouve sa réponse le lendemain. |
| Aucun adulte disponible ce soir | La soirée reste à l'enfant, sans reproche. |
| Les devoirs sont un conflit à la maison | L'adulte peut arrêter de recevoir la soirée, puis reprendre ; l'enfant garde la sienne. |
| Deux enfants, un ordinateur | Chacun entre par son prénom et son code, et quitte quand il a fini. |

## 2. Les user stories

Chaque story dit qui, quoi et pourquoi, puis quand elle est réussie. Les écrans du § 5 n'existent
que pour elles ; un écran qu'aucune story ne demande est retiré. Les étapes qui les construisent
sont au § 8.

### L'enfant

- **E-1. Entrer la première fois.** En tant qu'élève, je veux entrer sur ma tablette avec le code
  que ma mère m'a donné, pour avoir mon espace à moi. *Réussie quand* : il suffit d'un code de
  départ (ou du carré à viser) puis de choisir mon code, en 3 écrans au plus.
- **E-2. Revenir.** Je veux toucher mon prénom et taper mon code, sans rien d'autre à chercher.
- **E-3. Code oublié.** Je veux pouvoir repartir quand j'ai oublié mon code. *Réussie quand* :
  l'écran de mon code me dit à qui demander un code de départ, et m'ouvre la case pour le taper
  quand je l'ai.
- **E-4. Dire mes devoirs.** Je veux dire ce que j'ai ce soir, en écrivant ou à voix haute, pour
  ne rien oublier. *Réussie quand* : chaque devoir dit apparaît dans mon plan, et je peux le
  corriger.
- **E-5. Choisir l'ordre.** Je veux changer l'ordre de mes devoirs quand je veux, pas seulement
  quand Tom le propose.
- **E-6. Avancer étape par étape.** Je veux savoir ce que je fais maintenant et dire quand c'est
  fini. *Réussie quand* : le bouton dit ce qui est fini (« J'ai fini : exercice 3 »).
- **E-7. Demander de l'aide.** Quand je bloque, je veux un bouton « Je bloque », pour que Tom
  m'aide sans me donner la réponse.
- **E-8. Préparer demain.** Je veux savoir ce qui reste et ce qu'il faut dans mon cartable.
- **E-9. Dire où j'en suis.** Je veux choisir à quel adulte je dis où en sont mes devoirs, et lui
  demander quelque chose (un mot à signer). *Réussie quand* : un seul toucher suffit ; je peux
  aussi le garder pour moi.
- **E-10. Faire une pause et quitter.** Je veux arrêter et quitter sans rien perdre, et sans que
  mon frère voie mes devoirs. *Réussie quand* : l'écran me dit que mon plan reste là, et personne
  ne rentre après moi sans mon code.
- **E-11. Savoir qui voit quoi.** Je veux savoir ce que mes adultes voient, en une phrase, là où je
  le cherche.
- **E-12. Faire oublier Tom.** Je veux que Tom oublie ce qu'il retient, et savoir ce qui reste.
- **E-13. Mes contrôles.** Je veux que mes contrôles annoncés reviennent les jours d'avant
  (étape 5).

### Le parent ou tuteur

- **P-1. Entrer la première fois.** En tant que parent invité, je veux ouvrir le compte de mon
  enfant en quelques minutes, sans mot de passe ni code à recopier. *Réussie quand* : je touche
  le bouton de l'e-mail d'invitation, je remplis un écran pour moi et mon enfant, un écran pour
  son appareil, et j'arrive à l'accueil. Trois écrans, rien à retenir.
- **P-2. Revenir sans effort.** Je veux rester connecté sur mon téléphone, et entrer par un lien
  reçu par e-mail quand il le faut, sans course contre la montre. *Réussie quand* : sur chaque
  écran, je vois sous quel prénom je suis entré, et « Votre compte » me dit avec quelle adresse.
- **P-3. Relier l'appareil de mon enfant**, ce soir ou à l'avance (pour l'ordinateur de sa
  grand-mère).
- **P-4. Lire la soirée.** Je veux voir ce que mon enfant me montre et faire le geste demandé.
  *Réussie quand* : si un autre adulte s'en occupe déjà, je le vois.
- **P-5. Écrire un mot** à mon enfant après sa soirée.
- **P-6. Savoir s'il a travaillé**, chez moi ou chez son autre parent, sans lire ses
  conversations.
- **P-7. Inviter l'autre parent, ou un proche.**
- **P-8. Être prévenu de ce que l'autre parent change**, et pouvoir m'y opposer.
- **P-9. Régler un problème** : code oublié, appareil bloqué. *Réussie quand* : un appareil
  bloqué vient à moi sur l'accueil, je n'ai pas à le chercher.
- **P-10. Proposer la mémoire de Tom**, ou la retirer.
- **P-11. Arrêter de recevoir la soirée, puis reprendre.**
- **P-12. Supprimer le compte de mon enfant, ou le mien.**

### Le proche

- **R-1. Accepter l'invitation** et comprendre tout de suite pour quel enfant et pourquoi.
  *Réussie quand* : un bouton dans l'e-mail, un écran qui dit « Nadia vous invite pour Léa », et
  j'arrive à l'accueil.
- **R-2. Lire la soirée et répondre**, comme P-4 et P-5.
- **R-3. Savoir ce que je ne peux pas faire**, et à qui le demander (relier un appareil).
- **R-4. Faire une pause** pendant les vacances, puis reprendre ; ou me retirer.

## 3. Le modèle de famille

Ce sont des règles. Le lien entre un adulte et un enfant, son rôle et l'invitation d'un adulte
sont en place (`apps/server/src/modules/household`, `docs/architecture.md`) ; l'historique vient
avec « Gérer ».

**Un enfant a un ou plusieurs adultes.** Le « foyer » disparaît des mots et des écrans : chaque
adulte voit les enfants qui le concernent. Deux maisons, c'est un enfant avec deux parents. Un
adulte peut avoir plusieurs enfants, de familles différentes.

**Qui peut quoi :**

| Geste | Parent ou tuteur | Proche | Enfant |
|---|---|---|---|
| Ajouter l'enfant, avec la déclaration | oui | non | non |
| Inviter un adulte pour cet enfant | oui | non | non |
| Retirer un proche | oui | lui-même | non |
| Retirer un autre parent | non | non | non |
| Donner un code de départ (appareil, code oublié) | oui | non | non |
| Débloquer ou retirer un appareil | oui | non | non |
| Proposer ou retirer la mémoire de Tom, avant 15 ans | oui | non | l'accepte ou non, peut l'arrêter |
| La mémoire de Tom, à partir de 15 ans | non | non | décide seul |
| Changer le prénom ou la classe | oui | non | non |
| Supprimer le compte de l'enfant | oui (question tranchée 1) | non | non |
| Voir les soirs où l'enfant a travaillé | oui | oui | oui |
| Recevoir la soirée | si l'enfant la lui montre | si l'enfant la lui montre | choisit à qui |
| Arrêter de recevoir la soirée, puis reprendre | oui | oui | non |
| Voir ce qu'un autre adulte a changé | oui | non | ce qui le touche |
| Lire les conversations avec Tom | jamais | jamais | oui |

**Inviter un adulte** : construit (A8, `apps/server/src/modules/household/service.ts`), sauf
ceci : l'enfant le voit à sa prochaine entrée.

**L'historique.** Chaque geste d'un parent sur l'enfant s'inscrit dans l'historique, sur la page
« Gérer » : qui, quoi, quand, sur 90 jours. Un geste qui compte est aussi envoyé par e-mail aux
autres parents : un adulte ajouté, la mémoire retirée, un code de départ pour un code oublié, une
suppression demandée.

**La soirée montrée.** À la fin de sa soirée, l'enfant choisit à quels adultes la montrer, parmi
ceux qui la reçoivent. Aucun n'est choisi d'avance : chaque prénom est un bouton. En 6ᵉ et en 5ᵉ,
Catiche propose de la montrer à la fin de chaque soirée ; en 4ᵉ et en 3ᵉ, l'enfant choisit de le
faire (`produit.md`). Quand un adulte touche « Je m'en occupe », les autres voient qu'il s'en
occupe.

**Le consentement.** Avant 15 ans, il faut l'accord d'un parent et celui de l'enfant. Pour la
CNIL, l'accord d'un seul parent suffit, celui de l'autre étant présumé ; l'autre doit pouvoir s'y
opposer, et le service doit lui en donner le moyen
([CNIL, recommandation 4](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans)).
Donc : la déclaration d'un parent suffit ; un autre parent invité est prévenu des changements, et
peut retirer la mémoire ou annuler une suppression ; un parent sans compte s'oppose en écrivant à
`contact@catiche.fr`, ce que la politique de confidentialité dit (étape 2) ; aucun parent ne peut
retirer l'autre.

## 4. La navigation

**Pas d'onglets.** Chaque rôle n'a qu'un écran où il revient : l'enfant, « Ce soir » ; l'adulte,
l'accueil avec une carte par enfant. Tout le reste s'ouvre depuis là et se referme par un bouton
« ← » qui nomme où il ramène, avec le mot du titre de cet écran : côté adulte, « ← Vos enfants »,
puisque l'accueil s'intitule « Suivez les devoirs de vos enfants ». C'est un écart à `charte.md`
(« des onglets en bas » au téléphone, « la navigation sur le côté » à l'ordinateur) : la PR de ce
document met la charte à jour, les onglets ne servant que pour plusieurs destinations fréquentes.

**Qui est connecté** : construit côté adulte (`AdultPage`, `apps/web/src/components/page.tsx`).
Côté enfant, le titre de « Ce soir » porte déjà son prénom (E4). Personne n'a à deviner sous quel
compte il est entré.

**Les tailles** : téléphone et tablette en portrait, une colonne ; tablette en paysage et
ordinateur, la même page sur deux colonnes, sans barre de côté.

**Un appareil pour plusieurs personnes** (la tablette de Monique, l'ordinateur de la famille) :
« Quitter », pour l'enfant comme pour l'adulte, ramène toujours à « Qui fait ses devoirs ? », où
chacun reprend sa place : un prénom, ou « Je suis un adulte ». Un adulte entré sur un appareil qui
porte un enfant y reste connecté peu de temps (10 minutes sans rien faire, comme aujourd'hui).

**L'enfant :**
```
Ouvrir Catiche
├─ l'appareil connaît des prénoms → « Qui fait ses devoirs ? » → [Prénom] → Ton code → Ce soir
├─ « Première fois ici ? J'ai un code de départ » → Ton code de départ → Choisis ton code → Ce soir
└─ « Je suis un adulte » → l'entrée de l'adulte
Ce soir
├─ « Commencer mes devoirs » / « Reprendre mes devoirs » → La soirée (plein écran)
│    └─ « ← Pause » → Ce soir
├─ en haut : « Mes réglages » → Mes réglages → Ce que Tom retient
└─ en haut : « Quitter »
```

**L'adulte :**
```
Ouvrir Catiche
├─ la première fois : bouton de l'e-mail d'invitation → Vous et votre enfant → Son appareil → Accueil
├─ ensuite : déjà connecté → Accueil
└─ sinon : Entrez dans Catiche → bouton de l'e-mail (ou son code) → Accueil
Accueil : une carte par enfant
├─ « Lire son message » (quand l'enfant en a envoyé un) → Le message de [prénom]
├─ « Gérer » (parent) ou « Ses devoirs et ses messages » (proche) → Gérer [prénom]
├─ une carte d'alerte quand il le faut (appareil bloqué, suppression demandée)
├─ « Ajouter un enfant »
└─ en haut : « [Prénom] » → Votre compte ; « Quitter »
```

## 5. Les écrans

**Les voix** : Catiche vouvoie l'adulte et tutoie l'enfant dans les boutons, les erreurs et les
réglages ; Tom tutoie dans ses bulles, et seulement là. Les boutons de l'enfant parlent à la
première personne (« Commencer mes devoirs », « Mes réglages »). Hors de la soirée, le dessin de
Tom ne parle pas. Côté enfant, des tournures sans genre.

**Les mots qui disent ce qui se passe** (Victor, 2026-10-23 : « soirée » n'est pas évocateur) :
« la soirée » et « le point du soir » sont des mots de ce document, jamais de l'écran. L'écran dit
« tes devoirs » ou « tes devoirs du soir » ; ce que l'enfant dit à un adulte est « un message »
(« Envoyer à Karim », « Léa vous dit où en sont ses devoirs »). Un mot de l'écran dit
ce que la personne fait, pas le nom d'une fonction.

**Les titres** ont un verbe, ou sont une question (`charte.md`).

**Les noms**, partout les mêmes :
- **« ton code »** : les 6 chiffres que l'enfant choisit ;
- **« le code de départ »** : 8 lettres et chiffres qu'un parent obtient pour relier un appareil
  ou après un code oublié, montré aussi comme « un carré à viser avec l'appareil photo » ;
- **« le code reçu par e-mail »** : celui de l'adulte, avec le lien qui fait entrer sans le taper ;
- **« appareil »** quand on ne sait pas si c'est un téléphone, une tablette ou un ordinateur.

**Rien ne se perd** : la soirée est gardée à chaque geste. « Pause », « Quitter », une fermeture
pour inactivité ou une coupure d'internet la retrouvent là où elle était.

**La confirmation récente**, pour les gestes sensibles de l'adulte (ajouter un appareil, un code
de départ après un oubli, créer une clé d'accès, la suppression d'un compte ; A4, A5, A7, A9) :
une entrée de moins de
10 minutes suffit ; au-delà, l'écran le dit avant le geste (« Pour confirmer, nous allons vous
envoyer un e-mail. »), puis y revient seul.

**L'inactivité, sur un appareil partagé** : l'espace se ferme après 10 minutes sans rien faire, et
au plus tard après 2 heures (`SHARED_MINUTES`, aujourd'hui). Pendant une étape de la soirée, le
délai passe à 30 minutes : l'élève travaille sur papier. Une minute avant, un avertissement qui
vibre ou sonne quand l'appareil le permet : « Ton espace va se fermer. Ton plan reste
là. » avec « Je suis encore là ». Sur un appareil personnel, rien ne se ferme.

### Les écrans communs

**C1. Erreur générale** (remplace `Failure`). Sans pronom.
- Titre : « La page ne s'est pas affichée » ; texte : « Internet a peut-être coupé. »
- Bouton principal : « Réessayer » ; lien : « Revenir à l'accueil »

**C2. Qui fait ses devoirs ?** (l'entrée ; remplace `/profils` et l'écran sans profil).
- Titre : « Qui fait ses devoirs ? »
- Les prénoms des enfants de l'appareil, en grandes cartes alignées avec le titre (aujourd'hui,
  le titre est à gauche et les prénoms au centre). Sous un prénom bloqué : « Bloqué ici. Demande à Nadia ou à Karim. »
- Deux grands boutons sous les prénoms (seuls, quand l'appareil n'en connaît pas) : « Première fois
  ici ? J'ai un code de départ » ; « Je suis un adulte ».

### L'enfant

**E1. Ton code de départ** (`/activer`).
- Titre : « Entre ton code de départ »
- Texte : « 8 lettres et chiffres, donnés par l'adulte qui a créé ton espace. »
- Champ, qui accepte minuscules, espaces et collage, et affiche « ABCD EFGH ».
- Bouton principal : « Continuer » ; second : « Viser le carré avec l'appareil photo ».
- Erreur : « Ce code ne marche pas, ou il a expiré. Demande un nouveau code de départ. »

**E2. Choisis ton code.**
- Titre : « Choisis ton code » ; sous-titre : « 6 chiffres que personne d'autre ne connaît. »
- À côté : « Nadia et Karim ne voient ni ton code, ni tes conversations avec Tom. »
- Seconde saisie : « Tape-le encore une fois »
- Puis, sauf sur l'ordinateur ajouté par un parent, une question à laquelle il faut répondre :
  « Quelqu'un d'autre se sert de cet appareil ? » ; « Oui, on le partage » (Catiche se fermera
  quand tu ne t'en sers plus) ; « Non, il est à moi ».
- Bouton qui valide chaque saisie : « Valider ».
- Erreurs (le code trop facile, dès la première saisie) : « Ce code est trop facile à deviner.
  Évite les suites et les chiffres répétés. » ; « C'est ta date de naissance. Choisis un autre
  code. » ; « Les deux codes sont différents. Recommence. » ; « Le temps est passé. Demande un
  nouveau code de départ. »

**E3. Tape ton code.**
- Titre : « [Prénom], tape ton code »
- Liens : « Ce n'est pas moi » ; « J'ai oublié mon code », qui prévient Nadia et Karim (une carte
  sur leur accueil) et dit : « Nadia et Karim sont prévenus. Quand ils te donnent un code de
  départ, touche ici. » avec le bouton « J'ai un code de départ » (vers E1).
- Erreurs : « Ce n'est pas ton code. Réessaie. » ; après trop d'essais, un seul message, que
  l'espace soit bloqué ici ou le code arrêté partout : « Ton code ne marche plus ici. Nadia et
  Karim sont prévenus. » (l'accueil des parents dit lequel des deux, et quoi faire).
- Une soirée en cours : « Tes devoirs t'attendent là où tu les as laissés. »

**E4. Ce soir** (l'écran où l'enfant revient).
- En haut : « Mes réglages », « Quitter ».
- Titre : « [Prénom], voici tes devoirs du soir »
- **Une seule carte « Depuis ta dernière visite »**, quand il y a du nouveau, avec « Vu » :
  « Karim peut maintenant recevoir tes messages. » ; « Ton code a été changé le [date]. » ; « Un
  nouvel appareil ouvre ton espace : tablette, le [date]. »
- **Avant** : « Dis à Tom ce que tu as ce soir. Il t'aide à choisir par où commencer. » ; bouton
  principal « Commencer mes devoirs » ; le dessin de Tom au trait, sans bulle. Dessous,
  « Bientôt » : les contrôles annoncés (étape 5).
- **Pendant** : l'étape en cours, bouton principal « Reprendre mes devoirs ».
- **Après** : ce qui est fait, ce qui reste et pour quand, le cartable ; « Message envoyé à
  Karim » ; sa réponse (« Karim s'occupe du mot à signer. ») et son mot.
- La mémoire de Tom proposée : une carte, une fois (E7).
- « Quitter » demande : « Quitter Catiche ? Ton plan reste là. Personne d'autre ne peut l'ouvrir
  sans ton code. » ; « Quitter » ; « Rester ».

**E5. La soirée** (plein écran).
- En haut : « ← Pause » et une bande de progression nommée, la phase en cours marquée :
  « Noter · Ordre · Étapes · Cartable · Dire ».
- Au téléphone et sur une tablette en portrait, le plan tient en une ligne fixe (« 3 devoirs ·
  Maths : exercice 3, page 45 ») qui l'ouvre ; pendant « Noter » et « Ordre », il est ouvert en
  grand, chaque devoir avec « Monter » et « Descendre ». En paysage et à l'ordinateur, la
  conversation à gauche et le plan à droite.
- Le champ « Écris ici » avec « Envoyer », puis « Parler » et « Photo », au même niveau. Le micro se touche pour
  commencer et pour arrêter (« Tom écoute. Touche pour arrêter. ») ; ce qui est dit arrive dans le
  champ, modifiable. Micro absent : « Le micro n'est pas disponible. Écris ta réponse. »
- Le plan se réordonne à tout moment, par « Monter » et « Descendre » sur chaque devoir, ou en
  glissant.

Les phases :

1. **Noter.** Premier message de Tom, chaque soir : « Je suis Tom, une intelligence
   artificielle. » puis une question qui change (« Qu'est-ce que tu as ce soir ? »). Dessous, une
   fois : « Tom peut se tromper. Vérifie avec ton cours. » Tom demande ce qui manque, une question
   à la fois : « C'est pour quand ? », « Quels exercices ? », « Un contrôle bientôt ? ». Chaque
   devoir s'ajoute au plan. Puis : « Tu as ce qu'il te faut à côté de toi ? » avec la liste des
   affaires, à cocher (`methode.md`, « Vérifier ses affaires », « S'installer »). Bouton
   principal : « C'est tout pour ce soir ».
2. **Ordre.** Tom : « Je propose de commencer par [devoir]. Tu peux changer l'ordre. » Chaque
   devoir dit pour quand et une durée (« environ 20 min »). Bouton principal : « Commencer ».
3. **Étapes.** L'étape en cours en tête. Bouton principal : « J'ai fini : [étape] ». Juste à côté :
   « Je bloque ». Tom : « C'est noté. Étape suivante : [étape]. »
4. **L'aide**, quand l'élève touche « Je bloque », écrit, parle ou envoie une photo : Tom aide
   selon `tuteur.md`. « J'ai fini : [étape] » reste là. Une demande dite à Tom (« il faut que
   maman signe ») s'ajoute aux demandes de la phase « Dire ».
5. **Cartable.** Tom : « Ce soir, tu as fait [liste]. Il reste [liste], pour [jour]. Quels cours
   as-tu demain ? », puis « Dans ton cartable : [liste]. » Le cartable se coche. Bouton
   principal : « Mon cartable est prêt ».
6. **Dire** (le point du soir), avec son titre et « ← Revenir à Tom » :
   - titre : « Dire à un adulte où tu en es ? » ;
   - ce qui part toujours : ce qui reste pour demain, le contrôle qui approche, le cartable ;
   - si tu veux : « Ce que tu as bien réussi » (une étape) ; « Ce que tu demandes » : « Un mot à
     signer », « Une fourniture », « L'heure de demain », « Autre chose » ;
   - un bouton par adulte, « Envoyer à Karim », « Envoyer à Nadia » ; et « Garder pour moi » ;
   - en 4ᵉ-3ᵉ, cette phase ne s'ouvre que si l'élève touche « Dire où j'en suis ».
7. **Fin.** Tom : « C'est tout pour ce soir. Ton cartable est prêt. » Retour à E4.

Les attentes : « Tom lit ta photo, quelques secondes… », « Tom écrit… ». Les erreurs :
- « Tom a assez répondu pour aujourd'hui. Il répondra de nouveau demain. Ton plan et ton cartable
  restent là. » (remplace « Reviens demain ! ») ;
- « Tom répond encore. Attends sa réponse. » ;
- « Trop de messages d'un coup. Attends une minute. » ;
- « Ton message est vide ou trop long. Écris ta question en quelques phrases. » ;
- « La photo est trop lourde. Reprends-la, ou recopie l'énoncé. » ;
- « Tom n'a pas pu répondre. Réessaie dans un instant. »

La réponse de repli de Tom : « Je reprends autrement : où en es-tu dans l'exercice ? » La réponse
de détresse garde ses mots (`charte.md`).

**E6. Mes réglages.** Le titre : « Règle ton espace ». Trois blocs, dans l'ordre où on les
cherche :
- **« Qui voit quoi »** : « Nadia et Karim voient les soirs où tu as travaillé, et les messages
  que tu leur envoies. Ils ne lisent jamais tes conversations avec Tom. »
- **« Ce que Tom retient »** (vers E7).
- **« Tes appareils »** : « Tablette, depuis le [date] » ; « Ordinateur partagé, depuis le
  [date] ». « Tu ne reconnais pas l'un d'eux ? Dis-le à Nadia ou à Karim. »
- L'historique de ce qui le touche, caché tant qu'il est vide.

**E7. Ce que Tom retient.**
- Proposition : « Tom peut se souvenir de ce qui était difficile » ; « D'un soir à l'autre,
  Tom garderait les leçons où tu as bloqué. Il ne garde rien de ce que tu écris. Tu peux tout voir
  et tout effacer. » ; « D'accord », « Non merci ».
- Active : « Tom se souvient des leçons de tes exercices depuis la rentrée. Nadia et Karim voient
  seulement que c'est activé. » Par leçon : « Travaillée 3 fois. La dernière fois : pas encore
  réussie. » ; « J'ai compris ». En bas, deux boutons, chacun avec sa phrase :
  - « Tout effacer » : « Tom oublie tout ce qu'il retient, et recommence à retenir la prochaine
    fois. »
  - « Arrêter » : « Tom oublie tout, et ne retiendra plus rien. »
- Non active, avant 15 ans : « Tom ne se souvient de rien d'un soir à l'autre. Il connaît
  seulement ton prénom et ta classe. Nadia ou Karim peuvent te le proposer. »
- Toujours, en bas : « Pour que tout parte, tes devoirs compris, demande à Nadia ou à Karim de
  supprimer ton compte. »
- À partir de 15 ans : la proposition s'affiche une fois, et c'est toi qui décides.

### L'adulte

**A1. Entrez dans Catiche** et **A2. Ouvrez l'e-mail de Catiche** : construits
(`apps/web/src/routes/connexion.tsx`, l'e-mail dans `apps/server/src/platform/auth/auth.ts`) ; le
bouton de l'e-mail mène à `/entrer`, « Entrez dans Catiche » avec le bouton « Entrer »
(`entrer.tsx`).

**A3. Vous et votre enfant** (la première fois ; un seul écran). Le parent invité par Victor :
construit (`apps/web/src/routes/bienvenue.tsx`, l'invitation dans
`apps/server/src/platform/auth/invitation.ts`), précédé de `/invitation`, « Bienvenue sur
Catiche » avec le bouton « Accepter l'invitation » (`invitation.tsx`). L'adulte invité par un
parent : construit aussi (`bienvenue.tsx`, `InvitedWelcome`).

**A4. Où [prénom] travaille le soir ?** (après A3 pour le parent qui vient d'ajouter l'enfant,
jamais pour un adulte invité ; et depuis « Gérer »).
- Choix : « Sur cet appareil, à côté de moi » ; « Sur un autre appareil : le sien, ou celui d'un
  proche ».
- Cet appareil : « [Prénom] choisit son code maintenant, sur cet écran. Vous ne le verrez
  pas. » Puis E2 sur place. Pas proposé sur un appareil déjà ajouté (aujourd'hui, il l'est encore).
- Autre appareil : le carré à viser et le code de départ (« ABCD EFGH »). « Sur l'autre appareil,
  visez ce carré avec l'appareil photo : Catiche s'ouvre tout seul. Sinon, ouvrez catiche.fr,
  touchez « J'ai un code de départ » et tapez ce code. Il marche une seule fois, pendant
  7 jours. » Le carré porte un lien avec le code, qui mène droit à E2. Boutons : « Partager le
  code » (le partage du téléphone : SMS, WhatsApp) ; « Obtenir un autre code » ; « Aller à
  l'accueil ». Quand l'appareil est relié : « La tablette de [prénom] est ajoutée. »
- Confirmation : la règle commune de « La confirmation récente » (plus haut).

**A5. Accueil** (une carte par enfant, même avec un seul). L'en-tête, le titre et la carte de la
clé d'accès sont construits (`apps/web/src/routes/foyer.index.tsx`,
`components/passkey-offer.tsx`) ; le mot « clé d'accès » reste, car la fenêtre du téléphone
l'emploie ([Google, « Communicating passkeys »](https://developers.google.com/identity/passkeys/ux/communicating-passkeys)).
- Carte d'alerte, en tête, quand il le faut (parent) : « Léa a oublié son code. » avec « Donner un
  code de départ », qui l'affiche tout de suite ; « La tablette de Léa est bloquée après 3 codes
  faux. » avec « Débloquer » ; « Karim a demandé la suppression du compte de Léa. » avec « Voir ».
- Une carte par enfant : prénom, classe, puis ce soir :
  - « Léa vous dit où en sont ses devoirs, et vous demande un mot à signer. » ; bouton principal
    « Lire son message » ;
  - ou « Léa a travaillé ce soir. » ;
  - puis la semaine en une ligne : « Cette semaine, Léa a travaillé lundi, mardi et jeudi. » (chez
    vous ou ailleurs, sans durée ni matière) ;
  - puis « Gérer » (parent) ou « Ses devoirs et ses messages » (proche).
- « Ajouter un enfant » (parent).

**A6. Le message de [prénom]** (le point du soir, reçu).
- Titre : « Léa vous dit où en sont ses devoirs »
- « Léa vous demande » : chaque demande avec « Je m'en occupe ». Touché : « Vous vous en occupez.
  Léa le voit. » ; si un autre adulte l'a fait : « Nadia s'en occupe. »
- « Pour demain » : ce qui reste et pour quand, le contrôle qui approche, le cartable.
- « Ce que Léa a bien réussi », s'il l'a montré.
- Toujours : « Écrire un mot à Léa » (court, envoyé à l'enfant).
- Rien d'autre : pas de note, pas de correction, pas de reste présenté comme un retard.

**A7. Gérer [prénom]** (le proche y arrive par « Ses devoirs et ses messages »).
- En tête : « Vous décidez pour Léa, avec Karim. » (parent) ; « Vous suivez les devoirs de Léa. »
  (proche).
- « Les soirs où Léa a travaillé » : les sept derniers soirs, chez vous ou ailleurs, sans durée
  ni matière.
- « Recevoir les messages de Léa » : un interrupteur, avec « Un e-mail vous prévient quand Léa
  vous écrit. » (coupable à part). Coupé : « Vous ne recevez plus les messages de Léa. Vous pouvez
  reprendre quand vous voulez. »
- Parent seulement :
  - « Ses appareils » : « Ajouter un appareil » (vers A4) ; par appareil, « Débloquer » avec la
    cause, ou « Retirer ce téléphone » (« Léa devra entrer un nouveau code de départ sur cet
    appareil. ») ;
  - « Léa a oublié son code » : « Son code actuel ne marchera plus, nulle part. Avec le code de
    départ que vous allez obtenir, Léa en choisira un nouveau, et verra la date du
    changement. » ; « Obtenir un code de départ » ;
  - « Les adultes de Léa » : construit, sur la page de l'enfant (`foyer.$studentId.tsx`) ;
  - « Plus » (replié) : « Ce que Tom retient » (« Proposer à Léa » ou « Retirer » ; à partir de
    15 ans, « À partir de 15 ans, Léa décide seule. ») ; « Son prénom et sa classe » ;
    « Historique » ; « Supprimer son compte ».
- Proche seulement : « Pour ajouter un appareil, demandez un code de départ à Nadia ou à Karim. »
  « Vous suivez les devoirs de Léa. » et « Me retirer des adultes de Léa » sont construits, sur la
  page de l'enfant.

**A8. Invitez un adulte pour [prénom]** : construit (`foyer.$studentId_.inviter.tsx`, ses e-mails
dans `apps/server/src/modules/household/service.ts`), sauf « Léa en sera prévenue », qui attend les
écrans de l'enfant.

**A9. Votre compte** (par le prénom, en haut de chaque écran de l'adulte). Construit
(`apps/web/src/routes/foyer.compte.tsx`), sauf :
- dans « Vos clés d'accès », chaque clé porte son appareil, aussi précis que le navigateur le dit
  (« Téléphone Android, créée le 3 mars »), et « Supprimer » demande sa confirmation ;
- séparé, en bas : « Supprimer mon compte », avec les conséquences nommées : « Votre compte sera
  effacé. Le compte de Léa le sera aussi : personne d'autre n'est son parent dans Catiche. C'est
  définitif. »

### L'accessibilité, pour tous les écrans

Les règles de `.claude/rules/design-system.md` (contrastes, 44 px, 320 px), plus :
- **les codes** : un seul champ numérique (`inputmode="numeric"`) ; le code reçu par e-mail avec
  `autocomplete="one-time-code"` ; le code de l'enfant masqué, avec « Afficher » ; chaque erreur
  reliée à son champ (`aria-describedby`), le focus y revient ;
- **la soirée** : la conversation est un journal (`role="log"`), un message est annoncé une fois
  fini ; les ajouts au plan passent par une seule région de statut (« Ajouté au plan : maths, pour
  jeudi ») ; chaque message de Tom porte son nom en texte ; la bande de progression dit la phase
  en cours (`aria-current="step"`) ;
- **déplacer un devoir** : la nouvelle place est annoncée (« Histoire, 2 sur 4 »), le focus reste
  sur le devoir ;
- **les cartes** (« Depuis ta dernière visite », alertes) : des statuts, sans prendre le focus ;
- **le mouvement** : rien ne bouge sous mouvement réduit, le texte porte l'information ;
- **le dessin de Tom** : décoratif hors de la soirée (`alt=""`) ;
- **les cases** (affaires, cartable, demandes) : la ligne entière est la cible ;
- **la lecture aérée** de la charte, à l'étape 2.

## 6. Les cas, parcourus

- **Léa, chez son père ce mardi.** Nadia l'a ajoutée (A3) et a invité Karim comme parent (A8) ; il
  a touché « Accepter l'invitation », s'est présenté (A3). Mardi, Léa fait sa soirée (E5) et
  touche « Envoyer à Karim ». Karim lit A6 et touche « Je m'en occupe » sur le mot à signer ; Léa
  le voit sur E4. Nadia voit dans A7 que Léa a travaillé, sans le contenu.
- **Inès et Monique, le mercredi.** Nadia a relié la tablette de Monique depuis chez elle (A4,
  « Partager le code » par WhatsApp, valable 7 jours). Inès entre par C2. Monique a
  reçu l'invitation (« Nadia vous invite sur Catiche, pour Léa »), est entrée par le bouton de
  l'e-mail ; elle reste connectée. Un e-mail la prévient ; elle lit le message, touche « Je m'en
  occupe » sur la fourniture, et écrit un mot. Pendant les vacances, elle coupe « Recevoir les
  messages de Léa », puis les reprend.
- **Noah et son beau-père.** Comme Monique.
- **Sami.** Un parent ou tuteur ouvre le compte (question tranchée 4).
- **L'adulte rentré tard.** Le message attend sur l'accueil ; la réponse arrive à l'enfant le
  lendemain.
- **Aucun adulte.** « Garder pour moi ».
- **Le conflit.** L'adulte coupe « Recevoir les messages » (A7) ; son prénom disparaît des boutons
  d'E5.
- **Le code oublié.** Inès touche « J'ai oublié mon code » (E3) ; Nadia obtient un code de départ
  (A7) et le partage ; Inès touche « J'ai un code de départ », puis choisit un nouveau code.
- **Deux enfants, un ordinateur.** C2, puis E3 pour chacun ; « Quitter », ou la fermeture pour
  inactivité.

## 7. Avant / après

| Aujourd'hui | Dans l'application cible |
|---|---|
| Une colonne `max-w-md` presque partout, ni onglets ni navigation | Un écran où l'on revient, des pages qui s'ouvrent et se referment (§ 4) ; deux colonnes à l'ordinateur |
| Mots techniques : session, verrouillage, bêta fermée, URL brute | Mots des familles ; formule de statut ; un carré à viser |
| Trois codes appelés « code » | Ton code, le code de départ, le code reçu par e-mail |
| Deux façons de relier un appareil, sur deux écrans | Un seul écran, A4, avec deux choix |
| Un code de 10 minutes pour un appareil | 7 jours, une seule fois, à partager ; 10 minutes pour un code oublié |
| « Ajouter cet ordinateur » proposé sur un ordinateur déjà ajouté | Caché (A4) |
| Deux façons de proposer la mémoire | Un seul endroit, A7 ; l'enfant répond sur E4 ou E7 |
| « Changer de profil » et « Se déconnecter » | « Quitter », qui rassure |
| Le retour porte cinq noms | Un « ← » qui nomme où il ramène ; « ← Pause » dans la soirée |
| Le changement de code annoncé deux fois | Une carte « Depuis ta dernière visite » |
| L'élève vouvoyé (`Failure`, erreur du résumé) | C1 sans pronom ; le résumé disparaît à l'étape 4 |
| « Reviens demain ! » | Le message de quota d'E5, dès l'étape 2 |
| « Envoyer » désactivé quand le champ est vide | Toujours actif ; un message vide reçoit son erreur |
| « Partagé · ajouté » / « Partagé · Ajouté » | « Ordinateur partagé, depuis le [date] » |
| Tom réduit à une tête | Tom au trait (étape 2), sur E4 et dans E5 |
| Le résumé de la semaine, et « Ce qui résiste » montré malgré une mémoire refusée, alors que `/memoire` dit le contraire (`core/week-summary.ts`, `routes/memoire.tsx` du web) | Gardé, voix corrigée, jusqu'à l'étape 4 ; puis remplacé par la soirée montrée et « Les soirs où [prénom] a travaillé » |
| La liste des séances | Une soirée par soir (étape 3) |
| « ton parent », au singulier | Les prénoms des adultes |
| Un seul foyer, aucun second adulte | Plusieurs adultes, deux rôles, l'historique (§ 3) |
| Pas de déclaration à l'entrée | A3, horodatée |
| Pas de suppression du compte adulte : le serveur la porte (`POST /api/auth/delete-user`, session de moins de 10 minutes), elle se fait sur demande d'ici là, comme le disent les CGU et la politique de confidentialité | A9 |
| Code oublié et suppression d'un enfant sans confirmation récente | La confirmation récente (§ 5) |
| L'élève ne sait pas qu'un appareil s'ajoute | Carte « Depuis ta dernière visite », et E6 |
| Formules de Tom avec des flèches de défilement sur Chrome de bureau : leur conteneur (`[&_.katex]:overflow-x-auto`, `components/tom-text.tsx`) déborde de 6 px en hauteur | Corrigé dans E5 (étape 3) |
| Tom ne dit pas d'emblée qu'il est une IA ; « on avance ensemble » | Premier message d'E5 ; nouvelle réponse de repli (étape 3) |
| Le micro fermé (`Permissions-Policy`, `platform/http/security-headers.ts`) | Ouvert à `self`, transcription en français (étape 3) |
| Les rôles `accent` et `secondary` du mode sombre pas revus dans l'app | Revus avec le socle (étape 2) |
| La mémoire acceptée « à sa première séance », proposée à l'ajout (`tuteur.md` § 8) | Proposée depuis A7, acceptée sur E4 ou E7 |
| Les offres Gratuit et Complet | À revoir avec la soirée montrée (étape 4) |

## 8. Le découpage des étapes 2 à 5

- **Étape 2, le socle** (stories E-1 à E-3, E-10 à E-12, P-1 à P-3, P-7 à P-10, P-12, R-1, R-3).
  Plusieurs PR, chacune revue en profondeur (découpage revu par Victor le 2026-10-23) :
  1. le modèle de famille (fait, #562) ;
  2. l'entrée de l'adulte et son en-tête : A1, A2, A3 pour le parent invité par Victor, A9 (fait) ;
  3. inviter un adulte, le rôle de proche et ses droits (A8, la liste des adultes) (fait) ;
  4. relier l'appareil de l'enfant, A4, avec le code de départ de 7 jours et le carré à viser ;
  5. l'accueil en cartes (A5 complet), « Gérer » (A7), l'historique, la suppression avec 7 jours
     d'annulation ;
  6. l'enfant (C1, C2, E1 à E4, E6, E7 ; E4 dans son état « Avant », dont le bouton ouvre l'aide
     de Tom actuelle, voix corrigée et message de quota compris) et la navigation.

  Avec : Tom au trait, les
  rôles du mode sombre, la lecture aérée, l'inactivité, la politique de confidentialité pour
  l'opposition d'un autre parent, la charte mise à jour. Le résumé de la semaine reste, voix
  corrigée.
- **Étape 3, la soirée** (E-4 à E-8, P-6) : E5 sauf « Dire », E4 complet, « Les soirs où [prénom] a
  travaillé » dans A7, le prompt de Tom (`tuteur.md` § 5), le micro et la transcription en
  français, les paliers des premiers soirs, les formules, la politique de confidentialité pour la
  voix.
- **Étape 4, le point du soir** (E-9, P-4, P-5, P-11, R-2, R-4) : E5 « Dire », A6, les réponses sur E4,
  « Recevoir les messages » et l'e-mail qui prévient dans A7, la suppression du résumé de la
  semaine et de « Ce qui résiste », la politique de confidentialité pour ces messages, les offres.
- **Étape 5, les contrôles** (E-13) : « Bientôt » sur E4.

À chaque étape, `produit.md`, `tuteur.md` et `architecture.md` suivent dans la même PR. Chaque PR
vérifie ses stories par un test de tâches, comme celui du 2026-10-23 : un lecteur sans contexte,
dans le rôle d'un enfant ou d'un adulte peu habitué, fait les tâches sur l'écran construit.

## Questions tranchées par Victor (2026-10-23)

1. **La suppression du compte de l'enfant, quand il a deux parents** : l'un des deux la demande ;
   l'autre reçoit un e-mail et peut l'annuler pendant 7 jours ; ensuite elle se fait. Avec un seul
   parent dans Catiche, elle est immédiate.
2. **Ce que voit un adulte en dehors de la soirée montrée** : les soirs où l'enfant a travaillé,
   sans durée ni matière, pour tous ses adultes.
3. **Un proche ne relie pas d'appareil** : un parent le fait, avec un code de départ.
4. **Une famille d'accueil sans délégation** ne peut pas ouvrir de compte pour l'instant ; c'est
   noté dans `etat.md`.
5. **Le premier message de Tom** : « Je suis Tom, une intelligence artificielle. » chaque soir,
   suivi d'une question qui varie, et le rappel une fois par soirée.
6. **Un e-mail prévient l'adulte d'un message** (« Léa vous dit où en sont ses devoirs »), un par
   soir au plus, qu'il peut couper ; à l'étape 4. Victor : « soirée » n'est pas évocateur, attention
   aux termes qui troublent ; d'où la règle « Les mots qui disent ce qui se passe » (§ 5).
7. **Le code de départ vaut 7 jours** pour relier un appareil (10 minutes aujourd'hui), pour
   préparer la tablette de la grand-mère avant le mercredi. Un code volé ajoute un appareil, mais
   n'ouvre rien sans le code de l'enfant, et l'enfant en est prévenu. Le code après un oubli garde
   10 minutes.
8. **L'e-mail d'entrée de l'adulte porte un bouton et le code, valables 15 minutes** (un code de
   5 minutes aujourd'hui).
