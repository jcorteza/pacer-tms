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
import { buildingCodes } from '../db/schema.js';
import { CONFIGURATION_WRITERS } from './configuration-writers.js';

const BUILDING_CODES: CrudConfig = {
  entityType: 'building-code',
  table: buildingCodes as SoftDeletable,
  pageSize: 50,
  generatedCode: true,
};
const { insert: createBody, update: updateBody } = crudSchemas(BUILDING_CODES.table, { generatedCode: true });

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('building-codes')
@UseGuards(SessionGuard, ThrottlerGuard)
export class BuildingCodesController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getBuildingCodes(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(BUILDING_CODES, query.page);
  }

  @Get(':id')
  getBuildingCode(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(BUILDING_CODES, id);
  }

  @Post()
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  createBuildingCode(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(BUILDING_CODES, userId, body);
  }

  @Patch(':id')
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  updateBuildingCode(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(BUILDING_CODES, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequireAnyRole(...CONFIGURATION_WRITERS)
  deleteBuildingCode(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(BUILDING_CODES, userId, id);
  }
}
