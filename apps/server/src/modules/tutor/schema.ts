/**
 * The tutor's tables. A session belongs to its student, its messages and the distress that closed
 * it follow; the evening, its homework and the tests to come belong to the student. The distress
 * event outlives the session (`SET NULL`), for the human review that follows it, and keeps no
 * score (Victor's decision 7, 2026-10-06).
 */

import { bigint, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { DISTRESS_SOURCES } from '../../domain/distress';
import { EVENING_SUBJECTS } from '../../domain/subjects';
import { user } from '../../platform/auth/schema';
import { EVENING_PHASES, HOMEWORK_STATES } from './core/evening';
import type { TomMessage } from './core/message';

export const distressSource = pgEnum('distress_source', DISTRESS_SOURCES);

export const studySession = pgTable(
  'study_session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Set by a distress: every later message gets the fixed reply. */
    closedAt: timestamp('closed_at', { withTimezone: true }),
    /** One turn at a time: set when a turn starts, cleared when it ends; a stale one is taken over. */
    turnStartedAt: timestamp('turn_started_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('study_session_student_id_created_at_idx').on(table.studentId, table.createdAt)],
);

export const message = pgTable(
  'message',
  {
    /** The UIMessage's id. */
    id: uuid('id').primaryKey().defaultRandom(),
    // The order of the conversation: a turn writes its two messages in one transaction, where
    // now() is the same for both.
    position: bigint('position', { mode: 'number' }).generatedAlwaysAsIdentity(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => studySession.id, { onDelete: 'cascade' }),
    /** The UIMessage without its id (`core/message.ts`): Tom's reasoning in it never reaches the client. */
    content: jsonb('content').$type<Omit<TomMessage, 'id'>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('message_session_id_position_idx').on(table.sessionId, table.position)],
);

export const eveningPhase = pgEnum('evening_phase', EVENING_PHASES);
export const homeworkState = pgEnum('homework_state', HOMEWORK_STATES);
export const schoolSubject = pgEnum('school_subject', EVENING_SUBJECTS);

/** A student's evening of homework, one per day (`eveningDay`), and the step of it Tom is at. */
export const evening = pgTable(
  'evening',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    phase: eveningPhase('phase').notNull().default('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('evening_student_id_day_idx').on(table.studentId, table.day)],
);

/**
 * A homework the student noted, in their words. Planned for an evening at its rank in that
 * evening's order; unplanned, both null. It outlives its evening (`SET NULL`): what is left to do
 * comes back the next evening.
 */
export const homework = pgTable(
  'homework',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    subject: schoolSubject('subject').notNull(),
    task: text('task').notNull(),
    /** Null until the student says when it is due. */
    dueOn: date('due_on', { mode: 'string' }),
    eveningId: uuid('evening_id').references(() => evening.id, { onDelete: 'set null' }),
    rank: integer('rank'),
    state: homeworkState('state').notNull().default('todo'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('homework_student_id_state_idx').on(table.studentId, table.state), index('homework_evening_id_idx').on(table.eveningId)],
);

/** A test the student announced, once per subject and day. */
export const upcomingTest = pgTable(
  'upcoming_test',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    subject: schoolSubject('subject').notNull(),
    day: date('day', { mode: 'string' }).notNull(),
    topic: text('topic'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('upcoming_test_student_id_subject_day_idx').on(table.studentId, table.subject, table.day)],
);

export const distressEvent = pgTable(
  'distress_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => studySession.id, { onDelete: 'set null' }),
    detectedBy: distressSource('detected_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // One event per session: two distress messages sent at once must not alert twice.
    uniqueIndex('distress_event_session_id_idx').on(table.sessionId),
    index('distress_event_student_id_created_at_idx').on(table.studentId, table.createdAt),
  ],
);
