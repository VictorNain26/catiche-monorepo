# Charte

La direction « Rive » (`decisions.md`, 2026-10-12) : la catiche, le gîte de la loutre au bord de
l'eau. Ce document dit comment s'en servir ; les valeurs vivent dans le code,
`packages/tokens/theme.css` pour les tokens, `@repo/ui` pour les composants. Les pratiques d'où
viennent ces règles : `etudes/2026-10-12/bonnes-pratiques.md`. Le site et l'app la portent depuis
le lot 1, étape 2.1 ; leur composition se refait aux étapes 3 et 4 (`roadmap.md`).

## Le nom et le logo

**Catiche**, avec une majuscule, jamais en capitales ni abrégé. Le produit est le lieu ; Tom est
le tuteur qui s'y trouve et garde son nom : l'élève fait ses devoirs « sur Catiche, avec Tom ».
Jamais « Tom t'attend à la Catiche » : Tom n'est pas un compagnon.

Le logo est à dessiner (étape 2) : peu de formes, ni trait fin ni texte dans l'icône ; il se
vérifie en monochrome, à 16 et 32 px, en clair, en sombre et en icône « maskable », dont le motif
tient dans le cercle central.

## Couleurs

Chaque rôle pointe vers un pas d'échelle dans `packages/tokens/theme.css` ; les valeurs des pas,
en clair et en sombre, sont dans `packages/tokens/scales.css`.

| Rôle | Échelle | Usage |
|---|---|---|
| Brume (`background`) | `mist` | Le fond |
| Encre (`foreground`) | `mist` | Le texte |
| Eau profonde (`primary`) | `water` | L'action principale, les liens, le focus, le panneau de marque |
| Jonc (`highlight`) | `reed` | Ce qui ressort derrière le texte de l'encre ; jamais en texte ni en bordure, trop pâle sur la brume : seul le texte de l'encre sur le jonc est testé (`packages/tokens/contrast.test.mjs`) |
| Pelage (`annotation`) | `fur` | Une note, un accent rare |

- Chaque couleur a son échelle de douze pas, chaque pas à son rôle : 1 et 2 les fonds, 3 à 5 les
  aplats des composants, 6 à 8 les bordures, 9 ce qui n'est pas du texte (3:1 au moins), 10 et 11
  le texte et les aplats pleins (4,5:1 au moins), 12 l'encre. Les pas sont générés à des
  contrastes cibles sur le fond, interpolés en OKLCH, par Leonardo (`packages/tokens/scales.mjs`) ;
  le sombre a son échelle à lui, pas une inversion. Les rôles pointent vers les pas, ceux des
  surfaces compris (`card`, `secondary` pour la bulle de l'élève, `muted` et `muted-foreground`
  pour le texte secondaire). En sombre, l'eau profonde est un peu moins claire que le `#79cbc9`
  de l'essai : chaque pas garde le même contraste dans les deux modes.
- Le sombre suit le réglage de l'appareil ; il ne se présente jamais comme bon pour le sommeil.
- Les états (`success`, `destructive`, `warning`, `disabled`) gardent leur sens dans les deux
  modes. Un bouton ne se désactive pas pour un formulaire incomplet : l'envoi dit ce qui manque ;
  un contrôle désactivé garde un texte lisible, jamais une opacité.
- Les graphiques ont leur palette, `chart-1` à `chart-4` dans cet ordre, chaque série à 3:1 du
  fond et de la carte, deux voisines séparées par leur clarté (1,4:1 au moins), et toujours un
  libellé ou une forme en plus de la couleur.
- Contrastes WCAG 2.2 AA dans les deux modes, testés (`contrast.test.mjs`) ; APCA en contrôle de
  plus, jamais en norme.

## Typographie

- **Bricolage Grotesque** pour les titres, chargée sur son axe de graisse seul ; **Atkinson
  Hyperlegible Next** pour le texte ; **Atkinson Hyperlegible Mono** pour les codes. Ni police
  « spéciale dyslexie » : l'espacement aide, pas la fonte.
- Une échelle fixe, du corps au titre ; le corps à 17 px au moins au téléphone ; jamais sous 12 px ;
  jamais de graisse fine ; 45 à 75 caractères par ligne.
- Les chiffres qu'on compare en chiffres tabulaires ; les fractions des maths en `frac`.
- Le gras pour faire ressortir, jamais l'italique ; le texte de Tom à 18 px au moins, interligne 1,5.

## Formes et composition

- Deux rayons : les cartes et les bulles, puis les boutons et les champs ; une ombre légère pour
  ce qui se pose sur le fond, rien de plus.
- **L'arche**, l'entrée du gîte, est la signature : en grand derrière Tom, sur le haut du site et à
  l'entrée de l'app ; jamais sur un élément qui se répète (une liste, une carte, un avatar).
- Une liste pour des éléments semblables, une carte pour un bloc à part qui mène à un détail ; un
  seul bouton principal par écran.
- Au téléphone, une colonne et des onglets en bas ; à l'ordinateur, la navigation sur le côté et
  une vraie mise en page, jamais une colonne étirée (`experience.md`).

## Tom

- Dans l'app, Tom est en 2D au trait, tiré de `tom.blend` par le Line Art de Blender puis fixé par
  une planche de référence (vues, attitudes) ; sur le site, le Tom en 3D, entier et en mouvement
  (`apps/landing/public/tom/`).
- Sa tête est à côté de chacun de ses messages : l'élève sait qu'il lit Tom, une IA. Hors de la
  séance, son dessin n'a pas de bulle et ne parle pas.
- Il ne réagit pas à l'élève : ni joie, ni déception, ni célébration.
- Il reste loin de l'énoncé, et absent des erreurs sérieuses et du tableau de bord du parent.

## Icônes

Lucide, trait de 2 px à 24 px (`nonScalingStroke`, qui remplace `absoluteStrokeWidth` dans
`lucide-react` 1), toujours avec un libellé visible.

## Graphiques

Le message en une phrase au-dessus ; des barres partant de zéro, étiquetées directement ; ni
anneau, ni camembert, ni 3D ; une barre empilée à quatre segments au plus ; un tableau des valeurs
pour les lecteurs d'écran.

## Mouvement

Des durées et une courbe en tokens ; un fondu court à l'arrivée d'un message ; aucun rebond ;
aucune information portée par le mouvement seul ; rien ne bouge sous le mouvement réduit.

## Les mots

- On tutoie l'élève, on vouvoie le parent ; un texte pour l'un n'est jamais le texte pour l'autre.
- Des phrases courtes, au présent. Pas de point d'exclamation, pas d'emoji, pas de mot de jeu, pas
  le mot « enfant » dans ce que lit l'élève.
- Tom se dit programme, jamais ami ; il ne dit pas « je suis fier de toi ».
- Des tournures sans genre pour l'élève : Tom ne sait pas s'il parle à une fille ou à un garçon.
- Un bouton dit ce qu'il fait ; une erreur dit ce qui s'est passé et quoi faire, sans s'excuser ;
  une attente dit ce qui se passe et combien de temps.

## Accessibilité

Les règles de `.claude/rules/design-system.md` : contrastes AA testés dans les deux modes, cibles
de 44 px, aucun défilement horizontal à 320 px. Un réglage « Lecture aérée », aux espacements de
WCAG 1.4.12, vient au lot 1.
