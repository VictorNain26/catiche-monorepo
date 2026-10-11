# Charte

La direction « Grands carreaux » (`decisions.md`, 2026-10-11) : un cahier d'écolier, où l'élève
écrit sur la ligne et Tom parle depuis la marge. Les valeurs vivent dans le code,
`packages/tokens/theme.css` pour les tokens, `@repo/ui` pour les composants ; ce document dit
comment s'en servir. L'étude qui l'a fondée : `etudes/2026-10-11/direction-artistique.md`.

## Le nom

**Catiche**, le gîte de la loutre, avec une majuscule, jamais en capitales ni abrégé. Le produit
est le lieu ; Tom est le tuteur qui s'y trouve, une loutre, et garde son nom : l'élève fait ses
devoirs « sur Catiche, avec Tom ». Jamais « Tom t'attend à la Catiche » : Tom n'est pas un
compagnon. Le logo reste à dessiner.

## Couleurs

Chaque couleur a un rôle, et un rôle n'en prend pas une autre.

| Rôle | Token | Usage |
|---|---|---|
| Papier | `background`, `card` | Le fond de l'écran ; une carte s'en détache à peine |
| Encre | `foreground`, `muted-foreground` | Le texte ; le texte secondaire |
| Encre bleue | `primary` | L'action principale, les liens, le focus : le bleu du pull de Tom, seul accent |
| Bulle de l'élève | `secondary` | Ce que l'élève a écrit |
| Marge | `margin` | Le filet rouge à gauche de chaque écran, en décor ; aucun texte ne s'y lit |
| Surligneur | `highlight` | Ce qui se relit : une notion qui résiste |
| États | `success`, `destructive`, `warning`, `disabled` | Réussi, erreur, attention, désactivé |

Le sombre suit le réglage du téléphone, avec la même encre éclaircie sur un bleu nuit ; il ne se
présente jamais comme bon pour le sommeil. Le bleu est celui de la catégorie (Kartable, Le Prof
IA, Dinobot) : la différence vient du nom, de Tom et de la marge, pas d'un deuxième accent.

## Typographie

- **Inclusive Sans** pour tout le texte et les titres ; **Atkinson Hyperlegible Mono** pour les
  codes, les chiffres alignés et les étapes. Ni Andika, ni police « spéciale dyslexie » : aucune
  étude ne les montre plus lisibles ; l'espacement, si.
- Le texte de Tom à 18 px au moins, interligne 1,5 ; les titres en gras (700), jamais plus.
- Le gras pour faire ressortir, jamais l'italique.

## Formes

- Un rayon pour les cartes et les bulles, un pour les boutons et les champs ; ni pilule, ni coin
  vif.
- Pas d'ombre : le bouton principal a un liseré, comme le bord d'une feuille.
- Un contrôle désactivé garde un texte lisible (`disabled`), jamais une opacité.

## Tom

- Sa tête est à côté de chacun de ses messages : l'élève sait toujours qu'il lit Tom, une IA.
- Son dessin ne réagit pas à l'élève : ni joie, ni déception, ni célébration ; il n'a pas
  d'émotion à montrer.
- Il reste petit et loin de l'énoncé : un détail décoratif près de l'exercice gêne
  l'apprentissage.
- Le Tom en entier et en mouvement (`apps/landing/public/tom/`) est pour le site. Les rendus de
  l'app se font dans Blender, depuis `tom.blend`.

## Les mots

- On tutoie l'élève, on vouvoie le parent ; un texte pour l'un n'est jamais le texte pour l'autre.
- Des phrases courtes, au présent. Pas de point d'exclamation, pas d'emoji, pas de mot de jeu.
- Tom se dit programme, jamais ami ; il ne dit pas « je suis fier de toi ».
- Des tournures sans genre pour l'élève : Tom ne sait pas s'il parle à une fille ou à un garçon.
- Une erreur dit ce qui s'est passé et quoi faire, sans s'excuser ; une attente dit ce qui se
  passe et combien de temps.

## Mouvement

Un fondu court à l'arrivée d'un message, un soulignement qui se trace sur la notion clé ; aucun
rebond. Rien ne bouge sous le mouvement réduit.

## Accessibilité

Les règles de `.claude/rules/design-system.md` : contrastes AA testés dans les deux modes, cibles
de 44 px, aucun défilement horizontal. À venir au lot 2 : un réglage « Lecture aérée », aux
espacements de WCAG 1.4.12.
