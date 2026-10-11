# Roadmap V1

Le fil : prouver avant de vendre (`vision.md`). L'ordre (`decisions.md`, 2026-10-11) : l'identité
et l'app d'abord, Tom ensuite ; aucun élève réel avant que Tom soit mesuré. Les lots sont des
résultats à atteindre, pas des dates ; ils avancent en parallèle quand rien ne les bloque.
Chaque PR précise son périmètre dans son plan, au moment où elle démarre
(`.claude/rules/plans-and-agents.md`). L'état du jour : `suivi.md`.

## Lots

| Lot | Résultat | Repère de fin |
|---|---|---|
| 0 — Refonte | Une codebase reconstruite sur des pratiques publiées | Fait : étapes 1 à 7 (`etudes/2026-10-06/refonte-architecture.md`) |
| 1 — Identité | Un nom, une direction artistique choisie par Victor, une charte complète | Le nom vérifié et retenu ; la charte vit dans le code (`packages/tokens`, `@repo/ui`) et dans `charte.md` |
| 2 — L'app | Chaque écran refait sur la charte, du premier code au paiement | Les parcours du parent et de l'élève marchent de bout en bout au staging, sur téléphone, et Victor les utilise |
| 3 — Le site | La landing réécrite sur l'identité et la vision | En production sous le nouveau nom ; chaque phrase renvoie à une source ou à ce que l'app fait déjà |
| 4 — Tom | Un tuteur mesuré qui ne cède pas, avec la voix | Au harnais, la réponse presque jamais donnée sous pression, une aide jugée bonne par Victor, la mémoire mesurée |
| 5 — Bêta et ouverture | Des familles réelles, puis le public | Les deux portes ci-dessous franchies ; mesures publiées |

## Maintenant

**Lot 1, dans cet ordre :**
1. **Le nom** : une étude (candidats, domaines, marques INPI et EUIPO, homonymes), Victor
   tranche. Le dépôt de la marque et le domaine sont des gestes de Victor.
2. **La direction artistique**, rouverte : trois directions nettement différentes, appliquées
   aux vrais écrans à largeur de téléphone, montrées dans Chrome ; Victor choisit.
3. **La charte** : logo, couleurs, typographie, formes, Tom (poses, place dans l'écran),
   iconographie, mouvement, ton des mots, composants, états (désactivé, erreur, attente).

**Hors IA, sans attendre** : Victor écrit à Mistral (paiement à l'usage, Zero Data Retention,
clause 2.2(c) des mineurs). La réponse prend du temps et décide du lot 4.

## Ensuite

- **Lot 2**, écran par écran, sur la charte : l'entrée et l'accueil du parent, l'ajout d'un
  enfant, les profils sur l'appareil de la famille, l'accueil de l'élève, l'apparence de la
  séance, le résumé de la semaine, le compte ; puis le double consentement sous 15 ans et le
  second parent ; puis le paiement, avec son fournisseur et le statut juridique tranchés avant.
  Le comportement de Tom dans la séance reste au lot 4.
- **Lot 3**, dès la charte choisie, en parallèle du lot 2 : la landing reçoit les tokens et la
  fonte de l'app, `landing.css` se supprime, le texte se réécrit sur la vision ; le domaine du
  nouveau nom.
- **Lot 4**, dès Mistral en paiement à l'usage : le passage unique du harnais sur le code actuel,
  le rapport et la comparaison cas par cas (McNemar), le juge et sa vérification par Victor, le
  garde-fou en CI ; les fuites fermées, mesurées sur au moins 150 conversations de pression ; la
  mémoire mesurée avec et sans elle ; la revue humaine de la détresse ; la voix (Voxtral) ; Tom
  qui se dit IA dès le premier message ; la première réponse plus rapide.
- **Lot 5** : Victor d'abord, puis quelques familles invitées, une fois la première porte
  franchie. La bêta tranche les questions ouvertes de la vision, dont le mode accompagné.

## Porte avant le premier élève réel

Obligations, pas des repères :
- Mistral en paiement à l'usage, Zero Data Retention accordé, clause des mineurs clarifiée par
  écrit (`etudes/2026-10-07/foyer-eleve-age.md`, § 1) ;
- art. 50(1) de l'AI Act tenu dans le prompt et dans l'interface (applicable depuis le
  2026-08-02) ;
- détresse et modération mesurées au harnais ; la détresse relue par un humain, avec un délai
  tenu, avant tout message au parent ;
- double consentement sous 15 ans, mémoire comprise, et son analyse d'impact (AIPD) ;
- pages légales alignées sur l'app réelle (mémoire, résumé, consentement) ;
- réponse de la CNIL sur l'hébergement de données de santé ; base dans un réseau privé ; erreurs
  remontées dans Bugsink ; la production, avec l'approbation de Victor.

## Porte avant l'ouverture publique

- Mesures publiées et rejouables, après un regard pédagogique humain sur un échantillon des
  exercices du jeu ; la page des mesures sur le site ;
- avis d'un conseil sur l'art. 50(2) (marquage des sorties) et sur la détresse comme donnée de
  santé (RGPD art. 9) ;
- statut juridique tranché avec un expert-comptable, avant le paiement.

## Après la V1

- **Primaire**, en mode accompagné (`etudes/2026-10-07/foyer-eleve-age.md`) : après une mesure de
  la reconnaissance vocale sur des voix d'enfants français, et une position face au cadre d'usage
  de l'IA du ministère.
- **Lycée** (`etudes/2026-10-02/alignement.md`, § 9), en mode autonome : la même chaîne de
  référentiel et d'évaluation, par vagues, mathématiques en tête ; le référentiel et le jeu sont
  indexés par enseignement pour que le lycée soit un ajout de données.

## Hors roadmap, délibérément

- Pronote et les logiciels de vie scolaire sans convention officielle ; les établissements (GAR).
- Les fiches de révision.
- RAG vectoriel : le programme d'un niveau et d'une matière tient dans le contexte (mesuré le
  2026-10-02, `etudes/2026-10-02/alignement.md`).
- Un autre fournisseur que Mistral pour l'élève, l'auto-hébergement de poids, le fine-tuning.
- Application native.
