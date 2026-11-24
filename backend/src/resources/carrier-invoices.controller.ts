import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard } from '../auth/session.guard.js';
import type { CrudConfig, SoftDeletable } from '../common/crud/crud.config.js';
import { crudSchemas, pageQuery } from '../common/crud/crud.schemas.js';
import { CrudService } from '../common/crud/crud.service.js';
import { carrierInvoices } from '../db/schema.js';

const CARRIER_INVOICES: CrudConfig = {
  entityType: 'carrier-invoice',
  table: carrierInvoices as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(CARRIER_INVOICES.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('carrier-invoices')
@UseGuards(SessionGuard, ThrottlerGuard)
export class CarrierInvoicesController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getCarrierInvoices(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(CARRIER_INVOICES, query.page);
  }

  @Get(':id')
  getCarrierInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(CARRIER_INVOICES, id);
  }

  @Post()
  createCarrierInvoice(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(CARRIER_INVOICES, userId, body);
  }

  @Patch(':id')
  updateCarrierInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(CARRIER_INVOICES, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteCarrierInvoice(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(CARRIER_INVOICES, userId, id);
  }
}
