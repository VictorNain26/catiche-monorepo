/**
 * The household on a real database, through the HTTP API as the web will call it: the access
 * matrix first (anonymous, two guardians, a student of each), then what a guardian does, the
 * devices of a student, and what a student may do with better-auth's own routes.
 */

import { describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { account, deviceProfile, session, user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { birthMonthAged, STUDENT_CODE, type Student } from '../../testing/http';
import { householdMember, studentProfile } from './schema';

const { db } = await testDatabase();

// One app per block: each has its own rate-limit budget, and every request here shares one address.
const client = () => testApp(db).api;

const householdOf = async (userId: string) => (await db.select().from(householdMember).where(eq(householdMember.userId, userId)))[0]?.householdId;

const matrix = client();
const guardianA = await matrix.guardian('a@example.com');
const guardianB = await matrix.guardian('b@example.com');
const studentOfA = await matrix.student(guardianA);
const studentOfB = await matrix.student(guardianB);
const asStudentA = await matrix.pair(guardianA, studentOfA.id);
const asStudentB = await matrix.pair(guardianB, studentOfB.id);
const [deviceOfA] = (await matrix.devices(guardianA, studentOfA.id)).devices;
// Without it the device route would read « /devices/ », refused all the same: the matrix would prove nothing.
if (!deviceOfA) throw new Error('The student of A has no device');

describe('access matrix', () => {
  const api = matrix;
  const target = `/api/household/students/${studentOfA.id}`;
  const routes = [
    { method: 'GET', path: '/api/household/students' },
    { method: 'POST', path: '/api/household/students', body: { name: 'X', level: 'sixieme', birthMonth: birthMonthAged(11) } },
    { method: 'PATCH', path: target, body: { name: 'Changé' } },
    { method: 'POST', path: `${target}/activation-code`, body: { reason: 'device' } },
    { method: 'POST', path: `${target}/activation-code`, body: { reason: 'forgotten' } },
    { method: 'GET', path: `${target}/devices` },
    { method: 'POST', path: `${target}/devices/${deviceOfA.id}/unblock` },
    { method: 'DELETE', path: `${target}/devices/${deviceOfA.id}` },
    { method: 'DELETE', path: target },
  ];
  const refused = [
    { actor: 'anonymous', cookie: undefined, status: 401, routes },
    { actor: 'the student', cookie: asStudentA, status: 403, routes },
    { actor: 'a student of another household', cookie: asStudentB, status: 403, routes },
    { actor: 'the guardian of another household', cookie: guardianB, status: 404, routes: routes.slice(2) },
  ];

  for (const { actor, cookie, status, routes: denied } of refused) {
    for (const { method, path, body } of denied) {
      it(`refuses ${method} ${path.replace(studentOfA.id, ':id').replace(deviceOfA.id, ':device')} to ${actor} with ${String(status)}, the student of A untouched`, async () => {
        const res = await api.request(method, path, { cookie, body });
        expect(res.status).toBe(status);
        expect(res.headers.get('content-type')).toStartWith('application/problem+json');
        const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, studentOfA.id));
        expect(row?.name).toBe('Léa');
        expect((await api.sessionUser(asStudentA))?.id).toBe(studentOfA.id);
      });
    }
  }

  it('lists to each guardian only the students of their household', async () => {
    const listA = (await (await api.request('GET', '/api/household/students', { cookie: guardianA })).json()) as Student[];
    const listB = (await (await api.request('GET', '/api/household/students', { cookie: guardianB })).json()) as Student[];
    expect(listA.map((s) => s.id)).toEqual([studentOfA.id]);
    expect(listB.map((s) => s.id)).toEqual([studentOfB.id]);
  });
});

const creation = client();
const creator = await creation.guardian('createur@example.com');
const leo = await creation.student(creator, { name: 'Léo', level: 'sixieme', birthMonth: birthMonthAged(11) });

