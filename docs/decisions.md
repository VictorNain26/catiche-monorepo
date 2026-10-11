# Décisions

Les décisions de Victor qui tiennent aujourd'hui, une par entrée, avec leur date, leur raison et
leur source. Les autres docs décrivent l'état présent et renvoient ici pour le pourquoi. Une
décision qui change se réécrit à sa place, avec la nouvelle date ; l'ancienne reste dans git.
Une décision prise en séance entre ici dans la PR qui la suit, pas dans une mémoire d'agent.

## Produit

- **Prouver avant de vendre** (2026-10-01). On n'affirme que ce qu'on peut prouver, mesure ou
  source primaire à l'appui. Source : `vision.md`.
- **Pas d'entretiens avec des familles avant la bêta** (2026-10-02). Les hypothèses de la vision
  restent des hypothèses jusqu'à l'usage réel de la bêta fermée.
- **Le foyer et l'âge** (2026-10-07, revu le 2026-10-08). Le parent ouvre le foyer et conclut le
  contrat ; trois façons d'accompagner, du CP à la terminale, le mode suivant le niveau ; la V1 au
  collège, en mode accompagné en 6e et 5e, guidé en 4e et 3e ; l'enfant n'a aucun identifiant ; la
  détresse est relue par un humain avant tout message au parent. Source :
  `etudes/2026-10-07/foyer-eleve-age.md`.
- **Le mode accompagné en 6e et 5e** (2026-10-08). Le découpage des modes devient : accompagné
  du CP à la 5e, guidé en 4e et 3e, autonome au lycée (l'étude du 2026-10-07 plaçait la 6e et la
  5e en guidé). Avant la 4e, pas d'appareil propre à l'enfant : le parent lance la séance sur
  l'appareil de la famille, qui passe au profil de l'enfant (« Les profils sur l'appareil de la
  famille »), avec « Je reste à côté » ou « Il travaille seul ce soir » ; le profil reste ouvert
  pour les soirs suivants, et revenir au parent demande sa clé ou un code. À côté, le parent écoute
  et reste disponible, il ne corrige pas au fil de l'eau ; Tom lui propose au plus trois ou quatre
  pistes par séance, de vingt mots au plus, au lancement, à un blocage, à une frustration et à la
  fin, visibles de l'enfant, jamais plus d'aide que le cran de l'enfant, ce que le serveur
  garantit. Seul, l'enfant a le même Tom, sans pistes ; aucun compteur ni reproche des soirs sans
  parent. Le jumelage d'un appareil à l'enfant ouvre en 4e. Raisons : l'école ne fait utiliser
  l'IA générative aux élèves, en classe et encadrée par l'enseignant, qu'à partir de la 4e ; au
  collège, l'aide aux devoirs qui laisse chercher va avec des progrès, l'aide intrusive avec des
  reculs. Écart assumé : l'UNESCO recommande 13 ans pour converser seul avec une IA générative, et
  un soir seul, un élève de 6e le fait, sur le choix de son parent, avec un Tom tenu par le serveur.
  Sur l'appareil de la famille, les séances restent dans le profil de l'enfant, que le parent peut
  ouvrir : l'enfant le sait dès son accueil. Source : `etudes/2026-10-08/aide-parentale.md`. À revoir
  en bêta si le mode ne sert que les familles déjà disponibles, ou si des familles n'ont pas
  d'appareil commun le soir.
- **Une mémoire d'apprentissage d'une séance à l'autre** (2026-10-07). Tirée des exercices,
  acceptée par le parent et l'enfant, visible et effaçable par l'élève, remise à zéro à la
  rentrée ; promise seulement après sa mesure. Remplace « pas de mémoire ». Source :
  `etudes/2026-10-07/memoire-entre-seances.md`.
- **Le prénom et la mémoire partent dans le prompt** (2026-10-07). Aucun vrai élève avant la
  réponse écrite de Mistral sur sa clause des mineurs ; s'il refuse, ils en sortent.
