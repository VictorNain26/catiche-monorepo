# La direction artistique, rouverte (2026-10-11)

Étude du 2026-10-11, après que Victor a rouvert la direction « Cahier du soir »
(`decisions.md`). Elle propose trois directions à essayer sur les vrais écrans ; Victor choisit.
Les couleurs des concurrents sont les plus fréquentes du CSS de leur page d'accueil, relevées le
jour même : des indices, pas leurs chartes.

## La catégorie

| Produit | Ce qu'on voit | Ce qu'on en retient |
|---|---|---|
| [Kartable](https://www.kartable.fr/) | Bleu `#466fff`, Roboto, photos, pas de mascotte | Rassure par les programmes et le tableau de bord parent ; visuellement banal |
| [SchoolMouv](https://www.schoolmouv.fr/) | Jaune et violet, exclamations, trophées, « augmenter sa moyenne » | Ton d'animateur, promesse de note |
| [Galac6](https://galac6.io/) | Nuit `#0b0b14`, dégradés violets, emojis | Même promesse que Tom ; le code « IA violette » fait start-up, pas devoirs du soir |
| [Le Prof IA](https://leprofia.fr/) | Bleu `#1a6bf0` et orange, Sora, un personnage « Arthur » | « Sans engagement, annulez en 1 clic » rassure ; le « prof qui ne dort jamais » est l'inverse de nos principes |
| [Dinobot](https://ouiactive.com/) | Bleu `#1694fa` et ambre, mascotte dino, « +2 pts de moyenne » | Promesse chiffrée sans preuve |
| [Nomad Éducation](https://www.nomadeducation.fr/) | Orange et marine, « coach Nomad » | L'accroche d'habitude et le coach : ce que Tom n'est pas |

Trois sur six ont un bleu vif pour couleur principale, deux du violet : l'accent bleu seul de
« Cahier du soir » rend Tom indiscernable. Aucun n'occupe « papier ivoire, encre, titres à
empattement ».

Hors catégorie : [Duolingo](https://blog.duolingo.com/how-duolingo-streak-builds-habit/) montre
ce qu'on ne reprend pas (série, mascotte qui culpabilise, formes rebondissantes) ;
[Khanmigo](https://www.khanmigo.ai/) se dit IA et parle au parent de compréhension, pas de note ;
[Headspace](https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424),
le calme par la retenue, mais des personnages aux émotions variées, ce que Tom évite ; Notion,
des illustrations au trait qui tiennent en clair comme en sombre ; Penguin, un animal marque
d'éditeur depuis 1935, jamais interlocuteur.

## Ce que disent les sources

**Les adolescents.** Rien de condescendant ni de « bébé », des graphismes neutres, pas
d'animations lourdes ni de couleurs criardes, pas de petits textes, pas d'écrans chargés
([Nielsen Norman Group](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)).
Ce qui fait enfantin : palette saturée à plusieurs couleurs, personnages aux grands yeux qui
réagissent, polices rondes, emojis, exclamations, mots de jeu, célébrations.

**La lecture et la dyslexie.**
- Les polices « dyslexie » n'aident pas : OpenDyslexic ([Wery et Diliberto 2017](https://pubmed.ncbi.nlm.nih.gov/26993270/)),
  Dyslexie ([Kuster et al. 2018](https://doi.org/10.1007/s11881-017-0154-6)) ; quand Dyslexie
  fait mieux, c'est par son espacement, qu'Arial égale à espacement égal
  ([Marinus et al. 2016](https://researchers.mq.edu.au/en/publications/a-special-font-for-people-with-dyslexia-does-it-work-and-if-so-wh/)).
- L'espacement aide : chez 74 enfants dyslexiques de 8 à 14 ans, italiens et français, un
  espacement large double la justesse et gagne plus de 20 % de vitesse
  ([Zorzi et al. 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3396504)).
- Sans empattement, chasse fixe et romain font mieux, l'italique moins bien ; les préférences ne
  prédisent pas la performance ([Rello et Baeza-Yates 2013](https://www.changedyslexia.org/publications/pdfs/2013-ASSETS-An%20iOS%20Reader%20Dyslexia.pdf)).
- Les fonds chauds se lisent plus vite que les froids
  ([Rello et Bigham 2017](https://www.changedyslexia.org/publications/pdfs/2017-ASSETS-Good%20Background%20Colors.pdf)).
- La meilleure police varie d'une personne à l'autre, jusqu'à 35 % d'écart de vitesse
  ([Wallace et al. 2022](https://jeffhuang.com/papers/Readability_TOCHI22.pdf)).
- Andika est dessinée pour les lecteurs débutants ([SIL](https://software.sil.org/andika/)) :
  elle risque de faire « CP » en 4e et 3e. Hypothèse, pas mesure.

**Le soir.** Le texte sombre sur fond clair est avantageux à tout âge
([Piepenbrock et al. 2013](https://pubmed.ncbi.nlm.nih.gov/23654206/)) ; en lecture rapide, le
texte clair sur fond sombre dans une pièce sombre est le moins lisible
([Dobres et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28166901/)) ; le filtre de lumière bleue
ne change pas le sommeil ([Duraccio et al. 2021](https://pubmed.ncbi.nlm.nih.gov/33867308/)).
Le thème suit le téléphone, le clair reste confortable la nuit, et le sombre ne se vend jamais
comme bon pour le sommeil.

**La mascotte.** Éviter les avatars qui donnent l'impression d'une personne
([DfE 2026](https://www.gov.uk/government/publications/generative-ai-product-safety-standards/generative-ai-product-safety-standards)) ;
un ton relationnel séduit surtout les adolescents fragiles sans être plus utile
([Kim et al. 2025](https://arxiv.org/abs/2512.15117)) ; les détails décoratifs nuisent à
l'apprentissage ([Sundararajan et Adesope 2020](https://doi.org/10.1007/s10648-020-09522-4)).
Tom reste une marque, sans expression qui réagit à l'élève, loin de l'énoncé.

## Trois directions

Contrastes calculés par la formule WCAG ; chaque paire de texte passe 4,5:1, chaque bordure 3:1.
Les fontes sont sous SIL OFL 1.1 (fichier `OFL.txt` présent dans
[google/fonts](https://github.com/google/fonts)).

### A. « Grands carreaux »

Le cahier à réglure Seyès : l'élève écrit sur la ligne, Tom dans la marge.
- **Couleurs** : papier `#faf8f2`, encre `#1c2033`, primaire `#24409a`, marge `#e8a0a0` en décor ;
  sombre `#13151d`, texte `#e8e9ef`, primaire `#aab8ff`.
- **Fontes** : Andika pour le texte, Young Serif pour les titres.
- **Tom** : la tête 3D à 32 px dans une colonne de marge ; les pistes au parent dans la même marge.
- **Mots** : « Tom lit l'énoncé. Environ 15 secondes. »
- **Risques** : le bleu de la catégorie, « encore l'école », la réglure jamais derrière le texte.

### B. « Instrument »

Tom est un outil précis de la trousse ; l'interface dit que c'est un programme.
- **Couleurs** : fond `#f4f4f1`, graphite `#16191c`, bleu-vert pétrole `#0b6070` ; sombre
  `#111315`, texte `#e6e8ea`, primaire `#5fd0c9`.
- **Fontes** : Inclusive Sans pour le texte, Atkinson Hyperlegible Mono pour les étiquettes, les
  chiffres et les codes.
- **Tom** : un pictogramme plat, « Tom · IA » sur chaque message ; la 3D sur « Qui est Tom »
  seulement.
- **Mots** : « Lecture de l'énoncé · étape 1 sur 3 · environ 15 s »
- **Risques** : froid pour le parent d'un élève de 6e ; un enfant qui fuit un outil trop sec.

### C. « Colophon »

Une maison d'édition sérieuse : le texte est roi, Tom est la marque de l'éditeur.
- **Couleurs** : ivoire `#f7f3ea`, encre `#1f1b16` (aussi le bouton principal), terre de Sienne
  `#9a4a1c`, le pelage de Tom, pour les liens, le focus et la marque ; sombre `#17140f`, texte
  `#ede6d8`, accent `#e89a6a`.
- **Fontes** : Atkinson Hyperlegible Next pour tout le texte, Literata pour les titres seulement.
- **Tom** : un dessin au trait tiré du rendu Line Art, en tête de séance et au pied du résumé ;
  pas d'avatar à chaque message ; la 3D en couleur pour le site.
- **Mots** : « Ici, c'est toi qui trouves. Tom est un programme : il pose une question à la
  fois. »
- **Risques** : l'empattement peut faire daté ; un bouton noir doit rester un bouton ; Sienne et
  rouge d'erreur proches, une erreur porte toujours une icône et un texte ; l'ivoire rappelle la
  landing rejetée ; Tom moins présent dans l'app.

L'étude recommande C : la seule direction qu'aucun concurrent ne partage, adulte pour l'élève,
sérieuse pour le parent, cohérente avec « on publie nos mesures ». A est le repli si le bleu du
pull compte ; sa marge pour Tom est l'idée à emprunter.

## Pour les trois

- Texte de Tom à 18 px au moins, interligne 1,5 ; le gras plutôt que l'italique.
- Un réglage « Lecture aérée » aux valeurs de [WCAG 1.4.12](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)
  (lettres +0,12 em, mots +0,16 em).
- L'essai sur les cinq vrais écrans (accueil parent, fiche enfant, accueil élève, séance,
  jumelage), à 390 px, en clair et en sombre, avant le choix.

## Limites

Aucun test de lecture fait avec Literata, Young Serif ou Inclusive Sans ; les visuels de Dinobot
non lus ; les guides de la British Dyslexia Association, de Material Design et d'Apple sur le
sombre non lus.
