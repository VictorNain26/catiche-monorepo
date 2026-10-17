/**
 * A student's age, counted one way for all: the bounds of admission, which the web shares
 * (`@repo/server/student-age`), and the memory consent (`memory-consent.ts`). This file imports
 * nothing, so that the web's bundle takes it whole.
 */

/** From the CP to the terminale and beyond for a student who repeated: five to twenty years old. */
export const STUDENT_AGE_YEARS = { min: 5, max: 20 } as const;

/**
 * The age in full years on `now`, in UTC, of a child born in `birthMonth` (`YYYY-MM`, a day after
 * it ignored). Only the month is known, so the birthday counts once its month is over: a child is
 * never taken for older than they are, and one under 15 never decides their memory alone.
 */
export function ageAt(birthMonth: string, now: Date): number {
  const [year = 0, month = 1] = birthMonth.split('-').map(Number);
  const age = now.getUTCFullYear() - year;
  return now.getUTCMonth() + 1 > month ? age : age - 1;
}

/** Whether a birth month, `YYYY-MM`, is that of a child of 5 to 20 on `now`. */
export function isStudentBirthMonth(birthMonth: string, now: Date): boolean {
  const age = ageAt(birthMonth, now);
  return age >= STUDENT_AGE_YEARS.min && age <= STUDENT_AGE_YEARS.max;
}
