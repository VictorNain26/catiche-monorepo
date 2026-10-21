import { describe, expect, it } from 'bun:test';
import { spokenHour } from './hours';

describe('spokenHour', () => {
  it('writes an hour of running text the French way', () => {
    expect(spokenHour('17:30')).toBe('17 h 30');
    expect(spokenHour('18:50')).toBe('18 h 50');
  });

  it('drops the minutes on the hour', () => {
    expect(spokenHour('18:00')).toBe('18 h');
  });

  it('drops a leading zero from the hour, not from the minutes', () => {
    expect(spokenHour('08:05')).toBe('8 h 05');
  });

  it('leaves what is not an hour as it is', () => {
    expect(spokenHour('17h30')).toBe('17h30');
    expect(spokenHour('')).toBe('');
  });
});
