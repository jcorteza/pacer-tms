import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
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
import { shippingAddresses } from '../db/schema.js';

const SHIPPING_ADDRESSES: CrudConfig = {
  entityType: 'shipping-address',
  table: shippingAddresses as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(SHIPPING_ADDRESSES.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('shipping-addresses')
@UseGuards(SessionGuard, ThrottlerGuard)
export class ShippingAddressesController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getShippingAddresses(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(SHIPPING_ADDRESSES, query.page);
  }

  @Get(':id')
  getShippingAddress(@Param('id', ParseUUIDPipe) id: string) {
    return this.crud.get(SHIPPING_ADDRESSES, id);
  }

  @Post()
  createShippingAddress(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(SHIPPING_ADDRESSES, userId, body);
  }

  @Patch(':id')
  updateShippingAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(SHIPPING_ADDRESSES, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteShippingAddress(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() userId: string) {
    return this.crud.remove(SHIPPING_ADDRESSES, userId, id);
  }
}
