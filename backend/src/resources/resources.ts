import type { CrudConfig, SoftDeletable } from '../common/crud/crud.config.js';
import * as schema from '../db/schema.js';
import type { Role } from '../users/roles.js';

/** The Configuration page's resources: sites, buildings, items and item locations are edited by warehouse and operations management. */
const CONFIGURATION_WRITERS: readonly Role[] = ['Warehouse Management', 'Operations Management'];

const resource = (
  path: string,
  entityType: string,
  table: unknown,
  idType: CrudConfig['idType'],
  pageSize = 50,
  extra: Partial<CrudConfig> = {},
): CrudConfig => ({ path, entityType, table: table as SoftDeletable, idType, pageSize, ...extra });

/** Every plain CRUD resource. Adding one means adding a line here (and its test fixture). */
export const CRUD_RESOURCES: CrudConfig[] = [
  resource('clients', 'client', schema.clients, 'uuid', 20),
  resource('carriers', 'carrier', schema.carriers, 'int', 20),
  resource('orders', 'order', schema.orders, 'int'),
  resource('shipments', 'shipment', schema.shipments, 'int'),
  resource('carrier-invoices', 'carrier-invoice', schema.carrierInvoices, 'int'),
  resource('invoices', 'invoice', schema.invoices, 'int'),
  resource('documents', 'document', schema.documents, 'int'),
  resource('items', 'item', schema.items, 'int', 50, { writeRoles: CONFIGURATION_WRITERS }),
  resource('shipping-addresses', 'shipping-address', schema.shippingAddresses, 'uuid'),
  resource('warehouse-codes', 'warehouse-code', schema.warehouseCodes, 'int', 50, { generatedCode: true, writeRoles: CONFIGURATION_WRITERS }),
  resource('building-codes', 'building-code', schema.buildingCodes, 'int', 50, { generatedCode: true, writeRoles: CONFIGURATION_WRITERS }),
  resource('item-locations', 'item-location', schema.itemLocations, 'int', 50, { generatedCode: true, writeRoles: CONFIGURATION_WRITERS }),
  resource('status-change-log', 'status-change-log', schema.statusChangeLog, 'int', 50, { logsWrites: false }),
];
