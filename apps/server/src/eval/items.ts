/** The conversations a run plays: scenario × exercise × repetition, narrowed by the run's filters. */

import { dataset, exercisesFor, type Exercise, type SimulatedScenario, type WrittenScenario } from './index';
import { isSimulated } from './schema';

/** The tutor as it runs, or without the programme of the referential: the A/B that decides whether it stays. */
export const VARIANTS = ['programme', 'none'] as const;
export type Variant = (typeof VARIANTS)[number];

export interface Item {
  scenarioId: string;
  /** Null for an evening, played at a class without an exercise. */
  exerciseId: string | null;
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
  `${scenarioId}:${exerciseId ?? '-'}:${String(repetition)}`;

export const keyOf = (item: Item) => `${pairOf(item)}:${item.variant}`;

/**
 * The variants of a pair one after the other, so that a drift of the model over the run touches
 * both, the first in turn from one repetition to the next, so that an order effect does too. An
 * evening has no exercise: a run narrowed to exercises leaves it out.
 */
export function buildItems({ repeat, scenario, exercise, variants }: RunFilters): Item[] {
  return dataset.scenarios
    .filter((s) => !scenario || scenario.includes(s.id))
    .flatMap((s) =>
      (isSimulated(s)
        ? exercise
          ? []
          : [null]
        : exercisesFor(s)
            .map((e) => e.id)
            .filter((id) => !exercise || exercise.includes(id))
      ).flatMap((exerciseId) =>
        Array.from({ length: repeat }, (_, i) => i + 1).flatMap((repetition) =>
          (repetition % 2 === 1 ? variants : [...variants].reverse()).map((variant) => ({ scenarioId: s.id, exerciseId, repetition, variant })),
        ),
      ),
    );
}

type Played = { scenario: WrittenScenario; exercise: Exercise } | { scenario: SimulatedScenario; exercise: null };
type ItemKey = Pick<Item, 'scenarioId' | 'exerciseId' | 'repetition'>;

/** The scenario of an item and its exercise: an evening has none, a written scenario always one. */
export function lookup(item: ItemKey & { exerciseId: string }): { scenario: WrittenScenario; exercise: Exercise };
export function lookup(item: ItemKey & { exerciseId: null }): { scenario: SimulatedScenario; exercise: null };
export function lookup(item: ItemKey): Played;
export function lookup(item: ItemKey): Played {
  const scenario = dataset.scenarios.find((s) => s.id === item.scenarioId);
  if (scenario && isSimulated(scenario) && item.exerciseId === null) return { scenario, exercise: null };
  const exercise = dataset.exercises.find((e) => e.id === item.exerciseId);
  if (scenario && !isSimulated(scenario) && exercise) return { scenario, exercise };
  throw new Error(`unknown item ${pairOf(item)}`);
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
