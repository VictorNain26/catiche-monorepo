import { describe, expect, it } from 'bun:test';
import { eveningText, type EveningState } from './evening';

const state = (overrides: Partial<EveningState> = {}): EveningState => ({
  firstName: 'Léa',
  today: '2026-11-02',
  phase: 'order',
  homework: [],
  tests: [],
  ...overrides,
});
const homework = (id: string, overrides: Partial<EveningState['homework'][number]> = {}): EveningState['homework'][number] => ({
  id,
  subject: 'mathematiques',
  task: `devoir ${id}`,
  dueOn: '2026-11-03',
  rank: null,
  state: 'todo',
  ...overrides,
});

describe('eveningText', () => {
  it('names the student, the day and the step of the evening', () => {
    expect(eveningText(state())).toStartWith('Prénom : Léa\nAujourd’hui : lundi 2026-11-02\nÉtape : ordre');
  });

  it("gives tonight's plan in its order, then the other homework left, each with its id", () => {
    const text = eveningText(
      state({
        homework: [
          homework('b', { rank: 2 }),
          homework('c'),
          homework('a', { rank: 1, state: 'done', subject: 'francais', task: 'lire le chapitre 2' }),
        ],
      }),
    );
    expect(text).toContain(
      [
        'Plan de ce soir :',
        '1. [a] francais : lire le chapitre 2, pour 2026-11-03, fait',
        '2. [b] mathematiques : devoir b, pour 2026-11-03, à faire',
        'Autres devoirs à faire :',
        '- [c] mathematiques : devoir c, pour 2026-11-03',
      ].join('\n'),
    );
  });

  it('marks a homework whose day is unknown as to be asked', () => {
    expect(eveningText(state({ homework: [homework('c', { dueOn: null })] }))).toContain('- [c] mathematiques : devoir c, pour : à demander');
  });

  it('lists the tests to come, and says when nothing is noted', () => {
    expect(eveningText(state({ tests: [{ subject: 'histoire-geo', day: '2026-11-05', topic: 'la Révolution' }] }))).toContain(
      'Contrôles à venir :\n- histoire-geo le 2026-11-05 : la Révolution',
    );
    expect(eveningText(state())).toContain('Rien de noté pour l’instant.');
  });
});
