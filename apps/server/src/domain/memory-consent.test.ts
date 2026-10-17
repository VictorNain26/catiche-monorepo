import { describe, expect, it } from 'bun:test';
import { memoryConsent } from './memory-consent';

const now = new Date('2026-10-07T12:00:00Z');
const fourteen = '2012-03-01';
const fifteen = '2011-09-01';

describe('memoryConsent', () => {
  it('leaves the parent their say all through the month of the 15th birthday, the child alone from the next', () => {
    const turningFifteen = { birthMonth: '2011-10-01', proposedAt: null, answer: null };
    expect(memoryConsent(turningFifteen, new Date('2026-10-31T23:59:59Z')).decidesAlone).toBe(false);
    expect(memoryConsent(turningFifteen, new Date('2026-11-01T00:00:00Z')).decidesAlone).toBe(true);
  });

  it('lets a child born in December decide alone on 1 January in UTC, not at midnight in Paris', () => {
    const december = { birthMonth: '2011-12-01', proposedAt: null, answer: null };
    expect(memoryConsent(december, new Date('2026-12-31T23:30:00Z')).decidesAlone).toBe(false);
    expect(memoryConsent(december, new Date('2027-01-01T00:00:00Z')).decidesAlone).toBe(true);
  });

  it('before 15, asks the child only once the parent proposed it, and is active once the child accepts', () => {
    expect(memoryConsent({ birthMonth: fourteen, proposedAt: null, answer: null }, now)).toEqual({
      state: 'off',
      mayAnswer: false,
      decidesAlone: false,
    });
    expect(memoryConsent({ birthMonth: fourteen, proposedAt: now, answer: null }, now)).toEqual({
      state: 'asked',
      mayAnswer: true,
      decidesAlone: false,
    });
    expect(memoryConsent({ birthMonth: fourteen, proposedAt: now, answer: 'accepted' }, now).state).toBe('active');
  });

  it('before 15, stays off when the parent withdraws it, whatever the child answered', () => {
    expect(memoryConsent({ birthMonth: fourteen, proposedAt: null, answer: 'accepted' }, now).state).toBe('off');
  });

  it('from 15, lets the child decide alone', () => {
    expect(memoryConsent({ birthMonth: fifteen, proposedAt: null, answer: null }, now)).toEqual({
      state: 'asked',
      mayAnswer: true,
      decidesAlone: true,
    });
    expect(memoryConsent({ birthMonth: fifteen, proposedAt: null, answer: 'accepted' }, now).state).toBe('active');
  });

  it('is off once the child declines, at any age', () => {
    expect(memoryConsent({ birthMonth: fourteen, proposedAt: now, answer: 'declined' }, now).state).toBe('off');
    expect(memoryConsent({ birthMonth: fifteen, proposedAt: now, answer: 'declined' }, now).state).toBe('off');
  });
});
