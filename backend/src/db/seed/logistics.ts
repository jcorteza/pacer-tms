import { eq } from 'drizzle-orm';
import type { Tx } from '../db.js';
import { carrierInvoices, carriers, orders, shipmentHandoffs, shipments } from '../schema.js';
import { addDays, addHours, daysAgo, daysAhead } from './dates.js';

type Row<T extends { $inferSelect: unknown }> = T['$inferSelect'];

const CARRIERS = [
  { name: 'Ridgeline Freight Lines', prefix: 'RFL', type: 'usdot', number: '2841107', levels: ['ground', 'expedited'] },
  { name: 'Bluebird Logistics', prefix: 'BBL', type: 'mc', number: '613902', levels: ['ground'] },
  { name: 'Northstar Haulage', prefix: 'NSH', type: 'usdot', number: '3150668', levels: ['ground', 'freight forwarding'] },
  { name: 'Silverline Express', prefix: 'SLX', type: 'mc', number: '774215', levels: ['expedited', 'air'] },
  { name: 'Basin Pacific Carriers', prefix: 'BPC', type: 'usdot', number: '1987342', levels: ['ground', 'ocean'] },
  { name: 'Tumbleweed Transport', prefix: 'TWT', type: 'mc', number: '508831', levels: ['ground', 'expedited'] },
] as const;

/**
 * 15 orders, two shipments each. `age` is days since the order was created.
 * Closed/fulfilled orders are fully delivered; unsent shipments (pending, incoming)
 * haven't left, so no warehouse has scanned them.
 */
type ShipmentStatus = 'pending' | 'incoming' | 'in transit' | 'arrived' | 'delayed' | 'delivered' | 'flagged';
const ORDERS: { status: string; age: number; shipments: [ShipmentStatus, ShipmentStatus] }[] = [
  { status: 'closed', age: 55, shipments: ['delivered', 'delivered'] },
  { status: 'closed', age: 50, shipments: ['delivered', 'delivered'] },
  { status: 'closed', age: 46, shipments: ['delivered', 'delivered'] },
  { status: 'fulfilled', age: 30, shipments: ['delivered', 'delivered'] },
  { status: 'fulfilled', age: 27, shipments: ['delivered', 'delivered'] },
  { status: 'in progress', age: 20, shipments: ['in transit', 'in transit'] },
  { status: 'in progress', age: 18, shipments: ['in transit', 'in transit'] },
  { status: 'in progress', age: 16, shipments: ['in transit', 'arrived'] },
  { status: 'in progress', age: 14, shipments: ['arrived', 'delayed'] },
  { status: 'in progress', age: 12, shipments: ['arrived', 'delayed'] },
  { status: 'open', age: 8, shipments: ['in transit', 'delayed'] },
  { status: 'open', age: 6, shipments: ['pending', 'pending'] },
  { status: 'open', age: 4, shipments: ['pending', 'incoming'] },
  { status: 'open', age: 3, shipments: ['pending', 'incoming'] },
  { status: 'flagged', age: 10, shipments: ['incoming', 'flagged'] },
];

/**
 * Warehouse scans by shipment index (0-29). Sent shipments with no entry get exactly one scan;
 * 0 means the shipment went straight from pickup to dropoff.
 */
const SCANS: Record<number, number> = { 1: 3, 4: 2, 10: 3, 13: 2, 2: 0, 5: 0, 8: 0 };
const UNSENT: ShipmentStatus[] = ['pending', 'incoming'];

const CARRIER_INVOICE_STATUSES = ['unprocessed', 'blocked', 'flagged', 'validated', 'processed'];

