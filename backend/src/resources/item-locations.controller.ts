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
import { itemLocations } from '../db/schema.js';
import { CONFIGURATION_WRITERS } from './configuration-writers.js';

const ITEM_LOCATIONS: CrudConfig = {
  entityType: 'item-location',
  table: itemLocations as SoftDeletable,
  pageSize: 50,
  generatedCode: true,
};
const { insert: createBody, update: updateBody } = crudSchemas(ITEM_LOCATIONS.table, { generatedCode: true });

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('item-locations')
@UseGuards(SessionGuard, ThrottlerGuard)
export class ItemLocationsController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getItemLocations(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(ITEM_LOCATIONS, query.page);
  }

  @Get(':id')
  getItemLocation(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(ITEM_LOCATIONS, id);
  }

  @Post()
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  createItemLocation(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(ITEM_LOCATIONS, userId, body);
  }

  @Patch(':id')
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  updateItemLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(ITEM_LOCATIONS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  deleteItemLocation(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(ITEM_LOCATIONS, userId, id);
  }
}
