/**
 * The history of a child, on a real database, through the HTTP API: each gesture of an adult on
 * the child writes its line, with who made it; a parent reads the 90 last days, the newest first,
 * and no one else. The gestures that count reach the other parents by email.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { STUDENT_CODE } from '../../testing/http';
import { childEvent } from './schema';

const { db } = await testDatabase();
const { api, mail, tasks } = testApp(db);

interface Line {
  id: string;
  kind: string;
  detail: Record<string, unknown>;
  actor: string | null;
  createdAt: string;
}

const idOf = async (cookie: string) => (await api.sessionUser(cookie))?.id ?? '';
const named = async (cookie: string, name: string) => {
  expect((await api.request('POST', '/api/auth/update-user', { cookie, body: { name } })).status).toBe(200);
};
const history = async (cookie: string, studentId: string) => {
  const res = await api.request('GET', `/api/household/students/${studentId}/history`, { cookie });
  expect(res.status).toBe(200);
  return (await res.json()) as Line[];
};
/** The lines written since `before` lines were, the oldest first, as kind, author and detail. */
const linesSince = async (cookie: string, studentId: string, before: number) =>
  (await history(cookie, studentId))
    .toReversed()
    .slice(before)
    .map(({ kind, actor, detail }) => ({ kind, actor, detail }));
const patch = (cookie: string, studentId: string, body: unknown) => api.request('PATCH', `/api/household/students/${studentId}`, { cookie, body });

/** Nadia and Karim, Léa's parents, and Monique, a relative of hers, each named. */
const family = async (tag: string) => {
  const nadia = await api.guardian(`nadia-${tag}@example.com`);
  await named(nadia, 'Nadia');
  const lea = await api.student(nadia);
  const karim = await api.adult(nadia, lea.id, `karim-${tag}@example.com`, 'guardian');
  await named(karim, 'Karim');
  const monique = await api.adult(nadia, lea.id, `monique-${tag}@example.com`, 'relative');
  await named(monique, 'Monique');
  await tasks.settled();
  return { nadia, karim, monique, lea, karimEmail: `karim-${tag}@example.com`, moniqueEmail: `monique-${tag}@example.com` };
};

