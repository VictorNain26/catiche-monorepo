/**
 * What the student's home reads of them, through the HTTP API on a real database: their parents,
 * whom it names; and « Depuis ta dernière visite », what changed since they last said « Vu », a
 * device that took their profile, a code chosen after a forgotten one, never the device they read
 * it on.
 */

import { describe, expect, it } from 'bun:test';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';

const { db } = await testDatabase();
const { api } = testApp(db);

interface News {
  codeChangedAt: string | null;
  devices: { userAgent: string | null; createdAt: string }[];
}

const newsOf = async (cookie: string) => {
  const res = await api.request('GET', '/api/me/news', { cookie });
  expect(res.status).toBe(200);
  return (await res.json()) as News;
};
const seen = async (cookie: string) => {
  expect((await api.request('POST', '/api/me/news/seen', { cookie })).status).toBe(204);
};

describe('the parents of a student', () => {
  it('are named to them by /api/me, the earliest first, never a relative', async () => {
    const nadia = await api.guardian('nadia-me@example.com');
    await api.named(nadia, 'Nadia');
    const lea = await api.student(nadia);
    const karim = await api.adult(nadia, lea.id, 'karim-me@example.com', 'guardian');
    await api.named(karim, 'Karim');
    await api.adult(nadia, lea.id, 'monique-me@example.com', 'relative');
    const asLea = await api.pair(nadia, lea.id);
    expect(await (await api.request('GET', '/api/me', { cookie: asLea })).json()).toMatchObject({ role: 'student', parents: ['Nadia', 'Karim'] });
  });
});

describe('the news of a student', () => {
  it('are none on their first device', async () => {
    const nadia = await api.guardian('nouvelles-rien@example.com');
    const lea = await api.student(nadia);
    const tablet = await api.pair(nadia, lea.id);
    expect(await newsOf(tablet)).toEqual({ codeChangedAt: null, devices: [] });
  });

  it('never name the device the first code was chosen on, to the devices added after it', async () => {
    const nadia = await api.guardian('nouvelles-premier@example.com');
    const lea = await api.student(nadia);
    await api.pair(nadia, lea.id);
    const phone = await api.pair(nadia, lea.id);
    expect((await newsOf(phone)).devices).toEqual([]);
  });

  it('name a device added since, never the one they are read on, and nothing once seen', async () => {
    const nadia = await api.guardian('nouvelles-appareil@example.com');
    const lea = await api.student(nadia);
    const tablet = await api.pair(nadia, lea.id);
    await api.pair(nadia, lea.id);
    const { codeChangedAt, devices } = await newsOf(tablet);
    expect(codeChangedAt).toBeNull();
    expect(devices.map(({ userAgent }) => userAgent)).toEqual(['test-device']);
    expect(Date.parse(devices[0]?.createdAt ?? '')).toBeGreaterThan(Date.now() - 60_000);
    await seen(tablet);
    expect(await newsOf(tablet)).toEqual({ codeChangedAt: null, devices: [] });
  });

  it('say when a code was chosen after a forgotten one, and nothing once seen', async () => {
    const nadia = await api.guardian('nouvelles-code@example.com');
    const lea = await api.student(nadia);
    const tablet = await api.pair(nadia, lea.id);
    await seen(tablet);
    const fresh = api.device();
    expect((await fresh.activate(await api.activationCode(nadia, lea.id, 'forgotten'))).status).toBe(200);
    expect((await fresh.chooseCode(lea.id, '920374', true)).status).toBe(200);
    const { codeChangedAt } = await newsOf(fresh.cookie());
    expect(Date.parse(codeChangedAt ?? '')).toBeGreaterThan(Date.now() - 60_000);
    await seen(fresh.cookie());
    expect(await newsOf(fresh.cookie())).toEqual({ codeChangedAt: null, devices: [] });
  });

  it('are the student’s alone', async () => {
    const nadia = await api.guardian('nouvelles-adulte@example.com');
    expect((await api.request('GET', '/api/me/news', { cookie: nadia })).status).toBe(403);
    expect((await api.request('POST', '/api/me/news/seen', { cookie: nadia })).status).toBe(403);
  });
});
