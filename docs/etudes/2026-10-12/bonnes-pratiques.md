# Les bonnes pratiques de chaque métier, pour refaire Catiche (2026-10-12)

Recherche du 2026-10-12, après le choix de la direction « Rive » par Victor
([comparatif](https://claude.ai/artifact/JrKtG7Zd48J7BE9irjoVrY)) : ce que publient les métiers
de l'interface, du site, de l'identité et de l'ingénierie front, pour que le plan du lot 1
(`roadmap.md`) ne repose sur rien d'inventé. Sources consultées le 2026-10-12 ; « non trouvé »
quand aucune source primaire n'a été trouvée. Les règles retenues vont dans `charte.md`,
`experience.md` et `.claude/rules/design-system.md`.

## L'interface de l'app

**Navigation.**
- Peu de destinations : une barre d'onglets en bas, toujours visible, avec icône et libellé d'un
  mot, jamais une action ([Apple HIG](https://developer.apple.com/design/human-interface-guidelines/tab-bars)) ;
  deux à cinq destinations pour une barre, trois à sept pour un rail (Material, cité par
  [SAP Fiori](https://www.sap.com/design-system/fiori-design-android/v26-4/components/m3-standard-components/navigation-bar/usage)).
- Un menu caché divise l'usage de la navigation par deux : 44 % contre 89 % quand elle est
  visible ([NN/g 2016](https://www.nngroup.com/articles/find-navigation-mobile-even-hamburger/)) ;
  « visible navigation is the gold standard » ([NN/g 2021](https://www.nngroup.com/articles/vertical-nav/)).
- Du téléphone à l'ordinateur : la barre du bas sous 600 px, un rail ou une barre latérale
  au-delà, à partir de 840 px pour une barre permanente
  ([Android, classes de fenêtre](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes)).
- Profils d'une famille : Netflix limite le profil enfant et le verrouille, Disney+ le protège
  d'un code ([Netflix](https://help.netflix.com/en/node/10421)) ; dans une étude de foyers, chacun
  ne passe sur son profil que quand la tâche le demande (Egelman et al., CSCW 2008). Aucune règle
  officielle trouvée sur le changement de profil parent-enfant.

**Tableaux de bord.**
- Le résumé d'abord, le détail à la demande ([Shneiderman 1996](https://drum.lib.umd.edu/handle/1903/5784)).
- Longueur et position se lisent mieux qu'angle et aire : barres et lignes, pas d'anneau ni de
  camembert, pas de 3D ([NN/g 2017](https://www.nngroup.com/articles/dashboards-preattentive/) ;
  Cleveland et McGill 1984 ; [Few 2007](https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf)).
- Le guide du gouvernement britannique ([Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/)) :
  savoir dire le message en une phrase ; barres partant de zéro ; étiquettes directes plutôt
  qu'une légende ; barres empilées à quatre segments au plus ; un texte qui donne le message et un
  tableau pour les valeurs.
- Accessibilité : une description courte et une longue, qui peut rester visible
  ([W3C WAI](https://www.w3.org/WAI/tutorials/images/complex/)) ; jamais la couleur seule
  ([WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)) ; 3:1 pour les
  éléments graphiques ([1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
- États : jamais un vide total, jamais « aucune donnée » pendant le chargement, l'action qui
  remplit l'espace sur place ([NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)) ;
  rien sous une seconde, un squelette jusqu'à dix
  ([NN/g](https://www.nngroup.com/articles/skeleton-screens/)).

**Adolescents.** Textes courts et listes ; « kid » les repousse ; couleurs vives et animations
lourdes les détournent ; petits caractères et cibles précises les gênent
([NN/g 2019](https://www.nngroup.com/articles/usability-of-websites-for-teenagers/)). Information
courte au moment de l'usage, pas de boucle de récompense ni de notification qui prolonge l'usage
([ICO, normes 4, 5 et 13](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/4-transparency/) ;
[CNIL, recommandation 6](https://www.cnil.fr/recommandation-6-renforcer-linformation-et-les-droits-des-mineurs-par-le-design)).

**Composants.**
- Des cartes pour des blocs différents qui mènent à un détail ; une liste pour des éléments
  semblables, à comparer : « card layouts are less scannable than lists »
  ([NN/g](https://www.nngroup.com/articles/cards-component/)).
- Un seul bouton principal par écran, un libellé qui dit l'action, pas de bouton désactivé
  ([GOV.UK](https://design-system.service.gov.uk/components/button/)) ; une question par page dans
  un formulaire ([GOV.UK](https://www.gov.uk/service-manual/design/form-structure)) ; un seul
  bandeau de confirmation par page ([GOV.UK](https://design-system.service.gov.uk/components/notification-banner/)) ;
  l'erreur au champ, jamais en toast ([NN/g 2024](https://www.nngroup.com/articles/indicators-validations-notifications/)).

**Lecture.** Corps à 17 px au moins sur iOS, jamais de graisse fine
([Apple](https://developer.apple.com/design/human-interface-guidelines/typography)) ; 19 px chez
[GOV.UK](https://design-system.service.gov.uk/styles/type-scale/) ; 45 à 75 caractères par ligne
([Bringhurst](https://webtypography.net/2.1.2)) ; cibles de 44 px
([WCAG 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html), Apple),
48 quand c'est possible (Android) ; aucun défilement horizontal à 320 px
([1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)).

## Le site et l'entrée

**Page d'accueil.** En tête, une phrase : ce que fait le produit et pour qui ; de vrais exemples
plutôt que des descriptions ([NN/g](https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/)) ;
57 % du temps de lecture au-dessus de la ligne de flottaison
([NN/g](https://www.nngroup.com/articles/scrolling-and-attention/)) ; un appel à l'action qui dit
où il mène, jamais « Commencer » ([NN/g](https://www.nngroup.com/articles/get-started/)).
Publier un avis non vérifié est une pratique commerciale trompeuse (art. L121-4 du code de la
consommation) : aucune preuve sociale tant qu'elle n'existe pas.

**Tarifs.** Le prix est l'information la plus cherchée ; le cacher fait partir
([NN/g](https://www.nngroup.com/articles/show-price/)) ; formules côte à côte, coût total visible
([NN/g](https://www.nngroup.com/articles/phone-plan-ux/)) ; prix TTC ; depuis le 2023-06-01,
« résilier votre contrat » en ligne, accessible directement, avec récapitulatif, confirmation et
accusé de réception (art. L215-1-1 ; [service-public](https://www.service-public.gouv.fr/particuliers/actualites/A16599)) ;
aucune interface trompeuse ([CNIL](https://apparences-trompeuses.beta.cnil.fr/Assets/files/Guide-designs-trompeurs.pdf)).

**Entrée sans mot de passe.** L'adresse d'abord, avec `autocomplete="username webauthn"` ; le
code à usage unique (`one-time-code`, `inputmode="numeric"`), qui expire, avec un renvoi et une
limite d'essais ([GOV.UK](https://design-system.service.gov.uk/patterns/confirm-an-email-address/)) ;
la clé d'accès proposée après une connexion réussie, gérable dans le compte, l'e-mail toujours en
secours ([Google](https://developers.google.com/identity/passkeys/ux/user-journeys) ;
[FIDO](https://www.passkeycentral.org/design-user-journeys/required-patterns/) ;
[web.dev](https://web.dev/articles/passkey-checklist)). Une clé d'accès enregistrée sur
`catiche.fr` vaut pour ses sous-domaines, l'inverse non : le domaine se choisit avant la
production.

**Rattachement d'un appareil.** Un code court, sans caractère ambigu, en groupes, à durée courte
et à essais limités ; dire à la personne qu'elle autorise un appareil
([RFC 8628](https://www.rfc-editor.org/rfc/rfc8628)) ; la liste des appareils reliés, révocables
([WhatsApp](https://engineering.fb.com/2021/07/14/security/whatsapp-multi-device/)).

**Site et app.** L'app en `noindex` par en-tête, jamais par robots.txt seul
([Google](https://developers.google.com/search/docs/crawling-indexing/block-indexing)) ; aucun
cookie non essentiel, donc pas de bandeau ([CNIL](https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience)).
Performance : LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1
([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)) ; l'image principale
dans le HTML, prioritaire, jamais différée ([web.dev](https://web.dev/articles/optimize-lcp)) ;
fontes WOFF2 en sous-ensemble ([web.dev](https://web.dev/learn/performance/optimize-web-fonts)).

## L'identité et le système

**Charte.** Recherche, stratégie, identité, points de contact, gestion
(Wheeler, *Designing Brand Identity*). Une icône d'app : peu de formes, pas de trait fin ni de
texte, lisible en clair, en sombre et teintée
([Apple](https://developer.apple.com/design/human-interface-guidelines/app-icons)) ; les fichiers
d'icônes : ICO 32, SVG avec sombre, 180, 192, 512 et 512 « maskable »
([Evil Martians](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)).

**Couleurs.** Une échelle à douze pas par couleur, chaque pas à son rôle (fonds, composants,
bordures, aplats, texte), une échelle sombre à part, pas une inversion
([Radix](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)) ;
OKLCH dans Tailwind v4 ([Tailwind](https://tailwindcss.com/docs/colors)) ; WCAG 2.2 reste la
norme, APCA n'est pas celle de WCAG 3 ([Roselli 2026](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html)).
Mesuré sur Rive : jonc sur brume 1,21:1, jamais en texte ni en bordure ; bleu-vert et pelage
1,48:1, jamais côte à côte dans un graphique. Graphiques : une palette catégorielle à part, dans
un ordre fixe ([Carbon](https://carbondesignsystem.com/data-visualization/color-palettes/)).

**Fontes.** Atkinson Hyperlegible Next variable, 34 Ko en latin, avec chiffres tabulaires et
fractions ; Bricolage Grotesque chargée sur l'axe de graisse seul, 41 Ko contre 132 Ko avec ses
trois axes (fichiers mesurés le 2026-10-12).

**Tom.** Mailchimp : Freddie ne parle pas, on n'écrit pas dans sa voix
([Mailchimp](https://styleguide.mailchimp.com/voice-and-tone/)) ; Duolingo dessine avec peu de
formes et de détails (blog de 2020, site de design redirigé : à revérifier avant d'en citer une
règle). Le passage au trait part du modificateur Line Art de Blender
([manuel](https://docs.blender.org/manual/en/latest/grease_pencil/modifiers/generate/line_art.html)),
puis une planche de référence (vues, attitudes) ; aucune source de studio trouvée sur la planche.

**Icônes.** Lucide, trait de 2 px à 24 px, `absoluteStrokeWidth`
([Lucide](https://lucide.dev/contribute/icon-design-guide)) ; toujours un libellé à côté
([NN/g](https://www.nngroup.com/articles/icon-usability/)).

**Tokens.** Le format du W3C Design Tokens Community Group est stable depuis le 2025-10-28
([DTCG](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)) ; Primer
étage primitives, rôles et composants ([Primer](https://primer.style/foundations/primitives/token-names)).
Pas de token de composant avant son besoin.

**Mouvement.** Durées et courbes en tokens (Material : courbe standard `cubic-bezier(0.2, 0, 0, 1)` ;
[Carbon](https://carbondesignsystem.com/elements/motion/overview/) : 70 à 700 ms) ; le mouvement
optionnel, jamais seul porteur d'une information
([Apple](https://developer.apple.com/design/human-interface-guidelines/motion) ;
[WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).

## L'ingénierie front

**Composants.** shadcn/ui : on possède le code, on compose
([shadcn](https://ui.shadcn.com/docs)) ; Radix reste maintenu et pris en charge à côté de Base UI,
devenu le défaut de shadcn en 2026 ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)) ;
`radix-ui` 1.8.0 du 2026-10-12. `@repo/ui` part déjà de Radix (`Slot`) : une seule famille de
primitives, Radix, pour le dialogue, les onglets, le tiroir et le toast. Toasts : `sonner` 2.0.8
(août 2026), maintenu.

**Graphiques.** Pour sept barres et une répartition, un SVG écrit dans `@repo/ui` suit le guide
britannique sans dépendance ; Recharts 3 (accessible par défaut, base du Chart de shadcn) seulement
si l'interactivité devient nécessaire. Écartés : Nivo, sans version depuis mai 2025 ; Chart.js,
sans version depuis octobre 2025 et dessiné en canvas.

**Mise en page.** Le viewport décide de la coquille (onglets en bas, puis rail ou barre latérale),
les container queries de Tailwind v4 décident de l'intérieur des cartes
([Tailwind](https://tailwindcss.com/docs/responsive-design)).

**Vérification visuelle.** `toHaveScreenshot` de Playwright, références générées et comparées dans
l'image officielle `mcr.microsoft.com/playwright` à la version exacte de `@playwright/test`, en
local comme en CI ([Playwright](https://playwright.dev/docs/docker)) : c'est ce que fait GitHub
Primer ([Primer](https://github.com/primer/react/blob/main/contributor-docs/testing.md)). Argos
(gratuit jusqu'à 5 000 captures par mois) seulement si les écarts restent ingérables ; Lost Pixel
est archivé, Chromatic gratuit n'a pas Safari.

**Accessibilité automatisée.** `@axe-core/playwright` 4.13.0 sur chaque état conçu
([Playwright](https://playwright.dev/docs/accessibility-testing)) ; axe voit environ 57 % des
problèmes selon son éditeur ([Deque 2021](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues)) :
le clavier et VoiceOver restent à la main ([GOV.UK](https://www.gov.uk/service-manual/helping-people-to-use-your-service/testing-for-accessibility)).

**Documentation des composants.** Storybook 10 ajoute une seconde chaîne de build ; Ladle n'a pas
de version depuis novembre 2025. Pour un développeur seul, une page de catalogue dans l'app, en
développement seulement, capturée par Playwright, suffit.

**Processus.** Prototyper dans le code, sans copier le prototype tel quel en production
([GOV.UK](https://www.gov.uk/service-manual/design/making-prototypes)) ; un composant entre dans le
système s'il est utile, unique, utilisable, cohérent et polyvalent
([GOV.UK](https://design-system.service.gov.uk/community/contribution-criteria/)).

## Ce que la recherche ne tranche pas

Aucune étude sur l'effet d'un tableau de bord parent ; aucune règle officielle sur le changement de
profil parent-enfant ; les pages de Material 3 et la recommandation 5 de la CNIL n'ont pas pu être
lues ; aucune liste canonique du contenu d'une charte par un studio reconnu.
