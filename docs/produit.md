# Le produit

La direction retenue par Victor le 2026-10-20. Ce document dit pour qui, quoi et pourquoi. La
méthode d'une soirée est dans `methode.md`, ce qui existe déjà dans `concurrence.md`, et ce qui
est construit dans `tuteur.md` et `architecture.md`.

## En une phrase

Catiche apprend au collégien à s'organiser pour ses devoirs du soir. Chaque soir, l'élève dit ce
qu'il a à faire. Tom, le tuteur de Catiche, une intelligence artificielle, l'aide à choisir par
où commencer, à avancer par petites étapes et à préparer le cartable, sans faire le travail à sa
place.

## Pour qui

- **L'élève** : tout collégien, de la 6e à la 3e, que l'organisation des devoirs met en
  difficulté. Il ne sait pas par où commencer, oublie un contrôle, ne finit pas.
- **Les adultes autour de lui** : celui ou ceux pour qui la soirée de devoirs est un conflit, ou
  qui n'ont pas le temps de la tenir. Ils cherchent la paix du soir et des devoirs rendus, pas
  un tableau de notes. Ce n'est pas toujours « le parent » : deux foyers en garde alternée, un
  parent seul, un tuteur, un grand-parent qui garde le soir. Le compte est ouvert par un adulte
  qui déclare être majeur et représentant légal des enfants qu'il ajoute ; le modèle de comptes
  pour toutes ces familles est à revoir (`etat.md`).
