import { z } from 'zod';

/** The levels Tom serves in V1 (`docs/tuteur.md` § 3), the collège. */
export const SCHOOL_LEVELS = ['sixieme', 'cinquieme', 'quatrieme', 'troisieme'] as const;

export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];

export const schoolLevelSchema = z.enum(SCHOOL_LEVELS);

/**
 * Before the 4e, the child works on the family's device, the parent beside or not
 * (`docs/tuteur.md` § 8, « le mode accompagné »).
 */
export const isAccompaniedLevel = (level: SchoolLevel) => level === 'sixieme' || level === 'cinquieme';

/** The class as a teacher writes it, for the exercise sheet. */
export const LEVEL_SHORT_LABELS: Record<SchoolLevel, string> = {
  sixieme: '6e',
  cinquieme: '5e',
  quatrieme: '4e',
  troisieme: '3e',
};
