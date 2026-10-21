// The example evening of the home page, in one place: the top of the page, the moments of the evening and the evening
// check-in show the same homework at the same hours (docs/produit.md, "Ce que fait Catiche"). The hours follow the lengths: the work starts at
// 17:40, and its 30 + 15 + 20 minutes end it a little before 18:50.
export const HOURS = { said: '17:30', ordered: '17:35', started: '17:40', ended: '18:50' } as const;

/** What the pupil says, in a jumble, before Tom asks what is missing. */
export const SPOKEN = "J'ai anglais, un contrôle d'histoire, et les exercices 3 et 4 en maths.";

/** The homework in Tom's order, its end state; `spoken` is its place in what the pupil said. */
export const HOMEWORK = [
  { subject: 'Maths', length: '30 min', spoken: 3 },
  { subject: 'Anglais', length: '15 min', spoken: 1 },
  { subject: 'Histoire', length: '20 min', spoken: 2 },
] as const;

export const ORDER_PROPOSED = 'Je te propose cet ordre. Tu peux le changer.';

/** Where the evening ends, on the screen the adult of the house sees: the test comes back the day before it. */
export const CHECK_IN = { done: 'Maths, anglais, histoire', left: "Revoir l'histoire demain, pour jeudi" } as const;
