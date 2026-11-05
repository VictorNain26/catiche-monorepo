import { describe, expect, it } from 'bun:test';
import { calculate } from './calculate';

describe('calculate', () => {
  it('computes arithmetic, its priorities, powers, roots and decimals', () => {
    expect(calculate('3 * 5 + 20')).toBe('35');
    expect(calculate('(3 + 5) * 2')).toBe('16');
    expect(calculate('2^10')).toBe('1024');
    expect(calculate('sqrt(144)')).toBe('12');
    expect(calculate('-7 + 2.5')).toBe('-4.5');
    expect(calculate('17 % 5')).toBe('2');
  });

  it('rounds what is not exact to twelve significant digits', () => {
    expect(calculate('1 / 3')).toBe('0.333333333333');
    expect(calculate('0.1 + 0.2')).toBe('0.3');
  });

  it('refuses what is not arithmetic: functions, symbols, assignments, matrices', () => {
    for (const expression of [
      'import({}, {override: true})',
      'evaluate("1+1")',
      'zeros(100000, 100000)',
      'x + 1',
      'a = 2',
      '[1, 2]',
      'f(x) = x',
      'sqrt',
      'pi',
    ]) {
      expect(() => calculate(expression), expression).toThrow('calcul');
    }
  });

  it('refuses an expression it cannot read', () => {
    expect(() => calculate('3 +* 4')).toThrow('calcul');
  });
});
