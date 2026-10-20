/**
 * The tables of better-auth 1.7, field for field as its core declares them
 * (@better-auth/core `getAuthTables`, and @better-auth/passkey's schema): required there is NOT
 * NULL here. Then the student's way in (`./student-sign-in.ts`): the devices a guardian's code
 * recognised, the profiles each holds, and the code the student chose.
 */

import { boolean, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  ...timestamps,
});

/** A browser a guardian's code recognised: its id is all its signed cookie holds. */
export const device = pgTable('device', {
  id: text('id').primaryKey(),
  // Shared (a family computer), its sessions are short: a brother or sister comes next.
  shared: boolean('shared').notNull().default(false),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    // The student sign-in's own field: the device the session was opened on, if a recognised one.
    deviceId: text('device_id').references(() => device.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [index('session_user_id_idx').on(table.userId), index('session_device_id_idx').on(table.deviceId)],
);

/** A student's profile on a device: the tries its code had there since the last success. */
export const deviceProfile = pgTable(
  'device_profile',
  {
    deviceId: text('device_id')
      .notNull()
      .references(() => device.id, { onDelete: 'cascade' }),
    studentId: text('student_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    failures: integer('failures').notNull().default(0),
    // Until then, a student without a code chooses one here.
    codeWindowUntil: timestamp('code_window_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.deviceId, table.studentId] }), index('device_profile_student_id_idx').on(table.studentId)],
);

/**
 * The code a student chose, hashed, and the tries it had on every device since the last success.
 * No hash once a guardian's « forgotten » code is spent: the student chooses a new one.
 */
export const studentCode = pgTable('student_code', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  hash: text('hash'),
  failures: integer('failures').notNull().default(0),
  setAt: timestamp('set_at', { withTimezone: true }),
  // When a guardian's « forgotten » code replaced it: the student is told.
  resetAt: timestamp('reset_at', { withTimezone: true }),
});

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

export const passkey = pgTable(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at', { withTimezone: true }),
    aaguid: text('aaguid'),
  },
  (table) => [index('passkey_user_id_idx').on(table.userId), index('passkey_credential_id_idx').on(table.credentialID)],
);
