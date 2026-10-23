import { describe, expect, it } from 'bun:test';
import { entryFromFragment } from './entry';

describe('entryFromFragment', () => {
  it('reads the address and the code the email’s button carries', () => {
    expect(entryFromFragment('#email=camille%40exemple.fr&code=482917')).toEqual({ email: 'camille@exemple.fr', code: '482917' });
  });

  it('reads nothing from an address bar without a fragment', () => {
    expect(entryFromFragment('')).toBeNull();
    expect(entryFromFragment('#')).toBeNull();
  });

  it('reads nothing from a fragment cut or altered on its way', () => {
    expect(entryFromFragment('#email=camille%40exemple.fr')).toBeNull();
    expect(entryFromFragment('#email=camille%40exemple.fr&code=4829')).toBeNull();
    expect(entryFromFragment('#email=camille&code=482917')).toBeNull();
    expect(entryFromFragment('#code=482917')).toBeNull();
  });
});