describe('/api/me', () => {
  it('tells who is signed in and as what, a guardian without a household yet included', async () => {
    const api = client();
    const fresh = await api.guardian('nouveau@example.com');
    expect(await (await api.request('GET', '/api/me', { cookie: fresh })).json()).toMatchObject({
      name: 'Parent',
      role: 'guardian',
      level: null,
    });
    // In 5e as in 3e, the child's own space, which says nothing of a family device.
    expect(await (await api.request('GET', '/api/me', { cookie: asStudentA })).json()).toEqual({
      id: studentOfA.id,
      name: 'Léa',
      role: 'student',
      level: 'cinquieme',
    });
    expect((await api.request('GET', '/api/me')).status).toBe(401);
  });

  it('extends a session used past a day, and sends its new cookie', async () => {
    const api = client();
    const cookie = await api.guardian('assidu@example.com');
    const { id } = (await (await api.request('GET', '/api/me', { cookie })).json()) as { id: string };
    await db
      .update(session)
      .set({ expiresAt: new Date(Date.now() + 3_600_000) })
      .where(eq(session.userId, id));
    const res = await api.request('GET', '/api/me', { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.getSetCookie().some((line) => line.startsWith('better-auth.session_token='))).toBe(true);
    const [row] = await db.select({ expiresAt: session.expiresAt }).from(session).where(eq(session.userId, id));
    expect(row?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 86_400_000);
  });
});

describe('a guardian creates a student', () => {
  const api = creation;
  const guardian = creator;

  it('returns the student: a first name, a level and a month of birth', () => {
    expect(leo).toMatchObject({ name: 'Léo', level: 'sixieme', birthMonth: birthMonthAged(11) });
  });

  it('gives the student no credential: a non-routable address, no password', async () => {
    const [row] = await db.select({ email: user.email }).from(user).where(eq(user.id, leo.id));
    expect(row?.email).toEndWith('.invalid');
    expect(await db.select().from(account).where(eq(account.userId, leo.id))).toEqual([]);
  });

  it('puts every student in one household with their guardian', async () => {
    const second = await api.student(guardian);
    const home = await householdOf(second.id);
    expect(home).toBeDefined();
    expect(await householdOf(leo.id)).toBe(home);
    expect(await householdOf((await api.sessionUser(guardian))?.id ?? '')).toBe(home);
  });

  it('creates one household when two first students arrive at once', async () => {
    const parent = await api.guardian('simultane@example.com');
    const [one, two] = await Promise.all([api.student(parent), api.student(parent)]);
    expect(await householdOf(one.id)).toBe(await householdOf(two.id));
  });

  for (const [field, value] of [
    ['level', 'seconde'],
    ['birthMonth', '2999-01'],
    ['birthMonth', new Date().toISOString().slice(0, 7)],
    ['birthMonth', birthMonthAged(3)],
    // Turning 5 this month: still 4 until it is over (domain/student-age.ts).
    ['birthMonth', `${String(new Date().getUTCFullYear() - 5)}-${String(new Date().getUTCMonth() + 1).padStart(2, '0')}`],
    ['birthMonth', '1990-01'],
    ['birthMonth', '2014-13'],
    ['birthMonth', '2014-3'],
    ['name', '   '],
    ['name', 'a'.repeat(51)],
  ] as const) {
    it(`refuses ${field} ${JSON.stringify(value).slice(0, 20)}`, async () => {
      const body = { name: 'Léa', level: 'cinquieme', birthMonth: birthMonthAged(12), [field]: value };
      const res = await api.request('POST', '/api/household/students', { cookie: guardian, body });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { detail: string }).detail).toStartWith(`${field}:`);
    });
  }
});

const devicesClient = client();
const devicesGuardian = await devicesClient.guardian('appareils@example.com');

const DEVICE_FIELDS = ['blocked', 'createdAt', 'id', 'lastUsedAt', 'shared', 'userAgent'];

describe("a student's devices", () => {
  const api = devicesClient;
  const guardian = devicesGuardian;

  it('show the guardian their browser and state, never an address, and whether a code is chosen, never the code', async () => {
    const student = await api.student(guardian);
    expect((await api.devices(guardian, student.id)).code).toEqual({ chosen: false, locked: false });
    await api.pair(guardian, student.id);
    const { devices, code } = await api.devices(guardian, student.id);
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ userAgent: 'test-device', shared: false, blocked: false });
    expect(Object.keys(devices[0] ?? {}).sort()).toEqual(DEVICE_FIELDS);
    expect(code).toEqual({ chosen: true, locked: false });
  });

  it('are unblocked by the guardian, the profile open again on that device', async () => {
    const student = await api.student(guardian);
    const tablet = api.device();
    await tablet.activate(await api.activationCode(guardian, student.id));
    await tablet.chooseCode(student.id, STUDENT_CODE, true);
    await tablet.send('POST', '/api/auth/sign-out', {});
    for (let attempt = 0; attempt < 3; attempt++) await tablet.enter(student.id, '305186');
    const [blocked] = (await api.devices(guardian, student.id)).devices;
    expect(blocked?.blocked).toBe(true);

    const res = await api.request('POST', `/api/household/students/${student.id}/devices/${blocked?.id ?? ''}/unblock`, { cookie: guardian });
    expect(res.status).toBe(204);
    expect((await api.devices(guardian, student.id)).devices[0]?.blocked).toBe(false);
    expect((await tablet.enter(student.id, STUDENT_CODE)).status).toBe(200);
  });

  it('are disconnected by the guardian: the profile leaves the device, its sessions close', async () => {
    const student = await api.student(guardian);
    const device = await api.pair(guardian, student.id);
    const [held] = (await api.devices(guardian, student.id)).devices;
    const res = await api.request('DELETE', `/api/household/students/${student.id}/devices/${held?.id ?? ''}`, { cookie: guardian });
    expect(res.status).toBe(204);
    expect(await api.sessionUser(device)).toBeUndefined();
    expect((await api.devices(guardian, student.id)).devices).toEqual([]);
    expect(await db.select().from(deviceProfile).where(eq(deviceProfile.studentId, student.id))).toEqual([]);
  });

  it('show the student their own devices, however long ago they were recognised', async () => {
    const student = await api.student(guardian);
    const device = await api.pair(guardian, student.id);
    await db
      .update(deviceProfile)
      .set({ createdAt: new Date(Date.now() - 200 * 86_400_000) })
      .where(eq(deviceProfile.studentId, student.id));
    const res = await api.request('GET', '/api/me/devices', { cookie: device });
    expect(res.status).toBe(200);
    const { devices } = (await res.json()) as { devices: { userAgent: string }[] };
    expect(devices).toHaveLength(1);
    expect(devices[0]).toMatchObject({ userAgent: 'test-device' });
    expect(Object.keys(devices[0] ?? {}).sort()).toEqual(DEVICE_FIELDS);
  });
});

