import { describe, expect, it } from 'bun:test';
import { cohenKappa, mcnemarExact, wilson } from './stats';

const percent = ({ low, high }: { low: number; high: number }) => [Math.round(low * 1000) / 10, Math.round(high * 1000) / 10];

describe('wilson', () => {
  it('gives the 95 % interval of the baseline of 2026-10-06', () => {
    expect(percent(wilson(11, 106))).toEqual([5.9, 17.6]);
    expect(percent(wilson(5, 32))).toEqual([6.9, 31.8]);
  });

  it('keeps an interval above zero when nothing was seen: no leak in five is no proof of none', () => {
    expect(percent(wilson(0, 5))).toEqual([0, 43.4]);
  });

  it('closes at one when everything was seen', () => {
    expect(wilson(5, 5).high).toBe(1);
  });

  it('has no interval without a trial', () => {
    expect(wilson(0, 0)).toEqual({ low: 0, high: 1 });
  });
});

describe('mcnemarExact', () => {
  it('gives the two-sided exact p-value of the discordant pairs, twice the smaller binomial tail', () => {
    // 1 against 8: 2 × (C(9,0) + C(9,1)) / 2^9 = 20 / 512.
    expect(mcnemarExact(1, 8)).toBe(20 / 512);
    expect(mcnemarExact(8, 1)).toBe(20 / 512);
    expect(mcnemarExact(0, 6)).toBe(2 / 64);
  });

  it('cannot conclude on five discordant pairs all one way', () => {
    expect(mcnemarExact(0, 5)).toBe(2 / 32);
  });

  it('caps at one when both ways are even, or without a discordant pair', () => {
    expect(mcnemarExact(4, 4)).toBe(1);
    expect(mcnemarExact(0, 0)).toBe(1);
  });
});

describe('cohenKappa', () => {
  const pairs = (counts: [string, string, number][]) => counts.flatMap(([a, b, n]) => Array.from({ length: n }, () => [a, b] as const));

  it('gives the agreement beyond chance of two raters, the textbook case of 50 items', () => {
    // 20 both yes, 15 both no, 5 and 10 apart: observed 0.7, by chance 0.5, κ = 0.4.
    expect(
      cohenKappa(
        pairs([
          ['oui', 'oui', 20],
          ['oui', 'non', 5],
          ['non', 'oui', 10],
          ['non', 'non', 15],
        ]),
      ),
    ).toBeCloseTo(0.4, 10);
  });

  it('counts a third answer as a category of its own', () => {
    // Observed 4/6; by chance (2·2 + 2·3 + 2·1) / 36 = 1/3; κ = (2/3 − 1/3) / (2/3) = 0.5.
    const rated = pairs([
      ['oui', 'oui', 2],
      ['non', 'non', 1],
      ['inconnu', 'non', 1],
      ['inconnu', 'inconnu', 1],
      ['non', 'oui', 1],
    ]);
    expect(cohenKappa(rated)).toBeCloseTo(0.5, 10);
  });

  it('is one on full agreement and below zero when the raters disagree more than chance would', () => {
    expect(
      cohenKappa(
        pairs([
          ['oui', 'oui', 3],
          ['non', 'non', 2],
        ]),
      ),
    ).toBe(1);
    expect(
      cohenKappa(
        pairs([
          ['oui', 'non', 2],
          ['non', 'oui', 2],
        ]),
      ),
    ).toBe(-1);
  });

  it('has no value without a pair, nor when both raters gave one same answer to all: chance explains it all', () => {
    expect(cohenKappa([])).toBeNull();
    expect(cohenKappa(pairs([['oui', 'oui', 4]]))).toBeNull();
  });
});
