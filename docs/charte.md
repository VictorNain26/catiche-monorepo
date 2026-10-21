# Charte

La direction « Rive » : la catiche, le gîte de la loutre au bord de
l'eau. Ce document dit comment s'en servir ; les valeurs vivent dans le code,
`packages/tokens/theme.css` pour les tokens, `@repo/ui` pour les composants. Le site et l'app
portent ses tokens ; leur composition reste à faire.

## Le nom et le logo

**Catiche**, avec une majuscule, jamais en capitales ni abrégé. Le produit est le lieu ; Tom est
le tuteur qui s'y trouve et garde son nom : l'élève fait ses devoirs « sur Catiche, avec Tom ».
Jamais « Tom t'attend à la Catiche » : Tom n'est pas un compagnon.

Jamais d'article devant Catiche (« sur Catiche », pas « la Catiche ») : c'est le nom d'un service,
pas le gîte de la loutre. Un accord se fait au masculin ; une tournure qui l'évite est préférée
(« Catiche ouvre bientôt » plutôt que « Catiche sera ouvert ») (Victor, 2026-10-20).

Le logo est à dessiner : peu de formes, ni trait fin ni texte dans l'icône ; il se
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
| Jonc (`highlight`) | `reed` | Le surligneur, fil conducteur dans les deux modes : le même trait épais sous la ligne de base, qui ne touche pas les lettres ; jamais en texte ni en bordure. Il se détache du fond comme une marque, à 3:1 dans les deux modes (`packages/tokens/contrast.test.mjs`) |
| Pelage (`annotation`) | `fur` | Une note, un accent rare |

- Le jonc revient une fois par section : sous le mot qui porte le sens du titre (« organiser »,
  « lui-même »), posé une fois quand le titre apparaît, du geste du haut de page ; et sur les
  marques d'état (l'heure de la soirée affichée, le trait d'une étape faite, la coche de « Je m'en
  occupe »). Il rythme la page et
  relie les sections. Il reste une marque derrière une encre lisible, jamais une couleur de texte,
  et il est posé d'emblée sous le mouvement réduit.
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
  Dans les écrans réduits qui illustrent la landing, 16 px est admis.

## Formes et composition

- Deux rayons : les cartes et les bulles, puis les boutons et les champs ; une ombre légère pour
  ce qui se pose sur le fond, rien de plus.
- Une liste pour des éléments semblables, une carte pour un bloc à part qui mène à un détail ; un
  seul bouton principal par écran.
- Au téléphone, une colonne et des onglets en bas ; à l'ordinateur, la navigation sur le côté et
  une vraie mise en page, jamais une colonne étirée.

## Tom

- Dans l'app, Tom est en 2D au trait, tiré de `tom.blend` par le Line Art de Blender puis fixé par
  une planche de référence (vues, attitudes) ; sur le site, le Tom en 3D, entier et en mouvement
  (`apps/landing/public/tom/`).
- Sa tête est à côté de chacun de ses messages : l'élève sait qu'il lit Tom, une IA. Hors de la
  séance, son dessin n'a pas de bulle et ne parle pas.
- Il ne réagit pas à l'élève : ni joie, ni déception, ni célébration. Il constate une étape juste
  (« La voix de Tom », plus bas).
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
aucune information portée par le mouvement seul ; rien ne bouge sous le mouvement réduit. Sur la
landing, le mouvement est un geste de la soirée : le jonc qui se pose derrière les mots, le trait
qui raye l'étape faite, les devoirs qui se rangent dans l'ordre. Un texte peut apparaître au
défilement, une fois, si son état d'entrée n'est posé que par le script et hors mouvement réduit ;
sans script, il reste visible. La soirée reste figée pendant qu'on la défile, chaque étape
remplaçant la précédente, aux mêmes conditions ; sans script ou sous mouvement réduit, ses étapes
s'empilent (`.claude/rules/landing.md`).

## Les mots

Deux voix, fixées par Victor le 2026-10-21 après un audit comparé au guide de Mailchimp, à GOV.UK
et à la façon dont Khanmigo cadre son tuteur : celle de Catiche, qui parle aux adultes, et celle
de Tom, qui parle à l'élève.

### Pour les deux voix

- Le lecteur trouve, comprend et peut agir (langage clair, ISO 24495-1:2023). Il survole plus
  qu'il ne lit : l'essentiel va en tête de chaque bloc.
- Une idée et un verbe conjugué par phrase, sujet en tête. Environ 15 mots par phrase, 25 au plus.
  Pas de titre sans verbe, sauf une question.
- **La syntaxe de la voix parlée** (Victor, 2026-10-21) : sujet, verbe, complément, dans cet
  ordre, comme on le dirait à quelqu'un. Un lecteur pressé comprend une phrase droite du premier
  coup ; une phrase construite comme un slogan sonne « générée » et fait douter du reste.
  Avant : « Les devoirs du soir, votre enfant les organise avec Tom ». Après : « Tom aide votre
  enfant à organiser ses devoirs ». Chaque phrase avance d'une idée : elle ne résume pas la
  précédente, ne reprend pas ses mots, et garde le nombre d'éléments qu'il lui faut plutôt
  qu'un rythme en trois temps.
