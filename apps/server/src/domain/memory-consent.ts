/**
 * Who decides the learner memory (`docs/tuteur.md` § 8):
 * before 15, the parent proposes it and the child accepts it, either one switching it off; from
 * 15, the child alone (loi Informatique et Libertés, art. 45).
 */

import { ageAt } from './student-age';

const SELF_CONSENT_AGE = 15;

/** The child's answers, as the API takes them and the profile stores them. */
export const MEMORY_ANSWERS = ['accepted', 'declined'] as const;
export type MemoryAnswer = (typeof MEMORY_ANSWERS)[number];

/** off: nothing asked of the child; asked: the child may answer; active: Tom reads the memory. */
type MemoryState = 'off' | 'asked' | 'active';

export interface MemoryConsent {
  /** The month of birth, `YYYY-MM-DD` on its first day. */
  birthMonth: string;
  proposedAt: Date | null;
  answer: MemoryAnswer | null;
}

/** The state of the memory, whether the child may answer it, and whether they decide alone. */
export function memoryConsent({ birthMonth, proposedAt, answer }: MemoryConsent, now: Date) {
  const decidesAlone = ageAt(birthMonth, now) >= SELF_CONSENT_AGE;
  const mayAnswer = decidesAlone || proposedAt !== null;
  const state: MemoryState = !mayAnswer || answer === 'declined' ? 'off' : answer === 'accepted' ? 'active' : 'asked';
  return { state, mayAnswer, decidesAlone };
}
