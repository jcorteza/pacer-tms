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
import { orders } from '../db/schema.js';

const ORDERS: CrudConfig = {
  entityType: 'order',
  table: orders as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(ORDERS.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('orders')
@UseGuards(SessionGuard, ThrottlerGuard)
export class OrdersController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getOrders(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(ORDERS, query.page);
  }

  @Get(':id')
  getOrder(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(ORDERS, id);
  }

  @Post()
  createOrder(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(ORDERS, userId, body);
  }

  @Patch(':id')
  updateOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(ORDERS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteOrder(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(ORDERS, userId, id);
  }
}
