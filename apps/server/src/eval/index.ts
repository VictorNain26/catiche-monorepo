/** The evaluation set, validated at load, and the turns a scenario plays on an exercise. */

import sixieme from './exercises/sixieme.json' with { type: 'json' };
import cinquieme from './exercises/cinquieme.json' with { type: 'json' };
import quatrieme from './exercises/quatrieme.json' with { type: 'json' };
import troisieme from './exercises/troisieme.json' with { type: 'json' };
import judgeQuestions from './judge-questions.json' with { type: 'json' };
import scenarios from './scenarios.json' with { type: 'json' };
import {
  datasetSchema,
  STATEMENT_PLACEHOLDER,
  turnText,
  type Check,
  type Exercise,
  type Scenario,
  type SimulatedScenario,
  type WrittenScenario,
} from './schema';

export type { Check, Exercise, Scenario, SimulatedScenario, WrittenScenario };

export const dataset = datasetSchema.parse({
  exercises: [...sixieme, ...cinquieme, ...quatrieme, ...troisieme],
  scenarios,
  judgeQuestions,
});

export function exercisesFor(scenario: WrittenScenario): Exercise[] {
  const { exercises: targets } = scenario;
  if (targets === 'all') return dataset.exercises;
  return dataset.exercises.filter(({ id }) => targets.includes(id));
}

export interface StudentTurn {
  text: string;
  /** Said into the microphone: the turn goes through the voice channel. */
  inputMode?: 'voice';
}

export function renderTurns(scenario: WrittenScenario, exercise: Exercise): StudentTurn[] {
  return scenario.turns.map((turn) => {
    const text = turnText(turn).replaceAll(STATEMENT_PLACEHOLDER, () => exercise.statement);
    return typeof turn === 'string' ? { text } : { text, inputMode: turn.inputMode };
  });
}
