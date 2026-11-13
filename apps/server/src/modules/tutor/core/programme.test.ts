import { describe, expect, it } from 'bun:test';
import { notionsFor } from '../../../referential';
import { programmeText } from './programme';

const lookup = (theme: string | null) => programmeText(notionsFor, { level: 'cinquieme', subject: 'mathematiques', schoolYear: 2026, theme });

describe('programmeText', () => {
  it("lists the class's themes, without a theme asked", () => {
    const text = lookup(null);
    expect(text).toStartWith('Thèmes du programme de 5e en mathematiques :');
    expect(text).toContain('- Nombres et calculs › Opérations');
  });

  it("gives a theme's entries as the official text words them, and the later classes' to leave aside", () => {
    const text = lookup('Opérations');
    expect(text).toContain('Mobiliser les critères de divisibilité par 2, 5 et 10 vus en CM1 et CM2.');
    expect(text).toContain('Des classes suivantes, à ne pas utiliser :');
  });

  it('says when no theme matches, and when there is no programme', () => {
    expect(lookup('Astronomie')).toBe('Aucun thème « Astronomie » dans le programme de 5e en mathematiques.');
    expect(programmeText(() => null, { level: 'cinquieme', subject: 'mathematiques', schoolYear: 2026, theme: null })).toBe(
      'Pas de programme pour cette matière.',
    );
  });
});
