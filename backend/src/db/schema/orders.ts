import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { carrierInvoices, carriers } from './carriers.js';
import { clients, shippingAddresses } from './clients.js';
import { createdAt, deletedAt, exactDecimal, intId, timestamptz } from './columns.js';
import { items } from './items.js';
import { users } from './users.js';
import { buildingCodes, warehouseCodes } from './warehouses.js';

export const orders = pgTable('orders', {
  id: intId(),
  deletedAt: deletedAt(),
  po: text('po').notNull(),
  createdAt: createdAt(),
  closedAt: timestamptz('closed_at'),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  status: text('status').notNull(),
  requestedDeliveryAt: timestamptz('requested_delivery_at').notNull(),
  /** UTC; converted to local time in the UI. */
  estimatedDeliveryAt: timestamptz('estimated_delivery_at'),
  notes: text('notes'),
});

/** An order has many shipments; each shipment carries one item (Decision Log #26). */
export const shipments = pgTable('shipments', {
  id: intId(),
  deletedAt: deletedAt(),
  trackingCode: uuid('tracking_code').notNull().unique().defaultRandom(),
  orderId: integer('order_id')
    .notNull()
    .references(() => orders.id),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  createdAt: createdAt(),
  itemId: integer('item_id')
    .notNull()
    .references(() => items.id),
  itemCount: integer('item_count').notNull(),
  deliveryAddressId: uuid('delivery_address_id')
    .notNull()
    .references(() => shippingAddresses.id),
  /** pallet or crate. */
  container: text('container').notNull(),
  weight: exactDecimal('weight').notNull(),
  volume: exactDecimal('volume'),
  status: text('status').notNull(),
  /** Free-text contents, e.g. "2000 units of steel pipe" (Decision Log #10). */
  contents: text('contents'),
  estimatedDeliveryAt: timestamptz('estimated_delivery_at'),
  sentAt: timestamptz('sent_at'),
  deliveredAt: timestamptz('delivered_at'),
  carrierId: integer('carrier_id').references(() => carriers.id),
  carrierTrackingNumber: text('carrier_tracking_number'),
  /** The carrier invoice that bills this shipment, once one arrives. */
  carrierInvoiceId: integer('carrier_invoice_id').references(() => carrierInvoices.id),
  serviceLevel: text('service_level'),
  paymentTerms: text('payment_terms'),
  declaredValue: exactDecimal('declared_value'),
  /** Null means not entered; no separate insured flag (Decision Log #27). */
  insuranceCoverage: exactDecimal('insurance_coverage'),
  notes: text('notes'),
});

/** One row per scan of a shipment's label as it passes through a warehouse. */
export const shipmentHandoffs = pgTable('shipment_handoffs', {
  id: intId(),
  shipmentId: integer('shipment_id')
    .notNull()
    .references(() => shipments.id),
  warehouseId: integer('warehouse_id')
    .notNull()
    .references(() => warehouseCodes.id),
  buildingId: integer('building_id').references(() => buildingCodes.id),
  scannedBy: uuid('scanned_by')
    .notNull()
    .references(() => users.id),
  scannedAt: timestamptz('scanned_at').notNull().defaultNow(),
});
