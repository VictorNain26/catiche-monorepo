/**
 * The shape of a starting code, the one the server gives (`platform/auth/student-sign-in.ts`) and
 * the web reads back from the square's link (`@repo/server/activation-code`). This file imports
 * nothing, so that the web's bundle takes it whole.
 */

// Crockford's base32 (https://www.crockford.com/base32.html): no I, L, O or U to misread.
export const ACTIVATION_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const ACTIVATION_CODE_LENGTH = 8;

/** Whether `code` is one the server could have given: eight characters of the alphabet, uppercase. */
export const isActivationCode = (code: string) => new RegExp(`^[${ACTIVATION_ALPHABET}]{${String(ACTIVATION_CODE_LENGTH)}}$`).test(code);
