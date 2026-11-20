import type { Tx } from '../db.js';
import { documents, invoices, statusChangeLog } from '../schema.js';
import type { carriers, orders, shipments } from '../schema.js';
import { addDays, daysAhead } from './dates.js';

type Row<T extends { $inferSelect: unknown }> = T['$inferSelect'];
type Logistics = {
  carriers: Row<typeof carriers>[];
  orders: Row<typeof orders>[];
  shipments: Row<typeof shipments>[];
};

/** Client invoice status for each of the first ten orders; together they cover every invoice status. */
const INVOICE_STATUSES = [
  'payment received', 'payment received', 'partial payment received', 'sent', 'disputed',
  'sent', 'blocked', 'created', 'flagged', 'created',
];

export async function seedInvoices(tx: Tx, { orders: allOrders, shipments: allShipments }: Logistics) {
  const rows = INVOICE_STATUSES.map((status, i) => {
    const order = allOrders[i];
    const createdAt = addDays(order.createdAt, 10);
    const amount = allShipments
      .filter((s) => s.orderId === order.id)
      .reduce((sum, s) => sum + Number(s.declaredValue ?? 0) * 0.15, 0);
    return {
      createdAt,
      sentAt: status === 'created' ? null : addDays(createdAt, 1),
      paidAt: status === 'payment received' ? addDays(createdAt, 12) : null,
      clientId: order.clientId,
      orderId: order.id,
      amount: amount.toFixed(2),
      status,
    };
  });
  return tx.insert(invoices).values(rows).returning();
}

/** 25 documents: labels and packing lists and bills of lading for shipments, insurance for carriers. */
export async function seedDocuments(tx: Tx, now: Date, { carriers: allCarriers, shipments: all }: Logistics) {
  const file = (kind: string, n: number) => `https://files.larkspurfreight.test/${kind}/${n}.pdf`;
  const sentStatus = (i: number) => (all[i].sentAt ? 'processed' : i % 2 ? 'requested' : 'awaiting processing');

  const labels = [0, 2, 4, 6, 8, 13, 16, 20, 24, 28].map((i) => ({
    type: 'shipment label',
    metadata: { trackingCode: all[i].trackingCode },
    clientId: all[i].clientId,
    orderId: all[i].orderId,
    shipmentId: all[i].id,
    url: file('labels', all[i].id),
    status: sentStatus(i),
  }));
  const billsOfLading = [1, 3, 5, 10, 12, 14].map((i) => ({
    type: 'bill of lading',
    metadata: {},
    clientId: all[i].clientId,
    shipmentId: all[i].id,
    carrierId: all[i].carrierId,
    url: file('bols', all[i].id),
    status: i === 14 ? 'awaiting processing' : 'processed',
  }));
  const packingLists = [7, 9, 15, 18, 21].map((i) => ({
    type: 'packing list',
    metadata: {},
    clientId: all[i].clientId,
    shipmentId: all[i].id,
    url: file('packing-lists', all[i].id),
    status: i === 21 ? 'awaiting processing' : 'processed',
  }));
  const insurance = allCarriers.slice(0, 4).map((carrier, n) => ({
    type: 'carrier insurance',
    metadata: { expiration: daysAhead(now, [200, 90, 25, -10][n]).toISOString().slice(0, 10) },
    carrierId: carrier.id,
    url: file('insurance', carrier.id),
    status: 'processed',
  }));

  return tx.insert(documents).values([...labels, ...billsOfLading, ...packingLists, ...insurance]).returning();
}

/** The audit trail the API would have written: creation of every order and shipment, plus status moves. */
export async function seedStatusLog(
  tx: Tx,
  { orders: allOrders, shipments: all }: Logistics,
  actors: { dispatcher: string; warehouse: string },
) {
  const entry = (entityType: string, id: number, action: string, description: string, userId: string, at: Date) => ({
    entityType,
    entityId: String(id),
    action,
    description,
    userId,
    at,
  });

  const rows = [
    ...allOrders.map((o) => entry('order', o.id, 'create', `Created order ${o.po}`, actors.dispatcher, o.createdAt)),
    ...all.flatMap((s) => [
      entry('shipment', s.id, 'create', `Created shipment ${s.trackingCode}`, actors.dispatcher, s.createdAt),
      ...(s.sentAt ? [entry('shipment', s.id, 'update', 'Status changed to in transit', actors.warehouse, s.sentAt)] : []),
      ...(s.deliveredAt ? [entry('shipment', s.id, 'update', 'Status changed to delivered', actors.warehouse, s.deliveredAt)] : []),
    ]),
  ];
  return tx.insert(statusChangeLog).values(rows).returning();
}
