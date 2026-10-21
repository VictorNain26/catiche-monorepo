import { BRAND_NAME, CONTACT_EMAIL } from '@/lib/brand';

interface Faq {
  question: string;
  answer: string;
}

// Each answer is checked against the docs, and none repeats the page: docs/produit.md ("L'accès pendant la préparation",
// "Ouvert": the price; "Le point du soir": each family; "Pronote"; "Ce qu'on mesurera"), docs/methode.md ("À retenir" of
// "Ce qui vaut pour tous les élèves"), docs/architecture.md ("Client web"); the shared device's 10 minutes are
// IDLE_MINUTES in apps/server/src/platform/auth/student-sign-in.ts. What is not built is told in the future.
export const FAQS: Faq[] = [
  {
    question: 'Combien ça coûte, et quand ?',
    answer: `Le prix et la date d'ouverture ne sont pas encore fixés. D'ici là, les comptes s'ouvrent sur invitation : écrivez-nous à ${CONTACT_EMAIL}. Demander une invitation ne vous engage à rien.`,
  },
  {
    question: 'Et dans notre famille ?',
    answer:
      "Le point du soir s'adaptera. Rentré tard, l'adulte le verra plus tard, et votre collégien trouvera son « Vu » le lendemain. Dans deux maisons, il ira à l'adulte chez qui il est ce soir-là. Si les devoirs sont un sujet de tension, vous pourrez le couper ; sans adulte disponible, il restera à votre collégien. Il sera proposé par défaut en 6e et en 5e ; en 4e et en 3e, votre collégien choisira de le partager.",
  },
  {
    question: 'Ces gestes marcheront-ils avec Tom ?',
    answer: `Les études citées portent sur des méthodes transmises par des enseignants ou des chercheurs, et ${BRAND_NAME} en reprend les gestes. Pour savoir ce qu'il en reste avec Tom, nous mesurerons dès les premiers élèves les soirées de devoirs par semaine, les devoirs rendus, et l'avis des familles par des questionnaires déjà validés.`,
  },
  {
    // The application is the web client served by the server, laid out for a phone and for a computer.
    question: 'Sur quel appareil ?',
    answer: 'Dans le navigateur, sur un téléphone, une tablette ou un ordinateur, sans rien installer.',
  },
  {
    question: 'Un seul ordinateur pour toute la famille ?',
    answer:
      "Oui. Chacun a son profil et y entre avec son propre code. Sur un ordinateur partagé, son profil se ferme après 10 minutes sans activité, pour qu'un frère ou une sœur n'y entre pas.",
  },
  {
    question: 'Et Pronote ?',
    answer: `${BRAND_NAME} ne se connecte pas à Pronote : votre collégien dira ses devoirs à voix haute, en regardant ce qu'il a noté.`,
  },
];
