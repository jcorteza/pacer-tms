import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { orders, shipmentHandoffs, shipments } from '../schema.js';
import {
  closeDatabase,
  createBuilding,
  createCarrier,
  createShipment,
  createUser,
  createWarehouse,
  db,
  expectPgError,
  resetDatabase,
} from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('shipments', () => {
  it('given a new shipment, when saved, then a unique tracking code is generated', async () => {
    const a = await createShipment();
    const b = await createShipment();
    expect(a.shipment.trackingCode).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.shipment.trackingCode).not.toBe(b.shipment.trackingCode);
  });

  it.each(['orderId', 'itemId', 'deliveryAddressId'] as const)(
    'given no %s, when saved, then it is rejected',
    async (column) => {
      const { shipment } = await createShipment();
      const { id: _id, trackingCode: _t, ...values } = shipment;
      await expectPgError(db.insert(shipments).values({ ...values, [column]: null } as never), '23502');
    },
  );

  it('given no carrier or insurance yet, when saved, then both are null', async () => {
    const { shipment } = await createShipment();
    expect(shipment.carrierId).toBeNull();
    expect(shipment.insuranceCoverage).toBeNull();
  });

  it('given a carrier and coverage, when saved, then they are stored', async () => {
    const carrier = await createCarrier();
    const { shipment } = await createShipment({
      carrierId: carrier.id,
      declaredValue: '5000.00',
      insuranceCoverage: '4000.00',
    });
    expect(shipment.carrierId).toBe(carrier.id);
    expect(shipment.insuranceCoverage).toBe('4000.00');
  });

  it('given a label scan at a warehouse, when recorded, then the scan is stored with a timestamp', async () => {
    const { shipment } = await createShipment();
    const warehouse = await createWarehouse();
    const scanner = await createUser();
    const [scan] = await db
      .insert(shipmentHandoffs)
      .values({ shipmentId: shipment.id, warehouseId: warehouse.id, scannedBy: scanner.id })
      .returning();
    expect(Math.abs(scan.scannedAt.getTime() - Date.now())).toBeLessThan(60_000);
    expect(scan.buildingId).toBeNull();
  });

  it('given a scan inside a building, when recorded, then the building is stored', async () => {
    const { shipment } = await createShipment();
    const warehouse = await createWarehouse();
    const building = await createBuilding(warehouse.id);
    const scanner = await createUser();
    const [scan] = await db
      .insert(shipmentHandoffs)
      .values({ shipmentId: shipment.id, warehouseId: warehouse.id, buildingId: building.id, scannedBy: scanner.id })
      .returning();
    expect(scan.buildingId).toBe(building.id);
  });

  it('given a scan with no warehouse, when recorded, then it is rejected', async () => {
    const { shipment } = await createShipment();
    const scanner = await createUser();
    await expectPgError(
      db.insert(shipmentHandoffs).values({ shipmentId: shipment.id, scannedBy: scanner.id } as never),
      '23502',
    );
  });

  it('given an order with shipments, when the order is deleted, then it is rejected', async () => {
    const { order } = await createShipment();
    await expectPgError(db.delete(orders).where(eq(orders.id, order.id)), '23503');
  });
});
