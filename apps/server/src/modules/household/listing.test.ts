/**
 * What the list of an adult's students says of each, on a real database, through the HTTP API:
 * who else decides for the child, and what the home warns a parent of, a device that blocked the
 * child after 3 wrong codes, a code stopped everywhere after 10; never a relative.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { studentCode } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { STUDENT_CODE } from '../../testing/http';

const { db } = await testDatabase();
const { api } = testApp(db);

interface Listed {
  id: string;
  parents: string[];
  alerts: { blockedDevices: { id: string; userAgent: string | null }[]; codeLocked: boolean };
}
const listedAs = async (cookie: string, studentId: string) => {
  const list = (await (await api.request('GET', '/api/household/students', { cookie })).json()) as Listed[];
  return list.find(({ id }) => id === studentId);
};
const alertsOf = async (cookie: string, studentId: string) => (await listedAs(cookie, studentId))?.alerts;
const { named } = api;

describe('the parents of a child', () => {
  it('are named to each adult, the earliest first, the adult themselves and the relatives left out', async () => {
    const nadia = await api.guardian('nadia-parents@example.com');
    await named(nadia, 'Nadia');
    const lea = await api.student(nadia);
    expect((await listedAs(nadia, lea.id))?.parents).toEqual([]);
    const karim = await api.adult(nadia, lea.id, 'karim-parents@example.com', 'guardian');
    await named(karim, 'Karim');
    const monique = await api.adult(nadia, lea.id, 'monique-parents@example.com', 'relative');
    expect((await listedAs(nadia, lea.id))?.parents).toEqual(['Karim']);
    expect((await listedAs(karim, lea.id))?.parents).toEqual(['Nadia']);
    expect((await listedAs(monique, lea.id))?.parents).toEqual(['Nadia', 'Karim']);
  });
});

describe('the alerts of the home', () => {
  it('names a device blocked after 3 wrong codes, until a parent unblocks it', async () => {
    const nadia = await api.guardian('nadia-bloque@example.com');
    const lea = await api.student(nadia);
    const device = api.device();
    await device.activate(await api.activationCode(nadia, lea.id));
    await device.chooseCode(lea.id, STUDENT_CODE, true);
    expect(await alertsOf(nadia, lea.id)).toEqual({ blockedDevices: [], codeLocked: false });
    for (let n = 0; n < 3; n++) await device.enter(lea.id, '000000');
    const alerts = await alertsOf(nadia, lea.id);
    expect(alerts?.blockedDevices.map(({ userAgent }) => userAgent)).toEqual(['test-device']);
    expect(alerts?.codeLocked).toBe(false);
    const deviceId = alerts?.blockedDevices[0]?.id ?? '';
    expect((await api.request('POST', `/api/household/students/${lea.id}/devices/${deviceId}/unblock`, { cookie: nadia })).status).toBe(204);
    expect(await alertsOf(nadia, lea.id)).toEqual({ blockedDevices: [], codeLocked: false });
  });

  it('says a code stopped everywhere after 10 wrong codes, to a parent and not to a relative', async () => {
    const nadia = await api.guardian('nadia-arrete@example.com');
    const lea = await api.student(nadia);
    await api.pair(nadia, lea.id);
    const monique = await api.adult(nadia, lea.id, 'monique-arrete@example.com', 'relative');
    await db.update(studentCode).set({ failures: 10 }).where(eq(studentCode.userId, lea.id));
    expect(await alertsOf(nadia, lea.id)).toEqual({ blockedDevices: [], codeLocked: true });
    expect(await alertsOf(monique, lea.id)).toEqual({ blockedDevices: [], codeLocked: false });
  });
});
