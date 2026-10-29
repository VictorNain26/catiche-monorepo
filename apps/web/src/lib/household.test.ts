import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { hc } from 'hono/client';
import { parseResponse } from './api';
import {
  MONTHS,
  askParents,
  birthYears,
  childAlerts,
  childLink,
  codeAlert,
  decidesWith,
  deletionAsked,
  deletionDay,
  deletionWarning,
  hasCodeAlert,
  homeTitle,
  householdMessage,
  inviteSchema,
  isLevel,
  memoryStatus,
  newChildSchema,
  roleChoices,
} from './household';

const problem = (code: string, status: 400 | 404 | 429 | 500) =>
  new Hono().get('/', (c) => c.json({ status, code }, status, { 'Content-Type': 'application/problem+json' }));

const failure = async (code: string, status: 400 | 404 | 429 | 500) => {
  const app = problem(code, status);
  return parseResponse(hc<typeof app>('http://localhost', { fetch: app.request }).index.$get()).then(
    () => null,
    (error: unknown) => error,
  );
};

describe('codeAlert', () => {
  it('says first a code the child said forgotten, whether or not too many tries stopped it', () => {
    expect(codeAlert('Léa', { codeForgotten: true, codeLocked: false })).toBe('Léa a oublié son code.');
    expect(codeAlert('Léa', { codeForgotten: true, codeLocked: true })).toBe('Léa a oublié son code.');
  });

  it('says a code stopped by too many tries, and nothing for a code that works', () => {
    expect(codeAlert('Léa', { codeForgotten: false, codeLocked: true })).toBe('Le code de Léa ne marche plus.');
    expect(codeAlert('Léa', { codeForgotten: false, codeLocked: false })).toBeNull();
  });
});

describe('childAlerts', () => {
  const TABLET = 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
  const PHONE =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const calm = { codeForgotten: false, codeLocked: false, blockedDevices: [] };
  const child = (over: Partial<Parameters<typeof childAlerts>[0]> = {}) =>
    childAlerts({ name: 'Léa', role: 'guardian', deletion: null, alerts: calm, ...over });

  it('has nothing for a parent to act on when all is calm', () => {
    expect(child()).toEqual([]);
  });

  it('says each blocked device, by its kind, each with its own id to unblock', () => {
    const blockedDevices = [
      { id: 'd1', userAgent: TABLET },
      { id: 'd2', userAgent: PHONE },
    ];
    expect(child({ alerts: { ...calm, blockedDevices } })).toEqual([
      { kind: 'device', text: 'La tablette de Léa est bloquée après 3 codes faux.', deviceId: 'd1' },
      { kind: 'device', text: 'Le téléphone de Léa est bloqué après 3 codes faux.', deviceId: 'd2' },
    ]);
  });

  it('says the code alone when it is forgotten: the starting code it asks replaces every blocked device', () => {
    const alerts = { codeForgotten: true, codeLocked: false, blockedDevices: [{ id: 'd1', userAgent: TABLET }] };
    expect(child({ alerts })).toEqual([{ kind: 'code', text: 'Léa a oublié son code.' }]);
  });

  it('puts the deletion asked first, then the code, its author named or not', () => {
    const alerts = { ...calm, codeLocked: true };
    expect(child({ alerts, deletion: { by: 'Karim', dueAt: '2026-11-04T09:00:00Z' } })).toEqual([
      { kind: 'deletion', text: 'Karim a demandé la suppression du compte de Léa.' },
      { kind: 'code', text: 'Le code de Léa ne marche plus.' },
    ]);
    expect(child({ deletion: { by: null, dueAt: '2026-11-04T09:00:00Z' } })).toEqual([
      { kind: 'deletion', text: 'Un adulte a demandé la suppression du compte de Léa.' },
    ]);
  });

  it('has nothing for a relative, who acts on none of them', () => {
    const alerts = { codeForgotten: true, codeLocked: true, blockedDevices: [{ id: 'd1', userAgent: TABLET }] };
    expect(child({ role: 'relative', alerts, deletion: { by: 'Karim', dueAt: '2026-11-04T09:00:00Z' } })).toEqual([]);
  });
});

describe('childLink', () => {
  it('names the child for a parent, who manages them, in its words and to a screen reader alike', () => {
    expect(childLink({ name: 'Léa', role: 'guardian' })).toEqual({ label: 'Gérer Léa', name: 'Gérer Léa' });
  });

  it('says their homework for a relative, and names the child to a screen reader after the words it reads', () => {
    expect(childLink({ name: 'Léa', role: 'relative' })).toEqual({ label: 'Suivre ses devoirs', name: 'Suivre ses devoirs (Léa)' });
  });
});

describe('homeTitle', () => {
  const lea = { name: 'Léa', role: 'relative' } as const;
  it('names the one child a relative follows', () => {
    expect(homeTitle([lea])).toBe('Suivez les devoirs de Léa');
  });

  it('speaks of the children otherwise: a parent, even of one, or a relative of several', () => {
    expect(homeTitle([{ name: 'Léa', role: 'guardian' }])).toBe('Suivez les devoirs de vos enfants');
    expect(homeTitle([lea, { name: 'Noé', role: 'relative' }])).toBe('Suivez les devoirs de vos enfants');
    expect(homeTitle([])).toBe('Suivez les devoirs de vos enfants');
  });
});

