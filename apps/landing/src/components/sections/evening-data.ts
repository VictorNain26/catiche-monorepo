// The example evening of the home page, in one place: one Tuesday evening, from the top of the page to the moments of
// the evening and the evening check-in, with the same homework at the same hours (docs/produit.md, "Ce que fait
// Catiche"). Maths are due tomorrow, Wednesday; the history test is on Thursday; English is due on Friday. The pupil
// chooses to start with English at 17:35, so the maths exercise comes after it, at 18:00, and English is done first.
export const HOURS = { said: '17:30', ordered: '17:35', started: '18:00', ended: '18:50' } as const;

/** The evening the screens show. */
export const EVENING = 'Mardi soir';

/** At 17:30, the pupil says his homework in a jumble, without dates, and Tom asks what is missing. */
export const FIRST_SAID = "J'ai de l'histoire, de l'anglais et des maths.";
export const MISSING = "Chaque devoir, c'est pour quel jour ? Et en maths, quels exercices ?";

/** At 17:35, the pupil's answer, still in the order he said it, before Tom puts it in order. */
export const SPOKEN = "Le contrôle d'histoire, c'est jeudi. L'anglais, pour vendredi. Et en maths, les exercices 3 et 4 pour demain.";

/** The homework in Tom's order, its end state; `spoken` is its place in what the pupil said, `note` its due date. */
export const HOMEWORK = [
  { subject: 'Maths', note: 'pour demain', spoken: 3 },
  { subject: 'Histoire', note: 'contrôle jeudi', spoken: 1 },
  { subject: 'Anglais', note: 'pour vendredi', spoken: 2 },
] as const;

/** Tom's order, with its reasons; the pupil chooses (docs/produit.md: he can change it). */
export const ORDER_PROPOSED =
  "Je mettrais les maths d'abord, c'est pour demain. Puis une partie de l'histoire, pour le contrôle de jeudi. C'est toi qui choisis l'ordre.";

/** Where the evening ends, on the screen the adult of the house sees: the test comes back the day before it. */
export const CHECK_IN = {
  done: "Anglais, maths, une partie de l'histoire",
  left: "Réviser la suite de l'histoire demain, pour jeudi",
} as const;

/** Tomorrow's bag, Wednesday: the maths to hand in. Nothing says there is history or English on Wednesday. */
export const BAG = ['Cahier de maths, exercices 3 et 4'] as const;