export async function seedLogistics(
  tx: Tx,
  now: Date,
  { clients, addresses, items }: Pick<Awaited<ReturnType<typeof import('./customers.js').seedCustomers>>, 'clients' | 'addresses' | 'items'>,
  warehouse: { warehouses: { id: number }[]; buildings: { id: number; warehouseId: number }[] },
  scanners: { id: string }[],
) {
  const insertedCarriers = await tx
    .insert(carriers)
    .values(
      CARRIERS.map((c) => ({
        name: c.name,
        contactName: 'Dispatch Desk',
        contactPhone: '800-555-0100',
        contactEmail: `dispatch@${c.name.split(' ')[0].toLowerCase()}.test`,
        carrierNumber: c.number,
        carrierNumberType: c.type,
        serviceLevels: [...c.levels],
      })),
    )
    .returning();

  // Orders: three per client, round-robin.
  const orderRows = ORDERS.map((o, i) => {
    const createdAt = daysAgo(now, o.age);
    return {
      po: `PO-2026-${1001 + i}`,
      createdAt,
      closedAt: o.status === 'closed' ? daysAgo(now, o.age - 8) : null,
      clientId: clients[i % clients.length].id,
      status: o.status,
      requestedDeliveryAt: addDays(createdAt, 14),
      estimatedDeliveryAt: addDays(createdAt, 10),
    };
  });
  const insertedOrders = await tx.insert(orders).values(orderRows).returning();

  // Shipments: two per order.
  const shipmentPlans = ORDERS.flatMap((o, oi) =>
    o.shipments.map((status, n) => ({ order: insertedOrders[oi], age: o.age, status, index: oi * 2 + n })),
  );
  const shipmentRows = shipmentPlans.map(({ order, age, status, index }) => {
    const client = clients.find((c) => c.id === order.clientId)!;
    const clientItems = items.filter((i) => i.clientId === client.id);
    const item = clientItems[index % clientItems.length];
    const address = addresses.filter((a) => a.clientId === client.id)[index % 2];
    const itemCount = 20 + ((index * 37) % 180);
    const sent = !UNSENT.includes(status);
    const carrier = sent ? insertedCarriers[index % insertedCarriers.length] : null;
    const sentAt = sent ? daysAgo(now, age - 2) : null;
    const declaredValue = itemCount * Number(item.cost);
    const volumeCuFt = (itemCount * Number(item.lengthIn) * Number(item.widthIn) * Number(item.heightIn)) / 1728;
    return {
      orderId: order.id,
      clientId: client.id,
      createdAt: order.createdAt,
      itemId: item.id,
      itemCount,
      deliveryAddressId: address.id,
      container: index % 2 === 0 ? 'pallet' : 'crate',
      weight: (itemCount * Number(item.weightLbs)).toFixed(2),
      volume: volumeCuFt.toFixed(2),
      status,
      contents: `${itemCount} x ${item.name}`,
      sentAt,
      deliveredAt: status === 'delivered' ? daysAgo(now, age - 6) : null,
      estimatedDeliveryAt: status === 'delayed' ? daysAgo(now, 2) : sent ? daysAhead(now, 2) : daysAhead(now, 7),
      carrierId: carrier?.id ?? null,
      carrierTrackingNumber: carrier ? `${CARRIERS[index % CARRIERS.length].prefix}${100000 + index * 7919}` : null,
      serviceLevel: carrier ? carrier.serviceLevels[0] : null,
      paymentTerms: 'net 30',
      declaredValue: declaredValue.toFixed(2),
      insuranceCoverage: index % 3 === 0 ? declaredValue.toFixed(2) : null,
    };
  });
  const insertedShipments = await tx.insert(shipments).values(shipmentRows).returning();

  const handoffs = await seedHandoffs(tx, insertedShipments, warehouse, scanners);
  const invoices = await seedCarrierInvoices(tx, insertedCarriers, insertedShipments);

  return { carriers: insertedCarriers, orders: insertedOrders, shipments: insertedShipments, handoffs, carrierInvoices: invoices };
}

/** One row per warehouse scan: sent shipments get 1 scan unless SCANS says otherwise. */
async function seedHandoffs(
  tx: Tx,
  insertedShipments: Row<typeof shipments>[],
  { buildings }: { buildings: { id: number; warehouseId: number }[] },
  scanners: { id: string }[],
) {
  const rows = insertedShipments.flatMap((shipment, index) => {
    if (!shipment.sentAt) return [];
    return Array.from({ length: SCANS[index] ?? 1 }, (_, k) => {
      const building = buildings[(index + k) % buildings.length];
      return {
        shipmentId: shipment.id,
        warehouseId: building.warehouseId,
        buildingId: building.id,
        scannedBy: scanners[(index + k) % scanners.length].id,
        scannedAt: addHours(shipment.sentAt!, (k + 1) * 4),
      };
    });
  });
  return tx.insert(shipmentHandoffs).values(rows).returning();
}

/** Each delivered shipment is billed by its carrier; the invoice statuses cycle through all five. */
async function seedCarrierInvoices(tx: Tx, insertedCarriers: Row<typeof carriers>[], insertedShipments: Row<typeof shipments>[]) {
  const delivered = insertedShipments.filter((s) => s.status === 'delivered');
  const rows = delivered.map((s, i) => {
    const receivedAt = addDays(s.deliveredAt!, 3);
    return {
      receivedAt,
      deadline: addDays(receivedAt, 30),
      carrierId: s.carrierId!,
      invoiceNumber: `${CARRIERS[insertedCarriers.findIndex((c) => c.id === s.carrierId)].prefix}-${4100 + i}`,
      amount: (150 + i * 37.5).toFixed(2),
      status: CARRIER_INVOICE_STATUSES[i % CARRIER_INVOICE_STATUSES.length],
      url: `https://files.larkspurfreight.test/carrier-invoices/${4100 + i}.pdf`,
    };
  });
  const inserted = await tx.insert(carrierInvoices).values(rows).returning();
  for (const [i, shipment] of delivered.entries()) {
    await tx.update(shipments).set({ carrierInvoiceId: inserted[i].id }).where(eq(shipments.id, shipment.id));
  }
  return inserted;
}
