import { describe, expect, it } from 'bun:test';
import { inline } from './inline';

describe('inline', () => {
  it('keeps a plain sentence whole', () => {
    expect(inline('Sur un téléphone, une tablette ou un ordinateur.')).toEqual([
      { kind: 'text', value: 'Sur un téléphone, une tablette ou un ordinateur.' },
    ]);
  });

  it('turns each class written with ᵉ into its number and a raised e', () => {
    expect(inline('En 6ᵉ et en 5ᵉ, il est proposé.')).toEqual([
      { kind: 'text', value: 'En ' },
      { kind: 'ordinal', value: '6' },
      { kind: 'text', value: ' et en ' },
      { kind: 'ordinal', value: '5' },
      { kind: 'text', value: ', il est proposé.' },
    ]);
  });

  it('makes our address a part of its own, so that it becomes a link', () => {
    expect(inline('écrivez à contact@catiche.fr.')).toEqual([
      { kind: 'text', value: 'écrivez à ' },
      { kind: 'email', value: 'contact@catiche.fr' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('leaves an e that follows no number, or a number without its ᵉ', () => {
    expect(inline('ᵉ seul, 10 minutes')).toEqual([{ kind: 'text', value: 'ᵉ seul, 10 minutes' }]);
  });
});
