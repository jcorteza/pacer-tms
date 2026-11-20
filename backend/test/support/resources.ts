import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../../src/db/schema.js';
import {
  createBuilding,
  createCarrier,
  createClient,
  createItem,
  createOrder,
  createShippingAddress,
  createUser,
  createWarehouse,
} from '../../src/db/test/helpers.js';

type SoftDeletable = PgTable & { id: PgColumn; deletedAt: PgColumn };

/** One CRUD resource: how to reach it, how to build valid bodies for it, what to patch. */
export type Resource = {
  path: string;
  /** What the automatic status-change log records as entityType. */
  entityType: string;
  table: SoftDeletable;
  /** Rows per page when ?page is the only query parameter. */
  pageSize: number;
  /** Creates the rows this resource points at; returns a body factory (n keeps unique keys unique). */
  setup: () => Promise<(n: number) => Record<string, unknown>>;
  /** A valid partial update. */
  patch: Record<string, unknown>;
  /** The status-change log doesn't log itself. */
  logsWrites?: false;
};

const code = (prefix: string, n: number) => `${prefix}${String(n).padStart(2, '0')}`;
const at = '2027-01-10T00:00:00.000Z';

export const resources: Resource[] = [
  {
    path: 'clients',
    entityType: 'client',
    table: schema.clients as SoftDeletable,
    pageSize: 20,
    setup: async () => (n) => ({
      name: `Client ${n}`,
      billingAddress: '1 Billing St',
      billingContact: { name: 'Bill', email: 'bill@c.test', phone: '555-0100' },
      shippingContact: { name: 'Ship', email: 'ship@c.test', phone: '555-0101' },
    }),
    patch: { name: 'Renamed client' },
  },
  {
    path: 'carriers',
    entityType: 'carrier',
    table: schema.carriers as SoftDeletable,
    pageSize: 20,
    setup: async () => (n) => ({
      name: `Carrier ${n}`,
      contactName: 'Casey',
      contactPhone: '555-0102',
      contactEmail: 'casey@carrier.test',
      carrierNumber: `${1000000 + n}`,
      carrierNumberType: 'usdot',
      serviceLevels: ['ground'],
    }),
    patch: { serviceLevels: ['ground', 'air'] },
  },
  {
    path: 'orders',
    entityType: 'order',
    table: schema.orders as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const client = await createClient();
      return (n) => ({ po: `PO-${n}`, clientId: client.id, status: 'open', requestedDeliveryAt: at });
    },
    patch: { status: 'closed' },
  },
  {
    path: 'shipments',
    entityType: 'shipment',
    table: schema.shipments as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const client = await createClient();
      const address = await createShippingAddress(client.id);
      const item = await createItem(client.id);
      const order = await createOrder(client.id);
      return () => ({
        orderId: order.id,
        clientId: client.id,
        itemId: item.id,
        itemCount: 2000,
        deliveryAddressId: address.id,
        container: 'pallet',
        weight: '1500.00',
        status: 'pending',
      });
    },
    patch: { status: 'in transit' },
  },
  {
    path: 'carrier-invoices',
    entityType: 'carrier-invoice',
    table: schema.carrierInvoices as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const carrier = await createCarrier();
      return (n) => ({
        receivedAt: at,
        deadline: at,
        carrierId: carrier.id,
        invoiceNumber: `CI-${n}`,
        amount: '500.00',
        status: 'received',
        url: 'https://files.test/ci.pdf',
      });
    },
    patch: { status: 'paid' },
  },
  {
    path: 'invoices',
    entityType: 'invoice',
    table: schema.invoices as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const client = await createClient();
      const order = await createOrder(client.id);
      return () => ({ clientId: client.id, orderId: order.id, amount: '900.00', status: 'draft' });
    },
    patch: { status: 'sent' },
  },
  {
    path: 'documents',
    entityType: 'document',
    table: schema.documents as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const carrier = await createCarrier();
      return () => ({
        type: 'carrier insurance',
        metadata: { expiration: '2027-06-01' },
        carrierId: carrier.id,
        url: 'https://files.test/insurance.pdf',
        status: 'valid',
      });
    },
    patch: { status: 'expired' },
  },
  {
    path: 'items',
    entityType: 'item',
    table: schema.items as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const client = await createClient();
      return (n) => ({
        clientId: client.id,
        sku: `SKU-${n}`,
        stock: 10,
        name: 'Steel pipe',
        weightLbs: '25.00',
        lengthIn: '120.00',
        widthIn: '4.00',
        heightIn: '4.00',
        cost: '40.00',
      });
    },
    patch: { stock: 5 },
  },
  {
    path: 'shipping-addresses',
    entityType: 'shipping-address',
    table: schema.shippingAddresses as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const client = await createClient();
      return () => ({ clientId: client.id, address: '9 Dock Rd', city: 'Reno', state: 'NV', zip: '89501' });
    },
    patch: { nickname: 'Main dock' },
  },
  {
    path: 'warehouse-codes',
    entityType: 'warehouse-code',
    table: schema.warehouseCodes as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const manager = await createUser();
      return (n) => ({
        code: code('WH', n),
        name: `Site ${n}`,
        managerId: manager.id,
        phone: '555-0103',
        address: '5 Depot Way',
        city: 'Reno',
        state: 'NV',
        zip: '89502',
      });
    },
    patch: { phone: '555-0199' },
  },
  {
    path: 'building-codes',
    entityType: 'building-code',
    table: schema.buildingCodes as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const warehouse = await createWarehouse();
      return (n) => ({ code: code('BA', n), warehouseId: warehouse.id, name: `Building ${n}`, type: 'storage' });
    },
    patch: { type: 'transport' },
  },
  {
    path: 'item-locations',
    entityType: 'item-location',
    table: schema.itemLocations as SoftDeletable,
    pageSize: 50,
    setup: async () => {
      const building = await createBuilding((await createWarehouse()).id);
      return (n) => ({ code: code('LC', n), buildingId: building.id });
    },
    patch: { description: 'Aisle 4, shelf 2' },
  },
  {
    path: 'status-change-log',
    entityType: 'status-change-log',
    table: schema.statusChangeLog as SoftDeletable,
    pageSize: 50,
    logsWrites: false,
    setup: async () => {
      const user = await createUser();
      return (n) => ({
        entityType: 'item',
        entityId: `${n}`,
        action: 'update',
        description: 'stock adjusted',
        userId: user.id,
      });
    },
    patch: { description: 'stock adjusted after recount' },
  },
];
