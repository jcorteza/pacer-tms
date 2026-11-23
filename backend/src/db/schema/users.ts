import { sql } from 'drizzle-orm';
import { boolean, check, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import type { Role } from '../../users/roles.js';
import { timestamptz, uuidId } from './columns.js';

export const users = pgTable(
  'users',
  {
    id: uuidId(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    roles: text('roles').$type<Role>().array().notNull(),
    settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [check('users_has_role', sql`cardinality(${t.roles}) >= 1`)],
);

/** Login and demo sessions. A demo session belongs to a user created just for it (is_demo_user). */
export const sessions = pgTable('sessions', {
  id: uuidId(),
  expiresAt: timestamptz('expires_at')
    .notNull()
    .default(sql`now() + interval '12 hours'`),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isDemoUser: boolean('is_demo_user').notNull().default(false),
});
