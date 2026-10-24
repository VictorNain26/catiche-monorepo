/**
 * The history of a child, on a real database, through the HTTP API: each gesture of an adult on
 * the child writes its line, with who made it; a parent reads the 90 last days, the newest first,
 * and no one else. The gestures that count reach the other parents by email.
 */

import { describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { deviceProfile, user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { STUDENT_CODE } from '../../testing/http';
import { childEvent } from './schema';

const { db } = await testDatabase();
const { api, mail, tasks } = testApp(db);

interface Line {
  id: number;
  kind: string;
  detail: Record<string, unknown>;
  actor: string | null;
  subject: string | null;
  createdAt: string;
}

const idOf = async (cookie: string) => (await api.sessionUser(cookie))?.id ?? '';
const { named } = api;
const history = async (cookie: string, studentId: string) => {
  const res = await api.request('GET', `/api/household/students/${studentId}/history`, { cookie });
  expect(res.status).toBe(200);
  return (await res.json()) as Line[];
};
/** The lines written since `before` lines were, the oldest first, as kind, author, the adult they concern and detail. */
const linesSince = async (cookie: string, studentId: string, before: number) =>
  (await history(cookie, studentId))
    .toReversed()
    .slice(before)
    .map(({ kind, actor, subject, detail }) => ({ kind, actor, subject, detail }));
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
    // Invited before they had an account: the invitation names no one, never the address.
    expect(await linesSince(nadia, lea.id, 0)).toEqual([
      { kind: 'adult_invited', actor: 'Nadia', subject: null, detail: { role: 'guardian' } },
      // Named after: the line says who they are now.
      { kind: 'adult_joined', actor: 'Karim', subject: null, detail: { role: 'guardian' } },
      { kind: 'adult_invited', actor: 'Nadia', subject: null, detail: { role: 'relative' } },
      { kind: 'adult_joined', actor: 'Monique', subject: null, detail: { role: 'relative' } },
    ]);
  });

  it('names an adult invited who has an account by their first name, read when the history is', async () => {
    const { nadia, lea } = await family('compte');
    const sam = await api.guardian('sam-compte@example.com');
    await named(sam, 'Sam');
    const before = (await history(nadia, lea.id)).length;
    await api.inviteAdult(nadia, lea.id, 'sam-compte@example.com', 'relative');
    await named(sam, 'Samuel');
    expect(await linesSince(nadia, lea.id, before)).toEqual([
      { kind: 'adult_invited', actor: 'Nadia', subject: 'Samuel', detail: { role: 'relative' } },
    ]);
  });

  it('keeps a first name or a class changed, and nothing for a save that changes nothing', async () => {
    const { nadia, karim, lea } = await family('fiche');
    const before = (await history(nadia, lea.id)).length;
    expect((await patch(nadia, lea.id, { name: 'Léa', level: 'cinquieme' })).status).toBe(200);
    expect((await patch(nadia, lea.id, { name: 'Léna', level: 'cinquieme' })).status).toBe(200);
    expect((await patch(karim, lea.id, { name: 'Léna', level: 'quatrieme' })).status).toBe(200);
    expect(await linesSince(nadia, lea.id, before)).toEqual([
      // The child's own first name, whose lines go with the child.
      { kind: 'name_changed', actor: 'Nadia', subject: null, detail: { name: 'Léna' } },
      { kind: 'level_changed', actor: 'Karim', subject: null, detail: { level: 'quatrieme' } },
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
      { kind: 'memory_proposed', actor: 'Nadia', subject: null, detail: {} },
      { kind: 'memory_withdrawn', actor: 'Karim', subject: null, detail: {} },
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
      { kind: 'device_code', actor: 'Nadia', subject: null, detail: {} },
      { kind: 'device_unblocked', actor: 'Karim', subject: null, detail: { device: 'test-device' } },
      { kind: 'forgotten_code', actor: 'Karim', subject: null, detail: {} },
      { kind: 'device_removed', actor: 'Nadia', subject: null, detail: { device: 'test-device' } },
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
      { kind: 'adult_invited', actor: 'Nadia', subject: null, detail: { role: 'relative' } },
      { kind: 'invitation_withdrawn', actor: 'Nadia', subject: null, detail: {} },
      { kind: 'adult_removed', actor: 'Nadia', subject: 'Paul', detail: {} },
      { kind: 'adult_left', actor: 'Monique', subject: null, detail: {} },
    ]);
  });

  it('keeps neither the first name nor the address of an adult whose account is deleted', async () => {
    const { nadia, lea } = await family('efface');
    const paul = await api.adult(nadia, lea.id, 'paul-efface@example.com', 'relative');
    await named(paul, 'Paul');
    await api.inviteAdult(nadia, lea.id, 'jamais-efface@example.com', 'relative');
    const [pending] = (
      (await (await api.request('GET', `/api/household/students/${lea.id}/adults`, { cookie: nadia })).json()) as { invitations: { id: string }[] }
    ).invitations;
    expect((await api.request('DELETE', `/api/household/students/${lea.id}/invitations/${pending?.id ?? ''}`, { cookie: nadia })).status).toBe(204);
    expect((await api.request('DELETE', `/api/household/students/${lea.id}/adults/${await idOf(paul)}`, { cookie: nadia })).status).toBe(204);
    expect((await api.request('POST', '/api/auth/delete-user', { cookie: paul, body: {} })).status).toBe(200);
    const written = JSON.stringify(await db.select().from(childEvent).where(eq(childEvent.studentId, lea.id)));
    const read = JSON.stringify(await history(nadia, lea.id));
    for (const trace of ['Paul', 'paul-efface', 'jamais-efface']) {
      expect(written).not.toContain(trace);
      expect(read).not.toContain(trace);
    }
    expect((await linesSince(nadia, lea.id, 0)).filter(({ kind }) => kind === 'adult_removed')).toEqual([
      { kind: 'adult_removed', actor: 'Nadia', subject: null, detail: {} },
    ]);
  });

  it('keeps the lines of an adult who left Catiche, without their name', async () => {
    const { nadia, karim, lea } = await family('parti');
    expect((await patch(karim, lea.id, { level: 'sixieme' })).status).toBe(200);
    await db.delete(user).where(eq(user.id, await idOf(karim)));
    const lines = await history(nadia, lea.id);
    expect(lines.filter(({ actor }) => actor === null).map(({ kind }) => kind)).toEqual(['level_changed', 'adult_joined']);
  });

  it('gives the 90 last days', async () => {
    const { nadia, lea } = await family('jours');
    const DAY = 24 * 60 * 60_000;
    await db.insert(childEvent).values([
      { studentId: lea.id, kind: 'memory_proposed', createdAt: new Date(Date.now() - 89 * DAY) },
      { studentId: lea.id, kind: 'memory_withdrawn', createdAt: new Date(Date.now() - 91 * DAY) },
    ]);
    const lines = await history(nadia, lea.id);
    expect(lines.map(({ kind }) => kind)).toContain('memory_proposed');
    expect(lines.map(({ kind }) => kind)).not.toContain('memory_withdrawn');
    expect(Object.keys(lines[0] ?? {}).sort()).toEqual(['actor', 'createdAt', 'detail', 'id', 'kind', 'subject']);
  });

  // A clock can step back: this machine's database did, by 2 s, while these tests ran.
  it('gives the lines in the order they were written, the newest first, whatever the clock said', async () => {
    const { nadia, lea } = await family('horloge');
    // Written before the clock stepped back: dated after the gesture that follows it.
    await db.insert(childEvent).values({ studentId: lea.id, kind: 'memory_proposed', createdAt: new Date(Date.now() + 60 * 60_000) });
    expect((await patch(nadia, lea.id, { level: 'sixieme' })).status).toBe(200);
    expect((await history(nadia, lea.id)).slice(0, 2).map(({ kind }) => kind)).toEqual(['level_changed', 'memory_proposed']);
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

describe('at the same time', () => {
  /** Resolves once `count` statements of this database wait for a lock. */
  const waitingForLocks = async (count: number) => {
    for (;;) {
      const [row] = await db.execute<{ waiting: number }>(
        sql`select count(*)::int as waiting from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`,
      );
      if ((row?.waiting ?? 0) >= count) return;
      await Bun.sleep(20);
    }
  };

  // The child's code holds the child as a key, and the parent's gesture locks the child first.
  // The device's profile, held here, lines them up: the child's choice waits for it with the
  // device locked, then the parent's gesture with the child locked; released, neither may wait
  // for the other forever.
  for (const gesture of ['unblock', 'remove'] as const) {
    it(`lets a child choose their code while a parent ${gesture === 'unblock' ? 'unblocks' : 'removes'} the device: never a deadlock`, async () => {
      const parent = await api.guardian(`parent-course-${gesture}@example.com`);
      const child = await api.student(parent);
      const device = api.device();
      expect((await device.activate(await api.activationCode(parent, child.id))).status).toBe(200);
      const [{ id: deviceId } = { id: '' }] = (await api.devices(parent, child.id)).devices;

      const held = Promise.withResolvers<undefined>();
      const released = Promise.withResolvers<undefined>();
      const holding = db.transaction(async (tx) => {
        await tx.select().from(deviceProfile).where(eq(deviceProfile.deviceId, deviceId)).for('update');
        held.resolve(undefined);
        await released.promise;
      });
      await held.promise;
      const chosen = device.chooseCode(child.id, STUDENT_CODE, true);
      await waitingForLocks(1);
      const gestured =
        gesture === 'unblock'
          ? api.request('POST', `/api/household/students/${child.id}/devices/${deviceId}/unblock`, { cookie: parent })
          : api.request('DELETE', `/api/household/students/${child.id}/devices/${deviceId}`, { cookie: parent });
      await waitingForLocks(2);
      released.resolve(undefined);
      await holding;
      expect([(await chosen).status, (await gestured).status]).toEqual([200, 204]);
    });
  }
});
