/**
 * The household on a real database, through the HTTP API as the web will call it: the access
 * matrix first (anonymous, two adults, a student of each), then what an adult does, the
 * declarations, two adults linked to one student, the devices of a student, and what a student may
 * do with better-auth's own routes.
 */

import { describe, expect, it } from 'bun:test';
import { eq, sql } from 'drizzle-orm';
import { account, device as deviceTable, deviceProfile, session, user } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { birthMonthAged, STUDENT_CODE, type Student } from '../../testing/http';
import { adultInvitation, adultProfile, guardianship, studentProfile } from './schema';

const { db } = await testDatabase();

// One app per block: each has its own rate-limit budget, and every request here shares one address.
const client = () => testApp(db).api;

/** The adults a student is linked to, and whether each declared it. */
const linksOf = (studentId: string) =>
  db
    .select({ adultId: guardianship.adultId, declared: sql<boolean>`${guardianship.declaredAt} IS NOT NULL` })
    .from(guardianship)
    .where(eq(guardianship.studentId, studentId));
const idOf = async (cookie: string) => (await matrix.sessionUser(cookie))?.id ?? '';

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
const relativeOfA = await matrix.adult(guardianA, studentOfA.id, 'proche@example.com', 'relative');
const guardianAId = await idOf(guardianA);
// From 15 the child decides alone on the memory: a relative's proposal is refused all the same as not found.
const olderOfA = await matrix.student(guardianA, { name: 'Lou', birthMonth: birthMonthAged(15) });
await db.insert(guardianship).values({ adultId: await idOf(relativeOfA), studentId: olderOfA.id, role: 'relative' });

describe('access matrix', () => {
  const api = matrix;
  const target = `/api/household/students/${studentOfA.id}`;
  const routes = [
    { method: 'GET', path: '/api/household/students' },
    {
      method: 'POST',
      path: '/api/household/students',
      body: { name: 'X', level: 'sixieme', birthMonth: birthMonthAged(11), declaredGuardian: true },
    },
    { method: 'PATCH', path: target, body: { name: 'Changé' } },
    { method: 'PATCH', path: target, body: { memoryProposed: true } },
    { method: 'PATCH', path: `/api/household/students/${olderOfA.id}`, body: { memoryProposed: true } },
    { method: 'POST', path: `${target}/activation-code`, body: { reason: 'device' } },
    { method: 'POST', path: `${target}/activation-code`, body: { reason: 'forgotten' } },
    { method: 'POST', path: `${target}/declaration`, body: { declaredGuardian: true } },
    { method: 'GET', path: `${target}/devices` },
    { method: 'POST', path: `${target}/devices/${deviceOfA.id}/unblock` },
    { method: 'DELETE', path: `${target}/devices/${deviceOfA.id}` },
    { method: 'POST', path: `${target}/invitations`, body: { email: 'invite@example.com', role: 'guardian' } },
    { method: 'DELETE', path: `${target}/invitations/${crypto.randomUUID()}` },
    { method: 'GET', path: `${target}/adults` },
    { method: 'DELETE', path: `${target}/adults/${guardianAId}` },
    { method: 'DELETE', path: target },
  ];
  // A relative follows the student, and manages nothing of them: refused as an adult without a link.
  const refused = [
    { actor: 'anonymous', cookie: undefined, status: 401, routes },
    { actor: 'the student', cookie: asStudentA, status: 403, routes },
    { actor: 'another student', cookie: asStudentB, status: 403, routes },
    { actor: 'an adult without a link to the student', cookie: guardianB, status: 404, routes: routes.slice(2) },
    { actor: 'a relative of the student', cookie: relativeOfA, status: 404, routes: routes.slice(2) },
  ];

  for (const { actor, cookie, status, routes: denied } of refused) {
    for (const { method, path, body } of denied) {
      it(`refuses ${method} ${path.replace(studentOfA.id, ':id').replace(olderOfA.id, ':id-of-15').replace(deviceOfA.id, ':device')} ${JSON.stringify(body ?? {})} to ${actor} with ${String(status)}, the student of A untouched`, async () => {
        const res = await api.request(method, path, { cookie, body });
        expect(res.status).toBe(status);
        expect(res.headers.get('content-type')).toStartWith('application/problem+json');
        const [row] = await db.select({ name: user.name }).from(user).where(eq(user.id, studentOfA.id));
        expect(row?.name).toBe('Léa');
        expect((await api.sessionUser(asStudentA))?.id).toBe(studentOfA.id);
        expect((await linksOf(studentOfA.id)).map(({ adultId }) => adultId)).toContain(guardianAId);
        expect(await db.select().from(adultInvitation).where(eq(adultInvitation.studentId, studentOfA.id))).toEqual([]);
      });
    }
  }

  it('lists to each adult only the students they are linked to', async () => {
    const listA = (await (await api.request('GET', '/api/household/students', { cookie: guardianA })).json()) as Student[];
    const listB = (await (await api.request('GET', '/api/household/students', { cookie: guardianB })).json()) as Student[];
    expect(listA.map((s) => s.id)).toEqual([studentOfA.id, olderOfA.id]);
    expect(listB.map((s) => s.id)).toEqual([studentOfB.id]);
  });
});

