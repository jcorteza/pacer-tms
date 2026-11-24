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
import { invoices } from '../db/schema.js';

const INVOICES: CrudConfig = {
  entityType: 'invoice',
  table: invoices as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(INVOICES.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('invoices')
@UseGuards(SessionGuard, ThrottlerGuard)
export class InvoicesController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getInvoices(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(INVOICES, query.page);
  }

  @Get(':id')
  getInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(INVOICES, id);
  }

  @Post()
  createInvoice(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(INVOICES, userId, body);
  }

  @Patch(':id')
  updateInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(INVOICES, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteInvoice(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(INVOICES, userId, id);
  }
}
