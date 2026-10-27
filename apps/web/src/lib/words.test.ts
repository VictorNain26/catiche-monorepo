import { describe, expect, it } from 'bun:test';
import { parentWords } from './words';

describe('parentWords', () => {
  it('names two parents together, either one, and to either one, the verb in the plural', () => {
    const words = parentWords(['Nadia', 'Karim']);
    expect(words).toMatchObject({ both: 'Nadia et Karim', either: 'Nadia ou Karim', toEither: 'à Nadia ou à Karim', they: 'ils' });
    expect(words).toMatchObject({ Both: 'Nadia et Karim', Either: 'Nadia ou Karim', They: 'Ils' });
    expect(words.agree('voit', 'voient')).toBe('voient');
  });

  it('names a single parent alone, by their name again rather than a pronoun, the verb in the singular', () => {
    const words = parentWords(['Nadia']);
    expect(words).toMatchObject({ both: 'Nadia', either: 'Nadia', toEither: 'à Nadia', they: 'Nadia' });
    expect(words).toMatchObject({ Both: 'Nadia', Either: 'Nadia', They: 'Nadia' });
    expect(words.agree('voit', 'voient')).toBe('voit');
  });

  it('says « tes parents » without a first name, the verb in the plural', () => {
    const words = parentWords([]);
    expect(words).toMatchObject({ both: 'tes parents', either: 'tes parents', toEither: 'à tes parents', they: 'ils' });
    expect(words).toMatchObject({ Both: 'Tes parents', Either: 'Tes parents', They: 'Ils' });
    expect(words.agree('voit', 'voient')).toBe('voient');
  });
});
