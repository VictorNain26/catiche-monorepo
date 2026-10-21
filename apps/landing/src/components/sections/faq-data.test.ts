import { describe, expect, it } from 'bun:test';
import { plainAnswer } from './faq-data';

describe('plainAnswer', () => {
  it('gives a one-paragraph answer as it is', () => {
    expect(plainAnswer(['Sur un téléphone.'])).toBe('Sur un téléphone.');
  });

  it('puts each paragraph and each item of a list on its own line, the items marked as such', () => {
    expect(plainAnswer(['Le point du soir s’adapte.', ['Vous rentrez tard.', 'Personne n’est là.'], 'En 6ᵉ.'])).toBe(
      'Le point du soir s’adapte.\n– Vous rentrez tard.\n– Personne n’est là.\nEn 6ᵉ.',
    );
  });
});
