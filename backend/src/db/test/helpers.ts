import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../schema.js';
import { testDatabaseUrl } from './test-database-url.js';

const pool = new pg.Pool({ connectionString: testDatabaseUrl() });
export const db = drizzle({ client: pool });

/** Empty every app table (not drizzle's migration bookkeeping) between tests. */
export async function resetDatabase() {
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  const tables = rows.map((r) => `"${r.tablename}"`).join(', ');
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}

export const closeDatabase = () => pool.end();

type SqlState = '22001' | '23502' | '23503' | '23505' | '23514';

/**
 * Asserts a query is rejected by Postgres with the given SQLSTATE:
 * 22001 value too long, 23502 not-null, 23503 foreign key, 23505 unique, 23514 check.
 */
export async function expectPgError(query: PromiseLike<unknown>, sqlState: SqlState) {
  const error = await Promise.resolve(query).then(
    () => undefined,
    (e: { code?: string; cause?: { code?: string } }) => e,
  );
  expect(error, 'expected the query to be rejected').toBeDefined();
  expect(error?.cause?.code ?? error?.code).toBe(sqlState);
}

// ---- Factories: the smallest valid row for each table, with overrides. ----

let counter = 0;
const next = () => ++counter;

export async function createUser(over: Partial<typeof schema.users.$inferInsert> = {}) {
  const [row] = await db
    .insert(schema.users)
    .values({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: `user${next()}@larkspur.test`,
      passwordHash: 'hashed',
      roles: ['Warehouse'],
      ...over,
    })
    .returning();
  return row;
}

export async function createClient(over: Partial<typeof schema.clients.$inferInsert> = {}) {
  const [row] = await db
    .insert(schema.clients)
    .values({
      name: `Client ${next()}`,
      billingAddress: '1 Billing St',
      billingContact: { name: 'Bill', email: 'bill@c.test', phone: '555-0100' },
      shippingContact: { name: 'Ship', email: 'ship@c.test', phone: '555-0101' },
      ...over,
    })
    .returning();
  return row;
}

export async function createShippingAddress(clientId: string) {
  const [row] = await db
    .insert(schema.shippingAddresses)
    .values({ clientId, address: '9 Dock Rd', city: 'Reno', state: 'NV', zip: '89501' })
    .returning();
  return row;
}

export async function createItem(clientId: string) {
  const [row] = await db
    .insert(schema.items)
    .values({
      clientId,
      sku: `SKU-${next()}`,
      stock: 10,
      name: 'Steel pipe',
      description: '10ft steel pipe',
      weightLbs: '25.00',
      lengthIn: '120.00',
      widthIn: '4.00',
      heightIn: '4.00',
      cost: '40.00',
    })
    .returning();
  return row;
}

export async function createCarrier(over: Partial<typeof schema.carriers.$inferInsert> = {}) {
  const [row] = await db
    .insert(schema.carriers)
    .values({
      name: `Carrier ${next()}`,
      contactName: 'Casey',
      contactPhone: '555-0102',
      contactEmail: 'casey@carrier.test',
      carrierNumber: '1234567',
      carrierNumberType: 'usdot',
      serviceLevels: ['ground'],
      ...over,
    })
    .returning();
  return row;
}

export async function createOrder(clientId: string) {
  const [row] = await db
    .insert(schema.orders)
    .values({
      po: `PO-${next()}`,
      clientId,
      status: 'open',
      requestedDeliveryAt: new Date('2027-01-10T00:00:00Z'),
    })
    .returning();
  return row;
}

export async function createWarehouse(code = 'WH01') {
  const manager = await createUser();
  const [row] = await db
    .insert(schema.warehouseCodes)
    .values({
      code,
      name: `Site ${code}`,
      managerId: manager.id,
      phone: '555-0103',
      address: '5 Depot Way',
      city: 'Reno',
      state: 'NV',
      zip: '89502',
    })
    .returning();
  return row;
}

export async function createBuilding(warehouseId: number, code = 'BA01') {
  const [row] = await db
    .insert(schema.buildingCodes)
    .values({ code, warehouseId, name: `Building ${code}`, type: 'storage' })
    .returning();
  return row;
}

/** A full chain (client → address → item → order) plus one shipment on it. */
export async function createShipment(over: Partial<typeof schema.shipments.$inferInsert> = {}) {
  const client = await createClient();
  const address = await createShippingAddress(client.id);
  const item = await createItem(client.id);
  const order = await createOrder(client.id);
  const [shipment] = await db
    .insert(schema.shipments)
    .values({
      orderId: order.id,
      clientId: client.id,
      itemId: item.id,
      itemCount: 2000,
      deliveryAddressId: address.id,
      container: 'pallet',
      weight: '1500.00',
      status: 'pending',
      contents: '2000 units of steel pipe',
      ...over,
    })
    .returning();
  return { shipment, client, address, item, order };
}
