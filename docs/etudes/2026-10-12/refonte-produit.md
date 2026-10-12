# La refonte du produit (2026-10-12)

Demandée par Victor le 2026-10-12 : l'app et le site n'ont « pas un vrai design », ne sont pas
harmonisés, manquent de vraies pages de connexion et de vrais tableaux de bord ; tout peut être
revu, la vision et la documentation comprises. Cette étude dit pourquoi on en est là, ce que
disent les sources, ce qu'on garde, ce qu'on change, et dans quel ordre. Victor tranche les
décisions de la dernière section ; la vision, les décisions et la roadmap se réécrivent ensuite.

## Pourquoi l'app est si dépouillée

1. **La documentation parle de preuve, pas d'expérience.** La vision, les décisions et la roadmap
   décrivent ce qu'il faut garantir (le tuteur qui ne cède pas, les données, le juridique) et
   presque rien de ce que le parent et l'enfant vivent chaque soir dans l'app. Aucun document ne
   décrit un écran réussi.
2. **Les principes de l'interface ont produit le minimalisme.** L'étude du 2026-10-11
   (`etudes/2026-10-11/refonte-interface.md`) pose « peu de destinations, pas de barre
   d'onglets », « une action principale par écran », « Tom sur l'accueil de l'élève ; ailleurs,
   rien ». Appliqués à la lettre, ils donnent une colonne de texte et de boutons.
3. **Le parent ne voit presque rien.** La décision du 2026-10-08 limite le résumé aux sept
   derniers jours et ajoute « le parent ne voit rien d'autre » : il n'y a pas de quoi faire un
   tableau de bord.
4. **La charte s'arrête aux tokens.** Couleurs, fontes, rayons ; aucune règle de composition,
   aucune illustration, aucun logo, aucune mise en page pour l'ordinateur : chaque écran est
   plafonné à 448 px de large, même sur un ordinateur.
5. **Le site et l'app vivent séparés.** La landing garde l'identité précédente, gelée jusqu'au
   lot 3, pendant que l'app prenait « Grands carreaux » ; elle n'a aucun lien vers l'app.
6. **La méthode.** Le lot 2 avance parcours par parcours, chaque PR jugée sur ses flux, ses tests
   et sa sécurité ; aucune passe de design ne l'a précédé. C'est l'erreur de conduite de cette
   refonte, pas une limite de l'équipe.

## Ce que disent les sources

Recherche du 2026-10-12. Les études sur les 11-15 ans sont rares : la plupart viennent d'adultes
ou d'étudiants, ce qui est dit à chaque fois.

**Montrer le progrès aide, s'il porte sur la tâche.**
- Suivre sa progression aide à atteindre un but : 138 essais randomisés, d = 0,40, surtout hors
  de l'école ([Harkin et al. 2016](https://eprints.whiterose.ac.uk/91437/)).
