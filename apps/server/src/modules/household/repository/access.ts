/**
 * What every part of the household's repository shares: the way from an adult to the students
 * they manage, a clause of the query itself (`../repository.ts`), and the history's writing.
 */

import { and, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { ChildEventDetail, ChildEventKind } from '../../../domain/child-events';
import type { Db } from '../../../platform/db/client';
import { childEvent, guardianship } from '../schema';

export const otherAdult = alias(guardianship, 'other_adult');

/** The link is a parent's, who manages the student; a relative's only reads them. */
export const asParent = (role: typeof guardianship.role | typeof otherAdult.role = guardianship.role) => eq(role, 'guardian');

/** The ids of the students `adultId` is linked to, as a parent or a relative: what they read. */
export const studentsOf = (db: Db, adultId: string) =>
  db.select({ id: guardianship.studentId }).from(guardianship).where(eq(guardianship.adultId, adultId));

/** The ids of the students `adultId` is a parent of: what they manage. */
export const managedBy = (db: Db, adultId: string) =>
  db
    .select({ id: guardianship.studentId })
    .from(guardianship)
    .where(and(eq(guardianship.adultId, adultId), asParent()));

export interface Gesture {
  kind: ChildEventKind;
  detail?: ChildEventDetail;
}

/** The gestures of `actorId` on the student, in the history, by the transaction that makes them. */
export const record = (tx: Pick<Db, 'insert'>, studentId: string, actorId: string, gestures: readonly Gesture[]) =>
  gestures.length === 0 ? Promise.resolve() : tx.insert(childEvent).values(gestures.map((gesture) => ({ studentId, actorId, ...gesture })));
