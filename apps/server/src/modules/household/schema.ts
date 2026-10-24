/**
 * The adults and the students they follow. A user is a student when they have a student's profile;
 * anyone else signed in is an adult. A student may have several adults, an adult several students.
 * A student's first name or pseudonym is `user.name`; the profile holds no family name, only the
 * level and the month of birth (GDPR art. 5.1.c, data minimisation).
 */

import { sql } from 'drizzle-orm';
import { bigint, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { ADULT_ROLES } from '../../domain/adult-roles';
import { CHILD_EVENT_KINDS, type ChildEventDetail } from '../../domain/child-events';
import { SCHOOL_LEVELS } from '../../domain/levels';
import { MEMORY_ANSWERS } from '../../domain/memory-consent';
import { user } from '../../platform/auth/schema';

export const schoolLevel = pgEnum('school_level', SCHOOL_LEVELS);
export const memoryAnswer = pgEnum('memory_answer', MEMORY_ANSWERS);

export const adultRole = pgEnum('adult_role', ADULT_ROLES);
export const childEventKind = pgEnum('child_event_kind', CHILD_EVENT_KINDS);

/**
 * An adult who follows a student: the one who added them, or an adult a parent invited. The only
 * way from an adult to a student (`studentsOf`), and, for a parent, to what manages them
 * (`managedBy`). `declared_at` is when a parent declared holding parental authority or
 * guardianship over the student; null for a relative, and for a link made before the declaration
 * existed, which the parent confirms at their next visit.
 */
export const guardianship = pgTable(
  'guardianship',
  {
    adultId: text('adult_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // Every link made before the roles is a parent's: the one who added the student.
    role: adultRole('role').notNull().default('guardian'),
    declaredAt: timestamp('declared_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.adultId, table.studentId] }), index('guardianship_student_id_idx').on(table.studentId)],
);

/**
 * A parent's invitation of another adult for a student, waiting for the address to accept it:
 * the address proves itself by the email that lets the adult in. Inviting the address again for
 * the same student replaces it; it goes with the student, or with the parent who sent it.
 */
export const adultInvitation = pgTable(
  'adult_invitation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    // In lowercase, as better-auth stores an address.
    email: text('email').notNull(),
    role: adultRole('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [unique('adult_invitation_student_email_key').on(table.studentId, table.email), index('adult_invitation_email_idx').on(table.email)],
);

/**
 * An adult's own profile: when they declared being 18 or over, on which the parental consent rests
 * (CNIL), null until they do; how many times an email let them in, and when they put the passkey's
 * offer away, which then shows no more.
 */
export const adultProfile = pgTable('adult_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  declaredAdultAt: timestamp('declared_adult_at', { withTimezone: true }),
  emailEntries: integer('email_entries').notNull().default(0),
  passkeyOfferClosedAt: timestamp('passkey_offer_closed_at', { withTimezone: true }),
});

/**
 * The history of a student: a gesture of an adult on them, written in the transaction of the
 * gesture itself. It goes with the student; an adult who leaves Catiche leaves their lines,
 * without their name. Read 90 days back (`HISTORY_DAYS`), in the order of `id`, the order the
 * lines were written: the clock can step back, a sequence cannot.
 */
export const childEvent = pgTable(
  'child_event',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    kind: childEventKind('kind').notNull(),
    detail: jsonb('detail').$type<ChildEventDetail>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('child_event_student_created_idx').on(table.studentId, table.createdAt)],
);

export const studentProfile = pgTable(
  'student_profile',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    level: schoolLevel('level').notNull(),
    // The first day of the month: the day of birth is not collected.
    birthMonth: date('birth_month', { mode: 'string' }).notNull(),
    // The learner memory (domain/memory-consent.ts): the parent's proposal, the child's answer, and
    // the last exercise the memory leaves out, set with the answer or a reset: the position the
    // exercises had reached then. A position, not a date: the clock can step back, an identity cannot.
    memoryProposedAt: timestamp('memory_proposed_at', { withTimezone: true }),
    memoryAnswer: memoryAnswer('memory_answer'),
    memoryResetAfter: bigint('memory_reset_after', { mode: 'number' }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('student_profile_birth_month_first_day', sql`extract(day from ${table.birthMonth}) = 1`)],
);