- Le retour d'information aide (d = 0,48, [Wisniewski et al. 2020](https://doi.org/10.3389/fpsyg.2019.03087)),
  mais un tiers des retours nuisent, ceux qui tournent l'attention vers soi plutôt que vers la
  tâche ([Kluger et DeNisi 1996](https://cris.huji.ac.il/en/publications/the-effects-of-feedback-interventions-on-performance-a-historical/)).
- Points, badges et classements : effets fragiles hors apprentissage
  ([Sailer et Homner 2020](https://doi.org/10.1007/s10648-019-09498-w)) ; les récompenses
  attendues réduisent la motivation intrinsèque
  ([Deci, Koestner et Ryan 1999](https://home.ubalt.edu/ntygmitc/642/Articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf)) ;
  les tableaux de bord d'apprenants poussent à la comparaison
  ([Jivet et al. 2017](https://research.ou.nl/en/publications/awareness-is-not-enough-pitfalls-of-learning-analytics-dashboards/)).

**Informer le parent marche, s'il sait quoi en faire.**
- Des messages hebdomadaires aux parents réduisent l'échec, essais randomisés au collège et au
  lycée ([Bergman et Chan 2021](https://jhr.uwpress.org/content/56/1/125) ;
  [Kraft et Rogers 2015](https://annenberg.brown.edu/publications/underutilized-potential-teacher-parent-communication-evidence-field-experiment),
  où « ce qu'il peut améliorer » fait le plus d'effet ;
  [EEF, Texting Parents](https://educationendowmentfoundation.org.uk/projects-and-evaluation/projects/texting-parents/)).
- Au collège, parler des buts et des stratégies aide ; faire les devoirs avec l'enfant n'aide pas,
  voire nuit, par atteinte à l'autonomie ([Hill et Tyson 2009](https://doi.org/10.1037/a0015362) ;
  [Patall et al. 2008](https://scholars.duke.edu/publication/766357)).
- Ce que sait le parent vient surtout de ce que l'adolescent raconte
  ([Kerr et Stattin 2000](https://doi.org/10.1037/0012-1649.36.3.366)) ; le suivi doit rester
  proportionné à l'âge ([CNIL, recommandation 5](https://cnil.fr/fr/recommandation-5-promouvoir-des-outils-de-controle-parental-respectueux-de-la-vie-privee-et-de) ;
  [ONU, observation générale 25, § 75-76](https://www.unicef.org/bulgaria/en/media/10596/file)).
- Aucune étude trouvée sur l'effet d'un tableau de bord parent : on n'en promet aucun.

**Le soin visuel fait la confiance.** L'esthétique décide de l'utilisabilité perçue
([Tractinsky et al. 2000](https://doi.org/10.1016/S0953-5438(00)00031-X)), y compris chez des
14-17 ans ([Sonderegger et Sauer 2010](https://folia.unifr.ch/unifr/documents/302271)) ; elle se
juge en 50 ms ([Lindgaard et al. 2006](https://doi.org/10.1080/01449290500330448)). Les
adolescents rejettent ce qui fait « enfant » et préfèrent le soigné
([NN/g 2019](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)).

**Tom en 2D, au service de l'explication.** Les agents pédagogiques ont un petit effet positif,
plus fort en 2D (g = 0,38) qu'en 3D (g = 0,11)
([Castro-Alonso et al. 2021](https://research.birmingham.ac.uk/en/publications/effectiveness-of-multimedia-pedagogical-agents-predicted-by-diver/)) ;
un décor sans rapport avec la tâche nuit
([Sundararajan et Adesope 2020](https://doi.org/10.1007/s10648-020-09522-4)).

**La catégorie.** Le tableau de bord parent est devenu la norme : Kartable (« courbe de
progression de chaque enfant »), Galac6 (matières, temps, progression, points à renforcer), IXL
(résumé, usage par jour, points faibles), Dinobot (notions maîtrisées et blocages, source
indirecte). Khanmigo montre au parent l'historique des conversations et le fait résumer par
l'IA ; Brainly envoie au parent un point écrit (« ce qui tient, ce qui résiste, rien à faire »).
Les pages de connexion réussies (Notion, Headspace, Linear) posent le logo et une phrase de
promesse, l'e-mail d'abord, la clé d'accès en option ; Headspace montre les bénéfices à côté du
formulaire. Partout, « Se connecter » est dans l'en-tête du site, vers l'app sur le même domaine
ou un sous-domaine ; Galac6 envoie vers un domaine netlify.app. Sources lues le 2026-10-12 :
[Khan Academy](https://support.khanacademy.org/hc/en-us/articles/360040168512),
[Kartable](https://www.kartable.fr), [Galac6](https://galac6.io/),
[IXL](https://uk.ixl.com/materials/Analytics_Guide_for_Parents.pdf),
[Brainly](https://brainly.com/), [Prodigy](https://prodigygame.com/main-en/blog/report-card-tool).

## Ce qu'on garde

Ce sont la raison d'être du produit ; les sources ci-dessus les confirment.
- **Tom ne cède pas, et le code le garantit.**
- **On n'affirme que ce qu'on peut prouver.**
- **Les conversations restent à l'enfant.** Le parent n'y a jamais accès depuis son espace ; c'est
  ce qui distingue Catiche de Khanmigo, et c'est ce que demandent la CNIL et l'ONU.
- **Les données en Europe, au minimum.**
- **Ni points, ni séries, ni classements, ni comparaison entre élèves ; Tom est un programme, pas
  un compagnon.**

## Ce qu'on change

**1. Un principe nouveau : le soin fait partie de la promesse.** Le parent juge le sérieux du
produit en un coup d'œil, l'adolescent le quitte s'il fait « enfant ». Chaque écran est composé,
sur ordinateur comme sur téléphone, dans une seule identité, du site à l'app.

**2. Le parent voit, et sait quoi faire.** « Voit sans surveiller » reste ; « ne voit rien
d'autre » part. Son tableau de bord, par enfant :
- la semaine et les précédentes : temps par jour, matières, séances ;
- les notions travaillées sur le programme de l'année, celles qui résistent et celles qui ont
  cédé ;
- une question à poser, tournée vers la stratégie et non vers l'exercice (Hill et Tyson) ;
- la prochaine étape quand il y en a une (relier un appareil, faire les devoirs avec lui) ;
- un point hebdomadaire par e-mail, lisible sans se connecter, que le parent peut couper.
Tout se calcule déjà depuis les séances, les messages et les exercices : rien de nouveau n'est
collecté.

**3. L'élève a un vrai espace.** Un accueil avec Tom et la séance à reprendre ; ses séances,
rangées par matière ; « Mon programme » : les notions de son année, celles qu'il a travaillées,
celles qui résistent, celles qui ont cédé, sans note ni comparaison ; sa semaine, la même que son
parent lit. Une barre de navigation à onglets, sur téléphone et sur ordinateur.

**4. De vraies pages d'entrée.** Une connexion avec le logo, Tom et une phrase de promesse, deux
portes nettes (« Je suis parent », « Je relie mon appareil »), et sur ordinateur, le formulaire à
côté de ce que le produit fait. « Qui utilise Catiche ? » au même niveau.

**5. Le site et l'app, une seule identité.** La landing se refait avec l'app, plus après ; elle
mène à l'app par « Se connecter » dans son en-tête, sur le domaine du produit (par exemple
`app.catiche.fr`, une fois le domaine acheté ; le staging en attendant). Elle n'appelle toujours
ni le serveur ni l'authentification : un lien suffit.

**6. Tom, dessiné pour l'app.** Un Tom en 2D au trait pour l'app (accueil, entrée, états vides,
tête à côté de ses messages), la 3D pour le site ; jamais près de l'énoncé, jamais d'émotion qui
réagit à l'élève.

## La méthode

1. **Une nouvelle passe de direction artistique**, deux ou trois directions, chacune posée dans le
   vrai code sur les trois mêmes écrans : le haut de la landing, la connexion, le tableau de bord
   du parent ; en clair et en sombre, au téléphone et à l'ordinateur ; Victor choisit.
2. **Une charte complète** : en plus des tokens, la grille et les mises en page, la navigation,
   l'iconographie, Tom en 2D, le logo, les graphiques (temps, notions).
3. **Un document d'expérience** (`docs/experience.md`) qui décrit chaque espace et chaque écran,
   ce qu'il montre et d'où vient chaque donnée ; il remplace `etudes/2026-10-11/refonte-interface.md`
   comme plan des écrans.
4. **Les écrans construits dans l'ordre où on les voit** : la landing et l'entrée, les deux
   tableaux de bord avec ce qu'il leur faut côté serveur, la séance, le compte et les données, le
   second parent, le paiement. Chaque écran vu dans Chrome au téléphone et à l'ordinateur, en
   clair et en sombre, avant son merge.

Ce qui est déjà fait au lot 2 reste : les flux, les tests, la sécurité (ajout d'un enfant,
profils, jumelage) ; seul l'habillage se refait.

## La documentation

- `vision.md` réécrite : les principes ci-dessus, le parent qui voit et sait quoi faire, l'espace
  de l'élève, l'identité commune.
- `decisions.md` : « le parent ne voit rien d'autre », « Grands carreaux », « une refonte
  complète de l'interface » et « la landing réécrite avec l'identité » remplacées ; une entrée pour
  cette refonte.
- `roadmap.md` : les lots 1 à 3 fondus en un seul, « Le produit », dans l'ordre de la méthode ;
  Tom (lot 4) et les portes inchangés.
- `charte.md` réécrite avec la nouvelle direction ; `experience.md` créé ;
  `etudes/2026-10-11/refonte-interface.md` reste comme étude datée.
- `suivi.md` mis à jour dans la même PR.

## À trancher par Victor

| Décision | Recommandation |
|---|---|
| Le principe « le soin fait partie de la promesse » et une seule identité, site et app | Oui |
| Le parent voit plusieurs semaines et les notions du programme, plus une question à poser | Oui ; jamais les conversations ni un taux de réussite |
| Un point hebdomadaire par e-mail au parent | Oui, coupable d'un clic ; ce n'est pas une notification de rétention |
| « Mon programme » pour l'élève, sans note ni comparaison | Oui |
| Une barre de navigation à onglets, des mises en page pour l'ordinateur | Oui |
| Tom en 2D au trait pour l'app, la 3D pour le site | Oui |
| La landing refaite maintenant, avec « Se connecter » vers l'app | Oui |
| Les lots 1 à 3 fondus en un lot « Le produit » | Oui |
