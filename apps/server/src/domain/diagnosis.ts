/** The values of a diagnosis (`modules/tutor/core/diagnosis.ts`), which a turn's record keeps. */

export const VERDICTS = ['correct', 'right-step', 'incorrect', 'unclear'] as const;

export const DIAGNOSIS_ERROR_TYPES = ['guess', 'misinterpret', 'careless', 'right-idea', 'imprecise', 'not-sure', 'n/a'] as const;

/** mathjs settled the verdict, or the model alone. */
export const DECIDED_BY = ['mathjs', 'model'] as const;
