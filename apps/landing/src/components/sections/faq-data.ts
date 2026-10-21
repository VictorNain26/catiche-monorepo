import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';

// An answer: its paragraphs, and a list as the array of its items.
type Block = string | readonly string[];

interface Faq {
  question: string;
  answer: readonly Block[];
}

// Each answer is checked against the docs: docs/produit.md ("L'accès pendant la préparation", "Le point du soir": each
// family, "Pronote", "Ce qu'on mesurera"), docs/methode.md ("À retenir" of "Ce qui vaut pour tous les élèves"),
// docs/architecture.md ("Client web"); the shared device's 10 minutes are the application's
// (apps/web/src/routes/profils.$studentId.tsx). The product's state is said here once, in the first answer, and at the
// top of the page (docs/charte.md, "Les mots"). A class is written « 6ᵉ », raised on the page (atoms/inline-text.astro).
export const FAQS: readonly Faq[] = [
  {
    question: 'Combien ça coûte, et quand est-ce que ça ouvre\xa0?',
    answer: [
      `En préparation\xa0: les comptes s’ouvrent sur invitation. Le prix de ${BRAND_NAME} n’est pas encore fixé. Pour demander une invitation, écrivez à ${CONTACT_EMAIL}.`,
    ],
  },
  {
    question: 'Vous rentrez tard, ou personne n’est là le soir. Comment ça se passe\xa0?',
    answer: [
      'Le point du soir s’adapte à votre famille.',
      [
        'Vous rentrez tard\xa0: vous lisez le point du soir en arrivant, et votre enfant voit votre réponse le lendemain.',
        'Votre enfant vit dans deux maisons\xa0: le point du soir va à l’adulte chez qui il est ce soir-là.',
        'Personne n’est là\xa0: le point du soir reste à votre enfant et rien ne lui est reproché.',
        'Les devoirs sont un sujet tendu chez vous\xa0: vous pouvez couper le point du soir.',
      ],
      'En 6ᵉ et en 5ᵉ, le point du soir est proposé d’office. En 4ᵉ et en 3ᵉ, votre enfant choisit de le partager.',
    ],
  },
  {
    question: 'Est-ce que ça marche\xa0?',
    answer: [
      `${BRAND_NAME} reprend des méthodes qui ont fait leurs preuves quand des enseignants ou des chercheurs les ont apprises aux élèves. Dès les premiers élèves, nous mesurerons les soirs de devoirs par semaine, les devoirs rendus et l’avis des familles.`,
    ],
  },
  {
    // The application is the web client served by the server, laid out for a phone and for a computer.
    question: 'Sur quel appareil\xa0?',
    answer: [`${BRAND_NAME} marche sur un téléphone, une tablette ou un ordinateur. Il s’ouvre comme un site\xa0: il n’y a rien à installer.`],
  },
  {
    question: 'Nous n’avons qu’un ordinateur pour toute la famille. Comment faire\xa0?',
    answer: [
      'Chaque enfant a son espace et son code. Il choisit son profil, tape son code et retrouve ses devoirs. Son espace se ferme seul quand personne ne s’en sert pendant 10\xa0minutes.',
    ],
  },
  {
    question: 'Faut-il utiliser Pronote\xa0?',
    answer: [`${BRAND_NAME} fonctionne sans Pronote. Votre enfant dit ses devoirs à voix haute, en regardant ce qu’il a noté.`],
  },
];

// An answer in plain text, for the page's FAQPage data (pages/index.astro): one line per paragraph or item.
export function plainAnswer(answer: readonly Block[]): string {
  return answer.map((block) => (typeof block === 'string' ? block : block.map((item) => `– ${item}`).join('\n'))).join('\n');
}
