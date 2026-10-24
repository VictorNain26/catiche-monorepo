import { describe, expect, it } from 'bun:test';
import { encode } from 'uqr';
import { activationFromFragment, activationLink, activationSchema, formatCode, squarePath } from './activation';

describe('formatCode', () => {
  it('splits the eight characters in two groups, a space between them', () => {
    expect(formatCode('ABCD2345')).toBe('ABCD 2345');
  });
});

describe('activationSchema', () => {
  it('takes the code with or without its space or dash, trimmed', () => {
    expect(activationSchema.parse({ code: ' ABCD 2345 ' }).code).toBe('ABCD 2345');
    expect(activationSchema.safeParse({ code: 'ABCD-2345' }).success).toBe(true);
    expect(activationSchema.safeParse({ code: 'ABCD2345' }).success).toBe(true);
  });

  it('refuses a code too short, or far too long', () => {
    expect(activationSchema.safeParse({ code: 'ABCD234' }).success).toBe(false);
    expect(activationSchema.safeParse({ code: 'A'.repeat(33) }).success).toBe(false);
  });
});

describe('activationLink', () => {
  it('carries the code after the `#`, which no server sees', () => {
    expect(activationLink('https://app.catiche.fr', 'ABCD2345')).toBe('https://app.catiche.fr/activer#code=ABCD2345');
  });

  it('gives the code back to the page it leads to', () => {
    expect(activationFromFragment(new URL(activationLink('http://localhost:3002', 'K7M2P9QZ')).hash)).toBe('K7M2P9QZ');
  });
});

describe('activationFromFragment', () => {
  it('reads the code the square carries', () => {
    expect(activationFromFragment('#code=ABCD2345')).toBe('ABCD2345');
  });

  it('reads nothing from an address bar without a fragment', () => {
    expect(activationFromFragment('')).toBeNull();
    expect(activationFromFragment('#')).toBeNull();
    expect(activationFromFragment('#token=ABCD2345')).toBeNull();
  });

  it('reads nothing from a code cut or altered on its way', () => {
    expect(activationFromFragment('#code=ABCD234')).toBeNull();
    expect(activationFromFragment('#code=ABCD23456')).toBeNull();
    // I, L, O and U are not in Crockford's alphabet: never in a code the server gave.
    expect(activationFromFragment('#code=ABCDLOU5')).toBeNull();
    expect(activationFromFragment('#code=ABCD%3C345')).toBeNull();
  });
});

describe('squarePath', () => {
  it('draws one unit square for each dark module of the link’s QR code, and none for a light one', () => {
    const link = activationLink('https://app.catiche.fr', 'ABCD2345');
    const { data } = encode(link, { border: 4 });
    const { size, d } = squarePath(link);
    expect(size).toBe(data.length);
    const squares: readonly string[] = d.match(/M\d+ \d+h1v1h-1z/g) ?? [];
    expect(squares.length).toBe(data.flat().filter(Boolean).length);
    for (const [y, row] of data.entries())
      for (const [x, dark] of row.entries()) expect(squares.includes(`M${String(x)} ${String(y)}h1v1h-1z`)).toBe(dark);
  });
});
