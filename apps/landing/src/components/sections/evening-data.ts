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

/** At 17:35, on the top of the page, the pupil gives each homework's date. */
export const SPOKEN = 'Les maths pour demain. L’histoire, c’est un contrôle jeudi. L’anglais, pour vendredi.';

/** The homework in Tom's order, its end state; `spoken` is its place in what the pupil said, `note` its due date. */
export const HOMEWORK = [
  { subject: 'Maths', note: 'exercices 3 et 4 · pour demain', spoken: 1 },
  { subject: 'Histoire', note: 'contrôle · jeudi', spoken: 2 },
  { subject: 'Anglais', note: 'pour vendredi', spoken: 3 },
] as const;

/** Tom's order, with its reasons; the pupil chooses (docs/produit.md: he can change it). */
export const ORDER_PROPOSED =
  'Les maths passent en premier\xa0: elles sont pour demain. L’histoire suit, pour réviser le contrôle sur deux soirs, puis l’anglais. Tu gardes cet ordre\xa0?';

/** Where the evening ends, at 18:50: the test comes back the day before it. */
export const CHECK_IN = {
  done: 'anglais · maths, exercices 3 et 4 · histoire, le début de la révision',
  left: 'histoire, la suite de la révision demain, pour le contrôle de jeudi',
} as const;

/** Tomorrow's bag, Wednesday: the maths to hand in. */
export const BAG = 'le cahier de maths, exercices 3 et 4';
