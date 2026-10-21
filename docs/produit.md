# Le produit

La direction retenue par Victor le 2026-10-20. Ce document dit pour qui, quoi et pourquoi. La
méthode d'une soirée est dans `methode.md`, ce qui existe déjà dans `concurrence.md`, et ce qui
est construit dans `tuteur.md` et `architecture.md`.

## En une phrase

Catiche accompagne le collégien pendant ses devoirs, du début à la fin, et lui apprend à
s'organiser. Chaque soir, l'élève
dit ce qu'il a à faire, et Tom l'aide à le faire, du début à la fin, sans faire le travail à sa
place.

## Pour qui

- **L'élève** : un collégien, de la 6e à la 3e, qui peine à cause de l'organisation, pas des
  notions. Il ne sait pas par où commencer, oublie un contrôle, ne finit pas.
- **Le parent** : celui pour qui la soirée de devoirs est un conflit, ou qui n'a pas le temps de
  la tenir. Il cherche la paix du soir et des devoirs rendus, pas un tableau de notes.
- **La cible de départ** : les familles concernées par le TDAH et les troubles dys, pour qui des
  solutions payantes existent déjà (`concurrence.md`, « Le créneau de l'organisation »). Leurs associations et les professionnels qui les suivent sont le canal pour
  les trouver.
- **Jamais de diagnostic demandé** : le produit s'adresse à un besoin, pas à un trouble.

## Ce que fait Catiche

Une soirée suit les gestes de `methode.md` :

1. L'élève dit à l'oral ce qu'il a ce soir. Tom demande ce qui manque : pour quand, quels
   exercices, un contrôle bientôt ?
2. Tom propose un ordre, et l'élève peut le changer.
3. Il découpe le travail en étapes courtes et aide l'élève à démarrer, puis à tenir.
4. Il aide sur le contenu sans donner la réponse (`tuteur.md`).
5. À la fin, il récapitule ce qui est fait, ce qui reste, et le cartable du lendemain.
   **Le point du soir** (idée de Victor, 2026-10-20) : si le parent le peut, l'enfant lui
   montre ce récapitulatif. Le parent répond « Vu », avec un encouragement s'il le veut. Il ne
   vérifie pas le contenu et ne note rien. Ce point s'adapte à chaque famille :
   - parent rentré tard : il voit le récapitulatif plus tard, et l'enfant voit le « Vu » le
     lendemain ;
   - garde alternée : le récapitulatif va au parent chez qui l'enfant est ce soir-là ;
   - relation tendue autour des devoirs : le parent peut couper le point du soir ;
   - sans parent disponible : le récapitulatif reste à l'enfant, et rien ne lui est reproché ;
   - selon l'âge : proposé par défaut en 6e-5e ; en 4e-3e, l'enfant choisit de partager.

   Jamais de série de jours, de relance ni de score. La raison est dans `methode.md`, « Le rôle
   du parent ».
6. D'un soir à l'autre, il garde les contrôles annoncés et ramène leur révision les jours
   d'avant.

Le parent verra que c'est fait ; les conversations ne lui sont jamais envoyées. Dès la 6e,
l'enfant travaille dans son espace à lui, qu'il ouvre par son propre code, sur son appareil ou sur
l'ordinateur de la famille (`tuteur.md`, § 8).

## Pourquoi pas le gratuit

Les tuteurs IA, Galac6 ou Gemini, aident sur une question ; Goblin Tools et Tiimo découpent une
tâche. Sur les pages lues, aucun n'accompagne la soirée entière d'un collégien en français ;
Klixo reste à essayer. Le plus proche, PANDAH, n'est accessible que dans un essai clinique
(`concurrence.md`).

## Ce qu'on dit, et ce qu'on ne dit pas

- **On dit** « apprendre à s'organiser pour les devoirs ».
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

**Ordre décidé par Victor le 2026-10-20** : d'abord le design et la refonte (la landing, faite
dans #550, puis le passage à `catiche.fr`, puis l'application). La soirée et le volet IA viennent
ensuite.

**L'accès pendant la préparation** (Victor, 2026-10-21) : les comptes s'ouvrent sur invitation,
demandée par e-mail ; aucune promotion tant que les bloquants de `etat.md` ne sont pas levés.

## Les risques

- **Rien ne prouve qu'une IA remplace l'adulte qui vérifie** : c'est l'hypothèse centrale
  (`methode.md`).
- **L'élève doit revenir chaque soir**, sans adulte pour le relancer.
- **La clause de Mistral sur les moins de 15 ans** bloque tout utilisateur de moins de 15 ans,
  soit presque tous les collégiens (`etat.md`).
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
