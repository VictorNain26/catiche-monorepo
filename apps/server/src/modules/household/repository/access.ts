/**
 * What every part of the household's repository shares: the way from an adult to the students
 * they manage, a clause of the query itself (`../repository.ts`), and the history's writing.
 */

import { and, asc, eq, inArray, ne } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { ChildEventDetail, ChildEventKind } from '../../../domain/child-events';
import { user } from '../../../platform/auth/schema';
import type { Db } from '../../../platform/db/client';
import { childEvent, guardianship } from '../schema';

export const otherAdult = alias(guardianship, 'other_adult');

/** The link is a parent's, who manages the student; a relative's only reads them. */
export const asParent = (role: typeof guardianship.role | typeof otherAdult.role = guardianship.role) => eq(role, 'guardian');

/** The two ways from an adult to students, on `db`: each part of the repository builds them once. */
export function accessOf(db: Db) {
  /** The ids of the students `adultId` is linked to, as a parent or a relative: what they read. */
  const studentsOf = (adultId: string) => db.select({ id: guardianship.studentId }).from(guardianship).where(eq(guardianship.adultId, adultId));
  return {
    studentsOf,
    /**
     * First in a gesture's transaction: the adult's row, then the student's, if the adult is
     * linked to them, in the order the deletion of an account locks them (`deleteAccount`). The
     * gesture's line in the history holds both as keys: taken later, behind another lock of the
     * gesture's own (an invitation, a device), they would let two transactions wait for each other.
     * `NO KEY UPDATE`, which two gestures cannot hold at once, but which lets a row that only holds
     * the student as a key be written meanwhile: the child's code, chosen with their device locked.
     */
    lockFor: async (tx: Pick<Db, 'select'>, adultId: string, studentId: string) => {
      await tx.select({ id: user.id }).from(user).where(eq(user.id, adultId)).for('no key update');
      await tx
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.id, studentId), inArray(user.id, studentsOf(adultId))))
        .for('no key update');
    },
    /** The ids of the students `adultId` is a parent of: what they manage. */
    managedBy: (adultId: string) =>
      db
        .select({ id: guardianship.studentId })
        .from(guardianship)
        .where(and(eq(guardianship.adultId, adultId), asParent())),
    /**
     * The other parents of the students `adultId` is linked to, or of the one `studentId` names,
     * the earliest first: who decides with the adult, and who is told. Never a relative.
     */
    otherParents: (adultId: string, studentId?: string) =>
      db
        .select({ studentId: guardianship.studentId, name: user.name, email: user.email })
        .from(guardianship)
        .innerJoin(user, eq(user.id, guardianship.adultId))
        .where(
          and(
            studentId === undefined ? undefined : eq(guardianship.studentId, studentId),
            inArray(guardianship.studentId, studentsOf(adultId)),
            asParent(),
            ne(guardianship.adultId, adultId),
          ),
        )
        .orderBy(asc(guardianship.createdAt)),
  };
}

export interface Gesture {
  kind: ChildEventKind;
  detail?: ChildEventDetail;
}

/** The gestures of `actorId` on the student, in the history, by the transaction that makes them. */
export const record = (tx: Pick<Db, 'insert'>, studentId: string, actorId: string, gestures: readonly Gesture[]) =>
  gestures.length === 0 ? Promise.resolve() : tx.insert(childEvent).values(gestures.map((gesture) => ({ studentId, actorId, ...gesture })));
