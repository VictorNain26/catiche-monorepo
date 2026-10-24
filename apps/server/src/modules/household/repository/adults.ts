/**
 * The adults of a student, in the household's repository (`../repository.ts`): the invitations a
 * parent sends, their acceptance, the adults linked, and a relative's leaving, each written in the
 * history by its own transaction.
 */

import { and, asc, eq, gt, inArray, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { AdultRole } from '../../../domain/adult-roles';
import { user } from '../../../platform/auth/schema';
import type { Db } from '../../../platform/db/client';
import { adultInvitation, guardianship } from '../schema';
import { accessOf, asParent, record } from './access';

export interface NewInvitation {
  studentId: string;
  invitedBy: string;
  email: string;
  role: AdultRole;
  expiresAt: Date;
}

const inviter = alias(user, 'inviter');

/** The invitations to this address still valid, or the one of them `invitationId` names. */
const waiting = (email: string, invitationId?: string) =>
  and(
    eq(adultInvitation.email, email),
    gt(adultInvitation.expiresAt, sql`now()`),
    invitationId === undefined ? undefined : eq(adultInvitation.id, invitationId),
  );

export function adultsRepository(db: Db) {
  const { managedBy: managed, otherParents, lockFor } = accessOf(db);

  return {
    /** Whether an adult with this address is linked to the student already. */
    async followedBy(studentId: string, email: string) {
      const [linked] = await db
        .select({ adultId: guardianship.adultId })
        .from(guardianship)
        .innerJoin(user, eq(user.id, guardianship.adultId))
        .where(and(eq(guardianship.studentId, studentId), eq(user.email, email)));
      return linked !== undefined;
    },

    /**
     * A parent's link to the student, for what an email of theirs says: when they declared it,
     * their name, the student's, and the other parents' addresses, who are told. Undefined when
     * the adult is not a parent of the student.
     */
    async parentLink(adultId: string, studentId: string) {
      const [[link], others] = await Promise.all([
        db
          .select({ declaredAt: guardianship.declaredAt, studentName: user.name, adultName: inviter.name })
          .from(guardianship)
          .innerJoin(user, eq(user.id, guardianship.studentId))
          .innerJoin(inviter, eq(inviter.id, guardianship.adultId))
          .where(and(eq(guardianship.adultId, adultId), eq(guardianship.studentId, studentId), asParent())),
        otherParents(adultId, studentId),
      ]);
      return link && { ...link, otherParents: others.map(({ email }) => email) };
    },

    /** How many of the adult's invitations still wait, but the one to this address for this student, which a new one would replace. */
    waitingFrom: (adultId: string, studentId: string, email: string) =>
      db.$count(
        adultInvitation,
        and(
          eq(adultInvitation.invitedBy, adultId),
          gt(adultInvitation.expiresAt, sql`now()`),
          or(ne(adultInvitation.studentId, studentId), ne(adultInvitation.email, email)),
        ),
      ),

    /** The invitation, which replaces the one the address had for the student, and its line. */
    async saveInvitation(invitation: NewInvitation) {
      const { studentId, invitedBy, email, role, expiresAt } = invitation;
      await db.transaction(async (tx) => {
        await lockFor(tx, invitedBy, studentId);
        await tx
          .insert(adultInvitation)
          .values(invitation)
          .onConflictDoUpdate({
            target: [adultInvitation.studentId, adultInvitation.email],
            set: { invitedBy, role, expiresAt, createdAt: new Date() },
          });
        await record(tx, studentId, invitedBy, [{ kind: 'adult_invited', detail: { email, role } }]);
      });
    },

    /** The invitations still waiting for the address, the oldest first: for which student, from whom, as what. */
    pendingInvitations(email: string) {
      return db
        .select({
          id: adultInvitation.id,
          studentId: adultInvitation.studentId,
          studentName: user.name,
          invitedBy: inviter.name,
          role: adultInvitation.role,
        })
        .from(adultInvitation)
        .innerJoin(user, eq(user.id, adultInvitation.studentId))
        .innerJoin(inviter, eq(inviter.id, adultInvitation.invitedBy))
        .where(waiting(email))
        .orderBy(asc(adultInvitation.createdAt));
    },

    /**
     * The adult accepts an invitation to their address, still valid: their link, with its role,
     * a parent's declared now; the invitation spent. Undefined when none; `'undeclared'` for a
     * parent's without the declaration. Locks the adult, then the student, then the invitation, as
     * an account's deletion, the student's and its cascade do: none waits for another's lock forever.
     */
    async acceptInvitation(adultId: string, email: string, invitationId: string, declaredGuardian: boolean) {
      return db.transaction(async (tx) => {
        await tx.select({ id: user.id }).from(user).where(eq(user.id, adultId)).for('update');
        await tx
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.id, tx.select({ id: adultInvitation.studentId }).from(adultInvitation).where(eq(adultInvitation.id, invitationId))))
          .for('update');
        const [invitation] = await tx
          .select({ studentId: adultInvitation.studentId, role: adultInvitation.role })
          .from(adultInvitation)
          .where(waiting(email, invitationId))
          .for('update');
        if (!invitation) return undefined;
        const guardian = invitation.role === 'guardian';
        if (guardian && !declaredGuardian) return 'undeclared' as const;
        const linked = await tx
          .insert(guardianship)
          .values({ adultId, ...invitation, declaredAt: guardian ? new Date() : null })
          .onConflictDoNothing()
          .returning({ adultId: guardianship.adultId });
        if (linked.length > 0) await record(tx, invitation.studentId, adultId, [{ kind: 'adult_joined', detail: { role: invitation.role } }]);
        await tx.delete(adultInvitation).where(eq(adultInvitation.id, invitationId));
        return invitation;
      });
    },

    /** The adult declines an invitation to their address; `false` when no such invitation. */
    async declineInvitation(email: string, invitationId: string) {
      const declined = await db
        .delete(adultInvitation)
        .where(and(eq(adultInvitation.id, invitationId), eq(adultInvitation.email, email)))
        .returning({ id: adultInvitation.id });
      return declined.length > 0;
    },

    /** A parent withdraws an invitation: its address, and whether another one still waits for it; undefined when none. */
    async withdrawInvitation(adultId: string, studentId: string, invitationId: string) {
      return db.transaction(async (tx) => {
        await lockFor(tx, adultId, studentId);
        const [withdrawn] = await tx
          .delete(adultInvitation)
          .where(
            and(eq(adultInvitation.id, invitationId), eq(adultInvitation.studentId, studentId), inArray(adultInvitation.studentId, managed(adultId))),
          )
          .returning({ email: adultInvitation.email });
        if (!withdrawn) return undefined;
        await record(tx, studentId, adultId, [{ kind: 'invitation_withdrawn', detail: { email: withdrawn.email } }]);
        const [another] = await tx.select({ id: adultInvitation.id }).from(adultInvitation).where(waiting(withdrawn.email)).limit(1);
        return { email: withdrawn.email, stillInvited: another !== undefined };
      });
    },

    /** For a parent of the student: the other adults linked to them, the earliest first, and the invitations still waiting. */
    async adultsOf(adultId: string, studentId: string) {
      const [adults, invitations] = await Promise.all([
        db
          .select({ id: user.id, name: user.name, role: guardianship.role })
          .from(guardianship)
          .innerJoin(user, eq(user.id, guardianship.adultId))
          .where(and(eq(guardianship.studentId, studentId), ne(guardianship.adultId, adultId), inArray(guardianship.studentId, managed(adultId))))
          .orderBy(asc(guardianship.createdAt)),
        db
          .select({ id: adultInvitation.id, email: adultInvitation.email, role: adultInvitation.role, createdAt: adultInvitation.createdAt })
          .from(adultInvitation)
          .where(
            and(
              eq(adultInvitation.studentId, studentId),
              gt(adultInvitation.expiresAt, sql`now()`),
              inArray(adultInvitation.studentId, managed(adultId)),
            ),
          )
          .orderBy(asc(adultInvitation.createdAt)),
      ]);
      return { adults, invitations };
    },

    /**
     * A relative's link to the student goes: by a parent of the student, or by the relative
     * themselves. Never a parent's. `false` when no such link. The line names the relative a
     * parent removed; one who leaves is its author.
     */
    async removeRelative(adultId: string, studentId: string, relativeId: string) {
      return db.transaction(async (tx) => {
        await lockFor(tx, adultId, studentId);
        const [relative] = await tx
          .select({ name: user.name })
          .from(guardianship)
          .innerJoin(user, eq(user.id, guardianship.adultId))
          .where(
            and(
              eq(guardianship.studentId, studentId),
              eq(guardianship.adultId, relativeId),
              eq(guardianship.role, 'relative'),
              or(eq(guardianship.adultId, adultId), inArray(guardianship.studentId, managed(adultId))),
            ),
          )
          .for('update', { of: guardianship });
        if (!relative) return false;
        await tx.delete(guardianship).where(and(eq(guardianship.studentId, studentId), eq(guardianship.adultId, relativeId)));
        await record(tx, studentId, adultId, [
          relativeId === adultId ? { kind: 'adult_left' } : { kind: 'adult_removed', detail: { name: relative.name } },
        ]);
        return true;
      });
    },
  };
}
