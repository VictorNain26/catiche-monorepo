import { describe, expect, it } from 'bun:test';
import { ageAt, isStudentBirthMonth } from './student-age';

describe('ageAt', () => {
  const now = new Date('2026-10-07T12:00:00Z');

  it('counts a birthday at the end of its month, never early', () => {
    expect(ageAt('2011-09', now)).toBe(15);
    // Born in October 2011: maybe on the 28th, so not 15 before November.
    expect(ageAt('2011-10', now)).toBe(14);
    expect(ageAt('2011-10', new Date('2026-10-31T23:59:59Z'))).toBe(14);
    expect(ageAt('2011-10', new Date('2026-11-01T00:00:00Z'))).toBe(15);
  });

  it('reads a birth month stored on its first day the same way', () => {
    expect(ageAt('2011-10-01', now)).toBe(14);
    expect(ageAt('2011-09-01', now)).toBe(15);
  });

  it('turns a child born in December a year older on 1 January, in UTC', () => {
    expect(ageAt('2011-12', new Date('2026-12-31T23:30:00Z'))).toBe(14);
    expect(ageAt('2011-12', new Date('2027-01-01T00:00:00Z'))).toBe(15);
  });
});

describe('isStudentBirthMonth', () => {
  const now = new Date('2026-06-15T12:00:00Z');

  it('takes a child as old as the memory consent counts them: born in June 2021, 4 until July', () => {
    expect(ageAt('2021-06', now)).toBe(4);
    expect(isStudentBirthMonth('2021-06', now)).toBe(false);
    expect(isStudentBirthMonth('2021-05', now)).toBe(true);
    expect(isStudentBirthMonth('2014-03', now)).toBe(true);
  });

  it('counts the upper bound to the month too: 20 until the month of their 21st birthday is over', () => {
    // Turning 21 this month, then next month: both still 20.
    expect(isStudentBirthMonth('2005-06', now)).toBe(true);
    expect(isStudentBirthMonth('2005-07', now)).toBe(true);
    // Turned 21 at the end of May.
    expect(isStudentBirthMonth('2005-05', now)).toBe(false);
  });

  it('moves both bounds on 1 January, in UTC', () => {
    const newYearsEve = new Date('2026-12-31T23:30:00Z');
    expect(isStudentBirthMonth('2021-11', newYearsEve)).toBe(true);
    expect(isStudentBirthMonth('2021-12', newYearsEve)).toBe(false);
    expect(isStudentBirthMonth('2005-12', newYearsEve)).toBe(true);
    expect(isStudentBirthMonth('2005-11', newYearsEve)).toBe(false);
    const newYear = new Date('2027-01-01T00:30:00Z');
    expect(isStudentBirthMonth('2021-12', newYear)).toBe(true);
    expect(isStudentBirthMonth('2005-12', newYear)).toBe(false);
  });
});
