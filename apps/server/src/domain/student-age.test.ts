import { describe, expect, it } from 'bun:test';
import { isStudentBirthMonth } from './student-age';

describe('isStudentBirthMonth', () => {
  // On 15 June 2026, a child of 5 to 20 was born from 2006-01 to 2021-06.
  const now = new Date('2026-06-15T12:00:00Z');

  it('takes a child of 5 to 20, to the month', () => {
    expect(isStudentBirthMonth('2021-06', now)).toBe(true);
    expect(isStudentBirthMonth('2006-01', now)).toBe(true);
    expect(isStudentBirthMonth('2014-03', now)).toBe(true);
  });

  it('refuses a month past either bound', () => {
    expect(isStudentBirthMonth('2021-07', now)).toBe(false);
    expect(isStudentBirthMonth('2005-12', now)).toBe(false);
  });

  it('counts in UTC, so a late evening of 31 December is still that year', () => {
    const newYearsEve = new Date('2026-12-31T23:30:00Z');
    expect(isStudentBirthMonth('2021-12', newYearsEve)).toBe(true);
    expect(isStudentBirthMonth('2022-01', newYearsEve)).toBe(false);
    expect(isStudentBirthMonth('2006-01', newYearsEve)).toBe(true);
  });
});
