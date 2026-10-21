import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';

interface Faq {
  question: string;
  answer: string;
  sources?: { href: string; label: string }[];
}

// Each answer is checked against the docs: docs/produit.md, docs/methode.md, docs/tuteur.md (§ 2, Mistral; § 4, the check before
// the pupil), docs/architecture.md, docs/charte.md ("Les mots") and apps/server/src/modules/tutor/core/prompt.ts (never a friend); the shared device's 10 minutes are
// IDLE_MINUTES in apps/server/src/platform/auth/student-sign-in.ts.
export const FAQS: Faq[] = [
  {
    question: 'Dès quelle classe ?',
    answer: `De la 6e à la 3e. ${BRAND_NAME} est pensé pour le collège.`,
  },
  {
    question: 'Comment avoir un compte, et combien ça coûte ?',
    answer: `${BRAND_NAME} est en préparation. Pour l'instant, les comptes s'ouvrent sur invitation : écrivez-nous à ${CONTACT_EMAIL} pour en demander une. Le prix sera annoncé à l'ouverture.`,
  },
  {
    question: 'Sur quoi repose la méthode ?',
    answer:
      "Sur les gestes d'un programme d'aide à l'organisation pour collégiens, HOPS, testé dans un essai scientifique : noter ses devoirs et ses contrôles, vérifier ses affaires, découper le travail, réviser un contrôle les jours d'avant. Dans ce programme, un adulte vérifie à chaque séance. Rien ne prouve encore qu'une application fasse aussi bien : nous le mesurerons et publierons ce que nous trouvons.",
    // HOPS in docs/methode.md, "Sources": its trial [1], and the protocol [7] the gestures come from; no effect size on the page.
    sources: [
      { href: 'https://europepmc.org/article/MED/29172596', label: 'Essai de HOPS, Langberg et al., 2018' },
      { href: 'https://www.medrxiv.org/content/10.64898/2026.02.13.26346294v1', label: 'Protocole de HOPS, Nissley-Tsiopinis et al., 2026' },
    ],
  },
  {
    question: 'Tom donne-t-il les réponses ?',
    answer:
      "Non. Tom cherche d'abord où votre enfant bloque, puis l'aide pas à pas : une question, un indice, une étape. S'il bloque encore, Tom montre un exemple proche, déjà résolu. Chaque message de Tom est vérifié avant d'être affiché : s'il contient la réponse, il est réécrit ou remplacé.",
  },
  {
    question: 'Tom est-il une intelligence artificielle ?',
    answer:
      "Oui. Tom fonctionne avec les modèles de Mistral AI, une entreprise française. Il ne se présente jamais comme un ami, et chaque message est vérifié avant d'être affiché à votre enfant.",
  },
  {
    question: 'Et Pronote ?',
    answer: `${BRAND_NAME} ne se connecte pas à Pronote. Votre enfant dit ses devoirs à voix haute, en regardant son agenda ou ce qu'il a noté.`,
  },
  {
    question: 'Un seul ordinateur pour toute la famille ?',
    answer:
      "Oui. Chaque enfant a son profil et y entre avec son propre code. Sur un ordinateur partagé, son profil se ferme après 10 minutes sans activité, pour qu'un frère ou une sœur n'y entre pas.",
  },
];
