import { integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { carriers } from './carriers.js';
import { clients } from './clients.js';
import { intId } from './columns.js';
import { orders, shipments } from './orders.js';

/**
 * Operational documents. Which owners apply depends on the type, so every
 * owner reference is nullable (Decision Log #29): a carrier insurance
 * document has only a carrier; a shipment label has client, order and shipment.
 */
export const documents = pgTable('documents', {
  id: intId(),
  /** shipment label, carrier insurance, bill of lading, packing list, ... */
  type: text('type').notNull(),
  /** Type-specific extras, e.g. tracking code (label) or expiration (insurance). */
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  clientId: uuid('client_id').references(() => clients.id),
  orderId: integer('order_id').references(() => orders.id),
  shipmentId: integer('shipment_id').references(() => shipments.id),
  carrierId: integer('carrier_id').references(() => carriers.id),
  url: text('url').notNull(),
  status: text('status').notNull(),
  notes: text('notes'),
});