const management = client();
const manager = await management.guardian('gestion@example.com');

describe('a guardian manages a student', () => {
  const api = management;
  const guardian = manager;

  it('changes the name and the level', async () => {
    const student = await api.student(guardian);
    const res = await api.request('PATCH', `/api/household/students/${student.id}`, {
      cookie: guardian,
      body: { name: 'Léana', level: 'quatrieme' },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: student.id, name: 'Léana', level: 'quatrieme', birthMonth: student.birthMonth });
  });

  it('refuses an empty change', async () => {
    const student = await api.student(guardian);
    const res = await api.request('PATCH', `/api/household/students/${student.id}`, { cookie: guardian, body: {} });
    expect(res.status).toBe(400);
  });

  it('deletes the student, their devices, membership and profile; a second delete is not found', async () => {
    const student = await api.student(guardian);
    const device = await api.pair(guardian, student.id);

    const res = await api.request('DELETE', `/api/household/students/${student.id}`, { cookie: guardian });
    expect(res.status).toBe(204);
    expect(await api.sessionUser(device)).toBeUndefined();
    expect(await householdOf(student.id)).toBeUndefined();
    expect(await db.select().from(studentProfile).where(eq(studentProfile.userId, student.id))).toEqual([]);

    const again = await api.request('DELETE', `/api/household/students/${student.id}`, { cookie: guardian });
    expect(again.status).toBe(404);
  });
});

const own = client();
const ownGuardian = await own.guardian('regles@example.com');
const ownStudent = await own.student(ownGuardian);
const ownCookie = await own.pair(ownGuardian, ownStudent.id);

describe("a student, through better-auth's own routes", () => {
  const api = own;
  const student = ownStudent;
  const cookie = ownCookie;

  it('cannot change their name, set a password, change their email nor delete their account', async () => {
    for (const [path, body] of [
      ['/api/auth/update-user', { name: 'Autre' }],
      ['/api/auth/set-password', { newPassword: 'un mot de passe à moi' }],
      ['/api/auth/change-email', { newEmail: 'eleve@example.com' }],
      ['/api/auth/delete-user', {}],
    ] as const) {
      expect((await api.request('POST', path, { cookie, body })).status).toBe(403);
    }
    const [row] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, student.id));
    expect(row?.name).toBe(student.name);
    expect(row?.email).toEndWith('.invalid');
    expect(await db.select().from(account).where(eq(account.userId, student.id))).toEqual([]);
  });

  it('sends a link opened on their device to the sign-in page, which says whose the device is', async () => {
    const res = await api.request('GET', '/api/auth/verify-email?token=un-lien-du-parent&callbackURL=/', { cookie });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/connexion');
  });

  it('still reads their session and signs out', async () => {
    const fresh = await api.pair(ownGuardian, student.id);
    expect((await api.sessionUser(fresh))?.id).toBe(student.id);
    expect((await api.request('POST', '/api/auth/sign-out', { cookie: fresh, body: {} })).status).toBe(200);
    expect(await api.sessionUser(fresh)).toBeUndefined();
  });

  it('leaves a guardian free to change their own name', async () => {
    const parent = await api.guardian('libre@example.com');
    const res = await api.request('POST', '/api/auth/update-user', { cookie: parent, body: { name: 'Victor' } });
    expect(res.status).toBe(200);
  });
});
