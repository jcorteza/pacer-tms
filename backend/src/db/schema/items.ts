import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { clients } from './clients.js';
import { exactDecimal, intId } from './columns.js';

export const items = pgTable('items', {
  id: intId(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  sku: text('sku').notNull(),
  stock: integer('stock').notNull().default(0),
  name: text('name').notNull(),
  description: text('description'),
  weightLbs: exactDecimal('weight_lbs').notNull(),
  lengthIn: exactDecimal('length_in').notNull(),
  widthIn: exactDecimal('width_in').notNull(),
  heightIn: exactDecimal('height_in').notNull(),
  cost: exactDecimal('cost').notNull(),
});