describe('the history of a child', () => {
  it('keeps the adults coming in, each invitation by its author and each entry by the adult', async () => {
    const { nadia, lea } = await family('entrees');
    expect(await linesSince(nadia, lea.id, 0)).toEqual([
      { kind: 'adult_invited', actor: 'Nadia', detail: { email: 'karim-entrees@example.com', role: 'guardian' } },
      // Named after: the line says who they are now.
      { kind: 'adult_joined', actor: 'Karim', detail: { role: 'guardian' } },
      { kind: 'adult_invited', actor: 'Nadia', detail: { email: 'monique-entrees@example.com', role: 'relative' } },
      { kind: 'adult_joined', actor: 'Monique', detail: { role: 'relative' } },
    ]);
  });

  it('keeps a first name or a class changed, and nothing for a save that changes nothing', async () => {
    const { nadia, karim, lea } = await family('fiche');
    const before = (await history(nadia, lea.id)).length;
    expect((await patch(nadia, lea.id, { name: 'Léa', level: 'cinquieme' })).status).toBe(200);
    expect((await patch(nadia, lea.id, { name: 'Léna', level: 'cinquieme' })).status).toBe(200);
    expect((await patch(karim, lea.id, { name: 'Léna', level: 'quatrieme' })).status).toBe(200);
    expect(await linesSince(nadia, lea.id, before)).toEqual([
      { kind: 'name_changed', actor: 'Nadia', detail: { name: 'Léna' } },
      { kind: 'level_changed', actor: 'Karim', detail: { level: 'quatrieme' } },
    ]);
  });

  it('keeps the memory proposed and withdrawn, once each', async () => {
    const { nadia, karim, lea } = await family('memoire');
    const before = (await history(nadia, lea.id)).length;
    for (const [cookie, memoryProposed] of [
      [nadia, true],
      [karim, true],
      [karim, false],
      [nadia, false],
    ] as const) {
      expect((await patch(cookie, lea.id, { memoryProposed })).status).toBe(200);
    }
    expect(await linesSince(nadia, lea.id, before)).toEqual([
      { kind: 'memory_proposed', actor: 'Nadia', detail: {} },
      { kind: 'memory_withdrawn', actor: 'Karim', detail: {} },
    ]);
  });

  it('keeps the starting codes, and a device unblocked or removed with its browser', async () => {
    const { nadia, karim, lea } = await family('appareils');
    const before = (await history(nadia, lea.id)).length;
    const device = api.device();
    expect((await device.activate(await api.activationCode(nadia, lea.id))).status).toBe(200);
    expect((await device.chooseCode(lea.id, STUDENT_CODE, true)).status).toBe(200);
    for (let n = 0; n < 3; n++) await device.enter(lea.id, '000000');
    const [{ id: deviceId } = { id: '' }] = (await api.devices(nadia, lea.id)).devices;
    expect((await api.request('POST', `/api/household/students/${lea.id}/devices/${deviceId}/unblock`, { cookie: karim })).status).toBe(204);
    await api.activationCode(karim, lea.id, 'forgotten');
    expect((await api.request('DELETE', `/api/household/students/${lea.id}/devices/${deviceId}`, { cookie: nadia })).status).toBe(204);
    expect(await linesSince(nadia, lea.id, before)).toEqual([
      { kind: 'device_code', actor: 'Nadia', detail: {} },
      { kind: 'device_unblocked', actor: 'Karim', detail: { device: 'test-device' } },
      { kind: 'forgotten_code', actor: 'Karim', detail: {} },
      { kind: 'device_removed', actor: 'Nadia', detail: { device: 'test-device' } },
    ]);
  });

  it('keeps an invitation withdrawn, a relative removed and a relative who leaves', async () => {
    const { nadia, monique, lea } = await family('departs');
    const paul = await api.adult(nadia, lea.id, 'paul-departs@example.com', 'relative');
    await named(paul, 'Paul');
    const before = (await history(nadia, lea.id)).length;
    await api.inviteAdult(nadia, lea.id, 'faute@exmaple.com', 'relative');
    const { invitations } = (await (await api.request('GET', `/api/household/students/${lea.id}/adults`, { cookie: nadia })).json()) as {
      invitations: { id: string }[];
    };
    expect((await api.request('DELETE', `/api/household/students/${lea.id}/invitations/${invitations[0]?.id ?? ''}`, { cookie: nadia })).status).toBe(
      204,
    );
    expect((await api.request('DELETE', `/api/household/students/${lea.id}/adults/${await idOf(paul)}`, { cookie: nadia })).status).toBe(204);
    expect((await api.request('DELETE', `/api/household/students/${lea.id}/adults/${await idOf(monique)}`, { cookie: monique })).status).toBe(204);
    expect(await linesSince(nadia, lea.id, before)).toEqual([
      { kind: 'adult_invited', actor: 'Nadia', detail: { email: 'faute@exmaple.com', role: 'relative' } },
      { kind: 'invitation_withdrawn', actor: 'Nadia', detail: { email: 'faute@exmaple.com' } },
      { kind: 'adult_removed', actor: 'Nadia', detail: { name: 'Paul' } },
      { kind: 'adult_left', actor: 'Monique', detail: {} },
    ]);
  });

  it('keeps the lines of an adult who left Catiche, without their name', async () => {
    const { nadia, karim, lea } = await family('parti');
    await patch(karim, lea.id, { level: 'sixieme' });
    await db.delete(user).where(eq(user.id, await idOf(karim)));
    const [last] = await history(nadia, lea.id);
    expect(last).toMatchObject({ kind: 'level_changed', actor: null });
  });

  it('gives the 90 last days, the newest first', async () => {
    const { nadia, lea } = await family('jours');
    const DAY = 24 * 60 * 60_000;
    await db.insert(childEvent).values([
      { studentId: lea.id, kind: 'memory_proposed', createdAt: new Date(Date.now() - 89 * DAY) },
      { studentId: lea.id, kind: 'memory_withdrawn', createdAt: new Date(Date.now() - 91 * DAY) },
    ]);
    const lines = await history(nadia, lea.id);
    expect(lines.map(({ kind }) => kind)).toContain('memory_proposed');
    expect(lines.map(({ kind }) => kind)).not.toContain('memory_withdrawn');
    expect(lines.at(-1)?.kind).toBe('memory_proposed');
    const times = lines.map(({ createdAt }) => Date.parse(createdAt));
    expect(times).toEqual(times.toSorted((a, b) => b - a));
    expect(Object.keys(lines[0] ?? {}).sort()).toEqual(['actor', 'createdAt', 'detail', 'id', 'kind']);
  });

  it('is read by a parent only: a relative and an adult without a link are not found, a student refused', async () => {
    const { nadia, monique, lea } = await family('lecteurs');
    const stranger = await api.guardian('inconnu-lecteurs@example.com');
    const read = (cookie: string) => api.request('GET', `/api/household/students/${lea.id}/history`, { cookie });
    expect((await read(monique)).status).toBe(404);
    expect((await read(stranger)).status).toBe(404);
    expect((await read(await api.pair(nadia, lea.id))).status).toBe(403);
  });
});

describe('the other parents', () => {
  /** The emails sent while `gesture` runs, as recipient and subject. */
  const sentDuring = async (gesture: () => unknown) => {
    const before = mail.sent.length;
    await gesture();
    await tasks.settled();
    return mail.sent.slice(before).map(({ to, subject, text }) => ({ to, subject, text }));
  };

  it('are told the memory withdrawn, never its author nor a relative', async () => {
    const { nadia, lea, karimEmail } = await family('mail-memoire');
    await patch(nadia, lea.id, { memoryProposed: true });
    const sent = await sentDuring(() => patch(nadia, lea.id, { memoryProposed: false }));
    expect(sent.map(({ to }) => to)).toEqual([karimEmail]);
    expect(sent[0]?.subject).toBe('Nadia a retiré ce que Tom retient de Léa');
    expect(sent[0]?.text).toContain('Nadia a retiré ce que Tom retient de Léa.');
  });

  it('are told a starting code for a forgotten code, and not one for a device', async () => {
    const { nadia, lea, karimEmail } = await family('mail-code');
    expect(await sentDuring(() => api.activationCode(nadia, lea.id, 'device'))).toEqual([]);
    const sent = await sentDuring(() => api.activationCode(nadia, lea.id, 'forgotten'));
    expect(sent.map(({ to }) => to)).toEqual([karimEmail]);
    expect(sent[0]?.text).toContain('Nadia a demandé un code de départ pour Léa, qui a oublié son code.');
  });

  it('are not told a memory proposed', async () => {
    const { nadia, lea } = await family('mail-propose');
    expect(await sentDuring(() => patch(nadia, lea.id, { memoryProposed: true }))).toEqual([]);
  });
});
