import { jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { deletedAt, uuidId } from './columns.js';

export type Contact = { name: string; email: string; phone: string };

export const clients = pgTable('clients', {
  id: uuidId(),
  deletedAt: deletedAt(),
  name: text('name').notNull(),
  billingAddress: text('billing_address').notNull(),
  billingContact: jsonb('billing_contact').$type<Contact>().notNull(),
  shippingContact: jsonb('shipping_contact').$type<Contact>().notNull(),
  notes: text('notes'),
});

export const shippingAddresses = pgTable('shipping_addresses', {
  id: uuidId(),
  deletedAt: deletedAt(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  nickname: text('nickname'),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zip: text('zip').notNull(),
});
