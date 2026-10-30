/** The conversations a run plays: scenario × exercise × repetition, narrowed by the run's filters. */

import { dataset, exercisesFor, type Exercise, type Scenario } from './index';

/** The tutor as it runs, or without the programme of the referential: the A/B that decides whether it stays. */
export const VARIANTS = ['programme', 'none'] as const;
export type Variant = (typeof VARIANTS)[number];

export interface Item {
  scenarioId: string;
  exerciseId: string;
  repetition: number;
  variant: Variant;
}

export interface RunFilters {
  repeat: number;
  scenario?: readonly string[] | undefined;
  exercise?: readonly string[] | undefined;
  variants: readonly Variant[];
}

/** The conversation's pair: the same scenario, exercise and repetition under each variant. */
export const pairOf = ({ scenarioId, exerciseId, repetition }: Pick<Item, 'scenarioId' | 'exerciseId' | 'repetition'>) =>
  `${scenarioId}:${exerciseId}:${String(repetition)}`;

export const keyOf = (item: Item) => `${pairOf(item)}:${item.variant}`;

/**
 * The variants of a pair one after the other, so that a drift of the model over the run touches
 * both, the first in turn from one repetition to the next, so that an order effect does too.
 */
export function buildItems({ repeat, scenario, exercise, variants }: RunFilters): Item[] {
  return dataset.scenarios
    .filter((s) => !scenario || scenario.includes(s.id))
    .flatMap((s) =>
      exercisesFor(s)
        .filter((e) => !exercise || exercise.includes(e.id))
        .flatMap((e) =>
          Array.from({ length: repeat }, (_, i) => i + 1).flatMap((repetition) =>
            (repetition % 2 === 1 ? variants : [...variants].reverse()).map((variant) => ({
              scenarioId: s.id,
              exerciseId: e.id,
              repetition,
              variant,
            })),
          ),
        ),
    );
}

export function lookup(item: Pick<Item, 'scenarioId' | 'exerciseId' | 'repetition'>): { scenario: Scenario; exercise: Exercise } {
  const scenario = dataset.scenarios.find((s) => s.id === item.scenarioId);
  const exercise = dataset.exercises.find((e) => e.id === item.exerciseId);
  if (!scenario || !exercise) throw new Error(`unknown item ${pairOf(item)}`);
  return { scenario, exercise };
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/** The run creates accounts and deletes those of the previous run: only on a database on this machine. */
export function isLocalDatabase(databaseUrl: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  } catch {
    return false;
  }
}