- **Inclusif, sans cible médicale** (Victor, 2026-10-21) : Catiche s'adresse à tous les
  collégiens. Il répond aussi aux familles concernées par le TDAH ou les troubles dys, pour qui
  des solutions payantes existent (`concurrence.md`, « Le créneau de l'organisation »), sans en
  faire sa cible principale.
- **Jamais de diagnostic demandé** : le produit s'adresse à un besoin, pas à un trouble.

## Ce que fait Catiche

Une soirée suit les gestes de `methode.md` :

1. L'élève dit à l'oral ce qu'il a ce soir. Tom demande ce qui manque : pour quand, quels
   exercices, un contrôle bientôt ?
2. Tom propose un ordre, et l'élève peut le changer.
3. Il découpe le travail en étapes courtes et aide l'élève à démarrer, puis à tenir.
4. Il aide sur le contenu sans donner la réponse (`tuteur.md`).
5. À la fin, il récapitule ce qui est fait, ce qui reste, et le cartable du lendemain.
   **Le point du soir** (idée de Victor, 2026-10-20, revue le 2026-10-21 d'après `methode.md`,
   « Le rôle de l'adulte au collège ») : l'enfant choisit ce qu'il montre à un adulte de la
   maison. Il montre au moins le plan de demain (ce qui reste, le contrôle qui approche, le
   cartable), et s'il le veut une étape dont il est content. Il dit aussi ce qu'il lui faut d'un
   adulte : un mot à signer, une fourniture, l'heure de demain. L'adulte fait le geste demandé
   (« Je m'en occupe ») et peut ajouter un mot sur l'étape montrée. Catiche ne lui propose
   jamais de corriger, de vérifier le contenu ni de sanctionner : ce qui reste se présente comme
   un plan. Ce point s'adapte à chaque famille :
   - adulte rentré tard : il le voit plus tard, et l'enfant trouve sa réponse le lendemain ;
   - garde alternée : il va à l'adulte chez qui l'enfant est ce soir-là ;
   - relation tendue autour des devoirs : l'adulte peut couper le point du soir ;
   - sans adulte disponible : il reste à l'enfant, sans reproche ; Tom propose de garder la
     demande pour le professeur ;
   - selon l'âge : proposé par défaut en 6e-5e ; en 4e-3e, l'enfant choisit de partager.

   Jamais de série de jours, de relance ni de score. Les raisons sont dans `methode.md`, « Le
   rôle du parent » et « Le rôle de l'adulte au collège ».
6. D'un soir à l'autre, il garde les contrôles annoncés et ramène leur révision les jours
   d'avant.

L'adulte verra que c'est fait ; les conversations ne lui sont jamais envoyées. Dès la 6e,
l'enfant travaille dans son espace à lui, qu'il ouvre par son propre code, sur son appareil ou sur
l'ordinateur de la famille (`tuteur.md`, § 8).

## Nos engagements

Ce que la page d'accueil peut promettre, et rien d'autre :

- **Hébergé en France** : Clever Cloud, région Paris (`architecture.md`). Les réponses de Tom sont
  calculées en Europe, par Mistral AI (`tuteur.md` § 2).
- **Aucune donnée revendue** (Victor, 2026-10-21).
- **L'espace de l'élève est à lui** : il l'ouvre par son propre code, sans adresse e-mail ;
  l'adulte voit ce qui est fait, jamais les conversations (`tuteur.md` § 8).
- **Tom ne fait pas le travail** : chaque message est vérifié avant d'être affiché, et remplacé
  s'il contient la réponse (`tuteur.md` § 4).

## Pourquoi pas le gratuit

Les tuteurs IA, Galac6 ou Gemini, aident sur une question ; Goblin Tools et Tiimo découpent une
tâche. Sur les pages lues, aucun n'accompagne la soirée entière d'un collégien en français ;
Klixo reste à essayer. Le plus proche, PANDAH, n'est accessible que dans un essai clinique
(`concurrence.md`).

## Ce qu'on dit, et ce qu'on ne dit pas

- **On dit** « apprendre à s'organiser pour les devoirs ». Les deux voix, celle de Catiche aux
  adultes et celle de Tom à l'élève, sont dans `charte.md`, « Les mots ». La page d'accueil
  présente le produit au présent et dit son statut une seule fois.
- **On ne dit jamais** « réduire les symptômes », « rééduquer », « compenser », « traiter » :
  ces mots font du produit un dispositif médical. Pour l'ANSM, c'est la destination annoncée par
  l'éditeur, matériel promotionnel compris, qui en décide
  ([ANSM](https://ansm.sante.fr/documents/reference/le-logiciel-ou-lapplication-sante-que-je-vais-mettre-sur-le-marche-releve-t-il-du-statut-de-dispositif-medical-dm-ou-de-dispositif-medical-de-diagnostic-in-vitro-dm-div)).
- **On ne dit jamais** « pour les enfants TDAH » ni « pour les dys », et l'inscription ne pose
  aucune question de trouble. Pour la CNIL, une donnée devient de santé par sa nature, par
  croisement ou par destination ([CNIL](https://www.cnil.fr/fr/quest-ce-ce-quune-donnee-de-sante)).
  Un produit vendu comme « pour les TDAH » ferait de la simple inscription un indice de santé.
  C'est notre lecture, à valider par un conseil.
- **On ne promet pas de meilleures notes** : les programmes évalués changent l'organisation et
  les devoirs, à peine les notes (`methode.md`).

## Pronote

Pas d'accès non officiel à Pronote. Pour Index Éducation, l'accès de Papillon n'est « pas
illégal en soi » parce que l'élève saisit ses identifiants et que Papillon « n'a pas de
finalité commerciale » ; l'éditeur le déconseille pourtant (`concurrence.md`, « Pronote et les
logiciels de vie scolaire »). Un partenariat officiel
suppose une entreprise et une convention. Le produit marche sans Pronote, et l'élève dit ses
devoirs à l'oral.

## Ce que devient l'existant

- **Gardé** : le tuteur et ses garde-fous, la mémoire d'apprentissage, le foyer et les appareils,
  la charte.
- **Retiré** : le mode accompagné de la 6e et de la 5e (2026-10-20).
- **À revoir dans les PR qui construisent la soirée** : le résumé de la semaine, vers « c'est
  fait » ; les offres Gratuit et Complet.
- **À construire** : la soirée à l'oral, avec le micro à ouvrir (`etat.md`), les contrôles
  gardés d'un soir à l'autre, et le cartable du lendemain.

**Ordre décidé par Victor** (2026-10-20, précisé le 2026-10-21) : d'abord la landing, jusqu'à
ce que Victor la valide lui-même, car elle fixe la vision et les promesses que l'application
devra tenir ; puis l'application. La soirée et le volet IA viennent ensuite.

**L'accès pendant la préparation** (Victor, 2026-10-21) : les comptes s'ouvrent sur invitation,
demandée par e-mail ; aucune promotion tant que les bloquants de `etat.md` ne sont pas levés.
Dans la FAQ du site, la réponse sur le prix dit, après la formule de statut, que la soirée se
construit et ce que Tom fait déjà : l'aide sur un exercice, à l'écrit ou en photo (Victor,
2026-10-22 ; le texte dans `apps/landing/src/components/sections/faq-data.ts`).

## Les risques

- **Rien ne prouve qu'une IA remplace l'adulte qui vérifie** : c'est l'hypothèse centrale
  (`methode.md`).
- **L'élève doit revenir chaque soir**, sans adulte pour le relancer.
- **La clause de Mistral sur les mineurs** : lue à la lettre, elle peut exclure les données des
  moins de 15 ans même avec l'accord d'un représentant légal, soit presque tous les
  collégiens ; une réponse écrite de Mistral est attendue (`etat.md`).
- **Aucune étude ne porte sur un collégien seul avec une IA** : les gestes ont un appui en
  population générale, mais par des méthodes transmises par des adultes (`methode.md`, « Ce qui
  vaut pour tous les élèves »).
- **PANDAH** pourrait publier des résultats positifs et devenir la référence gratuite des
  cliniciens.
- **Les mots** : un seul message « pour les TDAH » fait basculer le produit vers les données de
  santé ou le dispositif médical.

## Ce qu'on mesurera dès les premiers élèves

Les mesures de `methode.md` : les soirées par semaine, les devoirs rendus, et les questionnaires
parents déjà validés.

## Ouvert

- Le prix.
- Le nom de Tom, que la marque TOM peut empêcher (`etat.md`).