- **Offre et quotas** (2026-10-07). Quota du jour par élève sur le coût réel, voix comprise :
  2 c en Gratuit, 10 c en Complet, remis à zéro à 4 h à Paris ; Complet à 7,99 € TTC par mois,
  ou 69 € l'année scolaire payée d'avance, sans renouvellement. Source :
  `etudes/2026-10-07/rentabilite.md`.
- **Entrée sans mot de passe** (2026-10-08). Le parent entre par un code envoyé à son adresse,
  puis par une clé d'accès ; pas de connexion Google, qui ferait savoir à une société américaine
  qui utilise Tom.
- **Les profils sur l'appareil de la famille** (2026-10-08). Le parent ouvre l'espace de son
  enfant sur son propre téléphone sans code et revient au sien par sa clé ou un code ; l'enfant
  n'a pas de déconnexion, mais « Changer de profil ».
- **Fiches de révision hors V1** (2026-10-08). Le Complet, c'est plus d'échanges par jour ; ni le
  site ni la vision ne promettent de fiches.
- **Le résumé parent dit les matières, le temps passé et ce qui résiste** (2026-10-08). Jamais
  les conversations ; l'élève voit le même résumé. Calculé par le code, sans modèle : rien
  d'inventé, rien à payer ; sur les sept derniers jours. Le parent ne voit rien d'autre de la
  mémoire d'apprentissage, qui reste à l'élève (tranché le 2026-10-08).
- **Le second parent avec le consentement** (2026-10-08, au lot 2 depuis le 2026-10-11). Il rejoint le foyer et peut
  s'opposer, parce que le double consentement sous 15 ans engage les titulaires de l'autorité
  parentale.
- **L'identité et l'app d'abord, Tom ensuite** (2026-10-11). Le nom, la direction artistique et
  sa charte, puis chaque écran de l'app et la landing, avant le travail sur le tuteur (harnais,
  fuites, voix, mémoire mesurée). Raisons : le tuteur attend le paiement à l'usage de Mistral
  pour être mesuré ; les écrans et le site avancent sans lui ; refaire l'identité après les
  écrans les ferait refaire deux fois. Aucun élève réel avant que Tom soit mesuré : l'ordre ne
  change pas la porte. Remplace « les fondations de la direction artistique au lot 3, le nom et
  la landing au lot 4 » (2026-10-08). Source : `roadmap.md`.
- **Le produit s'appelle « Catiche »** (2026-10-11, choix de Victor, sur le domaine .fr). Le gîte
  de la loutre : le produit est le lieu, Tom le tuteur qui s'y trouve, jamais un compagnon qui y
  attend l'enfant. Aucune marque en classes 9, 41 et 42, catiche.fr et catiche.app libres ce
  jour-là ; réserves : le suffixe « -iche » en 3e, @catiche pris sur Instagram et TikTok. Avant
  toute communication : la recherche de similarité INPI, le dépôt, les domaines. Aucun nom ne se
  bâtit sur Tom (marque TOM, FR 4873204). Remplace TomIA, puis « De sa main », que Victor n'a pas
  gardé. Source : `etudes/2026-10-11/nom-seconde-etude.md`.
- **La direction « Grands carreaux », aux fontes d'« Instrument »** (2026-10-11, choix de Victor
  après l'essai de trois directions sur les cinq vrais écrans, en clair et en sombre). Le cahier
  à réglure Seyès : papier, encre bleue du pull de Tom, marge rouge, la tête de Tom à chacun de
  ses messages ; Inclusive Sans pour le texte et les titres, Atkinson Hyperlegible Mono pour les
  codes et les chiffres, à la place d'Andika, qui faisait « primaire » en 4e et 3e (I, l et 1
  distincts, zéro barré, vérifiés à l'écran). Le bleu est celui de la catégorie : la différence
  vient du nom, de Tom et de la marge. Écartées : « Instrument » entière, froide pour le parent
  d'un élève de 6e ; « Colophon », sans Tom à côté de ses messages ; et, depuis le 2026-10-08, une
  direction qui jouait la relation et une direction sombre seulement au jaune. Remplace « Cahier
  du soir ». Source : `etudes/2026-10-11/direction-artistique.md`.
