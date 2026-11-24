import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard.js';
import { CrudService } from '../common/crud/crud.service.js';
import { StatusChangeLogService } from '../status-change-log/status-change-log.service.js';
import { ClientsController } from './clients.controller.js';
import { CarriersController } from './carriers.controller.js';
import { OrdersController } from './orders.controller.js';
import { ShipmentsController } from './shipments.controller.js';
import { CarrierInvoicesController } from './carrier-invoices.controller.js';
import { InvoicesController } from './invoices.controller.js';
import { DocumentsController } from './documents.controller.js';
import { ItemsController } from './items.controller.js';
import { ShippingAddressesController } from './shipping-addresses.controller.js';
import { WarehouseCodesController } from './warehouse-codes.controller.js';
import { BuildingCodesController } from './building-codes.controller.js';
import { ItemLocationsController } from './item-locations.controller.js';
import { StatusChangeLogController } from './status-change-log.controller.js';

@Module({
  controllers: [
    ClientsController,
    CarriersController,
    OrdersController,
    ShipmentsController,
    CarrierInvoicesController,
    InvoicesController,
    DocumentsController,
    ItemsController,
    ShippingAddressesController,
    WarehouseCodesController,
    BuildingCodesController,
    ItemLocationsController,
    StatusChangeLogController,
  ],
  providers: [CrudService, StatusChangeLogService, SessionGuard],
})
export class ResourcesModule {}
