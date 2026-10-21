import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';

interface Faq {
  question: string;
  answer: string;
}

// Each answer is checked against the docs, and none repeats the page: docs/produit.md ("L'accès pendant la préparation",
// "Ouvert": the price; "Le point du soir": each family; "Pronote"; "Ce qu'on mesurera"), docs/methode.md ("À retenir" of
// "Ce qui vaut pour tous les élèves"), docs/architecture.md ("Client web"); the shared device's 10 minutes are
// IDLE_MINUTES in apps/server/src/platform/auth/student-sign-in.ts. In everyday words, saying what Catiche does; the
// product's state is said here once, in the first answer, and at the top of the page (docs/charte.md, "Les mots").
// The page's FAQPage data (pages/index.astro) is built from these same answers.
export const FAQS: Faq[] = [
  {
    question: 'Combien ça coûte, et quand ?',
    answer: `Le prix et la date d'ouverture restent à fixer. D'ici là, les comptes s'ouvrent sur invitation : écrivez-nous à ${CONTACT_EMAIL}.`,
  },
  {
    question: 'Et si je rentre tard, ou si nous vivons dans deux maisons ?',
    answer:
      "Vous voyez le point du soir en rentrant, et votre collégien trouve votre « Vu » le lendemain. S'il vit dans deux maisons, le point du soir va à l'adulte chez qui il est ce soir-là. Vous pouvez aussi le couper. En 6e et en 5e, il est proposé dès le départ ; en 4e et en 3e, votre collégien choisit de le partager.",
  },
  {
    question: 'Est-ce que ça marche ?',
    answer: `${BRAND_NAME} reprend des méthodes qui marchent quand des enseignants ou des chercheurs les transmettent. Avec Tom, nous le mesurons dès les premiers élèves : combien de soirs par semaine ils travaillent avec lui, les devoirs rendus et l'avis des familles.`,
  },
  {
    // The application is the web client served by the server, laid out for a phone and for a computer.
    question: 'Sur quel appareil ?',
    answer: `Sur un téléphone, une tablette ou un ordinateur : ${BRAND_NAME} s'ouvre comme un site, sans rien installer.`,
  },
  {
    question: 'Un seul ordinateur pour toute la famille ?',
    answer:
      "Oui. Chaque collégien a son espace et y entre avec son propre code. Sur un ordinateur partagé, son espace se ferme tout seul après 10 minutes sans qu'il s'en serve, pour que ses échanges restent à lui.",
  },
  {
    question: 'Et Pronote ?',
    answer: "Votre collégien dit ses devoirs à voix haute, en regardant ce qu'il a noté : pas besoin de Pronote.",
  },
];
