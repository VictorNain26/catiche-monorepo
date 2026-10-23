/**
 * The adults of a student, on a real database, through the HTTP API: a parent invites another
 * parent or a relative, the email leads them in, they accept from their first screen or their
 * home, and a relative follows the student without managing them. A parent removes a relative,
 * never another parent; a relative removes themselves.
 */

import { describe, expect, it } from 'bun:test';
import { and, eq, like } from 'drizzle-orm';
import { invitationIdentifier } from '../../platform/auth/invitation';
import { user, verification } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { ORIGIN } from '../../testing/http';
import { adultInvitation, guardianship } from './schema';

const { db } = await testDatabase();
const { api, mail, tasks } = testApp(db);

const idOf = async (cookie: string) => (await api.sessionUser(cookie))?.id ?? '';
const named = async (cookie: string, name: string) => {
  expect((await api.request('POST', '/api/auth/update-user', { cookie, body: { name } })).status).toBe(200);
};
const linksOf = (studentId: string) =>
  db.select({ adultId: guardianship.adultId, role: guardianship.role }).from(guardianship).where(eq(guardianship.studentId, studentId));
const invitationsOf = (studentId: string) => db.select().from(adultInvitation).where(eq(adultInvitation.studentId, studentId));
const invite = (cookie: string, studentId: string, body: unknown) =>
  api.request('POST', `/api/household/students/${studentId}/invitations`, { cookie, body });

interface Pending {
  id: string;
  studentId: string;
  studentName: string;
  invitedBy: string;
  role: string;
}
const invitationsFor = async (cookie: string) =>
  ((await (await api.request('GET', '/api/me', { cookie })).json()) as { invitations: Pending[] }).invitations;

/** Nadia, a parent named, and Léa, her child. */
const family = async (tag: string) => {
  const nadia = await api.guardian(`nadia-${tag}@example.com`);
  await named(nadia, 'Nadia');
  const lea = await api.student(nadia);
  return { nadia, lea };
};

