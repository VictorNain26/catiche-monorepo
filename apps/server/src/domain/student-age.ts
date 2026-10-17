/**
 * The ages a student may have, which the web shares (`@repo/server/student-age`): this file
 * imports nothing, so that the web's bundle takes it whole.
 */

/** From the CP to the terminale and beyond for a student who repeated: five to twenty years old. */
export const STUDENT_AGE_YEARS = { min: 5, max: 20 } as const;

/** Whether a birth month, `AAAA-MM`, is that of a child of 5 to 20 on `now`, counted in UTC. */
export function isStudentBirthMonth(month: string, now: Date): boolean {
  const youngest = `${String(now.getUTCFullYear() - STUDENT_AGE_YEARS.min)}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const oldest = `${String(now.getUTCFullYear() - STUDENT_AGE_YEARS.max)}-01`;
  return month >= oldest && month <= youngest;
}
