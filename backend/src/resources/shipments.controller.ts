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
import { shipments } from '../db/schema.js';

const SHIPMENTS: CrudConfig = {
  entityType: 'shipment',
  table: shipments as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(SHIPMENTS.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('shipments')
@UseGuards(SessionGuard, ThrottlerGuard)
export class ShipmentsController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getShipments(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(SHIPMENTS, query.page);
  }

  @Get(':id')
  getShipment(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(SHIPMENTS, id);
  }

  @Post()
  createShipment(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(SHIPMENTS, userId, body);
  }

  @Patch(':id')
  updateShipment(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(SHIPMENTS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteShipment(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(SHIPMENTS, userId, id);
  }
}
