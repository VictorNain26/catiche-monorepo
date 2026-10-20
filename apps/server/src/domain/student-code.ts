/**
 * The code a student chooses, six digits: what makes one too easy to guess. A blocklist is what
 * NIST asks of an activation secret (SP 800-63B-4, § 3.2.10, « e.g., 123456 »), and the CNIL of
 * any password, with the reason told (deliberation 2022-100, § 37). The code is short: it only
 * unlocks a profile on a device the guardian's code recognised first, with tries bounded
 * (`platform/auth/student-sign-in.ts`).
 */

const STUDENT_CODE_LENGTH = 6;

/** What a keypad draws, beyond the runs and repeats the rules below catch. */
const KEYPAD_SHAPES = new Set([
  '147258',
  '258369',
  '369258',
  '159753',
  '159357',
  '357159',
  '753159',
  '789456',
  '456123',
  '321654',
  '963852',
  '741852',
  '147852',
  '123321',
  '456654',
  '789987',
  '102030',
]);

/** Every step from one digit to the next is `step`. */
const runs = (digits: readonly number[], step: number) => digits.every((digit, index) => index === 0 || digit - (digits[index - 1] ?? 0) === step);

/** The code is its first `period` digits over again. */
const repeats = (code: string, period: number) => code === code.slice(0, period).repeat(STUDENT_CODE_LENGTH / period);

/** Three pairs of one digit each: 112233. */
const pairs = (code: string) => [0, 2, 4].every((index) => code[index] === code[index + 1]);

/**
 * Why a code is refused, or null when it is taken: not six digits (`format`), too easy to guess
 * (`easy`), or the month and year of birth (`YYYY-MM`, a day after it ignored), either way round
 * (`birth`).
 */
export function studentCodeRefusal(code: string, birthMonth: string): 'format' | 'easy' | 'birth' | null {
  if (!/^[0-9]{6}$/.test(code)) return 'format';
  // Six ASCII digits by now: a code unit each.
  const digits = Array.from({ length: STUDENT_CODE_LENGTH }, (_, index) => code.charCodeAt(index) - 48);
  if (repeats(code, 1) || runs(digits, 1) || runs(digits, -1) || repeats(code, 2) || repeats(code, 3) || pairs(code) || KEYPAD_SHAPES.has(code)) {
    return 'easy';
  }
  const [year = '', month = ''] = birthMonth.split('-');
  if (code === `${month}${year}` || code === `${year}${month}`) return 'birth';
  return null;
}
