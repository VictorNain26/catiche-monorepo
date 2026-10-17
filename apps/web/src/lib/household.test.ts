import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { hc } from 'hono/client';
import { parseResponse } from './api';
import { birthYears, householdMessage, isLevel, memoryStatus, newChildSchema } from './household';

const problem = (code: string, status: 400 | 404 | 429 | 500) =>
  new Hono().get('/', (c) => c.json({ status, code }, status, { 'Content-Type': 'application/problem+json' }));

const failure = async (code: string, status: 400 | 404 | 429 | 500) => {
  const app = problem(code, status);
  return parseResponse(hc<typeof app>('http://localhost', { fetch: app.request }).index.$get()).then(
    () => null,
    (error: unknown) => error,
  );
};

describe('householdMessage', () => {
  it('says what to fix for each problem, in French', async () => {
    expect(householdMessage(await failure('INVALID_REQUEST', 400))).toBe('Vérifiez ce que vous avez saisi.');
    expect(householdMessage(await failure('INVALID_REQUEST', 400), 'Votre enfant a entre 5 et 20 ans.')).toBe('Votre enfant a entre 5 et 20 ans.');
    expect(householdMessage(await failure('NOT_FOUND', 404))).toStartWith('Cet enfant ou cet appareil');
    expect(householdMessage(await failure('RATE_LIMITED', 429))).toStartWith('Trop d’essais');
  });

  it('falls back for any other failure, the network included', async () => {
    expect(householdMessage(await failure('INTERNAL_ERROR', 500))).toBe('Une erreur est survenue. Réessayez dans un instant.');
    expect(householdMessage(new TypeError('Failed to fetch'))).toBe('Une erreur est survenue. Réessayez dans un instant.');
  });
});

describe('isLevel', () => {
  it('takes the server’s levels only', () => {
    expect(isLevel('cinquieme')).toBe(true);
    expect(isLevel('seconde')).toBe(false);
    expect(isLevel('toString')).toBe(false);
    expect(isLevel(undefined)).toBe(false);
  });
});

describe('newChildSchema', () => {
  // The server's rule (domain/student-age.ts): 5 to 20 years, in UTC. On 15 June 2026, from 2005-06 to 2021-05.
  const now = new Date('2026-06-15T12:00:00Z');
  const child = (month: string, year: string) => ({ name: '  Léa ', level: 'sixieme', month, year, memoryProposed: true });

  it('gives the server a trimmed first name, a level and the month the two menus make', () => {
    expect(newChildSchema(now).parse(child('03', '2014'))).toEqual({ name: 'Léa', level: 'sixieme', birthMonth: '2014-03', memoryProposed: true });
  });

  it('takes the ages the server takes, to the month, and no other', () => {
    expect(newChildSchema(now).safeParse(child('05', '2021')).success).toBe(true);
    expect(newChildSchema(now).safeParse(child('06', '2005')).success).toBe(true);
    // Born in June 2021: 5 only once June is over.
    const tooYoung = newChildSchema(now).safeParse(child('06', '2021'));
    expect(tooYoung.error?.issues).toEqual([
      expect.objectContaining({ path: ['year'], message: 'Votre enfant a entre 5 et 20 ans : vérifiez son année.' }),
    ]);
    expect(newChildSchema(now).safeParse(child('05', '2005')).success).toBe(false);
  });

  it('asks for each menu, and refuses an empty name or no level', () => {
    const empty = newChildSchema(now).safeParse({ name: ' ', level: '', month: '', year: '', memoryProposed: false });
    expect(empty.error?.issues.map(({ path, message }) => [path[0], message])).toEqual([
      ['name', 'Son prénom.'],
      ['level', 'Sa classe.'],
      ['month', 'Son mois.'],
      ['year', 'Son année.'],
    ]);
  });
});

describe('birthYears', () => {
  it('lists every year with a month the server takes, the youngest last, in UTC', () => {
    // On 31 December 2026: from December 2005 (20) to November 2021 (5).
    const years = birthYears(new Date('2026-12-31T23:30:00Z'));
    expect(years[0]).toBe('2005');
    expect(years.at(-1)).toBe('2021');
    expect(years).toHaveLength(17);
  });

  it('leaves out, in January, the year whose children are all still 4', () => {
    // On 15 January 2027: from January 2006 (20) to December 2021 (5).
    const years = birthYears(new Date('2027-01-15T12:00:00Z'));
    expect(years[0]).toBe('2006');
    expect(years.at(-1)).toBe('2021');
    expect(years).toHaveLength(16);
  });
});

describe('memoryStatus', () => {
  const status = (memory: { proposed: boolean; state: 'off' | 'asked' | 'active'; decidesAlone: boolean }) => memoryStatus({ name: 'Léa', memory });

  it('says what the guardian has done and what the child answered, before 15', () => {
    expect(status({ proposed: false, state: 'off', decidesAlone: false })).toBe('Pas proposée : Tom ne retient rien d’une séance à l’autre.');
    expect(status({ proposed: true, state: 'asked', decidesAlone: false })).toBe('Proposée : Léa répondra à sa prochaine visite.');
    expect(status({ proposed: true, state: 'active', decidesAlone: false })).toStartWith('Léa l’a acceptée');
    expect(status({ proposed: true, state: 'off', decidesAlone: false })).toBe('Léa l’a refusée.');
  });

  it('from 15, says the child decides, in words that fit a girl as a boy, and whether it is active', () => {
    expect(status({ proposed: false, state: 'asked', decidesAlone: true })).toBe(
      'À partir de 15 ans, c’est Léa qui décide : la question lui est posée.',
    );
    expect(status({ proposed: false, state: 'off', decidesAlone: true })).toBe('À partir de 15 ans, c’est Léa qui décide.');
    expect(status({ proposed: false, state: 'active', decidesAlone: true })).toStartWith('Léa l’a acceptée');
  });
});
