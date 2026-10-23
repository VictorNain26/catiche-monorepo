/**
 * The adults and the students they follow. A user is a student when they have a student's profile;
 * anyone else signed in is an adult. A student may have several adults, an adult several students.
 * A student's first name or pseudonym is `user.name`; the profile holds no family name, only the
 * level and the month of birth (GDPR art. 5.1.c, data minimisation).
 */

import { sql } from 'drizzle-orm';
import { bigint, check, date, index, pgEnum, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { SCHOOL_LEVELS } from '../../domain/levels';
import { MEMORY_ANSWERS } from '../../domain/memory-consent';
import { user } from '../../platform/auth/schema';

export const schoolLevel = pgEnum('school_level', SCHOOL_LEVELS);
export const memoryAnswer = pgEnum('memory_answer', MEMORY_ANSWERS);

/**
 * An adult who follows a student: the one who added them, or, later, an adult they invited. The
 * only way from an adult to a student (`studentsOf`). `declared_at` is when the adult declared
 * holding parental authority or guardianship over the student; null for a link made before the
 * declaration existed, which the adult confirms at their next visit.
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
    declaredAt: timestamp('declared_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.adultId, table.studentId] }), index('guardianship_student_id_idx').on(table.studentId)],
);

/** An adult's own declaration: when they declared being 18 or over. The parental consent rests on it (CNIL). */
export const adultProfile = pgTable('adult_profile', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  declaredAdultAt: timestamp('declared_adult_at', { withTimezone: true }).notNull(),
});

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
