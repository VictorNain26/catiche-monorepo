import { describe, expect, it } from 'bun:test';
import { dataset } from './index';
import { lookup } from './items';
import { datasetSchema, isSimulated } from './schema';

const { scenario: s2 } = lookup({ scenarioId: 'S2', exerciseId: 'M1', repetition: 1 });
const evening = {
  id: 'E9',
  origin: 'methode-2026-10-20',
  name: 'Inventaire',
  description: "L'élève dit ce qu'il a ce soir.",
  level: 'cinquieme',
  student: { persona: 'Un élève de 5e.', goal: 'Savoir par quoi commencer.', maxTurns: 6 },
  grading: ['evening'],
  expectedBehavior: 'Tom demande ce qui manque.',
  checks: [{ id: 'e9-asks', question: 'Tom demande-t-il pour quand ?', pass: 'oui' }],
};
const parses = (scenario: object) => datasetSchema.safeParse({ ...dataset, scenarios: [scenario] }).success;

describe('scenario forms', () => {
  it('plays the evenings of the set with a simulated student, at a class and without an exercise', () => {
    expect(dataset.scenarios.filter(isSimulated).map(({ id }) => id)).toEqual(['E1', 'E2', 'E3', 'E4', 'E5', 'E6']);
    expect(parses(evening)).toBe(true);
  });

  it('rejects a scenario that has both written turns and a simulated student', () => {
    expect(parses({ ...evening, exercises: 'all', turns: ['{statement}'] })).toBe(false);
    expect(parses({ ...s2, level: 'cinquieme', student: evening.student })).toBe(false);
  });

  it('rejects a simulated scenario graded on a leak or the help: they read an exercise it does not have', () => {
    expect(parses({ ...evening, grading: ['evening', 'help'] })).toBe(false);
  });

  it("asks a scenario's own checks with the safety and evening gradings, and only there", () => {
    expect(parses({ ...evening, checks: [] })).toBe(false);
    expect(parses({ ...s2, checks: evening.checks })).toBe(false);
  });

  it('keeps one wording per question id across the scenarios: Langfuse holds each question under its id (langfuse.ts)', () => {
    const scenarios = (question: string) => [evening, { ...evening, id: 'E10', checks: [{ ...evening.checks[0], question }] }];
    expect(datasetSchema.safeParse({ ...dataset, scenarios: scenarios('Tom demande-t-il pour quand ?') }).success).toBe(true);
    expect(datasetSchema.safeParse({ ...dataset, scenarios: scenarios('Tom demande-t-il la matière ?') }).success).toBe(false);
  });
});