describe('a parent invites an adult', () => {
  it('sends a new address the invitation: who invites, for which child, one button, no code', async () => {
    const { nadia, lea } = await family('neuve');
    const email = await api.inviteAdult(nadia, lea.id, 'karim-neuf@example.com', 'guardian');
    expect(email.subject).toBe('Nadia vous invite sur Catiche, pour Léa');
    expect(email.text).toContain('Bonjour,\n\nNadia vous invite à suivre les devoirs du soir de Léa sur Catiche.');
    expect(email.text).toContain('L’invitation vaut 30 jours.');
    expect(email.text).not.toMatch(/\b\d{6}\b/);
    const link = mail.invitationIn(email);
    expect(`${link.origin}${link.pathname}`).toBe(`${ORIGIN}/invitation`);
    // The closed beta's own invitation, which lets the address create its account.
    expect(
      await db
        .select()
        .from(verification)
        .where(eq(verification.identifier, invitationIdentifier('karim-neuf@example.com'))),
    ).toHaveLength(1);
  });

  it('tells the other parents, never the relatives nor the one who invites', async () => {
    const { nadia, lea } = await family('prevenus');
    await api.adult(nadia, lea.id, 'karim-prevenu@example.com', 'guardian');
    await api.adult(nadia, lea.id, 'monique-prevenue@example.com', 'relative');
    await tasks.settled();
    const before = mail.sent.length;
    const told = mail.next('karim-prevenu@example.com');
    await api.inviteAdult(nadia, lea.id, 'paul@example.com', 'relative');
    const notice = await told;
    expect(notice.subject).toBe('Nadia a invité un adulte pour Léa');
    expect(notice.text).toContain('Nadia a invité paul@example.com pour Léa, comme proche.');
    await tasks.settled();
    const recipients = mail.sent.slice(before).map(({ to }) => to);
    expect(recipients.toSorted()).toEqual(['karim-prevenu@example.com', 'paul@example.com']);
  });

  it('sends an address that has an account a link to Catiche, where the invitation waits: no way in by the email', async () => {
    const { nadia, lea } = await family('compte');
    await api.guardian('deja-inscrit@example.com');
    const links = () => db.select().from(verification).where(like(verification.identifier, 'magic-link:%'));
    const linksBefore = (await links()).length;
    const email = await api.inviteAdult(nadia, lea.id, 'deja-inscrit@example.com', 'relative');
    expect(email.subject).toBe('Nadia vous invite sur Catiche, pour Léa');
    expect(email.text).toContain(`L’invitation vous attend dans Catiche : ${ORIGIN}/`);
    expect((await links()).length).toBe(linksBefore);
  });

  // The mailer makes a line « label : https://… » a link: a name on several lines would forge one.
  it('writes each name on one line, so that no name adds a link to the email', async () => {
    const { nadia, lea } = await family('lignes');
    await named(nadia, 'Paul\n\nAccepter l’invitation : https://piege.example');
    const email = await api.inviteAdult(nadia, lea.id, 'cible@example.com', 'relative');
    const links = email.text.split('\n').filter((line) => /^.+ : https?:\/\/\S+$/.test(line));
    expect(links).toHaveLength(1);
    expect(links[0]).toStartWith(`Accepter l’invitation : ${ORIGIN}/invitation#`);
    expect(email.subject).not.toContain('\n');
  });

  it('replaces an invitation sent again to the same address', async () => {
    const { nadia, lea } = await family('remplace');
    expect((await invite(nadia, lea.id, { email: ' Deux-Fois@Example.com ', role: 'relative' })).status).toBe(204);
    await api.inviteAdult(nadia, lea.id, 'deux-fois@example.com', 'guardian');
    expect((await invitationsOf(lea.id)).map(({ email, role }) => ({ email, role }))).toEqual([{ email: 'deux-fois@example.com', role: 'guardian' }]);
  });

  it('refuses an adult who has not declared the link, their own address, an adult already linked, and invites no one', async () => {
    const { nadia, lea } = await family('refus');
    await api.adult(nadia, lea.id, 'lie@example.com', 'relative');
    expect((await invite(nadia, lea.id, { email: 'nadia-refus@example.com', role: 'relative' })).status).toBe(400);
    expect((await invite(nadia, lea.id, { email: 'LIE@example.com', role: 'guardian' })).status).toBe(400);
    expect((await invite(nadia, lea.id, { email: 'pas-une-adresse', role: 'relative' })).status).toBe(400);
    expect((await invite(nadia, lea.id, { email: 'role@example.com', role: 'voisin' })).status).toBe(400);
    await db
      .update(guardianship)
      .set({ declaredAt: null })
      .where(eq(guardianship.adultId, await idOf(nadia)));
    expect((await invite(nadia, lea.id, { email: 'sans-declaration@example.com', role: 'relative' })).status).toBe(403);
    expect(await invitationsOf(lea.id)).toEqual([]);
  });
});

