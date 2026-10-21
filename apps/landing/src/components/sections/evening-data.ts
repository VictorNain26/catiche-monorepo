// The example evening of the home page, in one place: the top of the page, the moments of the evening and the evening
// check-in show the same homework at the same hours (docs/produit.md, "Ce que fait Catiche").
export const HOURS = { said: '17:30', ordered: '17:35', started: '17:40', ended: '18:50' } as const;

/** What the pupil says, in a jumble, before Tom puts it in order. */
export const SPOKEN = "J'ai un contrôle d'histoire jeudi, de l'anglais, et les exercices 3 et 4 en maths pour demain.";

/** The homework in Tom's order, its end state; `spoken` is its place in what the pupil said, `note` why it stands there. */
export const HOMEWORK = [
  { subject: 'Maths', note: 'pour demain', spoken: 3 },
  { subject: 'Anglais', note: '', spoken: 2 },
  { subject: 'Histoire', note: 'une partie ce soir', spoken: 1 },
] as const;

/** Tom's order, with its reasons; the pupil chooses (docs/produit.md: he can change it). */
export const ORDER_PROPOSED =
  "Je mettrais les maths d'abord, c'est pour demain. L'histoire, on en révise une partie ce soir : le contrôle est jeudi. C'est toi qui choisis l'ordre.";

/** Where the evening ends, on the screen the adult of the house sees: the test comes back the day before it. */
export const CHECK_IN = { done: 'Maths, anglais, histoire', left: "Revoir l'histoire demain, pour jeudi" } as const;
