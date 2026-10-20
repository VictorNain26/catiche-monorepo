import { BrainCircuit, CalendarClock, Clock, GraduationCap, Monitor, NotebookPen, School, ShieldCheck, Wallet } from '@lucide/astro';
import { BRAND_NAME } from '@/lib/brand';

// Each answer is checked against the docs: docs/produit.md, docs/tuteur.md, docs/architecture.md.
export const FAQS = [
  {
    question: 'Dès quelle classe ?',
    answer: `De la 6e à la 3e. ${BRAND_NAME} est pensé pour le collège, et seulement pour lui.`,
    icon: GraduationCap,
  },
  {
    question: `Quand ${BRAND_NAME} ouvre-t-il ?`,
    answer: `${BRAND_NAME} est en préparation, et sa date d'ouverture n'est pas fixée. Les familles qui nous écrivent seront prévenues en premier.`,
    icon: CalendarClock,
  },
  {
    question: 'Combien ça coûte ?',
    answer: "Le prix sera annoncé à l'ouverture. Nous écrire ne vous engage à rien.",
    icon: Wallet,
  },
  {
    question: 'Et Pronote ?',
    answer: `${BRAND_NAME} ne se connecte pas à Pronote, et n'utilise aucun accès non officiel. Votre enfant dira ses devoirs à voix haute, à partir de son agenda ou de ce qu'il a noté.`,
    icon: NotebookPen,
  },
  {
    question: 'Et Devoirs faits, au collège ?',
    answer: `Devoirs faits est le temps d'aide aux devoirs que propose le collège. ${BRAND_NAME} ne le remplace pas. Il sert le soir, à la maison : pour les devoirs qui restent, le sac du lendemain et les contrôles à préparer.`,
    icon: School,
  },
  {
    question: "Un seul ordinateur pour toute la famille, c'est possible ?",
    answer:
      "Oui. Chaque enfant a son profil sur l'ordinateur de la famille, et l'ouvre par son propre code. Sur un appareil partagé, sa session se ferme après 10 minutes sans usage, pour que son frère ou sa sœur n'y entre pas.",
    icon: Monitor,
  },
  {
    question: 'Combien de temps par soir ?',
    answer:
      "Le temps de ses devoirs, pas plus. Tom coupera le travail en étapes d'environ 10 minutes, et la soirée finira quand tout sera fait. Nous mesurerons la durée réelle avec les premières familles.",
    icon: Clock,
  },
  {
    question: 'Tom donne-t-il les réponses ?',
    answer:
      "Tom est conçu pour ne pas donner la réponse d'un exercice. Il cherche d'abord où ça coince, puis aide par étapes : une question, un indice, une étape. Si votre enfant bloque encore, Tom montre un exemple proche, déjà résolu, dont il reprend la méthode. Chaque message de Tom est vérifié avant d'arriver à votre enfant : s'il contient la réponse, il est réécrit ou remplacé.",
    icon: BrainCircuit,
  },
  {
    question: 'Que deviennent les données de mon enfant ?',
    answer:
      "Aujourd'hui, aucune donnée d'élève n'est collectée : l'application n'est pas ouverte. Ensuite, ses messages seront traités par les modèles de Mistral AI, en Europe, et gardés chez Clever Cloud, à Paris. Aucune publicité, aucune revente. Vous pourrez consulter, corriger ou supprimer ses données sur simple demande.",
    icon: ShieldCheck,
  },
];
