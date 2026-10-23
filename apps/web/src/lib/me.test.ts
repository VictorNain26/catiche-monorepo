import { describe, expect, it } from 'bun:test';
import { declarationsSchema, invitationLine, invitationPromise, invitedWelcomeSchema, isRecentReset, welcomeSchema } from './me';

describe('declarationsSchema', () => {
  it('takes every box ticked', () => {
    expect(declarationsSchema.parse({ adult: true, guardianOf: { lea: true, tom: true } })).toEqual({
      adult: true,
      guardianOf: { lea: true, tom: true },
    });
  });

  it('says, under each box left unticked, what to do', () => {
    const unticked = declarationsSchema.safeParse({ adult: false, guardianOf: { lea: true, tom: false } });
    expect(unticked.error?.issues.map(({ path, message }) => [path.join('.'), message])).toEqual([
      ['adult', 'Cochez cette case pour continuer.'],
      ['guardianOf.tom', 'Cochez cette case pour continuer.'],
    ]);
  });
});

describe('welcomeSchema', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  const child = { name: ' Léa ', level: 'cinquieme', month: '03', year: '2014', declaredGuardian: true };

  it('asks the adult’s first name and age, then the child, as the server takes them', () => {
    expect(welcomeSchema(now).parse({ you: { name: ' Nadia ', adult: true }, child })).toEqual({
      you: { name: 'Nadia', adult: true },
      child: { name: 'Léa', level: 'cinquieme', birthMonth: '2014-03', declaredGuardian: true },
    });
  });

  it('says, under each field left empty or unticked, what to do', () => {
    const empty = welcomeSchema(now).safeParse({ you: { name: ' ', adult: false }, child: { ...child, name: '', declaredGuardian: false } });
    expect(empty.error?.issues.map(({ path, message }) => [path.join('.'), message])).toEqual([
      ['you.name', 'Écrivez votre prénom.'],
      ['you.adult', 'Cochez cette case pour continuer.'],
      ['child.name', 'Écrivez son prénom.'],
      ['child.declaredGuardian', 'Cochez cette case pour continuer.'],
    ]);
  });
});

describe('invitedWelcomeSchema', () => {
  it('asks a relative their first name and age, nothing of the child', () => {
    expect(invitedWelcomeSchema('relative').parse({ name: ' Monique ', adult: true, declaredGuardian: false })).toEqual({
      name: 'Monique',
      adult: true,
      declaredGuardian: false,
    });
  });

  it('asks a parent the box of parental authority too', () => {
    expect(invitedWelcomeSchema('guardian').parse({ name: 'Karim', adult: true, declaredGuardian: true })).toEqual({
      name: 'Karim',
      adult: true,
      declaredGuardian: true,
    });
    const unticked = invitedWelcomeSchema('guardian').safeParse({ name: '', adult: false, declaredGuardian: false });
    expect(unticked.error?.issues.map(({ path, message }) => [path.join('.'), message])).toEqual([
      ['name', 'Écrivez votre prénom.'],
      ['adult', 'Cochez cette case pour continuer.'],
      ['declaredGuardian', 'Cochez cette case pour continuer.'],
    ]);
  });
});

describe('the words of an invitation', () => {
  const invitation = { invitedBy: 'Nadia', studentName: 'Léa' };

  it('says who invites, for which child, and as what', () => {
    expect(invitationLine({ ...invitation, role: 'relative' })).toBe('Nadia vous invite pour Léa, comme proche.');
    expect(invitationLine({ ...invitation, role: 'guardian' })).toBe('Nadia vous invite pour Léa, comme parent.');
  });

  it('says, on the first screen, what the role brings', () => {
    expect(invitationPromise({ ...invitation, role: 'relative' })).toBe('Léa pourra vous dire où en sont ses devoirs, et vous pourrez lui répondre.');
    expect(invitationPromise({ ...invitation, role: 'guardian' })).toBe('Vous déciderez avec Nadia pour Léa.');
  });
});

describe('isRecentReset', () => {
  const now = new Date('2026-10-20T12:00:00Z');

  it('tells of a code a parent replaced within two weeks', () => {
    expect(isRecentReset('2026-10-20T11:59:00Z', now)).toBe(true);
    expect(isRecentReset('2026-10-07T12:00:00Z', now)).toBe(true);
  });

  it('no longer on the home past two weeks, nor for a code never replaced', () => {
    expect(isRecentReset('2026-10-05T12:00:00Z', now)).toBe(false);
    expect(isRecentReset(null, now)).toBe(false);
  });
});
