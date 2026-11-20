import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { carrierInvoices, clients, documents, invoices, shipments, statusChangeLog } from '../schema.js';
import {
  closeDatabase,
  createCarrier,
  createClient,
  createOrder,
  createShipment,
  createUser,
  db,
  expectPgError,
  resetDatabase,
} from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('documents', () => {
  it('given a carrier insurance document, when only the carrier is set, then it is accepted', async () => {
    const carrier = await createCarrier();
    const [doc] = await db
      .insert(documents)
      .values({
        type: 'carrier insurance',
        metadata: { expiration: '2028-01-01' },
        carrierId: carrier.id,
        url: 'https://files.test/ins.pdf',
        status: 'processed',
      })
      .returning();
    expect(doc.clientId).toBeNull();
    expect(doc.orderId).toBeNull();
    expect(doc.shipmentId).toBeNull();
    expect(doc.metadata).toEqual({ expiration: '2028-01-01' });
  });

  it('given a shipment label, when client, order and shipment are set, then it is accepted', async () => {
    const { shipment, client, order } = await createShipment();
    const [doc] = await db
      .insert(documents)
      .values({
        type: 'shipment label',
        metadata: { trackingCode: shipment.trackingCode },
        clientId: client.id,
        orderId: order.id,
        shipmentId: shipment.id,
        url: 'https://files.test/label.pdf',
        status: 'requested',
      })
      .returning();
    expect(doc.shipmentId).toBe(shipment.id);
  });

  it('given a shipment that does not exist, when a document references it, then it is rejected', async () => {
    await expectPgError(
      db.insert(documents).values({ type: 'bill of lading', shipmentId: 999, url: 'u', status: 'requested' }),
      '23503',
    );
  });
});

describe('invoices', () => {
  it('given an order and client, when an invoice is created, then it is accepted; without an order it is rejected', async () => {
    const client = await createClient();
    const order = await createOrder(client.id);
    await db.insert(invoices).values({ clientId: client.id, orderId: order.id, amount: '1200.50', status: 'created' });
    await expectPgError(
      db.insert(invoices).values({ clientId: client.id, amount: '1.00', status: 'created' } as never),
      '23502',
    );
  });

  it('given a client with orders, when the client is deleted, then it is rejected', async () => {
    const client = await createClient();
    await createOrder(client.id);
    await expectPgError(db.delete(clients).where(eq(clients.id, client.id)), '23503');
  });
});

describe('carrier invoices', () => {
  async function createCarrierInvoice(carrierId: number) {
    const [row] = await db
      .insert(carrierInvoices)
      .values({
        receivedAt: new Date(),
        deadline: new Date('2027-02-01T00:00:00Z'),
        carrierId,
        invoiceNumber: 'INV-1',
        amount: '900.00',
        status: 'unprocessed',
        url: 'https://files.test/ci.pdf',
      })
      .returning();
    return row;
  }

  it('given one carrier invoice, when two shipments are billed by it, then both reference that invoice', async () => {
    const invoice = await createCarrierInvoice((await createCarrier()).id);
    const [a, b] = [await createShipment(), await createShipment()];
    await db
      .update(shipments)
      .set({ carrierInvoiceId: invoice.id })
      .where(inArray(shipments.id, [a.shipment.id, b.shipment.id]));
    const billed = await db.select().from(shipments).where(eq(shipments.carrierInvoiceId, invoice.id));
    expect(billed).toHaveLength(2);
  });

  it('given a shipment not yet invoiced, when saved, then carrier_invoice_id is null', async () => {
    expect((await createShipment()).shipment.carrierInvoiceId).toBeNull();
  });

  it('given a carrier invoice that does not exist, when a shipment references it, then it is rejected', async () => {
    await expectPgError(createShipment({ carrierInvoiceId: 999 }), '23503');
  });

  it('given a carrier that does not exist, when an invoice references it, then it is rejected', async () => {
    await expectPgError(createCarrierInvoice(999), '23503');
  });
});

describe('status change log', () => {
  it('given any entity type, when a change is logged by a user, then it is stored', async () => {
    const user = await createUser();
    for (const entityType of ['item', 'shipment', 'order']) {
      await db.insert(statusChangeLog).values({
        entityType,
        entityId: '1',
        action: 'update',
        description: 'status -> flagged',
        userId: user.id,
      });
    }
    expect(await db.select().from(statusChangeLog)).toHaveLength(3);
  });

  it('given no user, when a change is logged, then it is rejected', async () => {
    await expectPgError(
      db
        .insert(statusChangeLog)
        .values({ entityType: 'order', entityId: '1', action: 'create', description: 'd' } as never),
      '23502',
    );
  });
});