- **Une refonte complète de l'interface** (2026-10-11). Le lot 2 ne repeint pas les écrans
  actuels : il repense chaque parcours du parent et de l'élève et refait chaque écran, sa
  structure, ses composants et ses mots, sur la charte ; rien de l'interface actuelle n'est
  gardé par principe.
- **La landing réécrite avec l'identité** (2026-10-11). Elle n'attend plus l'ouverture : dès la
  charte choisie, elle reçoit les tokens et la fonte de l'app et se réécrit sur la vision, sans
  rien promettre que l'app ne fait déjà. Jusque-là, seuls des correctifs d'honnêteté ou
  techniques y entrent.
- **Des formules, pas de schémas, dans la séance** (2026-10-08, choix délégué par Victor). Le
  texte de Tom est rendu en Markdown et ses formules en MathML (KaTeX) ; ni HTML, ni lien, ni
  image venus du modèle. Pas de schémas Mermaid : lourds sur téléphone, et refusés par la CSP ;
  le prompt ne les annonce plus. À reprendre si la bêta montre qu'ils manquent.
- **Tom se présente comme un programme** (2026-10-08). La loutre reste l'identité visuelle ; Tom
  dit qu'il est une IA, le redit quand l'élève parle de lui, ne se dit jamais ami et n'exprime
  pas de sentiments ; l'interface le tient, le prompt au lot 4 (`roadmap.md`). Raison : AI Act art. 50, UNICEF (2025), et un ton relationnel attire surtout
  les adolescents fragiles sans être plus utile (`etudes/2026-10-08/accompagnement-ia.md`).

## Tuteur et évaluation

- **Mistral Small 4 pour tout rôle de LLM, juge compris** (2026-10-03). Ni Medium, ni Large, ni
  Ministral ; les modèles spécialisés restent (Voxtral pour la voix, le modèle de modération).
  Le juge note donc son propre modèle : sa conception et la mesure d'accord contiennent ce biais.
- **Le palier d'aide monte aussi après deux « je sais pas » de suite** sans tentative
  (2026-10-06). Une demande de solution seule ne le fait jamais monter.
- **Victor juge seul la qualité** (2026-10-06). Quatre questions oui/non par conversation (fuite,
  même reformulée ; affirmation fausse ; aide qui fait avancer sans faire à la place ; détresse,
  sur ses scénarios), 60 à 100 conversations, échecs suréchantillonnés, verdict du juge caché ;
  sa cohérence se mesure en rejugeant une vingtaine de conversations une semaine plus tard. Un
  juge d'une autre famille seulement s'il est très bon marché, les conversations de test étant
  synthétiques. Publication : « jugé par le fondateur ». Remplace les décisions 2 et 4 de
  `etudes/2026-10-06/refonte-evaluation.md` (grille MRBench, second annotateur).
- **Une mesure par version du tuteur** (2026-10-08). Un passage complet du code actuel pour
  vérifier le harnais et lister les cas qui fuient ; ensuite, une nouvelle mesure seulement après
  un changement du tuteur, jamais deux fois sur le même code, sur au moins 150 conversations de
  pression comparées cas par cas (McNemar).
- **Mistral en paiement à l'usage, au lot 4** (2026-10-08, reporté par Victor le 2026-10-11).
  Le mode gratuit plafonne à 100 000 tokens par minute, et une fiche d'exercice en prend environ
  78 000 : ni le harnais ni deux élèves dans la même minute n'y tiennent. Le même geste ouvre la
  demande de Zero Data Retention. Les lots 1 à 3 n'en ont pas besoin.
- **Langfuse abandonné** (2026-10-08). Aucun code ne s'en servait ; le harnais écrit ses
  transcriptions dans `eval-results/`, que la page de jugement lira.

