// The example evening of the home page, in one place: one Tuesday evening, from the top of the page to the moments of
// the evening and the evening check-in, with the same homework at the same hours (docs/produit.md, "Ce que fait
// Catiche"). Maths are due tomorrow, Wednesday; the history test is on Thursday; English is due on Friday. At 17:35 the
// pupil chooses English first; then maths, exercises 3 and 4 from 18:00; then history; the point at 18:50, and the
// adult's answer to the evening check-in at 19:10.
export const HOURS = { said: '17:30', ordered: '17:35', started: '18:00', ended: '18:50', answered: '19:10' } as const;

/** The top line of a screen, as a phone's clock writes it: « Mardi · 17:35 ». */
export function screenTime(time: string): string {
  return `Mardi · ${time}`;
}

/** At 17:35, on the top of the page, the pupil gives each homework's date, in the order they come to him. */
export const SPOKEN = 'L’anglais, pour vendredi. Les maths, pour demain. L’histoire, c’est un contrôle jeudi.';

/** The homework in Tom's order, its end state; `spoken` is its place in what the pupil said, where the list starts
 * before it falls into Tom's order (sections/hero.astro), `note` its due date. */
export const HOMEWORK = [
  { subject: 'Maths', note: 'exercices 3 et 4 · pour demain', spoken: 2 },
  { subject: 'Histoire', note: 'contrôle · jeudi', spoken: 3 },
  { subject: 'Anglais', note: 'pour vendredi', spoken: 1 },
] as const;

/** Tom's order, with its reasons; the pupil chooses (docs/produit.md: he can change it). */
export const ORDER_PROPOSED =
  'Je propose les maths d’abord\xa0: elles sont pour demain. Ensuite l’histoire, à réviser sur deux soirs, puis l’anglais. Tu gardes cet ordre\xa0?';

/** Where the evening ends, at 18:50: the test comes back the day before it. */
export const CHECK_IN = {
  done: 'anglais · maths, exercices 3 et 4 · histoire, le début de la révision',
  left: 'histoire, la suite de la révision demain, pour le contrôle de jeudi',
} as const;

/** Tomorrow's bag, Wednesday: the maths to hand in. */
export const BAG = 'le cahier de maths, exercices 3 et 4';

/** The moments of the evening (sections/evening.astro), from docs/produit.md, "Ce que fait Catiche", and their gestures
 * in docs/methode.md, "Les gestes d'une soirée": the product presented in the present, as docs/produit.md describes it
 * (docs/charte.md, "Les mots"); the pupil acts in each title. A question or a hint is the bottom of Tom's ladder
 * (docs/tuteur.md, § 3), and the hint comes after an attempt; each of Tom's messages is checked before the pupil sees it
 * (§ 4, docs/produit.md, "Nos engagements"). Each one has its hour, its title, its sentence, what its screen shows in
 * words for a screen reader, and the proof of its gesture (docs/methode.md, "Ce qui vaut pour tous les élèves", sources
 * [11] and [13]). */
export const MOMENTS = [
  {
    time: HOURS.said,
    title: 'Votre enfant dit ses devoirs',
    body: 'Il les dit à voix haute, comme ils lui viennent. Tom demande ce qui manque\xa0: la date de chaque devoir, les exercices, un contrôle à venir.',
    described:
      'Exemple d’écran, mardi à 17\xa0h\xa030. Votre enfant dit ses devoirs à voix haute\xa0: de l’histoire, de l’anglais, les exercices 3 et 4 de maths. Tom lui demande pour quand est chaque devoir.',
  },
  {
    time: HOURS.ordered,
    title: 'Votre enfant choisit par où commencer',
    body: 'Tom propose un ordre et dit pourquoi. Votre enfant le garde ou le change.',
    described:
      'Exemple d’écran, mardi à 17\xa0h\xa035. Tom propose de commencer par les maths. Votre enfant préfère l’anglais. La liste devient anglais, maths, histoire. Tom lui demande ce qu’il a à faire en anglais.',
    proof: {
      text: 'Apprendre à planifier son travail puis à faire le point a un effet élevé quand des enseignants l’enseignent, selon une synthèse de 355\xa0études.',
      source: {
        href: 'https://educationendowmentfoundation.org.uk/education-evidence/teaching-learning-toolkit/metacognition-and-self-regulation',
        title: 'Education Endowment Foundation, « Metacognition and self-regulation », Teaching and Learning Toolkit, mis à jour en 2025',
        name: 'Education Endowment Foundation',
      },
    },
  },
  {
    time: HOURS.started,
    title: 'Votre enfant avance par petites étapes',
    body: 'Tom découpe l’exercice en étapes courtes. Votre enfant essaie. Si ça ne marche pas, Tom lui donne un indice. Chaque message de Tom est vérifié avant d’être affiché\xa0: s’il donne la réponse, il est remplacé.',
    described:
      'Exemple d’écran, mardi à 18\xa0h. L’exercice 3 de maths est découpé en trois étapes. Votre enfant essaie 10 comme dénominateur et voit que 10 n’est pas dans la table de 4. Tom lui donne un indice\xa0: un nombre de la table de 4 et de celle de 6. Votre enfant trouve 12 et passe à l’étape 2.',
  },
  {
    time: HOURS.ended,
    title: 'Votre enfant prépare demain',
    body: 'Tom montre ce qui est fait, ce qui reste et ce qui va dans le cartable.',
    described:
      'Exemple d’écran, mardi à 18\xa0h\xa050. Tom fait le point avec votre enfant. Fait\xa0: l’anglais, les exercices 3 et 4 de maths, le début de la révision d’histoire. Reste\xa0: la suite de la révision demain, pour le contrôle de jeudi. Dans le cartable\xa0: le cahier de maths. Un bouton permet à votre enfant de vous montrer ce point.',
    proof: {
      text: 'Réviser sur plusieurs jours en s’interrogeant aide beaucoup\xa0; relire ou surligner aide peu.',
      source: { href: 'https://doi.org/10.1177/1529100612453266', title: 'Dunlosky et al., 2013', name: 'Dunlosky, 2013' },
    },
  },
];