const creation = client();
const creator = await creation.guardian('createur@example.com');
const leo = await creation.student(creator, { name: 'Léo', level: 'sixieme', birthMonth: birthMonthAged(11) });

describe('/api/me', () => {
  it('tells who is signed in and as what, an adult without a child yet included', async () => {
    const api = client();
    const fresh = await api.guardian('nouveau@example.com');
    expect(await (await api.request('GET', '/api/me', { cookie: fresh })).json()).toMatchObject({
      name: 'Parent',
      // An adult, whatever their role for each child: parent or relative is the link's.
      role: 'adult',
      level: null,
      missing: { adult: false, guardianOf: [] },
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

  // The memory is proposed from the child's page, once they exist: never while adding them.
  it('never proposes the memory while adding the student', async () => {
    const res = await api.request('POST', '/api/household/students', {
      cookie: guardian,
      body: { name: 'Sans mémoire', level: 'cinquieme', birthMonth: birthMonthAged(12), declaredGuardian: true, memoryProposed: true },
    });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { memory: { proposed: boolean } }).memory.proposed).toBe(false);
  });

  it('links the student to the adult who added them, with their declaration', async () => {
    expect(await linksOf(leo.id)).toEqual([{ adultId: await idOf(guardian), declared: true }]);
  });

  it('links each of two students added at once', async () => {
    const parent = await api.guardian('simultane@example.com');
    const [one, two] = await Promise.all([api.student(parent), api.student(parent)]);
    const adultId = await idOf(parent);
    expect(await linksOf(one.id)).toEqual([{ adultId, declared: true }]);
    expect(await linksOf(two.id)).toEqual([{ adultId, declared: true }]);
  });

  for (const declaredGuardian of [undefined, false]) {
    it(`refuses a student without the declaration of parental authority (${String(declaredGuardian)}), and creates nothing`, async () => {
      const body = { name: 'Sans déclaration', level: 'cinquieme', birthMonth: birthMonthAged(12), declaredGuardian };
      const res = await api.request('POST', '/api/household/students', { cookie: guardian, body });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { detail: string }).detail).toStartWith('declaredGuardian:');
      expect(await db.select().from(user).where(eq(user.name, 'Sans déclaration'))).toEqual([]);
    });
  }

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
    ['name', 'Léa\nAccepter : https://piege.example'],
  ] as const) {
    it(`refuses ${field} ${JSON.stringify(value).slice(0, 20)}`, async () => {
      const body = { name: 'Léa', level: 'cinquieme', birthMonth: birthMonthAged(12), declaredGuardian: true, [field]: value };
      const res = await api.request('POST', '/api/household/students', { cookie: guardian, body });
      expect(res.status).toBe(400);
      expect(((await res.json()) as { detail: string }).detail).toStartWith(`${field}:`);
    });
  }
});

const devicesClient = client();
const devicesGuardian = await devicesClient.guardian('appareils@example.com');

// Never when the child last entered there: the guardian reads a device, not a schedule.
const DEVICE_FIELDS = ['blocked', 'createdAt', 'id', 'shared', 'userAgent'];

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
    // The device holds no profile now: nothing of it, its browser included, stays behind.
    expect(
      await db
        .select()
        .from(deviceTable)
        .where(eq(deviceTable.id, held?.id ?? '')),
    ).toEqual([]);
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

  it('deletes the student, their devices, links and profile; a second delete is not found', async () => {
    const student = await api.student(guardian);
    const device = await api.pair(guardian, student.id);

    const res = await api.request('DELETE', `/api/household/students/${student.id}`, { cookie: guardian });
    expect(res.status).toBe(204);
    expect(await api.sessionUser(device)).toBeUndefined();
    expect(await linksOf(student.id)).toEqual([]);
    expect(await db.select().from(studentProfile).where(eq(studentProfile.userId, student.id))).toEqual([]);

    const again = await api.request('DELETE', `/api/household/students/${student.id}`, { cookie: guardian });
    expect(again.status).toBe(404);
  });
});

const declarations = client();
const declarationsGuardian = await declarations.guardian('declarations@example.com');
const declarationsStudent = await declarations.pair(declarationsGuardian, (await declarations.student(declarationsGuardian)).id);

