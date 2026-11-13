/** The collège subjects, named once for the referential, the evaluation set and the tutor (`docs/tuteur.md`, § 3). */
export const SUBJECT_SLUGS = [
  'mathematiques',
  'francais',
  'anglais',
  'espagnol',
  'allemand',
  'italien',
  'histoire-geo',
  'physique-chimie',
  'svt',
  'technologie',
] as const;

export type SubjectSlug = (typeof SUBJECT_SLUGS)[number];

/** The subject of a homework or a test the student notes: a subject of the collège, or another (EPS, arts, latin…). */
export const EVENING_SUBJECTS = [...SUBJECT_SLUGS, 'autre'] as const;

export type EveningSubject = (typeof EVENING_SUBJECTS)[number];
