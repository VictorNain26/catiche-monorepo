/**
 * The background sweep's purges, on a real database: the history past 90 days, and the
 * invitations of adults expired, with the closed beta's invitation of their address once nothing
 * waits for it any more.
 */

import { describe, expect, it } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { invitationIdentifier } from '../../platform/auth/invitation';
import { verification } from '../../platform/auth/schema';
import { testApp } from '../../testing/app';
import { testDatabase } from '../../testing/database';
import { householdSweep } from '.';
import { adultInvitation, childEvent } from './schema';

const { db } = await testDatabase();
const { api, mail, tasks } = testApp(db);
const sweep = householdSweep({ db, mailer: mail.mailer });
const DAY = 24 * 60 * 60_000;

describe('the purge of the history', () => {
  it('takes a line of 91 days and keeps one of 89', async () => {
    const nadia = await api.guardian('nadia-purge@example.com');
    const lea = await api.student(nadia);
    const [old, recent] = await db
      .insert(childEvent)
      .values([
        { studentId: lea.id, kind: 'memory_withdrawn', createdAt: new Date(Date.now() - 91 * DAY) },
        { studentId: lea.id, kind: 'memory_proposed', createdAt: new Date(Date.now() - 89 * DAY) },
      ])
      .returning({ id: childEvent.id });
    await sweep.history(new Date());
    const left = await db
      .select({ id: childEvent.id })
      .from(childEvent)
      .where(inArray(childEvent.id, [old?.id ?? 0, recent?.id ?? 0]));
    expect(left).toEqual([{ id: recent?.id ?? 0 }]);
  });
});

describe('the purge of the invitations', () => {
  const invitedFor = async (email: string) =>
    (await db.select({ studentId: adultInvitation.studentId }).from(adultInvitation).where(eq(adultInvitation.email, email))).map(
      ({ studentId }) => studentId,
    );
  const betaInvited = async (email: string) =>
    (
      await db
        .select({ id: verification.id })
        .from(verification)
        .where(eq(verification.identifier, invitationIdentifier(email)))
    ).length > 0;

  it('takes an expired invitation with its beta invitation, keeps a live one, and the beta invitation another still waits for', async () => {
    const nadia = await api.guardian('nadia-invitations@example.com');
    const lea = await api.student(nadia, { name: 'Léa' });
    const tom = await api.student(nadia, { name: 'Tom' });
    await api.inviteAdult(nadia, lea.id, 'expiree@example.com', 'relative');
    await api.inviteAdult(nadia, lea.id, 'vivante@example.com', 'relative');
    await api.inviteAdult(nadia, lea.id, 'attendue@example.com', 'relative');
    await api.inviteAdult(nadia, tom.id, 'attendue@example.com', 'relative');
    await tasks.settled();
    // Léa's invitations of the first and the third address expired; Tom's of the third still waits.
    await db
      .update(adultInvitation)
      .set({ expiresAt: new Date(Date.now() - DAY) })
      .where(and(eq(adultInvitation.studentId, lea.id), inArray(adultInvitation.email, ['expiree@example.com', 'attendue@example.com'])));

    await sweep.invitations(new Date());

    expect(await invitedFor('expiree@example.com')).toEqual([]);
    expect(await betaInvited('expiree@example.com')).toBe(false);
    expect(await invitedFor('vivante@example.com')).toEqual([lea.id]);
    expect(await betaInvited('vivante@example.com')).toBe(true);
    expect(await invitedFor('attendue@example.com')).toEqual([tom.id]);
    expect(await betaInvited('attendue@example.com')).toBe(true);
  });
});
