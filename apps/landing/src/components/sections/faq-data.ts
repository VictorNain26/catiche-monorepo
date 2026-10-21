import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';

interface Faq {
  question: string;
  answer: string;
}

// Each answer is checked against the docs, and none repeats the page: docs/produit.md ("L'accès pendant la préparation",
// "Ouvert": the price; "Le point du soir": each family; "Pronote"; "Ce qu'on mesurera"), docs/methode.md ("À retenir" of
// "Ce qui vaut pour tous les élèves"), docs/architecture.md ("Client web"); the shared device's 10 minutes are
// IDLE_MINUTES in apps/server/src/platform/auth/student-sign-in.ts. In everyday words, saying what Catiche does; what is
// not built is told in the present under a line that says so (docs/charte.md, "Les mots").
export const FAQS: Faq[] = [
  {
    question: 'Combien ça coûte, et quand ?',
    answer: `Le prix et la date d'ouverture restent à fixer. D'ici là, les comptes s'ouvrent sur invitation : écrivez-nous à ${CONTACT_EMAIL}.`,
  },
  {
    question: 'Et dans notre famille ?',
    answer:
      "Le point du soir, que nous construisons, s'adapte à chaque famille. Si l'adulte rentre tard, il voit le point du soir plus tard, et votre collégien trouve son « Vu » le lendemain. Dans deux maisons, le point du soir va à l'adulte chez qui votre collégien est ce soir-là. Si les devoirs sont un sujet de tension, vous pouvez couper le point du soir. Sans adulte disponible, le point du soir reste à votre collégien. Il est proposé d'office en 6e et en 5e ; en 4e et en 3e, votre collégien choisit de le partager.",
  },
  {
    question: 'Est-ce que ça marche avec Tom ?',
    answer: `${BRAND_NAME} reprend des méthodes qui ont fait leurs preuves quand des enseignants ou des chercheurs les transmettent. Avec Tom, la mesure commence avec les premiers élèves : les soirées de devoirs par semaine, les devoirs rendus, et l'avis des familles.`,
  },
  {
    // The application is the web client served by the server, laid out for a phone and for a computer.
    question: 'Sur quel appareil ?',
    answer: `Sur un téléphone, une tablette ou un ordinateur : ${BRAND_NAME} s'ouvre comme un site, sans rien installer.`,
  },
  {
    question: 'Un seul ordinateur pour toute la famille ?',
    answer:
      "Oui. Chacun a son espace et y entre avec son propre code. Sur un ordinateur partagé, son espace se ferme tout seul après 10 minutes sans s'en servir, pour que ses échanges restent à lui.",
  },
  {
    question: 'Et Pronote ?',
    answer: "Votre collégien dit ses devoirs à voix haute, en regardant ce qu'il a noté, sans connexion à Pronote.",
  },
];
