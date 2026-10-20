import { describe, expect, it } from 'bun:test';
import { studentCodeRefusal } from './student-code';

const BIRTH = '2014-03';

describe('studentCodeRefusal', () => {
  it('takes six digits no rule refuses', () => {
    for (const code of ['482917', '305186', '920374', '135792']) expect(studentCodeRefusal(code, BIRTH)).toBeNull();
  });

  it('wants exactly six digits', () => {
    for (const code of ['', '12345', '1234567', '12a456', ' 48291', '４８２９１７', '48 917']) {
      expect(studentCodeRefusal(code, BIRTH)).toBe('format');
    }
  });

  it('refuses one digit repeated', () => {
    for (const code of ['000000', '111111', '999999']) expect(studentCodeRefusal(code, BIRTH)).toBe('easy');
  });

  it('refuses a run up or down', () => {
    for (const code of ['123456', '012345', '456789', '654321', '987654', '543210']) expect(studentCodeRefusal(code, BIRTH)).toBe('easy');
  });

  it('refuses a pair or a triple repeated, and pairs of one digit', () => {
    for (const code of ['121212', '909090', '123123', '480480', '112233', '998877']) expect(studentCodeRefusal(code, BIRTH)).toBe('easy');
  });

  it('refuses the shapes a keypad draws', () => {
    for (const code of ['147258', '159753', '789456', '123321']) expect(studentCodeRefusal(code, BIRTH)).toBe('easy');
  });

  it('refuses the month and year of birth, either way round', () => {
    expect(studentCodeRefusal('032014', BIRTH)).toBe('birth');
    expect(studentCodeRefusal('201403', BIRTH)).toBe('birth');
    // Another child's month: nothing to say against it.
    expect(studentCodeRefusal('032015', BIRTH)).toBeNull();
  });

  it('reads a birth month stored on its first day the same way', () => {
    expect(studentCodeRefusal('032014', '2014-03-01')).toBe('birth');
  });
});
