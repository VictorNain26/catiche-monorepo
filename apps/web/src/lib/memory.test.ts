import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { hc } from 'hono/client';
import { parseResponse } from './api';
import { accountDeletion, lastTime, memoryActive, memoryMessage, memoryOff, notionSummary } from './memory';

const notion = { notionId: 'n', label: 'Équations', worked: 2, lastSolved: false, lastHelp: 'avec un indice', watch: 'mal lire la consigne' };

describe('notionSummary', () => {
  it('says how often a lesson was worked on, and whether it was solved the last time (E7)', () => {
    expect(notionSummary(notion)).toBe('Travaillée 2 fois. La dernière fois : pas encore réussie.');
    expect(notionSummary({ ...notion, worked: 3, lastSolved: true })).toBe('Travaillée 3 fois. La dernière fois : réussie.');
  });
});

describe('the words of « Ce que Tom retient » (E7)', () => {
  it('says, once active, that the parents see only that it is', () => {
    expect(memoryActive(['Nadia', 'Karim'])).toBe(
      'Tom se souvient des leçons de tes exercices depuis la rentrée. Nadia et Karim voient seulement que c’est activé.',
    );
    expect(memoryActive(['Nadia'])).toBe('Tom se souvient des leçons de tes exercices depuis la rentrée. Nadia voit seulement que c’est activé.');
  });

  it('says, when not active, who may propose it', () => {
    expect(memoryOff(['Nadia', 'Karim'])).toBe(
      'Tom ne se souvient de rien d’un soir à l’autre. Il connaît seulement ton prénom et ta classe. Nadia ou Karim peuvent te le proposer.',
    );
    expect(memoryOff(['Nadia'])).toBe(
      'Tom ne se souvient de rien d’un soir à l’autre. Il connaît seulement ton prénom et ta classe. Nadia peut te le proposer.',
    );
  });

  it('says whom to ask for everything to go', () => {
    expect(accountDeletion(['Nadia', 'Karim'])).toBe('Pour que tout parte, tes devoirs compris, demande à Nadia ou à Karim de supprimer ton compte.');
    expect(accountDeletion(['Nadia'])).toBe('Pour que tout parte, tes devoirs compris, demande à Nadia de supprimer ton compte.');
    expect(accountDeletion([])).toBe('Pour que tout parte, tes devoirs compris, demande à tes parents de supprimer ton compte.');
  });
});

describe('lastTime', () => {
  it('says how the notion ended last time and what to watch, as the memory and the week both say it', () => {
    expect(lastTime(notion)).toBe('La dernière fois : pas encore résolue, avec un indice. À surveiller : mal lire la consigne.');
    expect(lastTime({ ...notion, lastSolved: true, watch: null })).toBe('La dernière fois : résolue avec un indice.');
  });
});

describe('memoryMessage', () => {
  const refused = async (code: string, status: 403 | 500) => {
    const app = new Hono().get('/', (c) => c.json({ status, code }, status, { 'Content-Type': 'application/problem+json' }));
    return parseResponse(hc<typeof app>('http://localhost', { fetch: app.request }).index.$get()).then(
      () => null,
      (error: unknown) => error,
    );
  };

  it('says a proposal withdrawn meanwhile as any failure: the screen, read again, says who may propose it', async () => {
    expect(memoryMessage(await refused('FORBIDDEN', 403))).toBe('Ça n’a pas marché. Réessaie dans un instant.');
  });

  it('falls back for anything else', async () => {
    expect(memoryMessage(await refused('INTERNAL_ERROR', 500))).toBe('Ça n’a pas marché. Réessaie dans un instant.');
  });
});
