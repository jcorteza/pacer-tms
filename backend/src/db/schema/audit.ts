import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { intId, timestamptz } from './columns.js';
import { users } from './users.js';

/** Append-only audit trail of who changed what, and when. */
export const statusChangeLog = pgTable('status_change_log', {
  id: intId(),
  /** item, shipment, order, ... */
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  /** create, update, delete, ... */
  action: text('action').notNull(),
  description: text('description').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  at: timestamptz('at').notNull().defaultNow(),
});