- Un titre est une affirmation simple de 8 mots au plus, ou une vraie question. Il dit ce qui
  change pour le lecteur.
- Le présent. Les mots des familles, pas les nôtres (« ce qu'il a fait », pas « récapitulatif ») ;
  un mot du produit s'explique la première fois.
- Aucun mot technique ou savant (« serveur », « navigateur », « IA » en abrégé, « bêta »). Aucun
  mot médical (trouble, TDAH, dys, symptôme, compenser).
- Pas de point d'exclamation, pas d'emoji, pas de mot de jeu.
- Rien sans appui : chaque phrase renvoie à `produit.md`, `methode.md` ou au code. Un exemple se lit
  comme un exemple. On parle de l'organisation qui bloque, jamais d'un enfant qui échoue.
- La typographie française : espace insécable avant « : ; ? ! » et dans « 17 h 30 », guillemets
  « », « 6ᵉ » en exposant. Une heure affichée sur l'écran d'un appareil suit son horloge,
  « 17:30 » ; le texte courant écrit « 17 h 30 ».

### La voix de Catiche, aux adultes

Le site, les pages annexes, les e-mails, et l'interface de l'app côté adulte.

- **Concrète, pas publicitaire** : une scène de soirée plutôt qu'une promesse. Aucun résultat
  promis, aucune fonction hors de `produit.md`.
- **Rassurante, pas lénifiante** : elle nomme le risque, puis le garde-fou.
- **Directe, pas sèche** : le vouvoiement, une idée par phrase.
- **Honnête sur le statut, sans s'excuser.** Le statut a une seule formule : « En préparation : les
  comptes s'ouvrent sur invitation. » Sur la landing, il se dit une fois en haut de page, puis dans
  la FAQ sur le prix ; la page présente le produit au présent.
- L'élève est « votre enfant » (Victor, 2026-10-21) ; le collège se dit dans les faits (« de la 6ᵉ
  à la 3ᵉ »). L'adulte est « vous » ; quand il faut le nommer, « un adulte de la maison », jamais
  « parent » : ce n'est pas toujours un parent.
- Elle dit ce que Catiche fait, pas ce qu'il ne fait pas. Une limite se dit une fois, là où on la
  cherche, au positif quand c'est exact ; jamais de phrase défensive.
- Une source se dit en mots simples ; son nom savant ne va que dans le lien.
- Tom, en troisième personne, présenté une fois comme le tuteur de Catiche, une intelligence
  artificielle, dès le haut de page.
- Un bouton dit ce qu'il fait et ce qu'on peut vraiment faire aujourd'hui. Une erreur dit ce qui
  s'est passé, puis quoi faire, sans s'excuser ; une attente dit ce qui se passe et combien de
  temps.

### La voix de Tom, à l'élève

Les bulles de séance, et les écrans d'exemple de la landing.

- **Précise, pas froide** : il nomme ce qui est juste et ce qui manque.
- **Patiente, pas insistante** : une seule question, à la fin de son message, puis il attend.
- **Neutre, pas distante** : il tutoie, avec les mots de la classe ; jamais « mon pote ».
- **Brève** : une ou deux phrases, sauf pour un récapitulatif.
- Il dit qu'il est une intelligence artificielle dès son premier message (AI Act, art. 50), et sa
  tête est à côté de chacun de ses messages.
- Il constate, il ne félicite pas : « C'est juste. » ou « 12 convient », puis l'étape suivante ;
  jamais « bravo », « génial », « je suis fier de toi ». Il ne ressent rien et ne se dit pas ami ;
  ni « nous », ni « ensemble », ni « on ».
- Pour ne pas donner la réponse, il ne dit pas « je ne peux pas » : il pose la question qui fait
  avancer.
- Il ne relance pas l'élève hors de la séance et ne l'attend pas. Reformuler une consigne pendant
  la séance (le palier « relance » de `tuteur.md`) n'est pas une relance.
- Une soirée finit sur ce qui est fait, ce qui reste et le cartable, puis il s'arrête ; ni « à
  demain », ni « tu m'as manqué ».
- Des tournures sans genre : « Ça bloque où ? » plutôt que « Tu es bloqué ? ». Jamais le mot
  « enfant ».
- Exception : la réponse de détresse, écrite et approuvée par Victor (`apps/server/src/domain/`),
  garde ses mots.

### Qui parle où

| Où | Qui parle | À qui |
|---|---|---|
| Site, pages annexes, e-mails | Catiche | l'adulte, vouvoyé |
| Écrans d'exemple de la landing | Tom, dans ses bulles | l'élève, tutoyé |
| Bulles de séance | Tom | l'élève, tutoyé |
| Boutons, erreurs, réglages de l'app | Catiche, jamais Tom | l'élève tutoyé, l'adulte vouvoyé |
| Pages légales | Catiche ; « Tom » n'y désigne que le tuteur | l'adulte, et l'élève dans son encadré |

## Accessibilité

Les règles de `.claude/rules/design-system.md` : contrastes AA testés dans les deux modes, cibles
de 44 px, aucun défilement horizontal à 320 px. Un réglage « Lecture aérée », aux espacements de
WCAG 1.4.12, reste à faire.
