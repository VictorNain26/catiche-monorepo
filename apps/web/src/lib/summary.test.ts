import { describe, expect, it } from 'bun:test';
import { eveningsLine, minutesText, questionFor, sameSummary, subjectLabel, tonightTag } from './summary';

describe('tonightTag', () => {
  it('says the child worked tonight as done, and not yet as neither done nor late', () => {
    expect(tonightTag(true)).toEqual({ tone: 'done', label: 'A travaillé ce soir' });
    expect(tonightTag(false)).toEqual({ tone: 'neutral', label: 'Pas encore ce soir' });
  });
});

describe('minutesText', () => {
  it('says the time as a parent and a pupil read it, never zero minutes', () => {
    expect(minutesText(0)).toBe('moins de 5 min');
    expect(minutesText(35)).toBe('environ 35 min');
    expect(minutesText(60)).toBe('environ 1 h');
    expect(minutesText(95)).toBe('environ 1 h 35');
  });
});

describe('eveningsLine', () => {
  // Monday 19, Tuesday 20 and Thursday 22 October 2026.
  it('names the days the child worked, in their order, without a time', () => {
    expect(eveningsLine('Léa', ['2026-10-19'])).toBe('Cette semaine, Léa a travaillé lundi.');
    expect(eveningsLine('Léa', ['2026-10-19', '2026-10-20'])).toBe('Cette semaine, Léa a travaillé lundi et mardi.');
    expect(eveningsLine('Léa', ['2026-10-19', '2026-10-20', '2026-10-22'])).toBe('Cette semaine, Léa a travaillé lundi, mardi et jeudi.');
  });

  it('says so when the child did not work these seven days', () => {
    expect(eveningsLine('Léa', [])).toBe('Léa n’a pas travaillé ces sept derniers jours.');
  });

  it('reads a day as the server dated it in Paris, whatever the zone of the machine', () => {
    // Sunday 25 October 2026, the night the clocks go back.
    expect(eveningsLine('Léa', ['2026-10-25'])).toBe('Cette semaine, Léa a travaillé dimanche.');
  });
});

describe('subjectLabel', () => {
  it('names each subject family in words, the off-subject chats included', () => {
    expect(subjectLabel('mathematiques')).toBe('Maths');
    expect(subjectLabel('histoire-geo')).toBe('Histoire-géo');
    expect(subjectLabel('general')).toBe('Autre');
  });
});

describe('questionFor', () => {
  it('asks the parent to have the child show where a notion that resists gets stuck, without knowing the answer', () => {
    expect(questionFor('guardian', 'Lou', 'Résoudre une équation du premier degré', [])).toBe(
      'Demandez à Lou de vous montrer un exercice sur « Résoudre une équation du premier degré », et où ça coince.',
    );
  });

  it('tells the child the same question in their own words, their parents named', () => {
    expect(questionFor('student', 'Lou', 'Résoudre une équation du premier degré', ['Nadia', 'Karim'])).toBe(
      'Nadia et Karim peuvent te demander de leur montrer un exercice sur « Résoudre une équation du premier degré », et où ça coince.',
    );
    expect(questionFor('student', 'Lou', 'Résoudre une équation du premier degré', ['Nadia'])).toBe(
      'Nadia peut te demander de lui montrer un exercice sur « Résoudre une équation du premier degré », et où ça coince.',
    );
  });
});

describe('sameSummary', () => {
  it('tells the child who reads the same summary', () => {
    expect(sameSummary(['Nadia', 'Karim'])).toBe('Nadia et Karim voient ce même résumé.');
    expect(sameSummary(['Nadia'])).toBe('Nadia voit ce même résumé.');
    expect(sameSummary([])).toBe('Tes parents voient ce même résumé.');
  });
});
