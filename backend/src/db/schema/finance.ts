import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { clients } from './clients.js';
import { createdAt, deletedAt, exactDecimal, intId, timestamptz } from './columns.js';
import { orders } from './orders.js';

/** Outgoing invoices to clients. (Incoming carrier invoices live in carriers.ts.) */
export const invoices = pgTable('invoices', {
  id: intId(),
  deletedAt: deletedAt(),
  createdAt: createdAt(),
  sentAt: timestamptz('sent_at'),
  paidAt: timestamptz('paid_at'),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  amount: exactDecimal('amount').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
});
