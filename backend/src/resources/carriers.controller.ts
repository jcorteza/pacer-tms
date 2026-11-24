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
import { carriers } from '../db/schema.js';

const CARRIERS: CrudConfig = {
  entityType: 'carrier',
  table: carriers as SoftDeletable,
  pageSize: 20,
};
const { insert: createBody, update: updateBody } = crudSchemas(CARRIERS.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('carriers')
@UseGuards(SessionGuard, ThrottlerGuard)
export class CarriersController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getCarriers(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(CARRIERS, query.page);
  }

  @Get(':id')
  getCarrier(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(CARRIERS, id);
  }

  @Post()
  createCarrier(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(CARRIERS, userId, body);
  }

  @Patch(':id')
  updateCarrier(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(CARRIERS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteCarrier(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(CARRIERS, userId, id);
  }
}
