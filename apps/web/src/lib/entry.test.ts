import { describe, expect, it } from 'bun:test';
import { entryFromFragment, invitationFromFragment } from './entry';

describe('invitationFromFragment', () => {
  it('gives better-auth’s link what the invitation’s button carries, its token first', () => {
    expect(invitationFromFragment('#token=abc&callbackURL=%2F&newUserCallbackURL=%2Fbienvenue&errorCallbackURL=%2Fentrer')).toBe(
      'token=abc&callbackURL=%2F&newUserCallbackURL=%2Fbienvenue&errorCallbackURL=%2Fentrer',
    );
  });

  it('gives nothing without a token', () => {
    expect(invitationFromFragment('')).toBeNull();
    expect(invitationFromFragment('#callbackURL=%2F')).toBeNull();
    expect(invitationFromFragment('#token=')).toBeNull();
  });
});

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
