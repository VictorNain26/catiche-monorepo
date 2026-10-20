import { BRAND_NAME } from '@/lib/brand';

interface Faq {
  question: string;
  answer: string;
  sources?: { href: string; label: string }[];
}

// Each answer is checked against the docs: docs/produit.md, docs/methode.md, docs/tuteur.md, docs/architecture.md.
export const FAQS: Faq[] = [
  {
    question: 'Dès quelle classe ?',
    answer: `De la 6e à la 3e. ${BRAND_NAME} est pensé pour le collège, et seulement pour lui.`,
  },
  {
    question: 'Comment avoir un compte, et combien ça coûte ?',
    answer: `${BRAND_NAME} est en préparation : les comptes s'ouvrent sur invitation, et la date d'ouverture à tous n'est pas fixée. Le prix sera annoncé à l'ouverture.`,
  },
  {
    question: 'Sur quoi repose la méthode ?',
    answer:
      "Noter ses devoirs et ses contrôles, vérifier ses affaires, découper le travail, préparer un contrôle les jours d'avant : ces gestes viennent de HOPS, un programme d'aide à l'organisation testé auprès de collégiens qui peinent à s'organiser. Dans ce programme, un adulte vérifie à chaque séance ; rien ne prouve encore qu'une application fasse aussi bien. Ce que donne Tom, nous le mesurerons et le publierons.",
    // HOPS in docs/methode.md, "Sources": its trial [1], and the protocol [7] the gestures come from; no effect size on the page.
    sources: [
      { href: 'https://europepmc.org/article/MED/29172596', label: 'Essai de HOPS, Langberg et al., 2018' },
      { href: 'https://www.medrxiv.org/content/10.64898/2026.02.13.26346294v1', label: 'Protocole de HOPS, Nissley-Tsiopinis et al., 2026' },
    ],
  },
  {
    question: 'Tom donne-t-il les réponses ?',
    answer:
      "Tom est conçu pour ne pas donner la réponse d'un exercice. Il cherche d'abord où ça coince, puis aide par étapes : une question, un indice, une étape. Si votre enfant bloque encore, Tom montre un exemple proche, déjà résolu, dont il reprend la méthode. Chaque message de Tom est vérifié avant d'arriver à votre enfant : s'il contient la réponse, il est réécrit ou remplacé.",
  },
  {
    question: 'Et Pronote ?',
    answer: `${BRAND_NAME} ne se connecte pas à Pronote, et n'utilise aucun accès non officiel. Votre enfant dit ses devoirs à voix haute, à partir de son agenda ou de ce qu'il a noté.`,
  },
  {
    question: "Un seul ordinateur pour toute la famille, c'est possible ?",
    answer:
      "Oui. Chaque enfant a son profil sur l'ordinateur de la famille, et l'ouvre par son propre code. Sur un appareil partagé, sa session se ferme après 10 minutes sans usage, pour que son frère ou sa sœur n'y entre pas.",
  },
];
