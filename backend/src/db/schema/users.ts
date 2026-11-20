import { sql } from 'drizzle-orm';
import { check, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
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

/** Login and demo sessions. user_id is null for anonymous visitors. */
export const sessions = pgTable('sessions', {
  id: uuidId(),
  expiresAt: timestamptz('expires_at')
    .notNull()
    .default(sql`now() + interval '12 hours'`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
});
