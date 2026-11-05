# Tuteur IA (Tom)

Comment Tom mène la soirée, ce que le code garantit, et ce qui reste à construire, marqué comme
tel. La soirée elle-même : `produit.md` et `methode.md`.

## 1. Principes

- **Ce qui ne doit jamais échouer est garanti par le code**, pas par le prompt : l'annonce qu'il
  est une IA, les outils de chaque étape, le contrôle avant l'élève, la modération, la détresse
  (§4).
- **L'état de la soirée vit dans nos tables**, changé par des outils validés : le modèle le lit,
  il ne le tient pas de mémoire (§5).
- **Modèle daté, prompt dans git** : le passage d'éval nomme le commit qu'il mesure (§2, §7).
- **Le texte de l'élève est une donnée**, jamais une instruction (§4, §5).
- **Mesurer avant de changer le tuteur** (§7) ; un juge séparé du tuteur, vérifié contre Victor.

Références : [docs.mistral.ai](https://docs.mistral.ai) (prompting, reasoning, moderation,
prompt caching, known limitations), [AI SDK](https://ai-sdk.dev/docs),
[Building effective agents](https://www.anthropic.com/engineering/building-effective-agents),
[OWASP Top 10 LLM](https://genai.owasp.org/llm-top-10/).

## 2. Modèles

Tom et les sorties structurées passent par l'AI SDK (`ai`, `@ai-sdk/mistral`) ; la modération
par le SDK Mistral (`@mistralai/mistralai`). Tous visent l'endpoint UE
`https://api.eu.mistral.ai` (origine nue, `MISTRAL_SERVER_URL` refuse tout chemin ; inférence
garantie en Europe, +10 %). Le Zero Data Retention de l'organisation est requis avant tout
utilisateur réel (`etat.md`, Bloquants). Agents, Conversations, Batch et Files ne sont pas servis
sur l'endpoint UE ni couverts par le ZDR : la boucle d'agent est celle de l'AI SDK, et
`mistral.conversation()` est refusé au lint (`apps/server/eslint.config.mjs`)
([regional inference](https://docs.mistral.ai/inference/regional-inference),
[ZDR](https://docs.mistral.ai/admin/monitor-comply/zero-data-retention)).

| Rôle | Modèle | Réglage |
|---|---|---|
| Tom (`modules/tutor/agent.ts`) | **Mistral Small 4** `mistral-small-2603` | La boucle d'outils `ToolLoopAgent` de l'AI SDK (`runAgent`, `platform/ai/client.ts`), `reasoningEffort: 'high'`, au plus `MAX_STEPS` étapes (`core/turn-deadline.ts`), la dernière sans outil ; `promptCacheKey` par séance |
| Modération entrée/sortie | `mistral-moderation-2603` | Catégories par sens (§4) |
| STT / TTS (à construire, R5) | Voxtral | Voix `fr_marie_*` |
| Juge et élève simulé (`eval/`) | Mistral Small 4 `mistral-small-2603` | Sorties structurées strictes, sans raisonnement |

Small 4 : 256k de contexte, function calling, sorties structurées, raisonnement
([fiche](https://docs.mistral.ai/models/mistral-small-4-0-26-03), prix dans
`platform/ai/cost.ts`). Un seul LLM pour tous les rôles texte, juge compris : moins de variables
à évaluer, un seul cache ; le juge note donc son propre modèle, biais que sa conception et la
mesure d'accord doivent contenir.

**Identifiants datés uniquement**, jamais d'alias `-latest` : un alias change de modèle sans
prévenir et invalide l'évaluation.

**Pièges vérifiés** : ceux de l'appel à Mistral (`reasoning_effort`, `safePrompt`, cache de
préfixe, débit du mode gratuit) sont dans le skill `mistral-stack`. **Propres à Tom** :
- La réponse finale est entière, sans flux (`agent.generate()`) : elle est contrôlée avant
  d'être écrite dans le flux (§4). `createAgentUIStreamResponse` enverrait les parts d'outil au
  client avant tout contrôle.
- Chaque étape de la boucle est facturée une fois finie, celles d'avant une étape en échec aussi
  (`onStepEnd`, `platform/ai/client.ts`).

## 3. La soirée

Les gestes viennent de `methode.md`, « Les gestes d'une soirée » ; les consignes de Tom, dans un
seul fichier, `modules/tutor/core/instructions.ts`. Le serveur tient l'étape de la soirée
(`evening.phase`) et les outils que chacune offre (`PHASE_TOOLS`, `core/evening.ts`) :

- **Noter** : les devoirs et les contrôles, une question à la fois, l'échéance demandée avant
  d'ordonner. Aucun outil de contenu à cette étape : l'inventaire d'abord.
- **Ordre** : un ordre proposé avec sa raison et une durée ; l'élève peut le changer.
- **Étapes** : une étape d'environ 10 minutes ; sur le contenu, la question qui fait avancer,
  jamais la réponse. `programme` lit le programme de la classe (`core/programme.ts`, sur
  `referential/`) ; `calculate` calcule par mathjs (`core/calculate.ts`), Tom ne calcule rien de
  tête.
- **Cartable**, puis **fin** : ce qui est fait, ce qui reste et pour quand, la liste du cartable.
- **L'aide sur le contenu en outils** (exercice, palier d'indice tenu par le serveur) : à
  construire, R4 (`docs/plans/eager-greeting-feigenbaum.md`).
- **Périmètre : collège (6e → 3e)**, les seuls niveaux du serveur (`domain/levels.ts`).
- **Les matières** : `domain/subjects.ts`, slugs du collège, et « autre » pour un devoir ou un
  contrôle noté.

## 4. Garde-fous par le code

| Garde-fou | Mécanisme | Où |
|---|---|---|
| Modération d'entrée | `studentTurn` classe le message de l'élève avec le dernier message de Tom en contexte ; `selfharm` décide la détresse, les autres catégories se mesurent sans bloquer ; modération indisponible : les règles seules jugent la détresse | `modules/tutor/turn.ts`, avant Tom |
| Détresse | Classifieur indépendant du prompt (Self-Harm + règles en français, `domain/distress.ts`) ; réponse fixe approuvée par un humain, avec le 3114 ; la séance close, tout message suivant reçoit la même réponse ; l'événement enregistré, un par séance, sans score (`distress_event`), pour la revue humaine, à construire. Ni quota ni écriture en échec ne retiennent la réponse | `turn.ts`, `service.ts` |
| Outils limités à l'élève | Chaque outil est construit pour un tour : l'élève et la soirée viennent du serveur, jamais d'une entrée du modèle, et chaque requête vérifie l'élève dans sa clause (OWASP LLM01) ; une entrée refusée revient au modèle comme erreur de l'outil | `agent.ts`, `repository.ts` |
| Annonce de l'IA | La première réponse d'une séance commence par « Je suis Tom, une intelligence artificielle. » quand le modèle l'a omise (AI Act art. 50(1)) | `turn.ts` |
| Contrôle avant l'élève | La réponse finale entière est contrôlée, puis envoyée, et c'est elle qui est gardée ; remplacée par une réponse fixe (`FALLBACK_REPLY`, `core/instructions.ts`) si elle est vide, porte la balise du bloc soirée, donne un résultat de `calculate` que l'élève n'a pas encore écrit (`findLeakForm`, `domain/leak.ts`, partagée avec le harnais), ou si la modération de sortie la bloque ou ne répond pas | `turn.ts` |
| Rien d'interne montré | Seul le texte contrôlé part dans le flux ; ni raisonnement ni résultat d'outil ne quittent le serveur (`routes.ts`, `service.ts` `listMessages`) | Sortie du tour |
| Injection | Le texte de l'élève est délimité comme donnée, la balise du bloc soirée retirée de ses mots (`stripPromptTags`, `domain/prompt-tags.ts`) ; aucun outil sensible | `turn.ts` |

La recherche justifie ce passage au code : sur plusieurs tours, les modèles tiennent mal les
règles du prompt système (SysBench, IHEval, SafeTutors : 17,7 % d'échecs en un tour, 77,8 % en
plusieurs), et les garde-fous de détresse cèdent en zone intermédiaire (McBain 2025).

## 5. Prompt et contexte

- **Instructions** (`core/instructions.ts`) : identité, gestes de la soirée, voix de
  `charte.md` ; la classe et la date du jour, aucune donnée de l'élève.
- **Historique** : les 20 derniers messages de la séance, gardés en `UIMessage`
  (`core/message.ts`, comme le conseille le guide de persistance de l'AI SDK) ; le raisonnement
  de la dernière réponse de Tom seul est rejoué, jamais celui d'une réponse retenue.
- **Le message de l'élève** porte en tête le bloc `<soiree>` que seul le serveur écrit
  (`eveningText`, `core/evening.ts`) : prénom, jour, étape, plan avec l'id de chaque devoir,
  devoirs restants, contrôles à venir. Les outils renvoient ce bloc à jour.
- `promptCacheKey` = identifiant de séance (recommandation Mistral). Les tokens servis par le
  cache sont gardés par appel dans `ai_cost` (`cached_input_tokens`).
- **Pas de résumé de conversation** : l'état vit dans les tables, pas dans l'historique.
- **La mémoire d'apprentissage** d'une soirée à l'autre est retirée en attendant R4 : elle
  reviendra sur les nouvelles tables, avec l'accord du parent et de l'enfant.

## 6. Sorties structurées et outils

- Les sorties machine de l'évaluation passent par `generateStructured`
  (`platform/ai/client.ts`) : `Output.object` avec un schéma Zod, `strictJsonSchema: true`, une
  seule relance avec l'erreur de validation.
- Les entrées des outils de Tom sont des schémas Zod (`agent.ts`) ; une date passée ou un id
  inconnu sont refusés en mots que le modèle lit.

## 7. Évaluation

Le code vit dans `apps/server/src/eval/` ; `bun run eval` rejoue le jeu sur le vrai tuteur et
écrit ses transcriptions dans `eval-results/`.

- **Ce que le code peut vérifier, il le vérifie** : fuite de la réponse avec `domain/leak.ts`, la
  même recherche qu'en production, artefacts, détresse ; ces mesures font foi en priorité.
- **Le juge**, Small 4 (`eval/judge.ts`), répond aux questions que le code ne tranche pas : une
  question oui/non par appel, sa raison avant sa réponse, « inconnu » sans verdict. Ses questions
  suivent la notation du scénario (`grading`) ; leur taux d'échec est publié avec les autres.
- **Le programme du référentiel se mesure** : `--variant none` retire à Tom l'outil
  `programme` (il répond qu'il n'y a pas de programme), et le passage compare les paires des deux
  variantes (McNemar exact, `eval/stats.ts`), avec son coût.
  Le programme reste s'il fait mieux sur « notion d'une classe suivante » ou « affirmation
  fausse » (Victor, 2026-10-28).
- **La soirée se joue avec un élève simulé** (`eval/student.ts`), Small 4 dans le rôle du
  collégien. Ses scénarios (E1 à E6) suivent les gestes de `docs/methode.md`, sans exercice, et
  leurs questions sont les leurs ; ils mesurent le nouveau Tom contre les seuils du plan.
- **Victor juge** les mêmes questions dans Langfuse, le juge ne comptant qu'une fois vérifié
  contre lui (`eval/langfuse.ts`). Avec les clés de Langfuse, chaque conversation jouée y part
  en trace, avec son texte et ce que le juge a lu, et chaque verdict du juge en score de la
  question ; `--annotate` ouvre une file d'annotation par scénario, avec ses seules questions.
  `--agreement` donne, question par question, le κ de Cohen entre le juge et Victor et le nombre
  de conversations qu'ils ont tous deux jugées (`eval/stats.ts`) ; une question compte à partir
  de κ ≥ 0,6, un accord « substantiel ». Une question réécrite prend un nouvel id : sous
  l'ancien, les réponses à l'ancienne formulation compteraient pour la nouvelle.
- **Une mesure par version du tuteur**, avec sa marge d'erreur ; deux versions se comparent cas
  par cas sur les mêmes conversations (McNemar), sur au moins 150 conversations de pression ; un
  passage ne prouve pas « moins de 1 % », il en faudrait au moins 300.
- **Le hasard reste** : chez Mistral, une température de 0 et une graine fixe ne rendent pas une
  réponse déterministe (4 notes changées sur 27 conversations en trois passages, mesuré le
  2026-10-03) ; une mesure se répète plutôt que de compter sur la graine.
- **Jeu et scénarios** : exercices de collège à réponse vérifiée, rattachés au programme ;
  scénarios d'aide, de pression, de détresse et d'injection. Rien n'est copié hors citations des
  programmes.
- **Non-régression** : un garde-fou en CI sur les changements du tuteur, centré sur la fuite
  (à construire).
- **Données de test seulement** : les conversations sont synthétiques, et seul le harnais en
  envoie le texte à Langfuse, sous l'environnement `eval` du projet ; en production, ni entrées ni
  sorties dans les traces, et aucun span en erreur exporté (`platform/observability/tracing.ts`).

## 8. Élève et parents

- **Les adultes de l'enfant** (Victor, 2026-10-23) : plusieurs, dans une ou deux maisons ; les
  parents ou tuteurs décident, les proches reçoivent le point du soir. Les droits de chacun et
  l'historique des changements : `docs/plans/app-cible.md`, « Le modèle de famille ».
- **Le parent voit un résumé de la semaine ; les conversations ne lui sont jamais envoyées** :
  les sept derniers jours, calculés par le code sans modèle (`modules/tutor/core/week-summary.ts`) :
  le temps passé (de l'ouverture de la séance, d'un message à l'autre, une pause au-delà de
  10 minutes, rien après une détresse), les séances et les soirs. L'élève voit le même résumé
  (`GET /api/summary`), chacun de ses adultes, parent ou proche, par
  `GET /api/summary/:studentId`. Ce qui résiste et le temps par matière reviennent avec le point
  du soir, sur les tables de la soirée.
- **L'enfant a son espace à lui, dès la 6e, ouvert par son propre code** (décisions de Victor,
  2026-10-20) : un code du parent met son profil sur un appareil, le sien ou l'ordinateur de la
  famille, puis l'enfant y choisit un code de 6 chiffres que le parent ne voit pas
  (`platform/auth/student-sign-in.ts`, et `docs/architecture.md`, « Serveur »). L'écran « Qui fait
  ses devoirs ? » liste les profils de l'appareil ; chaque frère ou sœur entre par son code, et
  « Quitter » referme le sien. Chacun de ses parents peut toujours donner un code
  « oublié » : l'enfant le sait, la date du changement lui est dite une fois, dans « Depuis ta
  dernière visite », jusqu'à son « Vu » (`apps/web/src/lib/news.ts` ; CNIL, recommandation 5).
  L'enfant voit les appareils qui portent son profil ; ses parents les débloquent ou les
  déconnectent, un proche jamais. La garde du foyer
  refuse à l'enfant les autres routes de better-auth (`STUDENT_AUTH_PATHS`,
  `modules/household/routes.ts`).
- **La détresse n'alerte pas le parent d'office** : l'événement est enregistré
  (`distress_event`) ; la revue humaine qui doit le relire et décider n'existe pas encore
  (`etat.md`).

## 9. Conformité

Cartographie de risque, à valider par un conseil avant l'ouverture.

| Exigence | Réponse |
|---|---|
| AI Act art. 5(1)(b) (exploitation d'une vulnérabilité liée à l'âge, jugée à l'effet) | Aucune mécanique d'engagement : pas de séries, pas de notifications de rétention |
| AI Act art. 50(1), applicable depuis le 2026-08-02 | Divulgation IA dès la première interaction : la première réponse d'une séance le dit, garantie par le code (§4), et l'interface le redit sous le champ (`routes/seance.$sessionId.tsx` du web) |
| AI Act art. 50(2), marquage machine des sorties texte | Question ouverte (dialogue privé couvert ou non) à faire trancher par un conseil ; le délai au 2026-12-02 ne vaut que pour un système sur le marché avant le 2026-08-02 (source secondaire, à confirmer par le conseil) |
| Loi 78-17 art. 45 | Double consentement sous 15 ans pour ce qui repose sur le consentement ; le parent conclut le contrat |
| Conditions commerciales de Mistral, 2.2(c), version du 2026-09-25 : pas de données personnelles d'enfants sous l'âge du consentement numérique (15 ans en France) | Clarification écrite demandée à Mistral avec le ZDR ; aucun vrai élève avant sa réponse. Le prénom et les devoirs notés partent dans le prompt ; si Mistral refuse, le prénom en sort (Victor, 2026-10-07) |
| RGPD art. 9 (la détresse est une donnée de santé) ; Code pénal art. 434-3 | Base légale et conduite à tenir à faire trancher par un conseil |
| Cadre d'usage de l'IA du ministère (2025) : usage autonome à partir de la 4e | Pèse sur une recommandation par un collège en 6e et 5e ; texte complet à lire |
| CNIL, données d'élèves non réutilisées | Endpoint UE ; ZDR avant tout utilisateur réel |
| RGPD art. 4(4) et 22, CNIL recommandation 8 (profilage d'un mineur) ; FAQ de la CNIL sur l'IA dans l'éducation (juin 2025 : AIPD « en principe » requise sur des données d'élèves mineurs) | La mémoire d'apprentissage, retirée jusqu'à R4, reviendra désactivée tant que le parent et l'enfant ne l'acceptent pas ; aucune décision automatisée ; AIPD avant le premier élève réel |
| Annexe III (haut risque éducation) | Hors champ tant que le produit est vendu aux familles et n'évalue pas les acquis pour orienter ; bascule si vente à des établissements |

## 10. Non vérifié

- Numéros d'aide : 3114, 15 et 112, ceux de la réponse de détresse, sont vérifiés
  (service-public.gouv.fr F33954, 3114.fr) ; 3020, 3018 et 119 sont à vérifier avant de
  servir.
- Canal vocal : le harnais déclare un tour vocal (`inputMode: 'voice'`) mais l'envoie comme du
  texte ; la voix revient en R5.
- Qualité de Small 4 en tutorat français multi-tours : aucune mesure publique ; celle du
  harnais n'est pas encore publiée.
- À ne pas citer : Wang & Fan 2025 (*HSSC*), rétracté le 2026-04-22.

## 11. Quotas et coûts

- Chaque appel IA facturé est tracé dans `ai_cost` par construction, en micro-euros
  (`platform/ai/cost.ts`), sous l'`operation` que chaque appel nomme (`tom` pour chaque étape de
  la boucle) ; la voix le sera à son arrivée. La modération, gratuite, ne l'est pas.
- Le quota est un budget du jour par élève, lu dans `ai_cost` : le coût réel, tokens en cache à
  leur prix (10 %), de chaque appel tracé, jamais des tokens bruts ; le même pour tous, les
  offres restant ouvertes (`produit.md`), le jour commençant à 4 h à Paris
  (`domain/quota.ts`, `domain/school-calendar.ts`). Vérifié à l'ouverture d'un tour, un seul
  tour à la fois par élève, toutes séances confondues (`modules/tutor/repository.ts`,
  `startTurn`) : au-delà, le tour est refusé avant tout modèle, sauf une détresse ; un quota
  illisible refuse le tour (`modules/tutor/service.ts`).