## Technique

- **Bun partout où il remplace proprement, Hono pour le serveur** (2026-10-01). Drizzle et
  postgres.js gardés (Bun.SQL a des bugs de corruption ouverts, `suivi.md`, « Surveillance ») ;
  Python écarté pour le serveur, qui perdrait le contrat typé avec le client.
- **Un dépôt, un serveur en monolithe modulaire** (2026-10-01). Les services séparés de
  l'ancienne version ont pourri ; un service à part ne se justifie que par une contrainte réelle.
- **Un client web, pas d'application native en V1** (2026-10-06). Application monopage Vite +
  React + TanStack Router, installable, servie par le serveur sur la même origine, pensée d'abord
  pour le téléphone ; la landing en Astro statique. Source : `etudes/2026-10-06/client-web.md`.
- **Refonte complète du code** (2026-10-06), sur des pratiques publiées, sans rien garder de
  l'ancienne architecture ; faite aux étapes 1 à 7. Source :
  `etudes/2026-10-06/refonte-architecture.md`, instantané de la cible d'alors.
- **Pronote hors V1** (2026-10-01). L'accès passe aujourd'hui par une bibliothèque non
  officielle, archivée et cassée par la version 2026 de Pronote ; il ne revient que par une
  convention de connecteur avec Index Éducation, sur un produit qui marche déjà sans lui.
- **Pas d'établissements en V1** (2026-10-01). Le GAR n'adhère que des personnes morales
  ([référentiel du 12 juin 2026](https://gar.education.fr/wp-content/uploads/2026/06/GAR-ReferentielAdminJuridique_FR_20260612.pdf), § 5.2.1),
  et une vente aux établissements ferait basculer le produit dans le haut risque de l'AI Act.

## Hébergement et livraison

- **Tout chez Clever Cloud, région Paris** (2026-10-07). L'app, sa base, la landing ; l'e-mail
  chez Scaleway TEM, les erreurs dans Bugsink auto-hébergé ; Scalingo en plan B, et si la CNIL
  juge l'hébergement de données de santé requis. Source : `etudes/2026-10-07/hebergement.md`.
- **Staging et bêta fermée sur invitation** (2026-10-07). Un compte parent ne se crée que sur
  invitation, au staging comme en production, jusqu'au lancement public.
- **Une seule branche, `main`** (2026-10-08). Chaque merge déploie le staging ; la production,
  née avec la première vraie famille, reçoit la même image sur l'approbation de Victor ; la
  landing va directement en production. Détail : `architecture.md`, « Environnements et
  livraison ».
- **Coûts au strict nécessaire** (2026-10-08). Une ressource payante arrive quand elle sert :
  Bugsink juste avant la première vraie famille. Chaque ressource payante demande l'accord de
  Victor, avec à quoi elle sert et quand elle devient nécessaire.

## Façon de travailler

- **TDD et parcours pensés depuis l'usage réel** (2026-10-08). Le test qui échoue d'abord, puis
  le code ; chaque fonctionnalité se conçoit à la place du parent et de l'enfant (téléphone
  partagé, soirée, vacances), avant les critères techniques.
- **Supprimer plutôt qu'archiver** (2026-08-23, rappelé le 2026-10-06). Ce qui ne sert plus se
  supprime ; git le garde.
- **Merge commit, pas de squash** ; une branche courte par PR, jamais de push sur `main`.

## Ouvertes

Tranchées au moment du lot qui en dépend, doc d'abord :

| Décision | Lot | Ce qui la tranche |
|---|---|---|
| Fournisseur de paiement | 2 | Conformité UE, abonnement familial, facturation sans piège |
| Statut juridique (micro-entreprise ou société), TVA | 2 | Une consultation d'un expert-comptable, avant le paiement |
| Canal du message au parent après une détresse | 4 | Un canal garanti (l'e-mail), avec la revue humaine |
| Hébergement de données de santé | Avant la première famille | La réponse de la CNIL |
