/**
 * The tutor's fixtures, for its tests: what the fake Mistral answers for a turn's analysis and an
 * exercise's sheet, and a turn as the repository saves it. Each test changes what it checks.
 */

import type { TurnAnalysis } from './core/analysis';
import type { ExerciseSheet } from './core/sheet';
import type { SavedTurn } from './repository';

/** The analysis of a student's message, as the model answers it: a maths message, nothing asked. */
export const analysis = (overrides: Partial<TurnAnalysis> = {}) => ({
  json: {
    subject: 'mathematiques',
    bringsExercise: false,
    proposesAnswer: false,
    asksSolution: false,
    asksExplanation: false,
    saysStuck: false,
    ...overrides,
  },
});

/** The sheet of « Résous 3x + 5 = 20. », on no notion of the referential. */
export const sheet = (overrides: Partial<ExerciseSheet> = {}): ExerciseSheet => ({
  statement: 'Résous 3x + 5 = 20.',
  kind: 'short',
  answer: 'x = 5',
  answerForms: ['5'],
  mathEquation: '3*x + 5 = 20',
  mathAnswer: 'x = 5',
  steps: [],
  commonErrors: [],
  rule: null,
  facts: [],
  expectedElements: [],
  entries: [],
  laterEntries: [],
  ...overrides,
});

/** The sheet as the model drafts it, its steps written out. */
export const draft = (overrides: Partial<ExerciseSheet> = {}) => ({
  json: {
    hasExercise: true,
    ...sheet({ answerForms: ['5', 'x = 5'], steps: ['Retrancher 5 : 3x = 15', 'Diviser par 3 : x = 5'], ...overrides }),
  },
});

/** The record of a turn that passed every check. */
export const record = (overrides: Partial<SavedTurn['record']> = {}): SavedTurn['record'] => ({
  model: 'm',
  promptVersion: 'v',
  newExercise: false,
  findings: [],
  outcome: 'passed',
  ...overrides,
});

/** A turn with no exercise, as the repository saves it. */
export const turn = (overrides: Partial<SavedTurn> = {}): SavedTurn => ({
  exchange: { studentText: 'Je bloque sur le + 5', photoText: null, tutorText: 'Que fais-tu du + 5 ?', replay: null },
  subject: null,
  newExercise: null,
  exerciseId: null,
  progress: null,
  record: record(),
  ...overrides,
});