describe('the declarations', () => {
  const api = declarations;
  const missingOf = async (cookie: string) =>
    ((await (await api.request('GET', '/api/me', { cookie })).json()) as { missing: { adult: boolean; guardianOf: string[] } }).missing;
  const declaredAdultAt = async (cookie: string) =>
    (
      await db
        .select()
        .from(adultProfile)
        .where(eq(adultProfile.userId, await idOf(cookie)))
    )[0]?.declaredAdultAt ?? null;

  it('ask a new adult to declare being 18 or over, and keep the first date', async () => {
    await api.invite('majeur@example.com');
    const cookie = await api.signIn('majeur@example.com');
    expect(await missingOf(cookie)).toEqual({ adult: true, guardianOf: [] });

    expect((await api.request('POST', '/api/me/declarations', { cookie, body: { adult: true } })).status).toBe(204);
    expect(await missingOf(cookie)).toEqual({ adult: false, guardianOf: [] });
    const first = await declaredAdultAt(cookie);
    expect(first).toBeInstanceOf(Date);

    expect((await api.request('POST', '/api/me/declarations', { cookie, body: { adult: true } })).status).toBe(204);
    expect(await declaredAdultAt(cookie)).toEqual(first);
  });

  it('refuses a student from an adult who has not declared being 18 or over, and creates nothing', async () => {
    await api.invite('sans-majorite@example.com');
    const cookie = await api.signIn('sans-majorite@example.com');
    const body = { name: 'Sans majorité', level: 'cinquieme', birthMonth: birthMonthAged(12), declaredGuardian: true };
    expect((await api.request('POST', '/api/household/students', { cookie, body })).status).toBe(403);
    expect(await db.select().from(user).where(eq(user.name, 'Sans majorité'))).toEqual([]);
  });

  it('refuses a declaration that declares nothing, and a student', async () => {
    await api.invite('mineur@example.com');
    const cookie = await api.signIn('mineur@example.com');
    for (const body of [{}, { adult: false }]) {
      expect((await api.request('POST', '/api/me/declarations', { cookie, body })).status).toBe(400);
    }
    expect(await declaredAdultAt(cookie)).toBeNull();
    expect((await api.request('POST', '/api/me/declarations', { cookie: declarationsStudent, body: { adult: true } })).status).toBe(403);
    expect(await declaredAdultAt(declarationsStudent)).toBeNull();
  });

  it('list the links made before the declaration, until the adult confirms each', async () => {
    const cookie = await api.guardian('ancien@example.com');
    const lea = await api.student(cookie);
    const tom = await api.student(cookie, { name: 'Tom' });
    await db
      .update(guardianship)
      .set({ declaredAt: null })
      .where(eq(guardianship.adultId, await idOf(cookie)));
    expect((await missingOf(cookie)).guardianOf.toSorted()).toEqual([lea.id, tom.id].toSorted());

    const path = `/api/household/students/${lea.id}/declaration`;
    expect((await api.request('POST', path, { cookie, body: { declaredGuardian: false } })).status).toBe(400);
    expect((await api.request('POST', path, { cookie, body: { declaredGuardian: true } })).status).toBe(204);
    expect(await missingOf(cookie)).toEqual({ adult: false, guardianOf: [tom.id] });
    expect(await linksOf(lea.id)).toEqual([{ adultId: await idOf(cookie), declared: true }]);
  });

  it("refuses to confirm another adult's link, which stays to confirm", async () => {
    const cookie = await api.guardian('a-confirmer@example.com');
    const lea = await api.student(cookie);
    await db.update(guardianship).set({ declaredAt: null }).where(eq(guardianship.studentId, lea.id));
    const res = await api.request('POST', `/api/household/students/${lea.id}/declaration`, {
      cookie: declarationsGuardian,
      body: { declaredGuardian: true },
    });
    expect(res.status).toBe(404);
    expect(await linksOf(lea.id)).toEqual([{ adultId: await idOf(cookie), declared: false }]);
  });
});

const sharing = client();

describe('two adults linked to one student', () => {
  const api = sharing;

  it('both see and manage the student', async () => {
    const mother = await api.guardian('mere@example.com');
    const father = await api.guardian('pere@example.com');
    const lea = await api.student(mother);
    // Linked directly: the invitation of another adult comes with its own screen.
    await db.insert(guardianship).values({ adultId: await idOf(father), studentId: lea.id, declaredAt: new Date() });

    for (const [cookie, level] of [
      [mother, 'quatrieme'],
      [father, 'troisieme'],
    ] as const) {
      const list = (await (await api.request('GET', '/api/household/students', { cookie })).json()) as Student[];
      expect(list.map(({ id }) => id)).toEqual([lea.id]);
      const res = await api.request('PATCH', `/api/household/students/${lea.id}`, { cookie, body: { level } });
      expect(await res.json()).toMatchObject({ id: lea.id, level });
      expect((await api.devices(cookie, lea.id)).code).toEqual({ chosen: false, locked: false });
    }
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

  it('sends a link opened on their device back to their own space', async () => {
    const res = await api.request('GET', '/api/auth/verify-email?token=un-lien-du-parent&callbackURL=/', { cookie });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
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
