/**
 * What goes, in the household's repository (`../repository.ts`): a student's deletion, at once or
 * asked for 7 days when another parent follows them (`domain/student-deletion.ts`), an adult's
 * account with the students they are the only parent of, and what the background sweep purges.
 */

import { and, asc, eq, gt, inArray, lt, lte, ne, notExists } from 'drizzle-orm';
import { HISTORY_DAYS } from '../../../domain/child-events';
import { user } from '../../../platform/auth/schema';
import type { Db } from '../../../platform/db/client';
import { adultInvitation, childEvent, guardianship, studentProfile } from '../schema';
import { accessOf, asParent, deletionIsDue, otherAdult, record } from './access';

const DAY_MS = 24 * 60 * 60_000;

export function deletionsRepository(db: Db) {
  const { managedBy, studentsOf, lockFor } = accessOf(db);

  /** The students `adultId` is the only parent of, among the users `tx` reads: their account's deletion takes them. */
  const onlyParentOf = (tx: Pick<Db, 'select'>, adultId: string) =>
    and(
      inArray(user.id, managedBy(adultId)),
      notExists(
        tx
          .select({ adultId: otherAdult.adultId })
          .from(otherAdult)
          .where(and(eq(otherAdult.studentId, user.id), ne(otherAdult.adultId, adultId), asParent(otherAdult.role))),
      ),
    );

  /**
   * First in a deletion's transaction, as in a gesture's: the adult and the student locked, then
   * when the student's deletion was asked, null if it was not. Undefined when the adult is not a
   * parent of the student, or the deletion is due already.
   */
  const askedOf = async (tx: Pick<Db, 'select'>, adultId: string, studentId: string) => {
    await lockFor(tx, adultId, studentId);
    const [student] = await tx
      .select({ requestedAt: studentProfile.deletionRequestedAt })
      .from(studentProfile)
      .where(and(eq(studentProfile.userId, studentId), inArray(studentProfile.userId, managedBy(adultId))));
    return student;
  };

  return {
    /** The students the adult is the only parent of, the earliest first, which `deleteAccount` takes. */
    onlyParentOf: (adultId: string) =>
      db.select({ id: user.id, name: user.name }).from(user).where(onlyParentOf(db, adultId)).orderBy(asc(user.createdAt)),

    /**
     * A user's deletion, in one transaction: the students they are the only parent of go with them
     * (their sessions, links, profiles and invitations by ON DELETE CASCADE), their relatives'
     * links too, since no one would manage them; a student another parent follows stays, with that
     * parent. Locks the user row, as createStudent does: a student created meanwhile waits, then
     * finds no adult. `NO KEY UPDATE`, as a gesture's `lockFor`: a row that holds them as a key,
     * written meanwhile with a lock of its own, does not wait for this one.
     */
    async deleteAccount(userId: string) {
      await db.transaction(async (tx) => {
        await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('no key update');
        // The students too, in one order: another adult of theirs leaving at the same time waits,
        // then finds this adult gone and takes the student, never left without an adult.
        await tx
          .select({ id: user.id })
          .from(user)
          .where(inArray(user.id, studentsOf(userId)))
          .orderBy(user.id)
          .for('no key update');
        await tx.delete(user).where(onlyParentOf(tx, userId));
        await tx.delete(user).where(eq(user.id, userId));
      });
    },

    /**
     * A parent deletes the student: at once when no other parent follows them (their sessions,
     * links, invitations and profile go with the user row, ON DELETE CASCADE), and `deleted`; else
     * the deletion is asked, dated `now` and written in the history, or stays as it was first
     * asked, `first` false. Undefined when the adult is not a parent of the student.
     */
    askDeletion: (adultId: string, studentId: string, now: Date) =>
      db.transaction(async (tx) => {
        const student = await askedOf(tx, adultId, studentId);
        if (!student) return undefined;
        const deleted = await tx
          .delete(user)
          .where(and(eq(user.id, studentId), onlyParentOf(tx, adultId)))
          .returning({ id: user.id });
        if (deleted.length > 0) return { deleted: true } as const;
        if (student.requestedAt) return { deleted: false, requestedAt: student.requestedAt, first: false } as const;
        await tx
          .update(studentProfile)
          .set({ deletionRequestedAt: now, deletionRequestedBy: adultId, updatedAt: now })
          .where(eq(studentProfile.userId, studentId));
        await record(tx, studentId, adultId, [{ kind: 'deletion_requested' }]);
        return { deleted: false, requestedAt: now, first: true } as const;
      }),

    /**
     * A parent of the student cancels the deletion asked, its author included: `cancelled`, written
     * in the history; `none` when none is asked. Undefined when the adult is not a parent of the
     * student, or the deletion is due already.
     */
    cancelDeletion: (adultId: string, studentId: string) =>
      db.transaction(async (tx) => {
        const student = await askedOf(tx, adultId, studentId);
        if (!student) return undefined;
        if (!student.requestedAt) return 'none' as const;
        await tx
          .update(studentProfile)
          .set({ deletionRequestedAt: null, deletionRequestedBy: null, updatedAt: new Date() })
          .where(eq(studentProfile.userId, studentId));
        await record(tx, studentId, adultId, [{ kind: 'deletion_cancelled' }]);
        return 'cancelled' as const;
      }),

    /**
     * The sweep deletes each student whose deletion is due at `now`, by a transaction of its own:
     * their row locked first, as a gesture's `lockFor` locks it, then the deletion read again, which
     * a parent may have cancelled meanwhile. The first name of each, and their parents' addresses.
     */
    async deleteDueStudents(now: Date) {
      const due = await db.select({ id: studentProfile.userId }).from(studentProfile).where(deletionIsDue(now)).orderBy(studentProfile.userId);
      const deleted: { name: string; parents: string[] }[] = [];
      for (const { id } of due) {
        const gone = await db.transaction(async (tx) => {
          const [student] = await tx.select({ name: user.name }).from(user).where(eq(user.id, id)).for('update');
          const [still] = await tx
            .select({ id: studentProfile.userId })
            .from(studentProfile)
            .where(and(eq(studentProfile.userId, id), deletionIsDue(now)));
          if (!student || !still) return undefined;
          const parents = await tx
            .select({ email: user.email })
            .from(guardianship)
            .innerJoin(user, eq(user.id, guardianship.adultId))
            .where(and(eq(guardianship.studentId, id), asParent()));
          await tx.delete(user).where(eq(user.id, id));
          return { name: student.name, parents: parents.map(({ email }) => email) };
        });
        if (gone) deleted.push(gone);
      }
      return deleted;
    },

    /** The history's lines older than the 90 days it is read over. */
    async purgeHistory(now: Date) {
      await db.delete(childEvent).where(lt(childEvent.createdAt, new Date(now.getTime() - HISTORY_DAYS * DAY_MS)));
    },

    /**
     * The invitations of adults expired at `now`, which hold an address of someone who never came
     * in; the addresses no other invitation waits for any more, whose beta invitation goes too.
     */
    purgeInvitations: (now: Date) =>
      db.transaction(async (tx) => {
        const expired = await tx.delete(adultInvitation).where(lte(adultInvitation.expiresAt, now)).returning({ email: adultInvitation.email });
        const emails = [...new Set(expired.map(({ email }) => email))];
        if (emails.length === 0) return [];
        const waiting = await tx
          .selectDistinct({ email: adultInvitation.email })
          .from(adultInvitation)
          .where(and(inArray(adultInvitation.email, emails), gt(adultInvitation.expiresAt, now)));
        return emails.filter((email) => !waiting.some((row) => row.email === email));
      }),
  };
}