describe('hasCodeAlert', () => {
  it('holds for a code forgotten or stopped by too many tries, as the home’s card shows it', () => {
    expect(hasCodeAlert({ codeForgotten: true, codeLocked: false })).toBe(true);
    expect(hasCodeAlert({ codeForgotten: false, codeLocked: true })).toBe(true);
    expect(hasCodeAlert({ codeForgotten: true, codeLocked: true })).toBe(true);
  });

  it('does not hold for a code that works', () => {
    expect(hasCodeAlert({ codeForgotten: false, codeLocked: false })).toBe(false);
  });
});

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
  const child = (month: string, year: string) => ({ name: '  Léa ', level: 'sixieme', month, year, declaredGuardian: true });

  // The memory is proposed later, from the child's page: never while adding them.
  it('gives the server a trimmed first name, a level, the month the two menus make and the declaration, nothing else', () => {
    expect(newChildSchema(now).parse({ ...child('03', '2014'), memoryProposed: true })).toEqual({
      name: 'Léa',
      level: 'sixieme',
      birthMonth: '2014-03',
      declaredGuardian: true,
    });
  });

  it('refuses the box of parental authority unticked', () => {
    const unticked = newChildSchema(now).safeParse({ ...child('03', '2014'), declaredGuardian: false });
    expect(unticked.error?.issues).toEqual([expect.objectContaining({ path: ['declaredGuardian'], message: 'Cochez cette case pour continuer.' })]);
  });

  it('takes the ages the server takes, to the month, and no other', () => {
    expect(newChildSchema(now).safeParse(child('05', '2021')).success).toBe(true);
    expect(newChildSchema(now).safeParse(child('06', '2005')).success).toBe(true);
    // Born in June 2021: 5 only once June is over.
    const tooYoung = newChildSchema(now).safeParse(child('06', '2021'));
    expect(tooYoung.error?.issues).toEqual([
      expect.objectContaining({ path: ['year'], message: 'Votre enfant a entre 5 et 20 ans : vérifiez son mois et son année.' }),
    ]);
    expect(newChildSchema(now).safeParse(child('05', '2005')).success).toBe(false);
  });

  it('asks for each menu, and refuses an empty name or no level', () => {
    const empty = newChildSchema(now).safeParse({ name: ' ', level: '', month: '', year: '', declaredGuardian: true });
    expect(empty.error?.issues.map(({ path, message }) => [path[0], message])).toEqual([
      ['name', 'Écrivez son prénom.'],
      ['level', 'Choisissez sa classe.'],
      ['month', 'Choisissez son mois de naissance.'],
      ['year', 'Choisissez son année de naissance.'],
    ]);
  });
});

describe('MONTHS', () => {
  // As a menu lists them: an object with « 10 » for a key would put October first.
  it('runs from January to December, each with the value the schema takes', () => {
    expect(MONTHS.map(([, label]) => label)).toEqual([
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ]);
    expect(MONTHS[0]?.[0]).toBe('01');
    expect(MONTHS.at(-1)?.[0]).toBe('12');
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

describe('inviteSchema', () => {
  it('gives the server a trimmed address and the role chosen', () => {
    expect(inviteSchema.parse({ email: ' karim@example.com ', role: 'guardian' })).toEqual({ email: 'karim@example.com', role: 'guardian' });
    expect(inviteSchema.parse({ email: 'monique@example.com', role: 'relative' })).toEqual({ email: 'monique@example.com', role: 'relative' });
  });

  it('says, under each field, what to do', () => {
    const empty = inviteSchema.safeParse({ email: 'karim', role: '' });
    expect(empty.error?.issues.map(({ path, message }) => [path[0], message])).toEqual([
      ['email', 'Écrivez son adresse e-mail, par exemple nom@exemple.fr.'],
      ['role', 'Choisissez : parent ou proche.'],
    ]);
  });
});

describe('roleChoices', () => {
  it('names the two roles with the child’s name, as A8 does', () => {
    expect(roleChoices('Léa')).toEqual([
      ['guardian', 'Parent ou tuteur de Léa'],
      ['relative', 'Un proche : beau-parent, grand-parent, assistante familiale…'],
    ]);
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

describe('decidesWith', () => {
  it('says to a parent whom they decide with, or that they decide alone', () => {
    expect(decidesWith('Léa', [])).toBe('Vous décidez pour Léa.');
    expect(decidesWith('Léa', ['Karim'])).toBe('Vous décidez pour Léa, avec Karim.');
    expect(decidesWith('Léa', ['Karim', 'Sam'])).toBe('Vous décidez pour Léa, avec Karim et Sam.');
  });
});

describe('askParents', () => {
  it('tells a relative which parents give a starting code', () => {
    expect(askParents(['Nadia'])).toBe('Pour ajouter un appareil, demandez un code de départ à Nadia.');
    expect(askParents(['Nadia', 'Karim'])).toBe('Pour ajouter un appareil, demandez un code de départ à Nadia ou à Karim.');
  });
});

describe('the deletion of a child’s account', () => {
  it('warns that the other parents may cancel it for 7 days', () => {
    expect(deletionWarning(['Karim'])).toBe('Karim recevra un e-mail et pourra l’annuler pendant 7 jours.');
    expect(deletionWarning(['Karim', 'Sam'])).toBe('Karim et Sam recevront un e-mail et pourront l’annuler pendant 7 jours.');
  });

  it('says who asked it, an adult who left Catiche as « Un adulte »', () => {
    expect(deletionAsked('Léa', 'Nadia')).toBe('Nadia a demandé la suppression du compte de Léa.');
    expect(deletionAsked('Léa', null)).toBe('Un adulte a demandé la suppression du compte de Léa.');
  });

  it('says the day it is done', () => {
    // A local date: the same day whatever the time zone of the machine.
    expect(deletionDay(new Date(2026, 9, 31, 9, 0).toISOString())).toBe('Elle se fera le 31 octobre.');
  });
});
