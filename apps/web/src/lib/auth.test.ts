import { describe, expect, it } from 'bun:test';
import { AuthFailure, authData, authMessage, isCancelled } from './auth';

const FALLBACK = 'Une erreur est survenue. Réessayez dans un instant.';

describe('authData', () => {
  it('gives the data of an answer', async () => {
    expect(await authData(Promise.resolve({ data: [{ id: 'a' }], error: null }))).toEqual([{ id: 'a' }]);
  });

  it('throws a refusal in French, its code, status and better-auth’s own error kept', async () => {
    const error = { code: 'INVALID_OTP', status: 400 };
    const refused: unknown = await authData(Promise.resolve({ data: null, error })).catch((failure: unknown) => failure);
    expect(refused).toBeInstanceOf(AuthFailure);
    expect(refused).toMatchObject({
      message: 'Ce code ne correspond pas. Vérifiez-le, ou demandez-en un nouveau.',
      code: 'INVALID_OTP',
      status: 400,
      cause: error,
    });
  });

  it('throws a refusal without a code, as a failing server gives it, in the fallback words', async () => {
    const refused: unknown = await authData(Promise.resolve({ data: null, error: { status: 500 } })).catch((failure: unknown) => failure);
    expect(refused).toBeInstanceOf(AuthFailure);
    expect(refused).toMatchObject({ message: FALLBACK, code: undefined, status: 500 });
  });
});

describe('authMessage', () => {
  it('says a known code in French', () => {
    expect(authMessage({ code: 'INVALID_OTP', status: 400 })).toBe('Ce code ne correspond pas. Vérifiez-le, ou demandez-en un nouveau.');
  });

  it('sends to the code a passkey Tom no longer knows', () => {
    expect(authMessage({ code: 'PASSKEY_NOT_FOUND', status: 401 })).toEndWith('entrez avec un code reçu par e-mail.');
  });

  it('asks to wait on a rate limit, whatever the code', () => {
    expect(authMessage({ code: 'INVALID_OTP', status: 429 })).toStartWith('Trop d’essais.');
  });

  it('falls back for an unknown, empty or missing code, never showing the server’s', () => {
    expect(authMessage({ code: 'SOMETHING_NEW', status: 400 })).toBe(FALLBACK);
    expect(authMessage({ code: '', status: 400 })).toBe(FALLBACK);
    expect(authMessage({ status: 500 })).toBe(FALLBACK);
  });
});

describe('isCancelled', () => {
  it('is the browser window closed, timed out or replaced, which says nothing', () => {
    expect(isCancelled({ code: 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY', status: 400 })).toBe(true);
    expect(isCancelled({ code: 'ERROR_CEREMONY_ABORTED', status: 400 })).toBe(true);
  });

  it('is not a passkey Tom refused, nor an error without a code', () => {
    expect(isCancelled({ code: 'PASSKEY_NOT_FOUND', status: 401 })).toBe(false);
    expect(isCancelled({ status: 500 })).toBe(false);
  });
});
