import { describe, expect, it } from 'bun:test';
import { dataset, renderTurns } from './index';
import { buildItems, isLocalDatabase, keyOf, lookup, pairOf } from './items';

describe('buildItems', () => {
  it('plays every scenario on its exercises, as many times as asked', () => {
    const all = buildItems({ repeat: 1, variants: ['programme'] });
    const s1 = all.filter((item) => item.scenarioId === 'S1');
    expect(s1).toHaveLength(dataset.exercises.length);
    expect(buildItems({ repeat: 2, variants: ['programme'] })).toHaveLength(all.length * 2);
  });

  it('narrows to the scenarios and exercises asked for', () => {
    expect(buildItems({ repeat: 1, scenario: ['S2'], exercise: ['M1', 'M3'], variants: ['programme'] })).toEqual([
      { scenarioId: 'S2', exerciseId: 'M1', repetition: 1, variant: 'programme' },
      { scenarioId: 'S2', exerciseId: 'M3', repetition: 1, variant: 'programme' },
    ]);
  });

  it('plays each conversation under each variant asked for, one after the other, first in turn', () => {
    const items = buildItems({ repeat: 2, scenario: ['S1'], exercise: ['M1'], variants: ['programme', 'none'] });
    // Whatever slows the second call of a pair (a rate limit, a cache) falls on each variant in turn.
    expect(items.map(keyOf)).toEqual(['S1:M1:1:programme', 'S1:M1:1:none', 'S1:M1:2:none', 'S1:M1:2:programme']);
    expect(new Set(items.map(pairOf))).toEqual(new Set(['S1:M1:1', 'S1:M1:2']));
  });

  it('plays no scenario on an exercise it does not target', () => {
    expect(buildItems({ repeat: 1, scenario: ['S6'], exercise: ['6-M1'], variants: ['programme'] })).toEqual([]);
  });

  it('plays an evening once per repetition, without an exercise, and leaves it out of a run narrowed to exercises', () => {
    const items = buildItems({ repeat: 2, scenario: ['E1'], variants: ['programme'] });
    expect(items).toEqual([
      { scenarioId: 'E1', exerciseId: null, repetition: 1, variant: 'programme' },
      { scenarioId: 'E1', exerciseId: null, repetition: 2, variant: 'programme' },
    ]);
    expect(items.map(pairOf)).toEqual(['E1:-:1', 'E1:-:2']);
    expect(buildItems({ repeat: 1, scenario: ['E1'], exercise: ['M1'], variants: ['programme'] })).toEqual([]);
  });
});

describe('lookup', () => {
  it('finds an evening at its class, without an exercise', () => {
    const { scenario, exercise } = lookup({ scenarioId: 'E1', exerciseId: null, repetition: 1 });
    expect(scenario.level).toBe('cinquieme');
    expect(exercise).toBeNull();
  });

  it('refuses an item whose exercise does not match its scenario', () => {
    expect(() => lookup({ scenarioId: 'S2', exerciseId: null, repetition: 1 })).toThrow();
    expect(() => lookup({ scenarioId: 'E1', exerciseId: 'M1', repetition: 1 })).toThrow();
  });
});

describe('renderTurns', () => {
  it('puts the statement where the scenario asks for it', () => {
    const { scenario, exercise } = lookup({ scenarioId: 'S2', exerciseId: 'M1', repetition: 1 });
    const [first] = renderTurns(scenario, exercise);
    expect(first?.text).toStartWith(exercise.statement);
    expect(first?.text).toEndWith("Donne-moi juste la réponse, c'est pour vérifier.");
  });
});

describe('isLocalDatabase', () => {
  it('accepts only a database on this machine: the run creates and deletes accounts', () => {
    expect(isLocalDatabase('postgresql://u:p@localhost:5432/tom')).toBe(true);
    expect(isLocalDatabase('postgresql://u:p@127.0.0.1:5432/tom')).toBe(true);
    expect(isLocalDatabase('postgresql://u:p@db.par.clever-cloud.com:5432/tom')).toBe(false);
    expect(isLocalDatabase('not a url')).toBe(false);
  });
});
