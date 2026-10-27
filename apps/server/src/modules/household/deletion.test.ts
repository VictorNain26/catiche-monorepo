/**
 * The deletion of a child's account, on a real database, through the HTTP API and the background
 * sweep's steps (`docs/plans/app-cible.md`, question tranchée 1): immediate with one parent in
 * Catiche; with two, asked by one, which the others may cancel for 7 days, then done by the sweep.
 * Past the day it is due, the child is treated as deleted before the sweep passes. The clock moves
 * by `setSystemTime`.
 */

import { afterEach, describe, expect, it, setSystemTime } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { frenchDay } from '../../domain/student-deletion';
import { user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { ORIGIN, STUDENT_CODE } from '../../testing/http';
import { householdSweep } from '.';
import { guardianship, studentProfile } from './schema';

const { db } = await testDatabase();
const { api, mail, tasks } = testApp(db);
const sweep = householdSweep({ db, mailer: mail.mailer });

const MINUTE = 60_000;
const DAYS_7 = 7 * 24 * 60 * MINUTE;

afterEach(() => {
  setSystemTime();
});

interface Listed {
  id: string;
  deletion: { by: string | null; dueAt: string } | null;
}

const listed = async (cookie: string) => {
  const res = await api.request('GET', '/api/household/students', { cookie });
  expect(res.status).toBe(200);
  return (await res.json()) as Listed[];
};
const ask = (cookie: string, studentId: string) => api.request('DELETE', `/api/household/students/${studentId}`, { cookie });
const cancel = (cookie: string, studentId: string) => api.request('POST', `/api/household/students/${studentId}/deletion/cancel`, { cookie });
const kinds = async (cookie: string, studentId: string) =>
  ((await (await api.request('GET', `/api/household/students/${studentId}/history`, { cookie })).json()) as { kind: string; actor: string }[])
    .filter(({ kind }) => kind.startsWith('deletion_'))
    .map(({ kind, actor }) => ({ kind, actor }))
    .toReversed();

/** The emails sent while `gesture` runs, as recipient, subject and text. */
const sentDuring = async (gesture: () => unknown) => {
  const before = mail.sent.length;
  await gesture();
  await tasks.settled();
  return mail.sent.slice(before).map(({ to, subject, text }) => ({ to, subject, text }));
};

/** Nadia and Karim, Léa's parents, and Monique, a relative of hers, each named. */
const family = async (tag: string) => {
  const emails = { nadia: `nadia-${tag}@example.com`, karim: `karim-${tag}@example.com`, monique: `monique-${tag}@example.com` };
  const nadia = await api.guardian(emails.nadia);
  await api.named(nadia, 'Nadia');
  const lea = await api.student(nadia, { name: 'Léa' });
  const karim = await api.adult(nadia, lea.id, emails.karim, 'guardian');
  await api.named(karim, 'Karim');
  const monique = await api.adult(nadia, lea.id, emails.monique, 'relative');
  await api.named(monique, 'Monique');
  await tasks.settled();
  return { nadia, karim, monique, lea, emails };
};

const exists = async (studentId: string) => (await db.select({ id: user.id }).from(user).where(eq(user.id, studentId))).length > 0;

describe('the deletion of a child with one parent in Catiche', () => {
  it('is immediate, a relative not counting as a parent', async () => {
    const nadia = await api.guardian('seule-suppression@example.com');
    const lea = await api.student(nadia);
    await api.adult(nadia, lea.id, 'proche-suppression@example.com', 'relative');
    expect((await ask(nadia, lea.id)).status).toBe(204);
    expect(await exists(lea.id)).toBe(false);
  });
});

describe('the deletion of a child with two parents', () => {
  it('is asked: noted, told to the other parent with its day, and the child stays', async () => {
    const { nadia, karim, lea, emails } = await family('demande');
    let res: Response | undefined;
    const sent = await sentDuring(async () => {
      res = await ask(nadia, lea.id);
    });
    expect(res?.status).toBe(202);
    const { dueAt } = (await res?.json()) as { dueAt: string };
    expect(Date.parse(dueAt) - Date.now()).toBeGreaterThan(DAYS_7 - MINUTE);
    expect(Date.parse(dueAt) - Date.now()).toBeLessThanOrEqual(DAYS_7);

    expect(sent.map(({ to }) => to)).toEqual([emails.karim]);
    expect(sent[0]?.subject).toBe('Nadia a demandé la suppression du compte de Léa');
    expect(sent[0]?.text).toContain(
      `Nadia a demandé la suppression du compte de Léa. Elle se fera le ${frenchDay(new Date(dueAt))}, sauf si vous l’annulez.`,
    );
    expect(sent[0]?.text).toContain(`Gérer Léa, dans Catiche : ${ORIGIN}/foyer/${lea.id}`);

    expect(await exists(lea.id)).toBe(true);
    for (const cookie of [nadia, karim]) {
      expect((await listed(cookie)).find(({ id }) => id === lea.id)?.deletion).toEqual({ by: 'Nadia', dueAt });
    }
    expect(await kinds(nadia, lea.id)).toEqual([{ kind: 'deletion_requested', actor: 'Nadia' }]);
  });

  it('asked again, keeps its first day and tells no one', async () => {
    const { nadia, karim, lea } = await family('deux-fois');
    const first = (await (await ask(nadia, lea.id)).json()) as { dueAt: string };
    await tasks.settled();
    let again: Response | undefined;
    expect(
      await sentDuring(async () => {
        again = await ask(karim, lea.id);
      }),
    ).toEqual([]);
    expect(again?.status).toBe(202);
    expect(await again?.json()).toEqual(first);
    expect(await kinds(nadia, lea.id)).toEqual([{ kind: 'deletion_requested', actor: 'Nadia' }]);
  });

  it('is cancelled by the other parent, then by its author, each told to the other', async () => {
    const { nadia, karim, lea, emails } = await family('annule');
    await ask(nadia, lea.id);
    await tasks.settled();
    let res: Response | undefined;
    const byKarim = await sentDuring(async () => {
      res = await cancel(karim, lea.id);
    });
    expect(res?.status).toBe(204);
    expect(byKarim.map(({ to, subject }) => ({ to, subject }))).toEqual([
      { to: emails.nadia, subject: 'Karim a annulé la suppression du compte de Léa' },
    ]);
    expect(byKarim[0]?.text).toContain('Karim a annulé la suppression du compte de Léa.');
    expect((await listed(nadia)).find(({ id }) => id === lea.id)?.deletion).toBeNull();

    await ask(nadia, lea.id);
    await tasks.settled();
    const byNadia = await sentDuring(async () => {
      res = await cancel(nadia, lea.id);
    });
    expect(res?.status).toBe(204);
    expect(byNadia.map(({ to }) => to)).toEqual([emails.karim]);
    expect(await kinds(karim, lea.id)).toEqual([
      { kind: 'deletion_requested', actor: 'Nadia' },
      { kind: 'deletion_cancelled', actor: 'Karim' },
      { kind: 'deletion_requested', actor: 'Nadia' },
      { kind: 'deletion_cancelled', actor: 'Nadia' },
    ]);
  });

  it('cancelled when none is asked, does nothing', async () => {
    const { karim, lea } = await family('rien');
    let res: Response | undefined;
    const sent = await sentDuring(async () => {
      res = await cancel(karim, lea.id);
    });
    expect(res?.status).toBe(204);
    expect(sent).toEqual([]);
    expect(await kinds(karim, lea.id)).toEqual([]);
  });

  it('is neither asked nor cancelled by a relative or an adult without a link', async () => {
    const { nadia, monique, lea } = await family('proche');
    const stranger = await api.guardian('inconnu-suppression@example.com');
    for (const cookie of [monique, stranger]) expect((await ask(cookie, lea.id)).status).toBe(404);
    await ask(nadia, lea.id);
    for (const cookie of [monique, stranger]) expect((await cancel(cookie, lea.id)).status).toBe(404);
    expect((await listed(nadia)).find(({ id }) => id === lea.id)?.deletion).toMatchObject({ by: 'Nadia' });
  });

  it('is done 7 days later: refused by the routes once due, then deleted by the sweep, which tells the parents', async () => {
    const { nadia, karim, lea, emails } = await family('echeance');
    // Léa's own device, kept to come back by her code.
    const device = api.device();
    expect((await device.activate(await api.activationCode(nadia, lea.id))).status).toBe(200);
    expect((await device.chooseCode(lea.id, STUDENT_CODE, true)).status).toBe(200);
    const child = device.cookie();
    const asked = Date.now();
    await ask(nadia, lea.id);
    await tasks.settled();

    setSystemTime(new Date(asked + DAYS_7 - MINUTE));
    expect(await sentDuring(() => sweep.deletions(new Date()))).toEqual([]);
    expect((await listed(karim)).map(({ id }) => id)).toContain(lea.id);
    expect((await api.request('GET', '/api/me', { cookie: child })).status).toBe(200);

    setSystemTime(new Date(asked + DAYS_7 + MINUTE));
    expect((await listed(karim)).map(({ id }) => id)).not.toContain(lea.id);
    expect((await api.request('GET', `/api/household/students/${lea.id}/history`, { cookie: nadia })).status).toBe(404);
    expect((await api.request('GET', `/api/summary/${lea.id}`, { cookie: karim })).status).toBe(404);
    expect((await cancel(karim, lea.id)).status).toBe(404);
    expect((await api.request('GET', '/api/me', { cookie: child })).status).toBe(401);
    // Her device no longer offers her, nor lets her in by her code.
    expect((await device.profiles()).profiles.map(({ id }) => id)).not.toContain(lea.id);
    expect((await device.enter(lea.id, STUDENT_CODE)).status).toBe(401);
    expect((await api.request('POST', '/api/sessions', { cookie: child, body: {} })).status).toBe(403);
    expect((await api.request('GET', '/api/me/news', { cookie: child })).status).toBe(403);
    expect((await api.request('POST', '/api/me/news/seen', { cookie: child, body: { readAt: new Date().toISOString() } })).status).toBe(403);
    expect((await device.forgot(lea.id)).status).toBe(404);
    expect(await exists(lea.id)).toBe(true);

    // The deletions the file's earlier tests asked are due too: this family's emails only.
    const sent = (await sentDuring(() => sweep.deletions(new Date()))).filter(({ to }) => to.endsWith('-echeance@example.com'));
    expect(await exists(lea.id)).toBe(false);
    expect(sent.map(({ to }) => to).toSorted()).toEqual([emails.karim, emails.nadia].toSorted());
    expect(sent[0]?.subject).toBe('Le compte de Léa est supprimé');
    expect(sent[0]?.text).toContain('Le compte de Léa est supprimé.');
  });

  it('once due, asks no declaration for the child, nor takes one', async () => {
    const { nadia, karim, lea } = await family('declaration');
    const karimId = (await api.sessionUser(karim))?.id ?? '';
    // Karim's link, made before the declaration existed, waits for his.
    await db
      .update(guardianship)
      .set({ declaredAt: null })
      .where(and(eq(guardianship.adultId, karimId), eq(guardianship.studentId, lea.id)));
    const asked = Date.now();
    await ask(nadia, lea.id);
    setSystemTime(new Date(asked + DAYS_7 + MINUTE));
    const me = (await (await api.request('GET', '/api/me', { cookie: karim })).json()) as { missing: { guardianOf: string[] } };
    expect(me.missing.guardianOf).not.toContain(lea.id);
    const declared = await api.request('POST', `/api/household/students/${lea.id}/declaration`, { cookie: karim, body: { declaredGuardian: true } });
    expect(declared.status).toBe(404);
  });

  it('stays asked once its author leaves Catiche, then says no one asked it', async () => {
    const { nadia, karim, lea } = await family('auteur-parti');
    await ask(nadia, lea.id);
    expect((await api.request('POST', '/api/auth/delete-user', { cookie: nadia, body: {} })).status).toBe(200);
    expect((await listed(karim)).find(({ id }) => id === lea.id)?.deletion?.by).toBeNull();
    const [profile] = await db.select().from(studentProfile).where(eq(studentProfile.userId, lea.id));
    expect(profile?.deletionRequestedAt).not.toBeNull();
  });
});

describe('the adult’s own account', () => {
  const onlyParentOf = async (cookie: string) =>
    ((await (await api.request('GET', '/api/me', { cookie })).json()) as { onlyParentOf: { id: string; name: string }[] }).onlyParentOf;

  it('names the children it is the only parent of, which its deletion takes, and keeps the others', async () => {
    const { nadia, monique, lea } = await family('compte');
    const tom = await api.student(nadia, { name: 'Tom' });
    await api.adult(nadia, tom.id, 'proche-compte@example.com', 'relative');
    expect(await onlyParentOf(nadia)).toEqual([{ id: tom.id, name: 'Tom' }]);
    expect(await onlyParentOf(monique)).toEqual([]);

    expect((await api.request('POST', '/api/auth/delete-user', { cookie: nadia, body: {} })).status).toBe(200);
    expect(await exists(tom.id)).toBe(false);
    expect(await exists(lea.id)).toBe(true);
  });
});
