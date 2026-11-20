import { sql } from 'drizzle-orm';
import { check, pgTable, text } from 'drizzle-orm/pg-core';
import { deletedAt, exactDecimal, intId, timestamptz } from './columns.js';
import { integer } from 'drizzle-orm/pg-core';

export const carriers = pgTable(
  'carriers',
  {
    id: intId(),
    deletedAt: deletedAt(),
    name: text('name').notNull(),
    contactName: text('contact_name').notNull(),
    contactPhone: text('contact_phone').notNull(),
    contactEmail: text('contact_email').notNull(),
    /** The carrier's federal registration number; carrierNumberType says which kind it is. */
    carrierNumber: text('carrier_number').notNull(),
    carrierNumberType: text('carrier_number_type').$type<'usdot' | 'mc'>().notNull(),
    serviceLevels: text('service_levels').array().notNull().default([]),
    notes: text('notes'),
  },
  (t) => [check('carriers_number_type', sql`${t.carrierNumberType} in ('usdot', 'mc')`)],
);

/** Incoming invoices from carriers (Decision Log #28). Shipments point back here via shipments.carrier_invoice_id. */
export const carrierInvoices = pgTable('carrier_invoices', {
  id: intId(),
  deletedAt: deletedAt(),
  receivedAt: timestamptz('received_at').notNull(),
  deadline: timestamptz('deadline').notNull(),
  carrierId: integer('carrier_id')
    .notNull()
    .references(() => carriers.id),
  invoiceNumber: text('invoice_number').notNull(),
  amount: exactDecimal('amount').notNull(),
  status: text('status').notNull(),
  url: text('url').notNull(),
  notes: text('notes'),
});