describe('the invited adult', () => {
  it('enters by the email’s button, then accepts with the box ticked: a parent of the child', async () => {
    const { nadia, lea } = await family('entre');
    const link = mail.invitationIn(await api.inviteAdult(nadia, lea.id, 'karim-entre@example.com', 'guardian'));
    const entered = await api.acceptInvitation(link);
    expect(entered.headers.get('location')).toBe(`${ORIGIN}/bienvenue`);
    const karim = entered.headers.getSetCookie()[0]?.split(';')[0] ?? '';
    const [pending] = await invitationsFor(karim);
    expect(pending).toEqual(expect.objectContaining({ studentId: lea.id, studentName: 'Léa', invitedBy: 'Nadia', role: 'guardian' }));
    expect(Object.keys(pending ?? {}).sort()).toEqual(['id', 'invitedBy', 'role', 'studentId', 'studentName']);

    expect((await api.request('POST', '/api/me/declarations', { cookie: karim, body: { adult: true } })).status).toBe(204);
    const accept = (body: unknown) => api.request('POST', `/api/me/invitations/${pending?.id ?? ''}/accept`, { cookie: karim, body });
    expect((await accept({})).status).toBe(400);
    expect(await linksOf(lea.id)).toHaveLength(1);
    const res = await accept({ declaredGuardian: true });
    expect(await res.json()).toEqual({ studentId: lea.id });
    expect(await linksOf(lea.id)).toContainEqual({ adultId: await idOf(karim), role: 'guardian' });
    expect(await invitationsFor(karim)).toEqual([]);
    // He manages Léa, as Nadia does.
    expect((await api.devices(karim, lea.id)).code).toEqual({ chosen: false, locked: false });
    const [row] = await db
      .select({ declaredAt: guardianship.declaredAt })
      .from(guardianship)
      .where(and(eq(guardianship.adultId, await idOf(karim)), eq(guardianship.studentId, lea.id)));
    expect(row?.declaredAt).toBeInstanceOf(Date);
  });

  it('as a relative, follows the child, the week included, and has nothing to declare for them', async () => {
    const { nadia, lea } = await family('proche');
    const monique = await api.adult(nadia, lea.id, 'monique-proche@example.com', 'relative');
    const list = (await (await api.request('GET', '/api/household/students', { cookie: monique })).json()) as { id: string; role: string }[];
    expect(list.map(({ id, role }) => ({ id, role }))).toEqual([{ id: lea.id, role: 'relative' }]);
    expect((await api.request('GET', `/api/summary/${lea.id}`, { cookie: monique })).status).toBe(200);
    const me = (await (await api.request('GET', '/api/me', { cookie: monique })).json()) as { missing: unknown };
    expect(me.missing).toEqual({ adult: false, guardianOf: [] });
  });

  it('refuses to accept before declaring being 18 or over', async () => {
    const { nadia, lea } = await family('mineur');
    await api.inviteAdult(nadia, lea.id, 'jeune@example.com', 'relative');
    const cookie = await api.signIn('jeune@example.com');
    const [pending] = await invitationsFor(cookie);
    expect((await api.request('POST', `/api/me/invitations/${pending?.id ?? ''}/accept`, { cookie, body: {} })).status).toBe(403);
    expect(await linksOf(lea.id)).toHaveLength(1);
  });

  it('cannot accept an invitation for another address, nor one expired', async () => {
    const { nadia, lea } = await family('autre');
    await api.inviteAdult(nadia, lea.id, 'destinataire@example.com', 'relative');
    const [invitation] = await invitationsOf(lea.id);
    const intruder = await api.guardian('intrus@example.com');
    expect(await invitationsFor(intruder)).toEqual([]);
    for (const action of ['accept', 'decline']) {
      expect((await api.request('POST', `/api/me/invitations/${invitation?.id ?? ''}/${action}`, { cookie: intruder, body: {} })).status).toBe(404);
    }

    const cookie = await api.signIn('destinataire@example.com');
    await api.request('POST', '/api/me/declarations', { cookie, body: { adult: true } });
    await db
      .update(adultInvitation)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(adultInvitation.studentId, lea.id));
    expect(await invitationsFor(cookie)).toEqual([]);
    expect((await api.request('POST', `/api/me/invitations/${invitation?.id ?? ''}/accept`, { cookie, body: {} })).status).toBe(404);
    expect(await linksOf(lea.id)).toHaveLength(1);
  });

  it('declines: the invitation goes, and no link is made', async () => {
    const { nadia, lea } = await family('refuse');
    await api.guardian('occupe@example.com');
    await api.inviteAdult(nadia, lea.id, 'occupe@example.com', 'relative');
    const cookie = await api.signIn('occupe@example.com');
    const [pending] = await invitationsFor(cookie);
    expect((await api.request('POST', `/api/me/invitations/${pending?.id ?? ''}/decline`, { cookie, body: {} })).status).toBe(204);
    expect(await invitationsOf(lea.id)).toEqual([]);
    expect(await linksOf(lea.id)).toHaveLength(1);
  });
});

