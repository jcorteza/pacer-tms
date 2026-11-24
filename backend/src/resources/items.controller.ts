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
import { RequireAnyRole } from '../auth/roles.guard.js';
import { SessionGuard } from '../auth/session.guard.js';
import type { CrudConfig, SoftDeletable } from '../common/crud/crud.config.js';
import { crudSchemas, pageQuery } from '../common/crud/crud.schemas.js';
import { CrudService } from '../common/crud/crud.service.js';
import { items } from '../db/schema.js';
import { CONFIGURATION_WRITERS } from './configuration-writers.js';

const ITEMS: CrudConfig = {
  entityType: 'item',
  table: items as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(ITEMS.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('items')
@UseGuards(SessionGuard, ThrottlerGuard)
export class ItemsController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getItems(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(ITEMS, query.page);
  }

  @Get(':id')
  getItem(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(ITEMS, id);
  }

  @Post()
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  createItem(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(ITEMS, userId, body);
  }

  @Patch(':id')
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(ITEMS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  deleteItem(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(ITEMS, userId, id);
  }
}