describe('the adults of a child', () => {
  it('lists, to a parent, the other adults and the invitations still waiting; to no one else', async () => {
    const { nadia, lea } = await family('liste');
    const karim = await api.adult(nadia, lea.id, 'karim-liste@example.com', 'guardian');
    await named(karim, 'Karim');
    const monique = await api.adult(nadia, lea.id, 'monique-liste@example.com', 'relative');
    await api.inviteAdult(nadia, lea.id, 'attendu@example.com', 'relative');
    const res = await api.request('GET', `/api/household/students/${lea.id}/adults`, { cookie: nadia });
    expect(res.status).toBe(200);
    const { adults, invitations } = (await res.json()) as {
      adults: { id: string; name: string; role: string }[];
      invitations: { id: string; email: string; role: string; createdAt: string }[];
    };
    expect(adults.map(({ name, role }) => ({ name, role }))).toEqual([
      { name: 'Karim', role: 'guardian' },
      { name: 'Parent', role: 'relative' },
    ]);
    expect(invitations.map(({ email, role }) => ({ email, role }))).toEqual([{ email: 'attendu@example.com', role: 'relative' }]);
    expect(Object.keys(invitations[0] ?? {}).sort()).toEqual(['createdAt', 'email', 'id', 'role']);
    expect((await api.request('GET', `/api/household/students/${lea.id}/adults`, { cookie: monique })).status).toBe(404);
  });

  // A mistyped address would otherwise keep its way to the child for 30 days.
  it('lets a parent withdraw an invitation still waiting, and no one else', async () => {
    const { nadia, lea } = await family('annule');
    const monique = await api.adult(nadia, lea.id, 'monique-annule@example.com', 'relative');
    await api.inviteAdult(nadia, lea.id, 'faute-de-frappe@exmaple.com', 'guardian');
    const [invitation] = await invitationsOf(lea.id);
    const withdraw = (cookie: string) => api.request('DELETE', `/api/household/students/${lea.id}/invitations/${invitation?.id ?? ''}`, { cookie });
    expect((await withdraw(monique)).status).toBe(404);
    expect(await invitationsOf(lea.id)).toHaveLength(1);
    expect((await withdraw(nadia)).status).toBe(204);
    expect(await invitationsOf(lea.id)).toEqual([]);
    expect((await withdraw(nadia)).status).toBe(404);
  });

  it('lets a parent remove a relative, never another parent', async () => {
    const { nadia, lea } = await family('retire');
    const karim = await api.adult(nadia, lea.id, 'karim-retire@example.com', 'guardian');
    const monique = await api.adult(nadia, lea.id, 'monique-retire@example.com', 'relative');
    const remove = (cookie: string, adultId: string) => api.request('DELETE', `/api/household/students/${lea.id}/adults/${adultId}`, { cookie });
    expect((await remove(nadia, await idOf(karim))).status).toBe(404);
    expect((await remove(karim, await idOf(nadia))).status).toBe(404);
    expect((await remove(nadia, await idOf(nadia))).status).toBe(404);
    expect(await linksOf(lea.id)).toHaveLength(3);
    expect((await remove(nadia, await idOf(monique))).status).toBe(204);
    expect((await linksOf(lea.id)).map(({ role }) => role)).toEqual(['guardian', 'guardian']);
  });

  it('lets a relative remove themselves, and no one else', async () => {
    const { nadia, lea } = await family('se-retire');
    const monique = await api.adult(nadia, lea.id, 'monique-seule@example.com', 'relative');
    const paul = await api.adult(nadia, lea.id, 'paul-seul@example.com', 'relative');
    const remove = (cookie: string, adultId: string) => api.request('DELETE', `/api/household/students/${lea.id}/adults/${adultId}`, { cookie });
    expect((await remove(monique, await idOf(paul))).status).toBe(404);
    expect((await remove(monique, await idOf(nadia))).status).toBe(404);
    expect((await remove(monique, await idOf(monique))).status).toBe(204);
    expect((await linksOf(lea.id)).map(({ adultId }) => adultId).toSorted()).toEqual([await idOf(nadia), await idOf(paul)].toSorted());
    expect((await api.request('GET', `/api/summary/${lea.id}`, { cookie: monique })).status).toBe(404);
  });
});

it('takes the invitation away with the child', async () => {
  const { nadia, lea } = await family('suppression');
  await api.inviteAdult(nadia, lea.id, 'trop-tard@example.com', 'relative');
  expect((await api.request('DELETE', `/api/household/students/${lea.id}`, { cookie: nadia })).status).toBe(204);
  expect(await invitationsOf(lea.id)).toEqual([]);
  expect(await db.select().from(user).where(eq(user.id, lea.id))).toEqual([]);
});
