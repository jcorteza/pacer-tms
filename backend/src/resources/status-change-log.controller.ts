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
import { statusChangeLog } from '../db/schema.js';

const STATUS_CHANGE_LOG: CrudConfig = {
  entityType: 'status-change-log',
  table: statusChangeLog as SoftDeletable,
  pageSize: 50,
  logsWrites: false,
};
const { insert: createBody, update: updateBody } = crudSchemas(STATUS_CHANGE_LOG.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('status-change-log')
@UseGuards(SessionGuard, ThrottlerGuard)
export class StatusChangeLogController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getStatusChangeLog(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(STATUS_CHANGE_LOG, query.page);
  }

  @Get(':id')
  getStatusChangeLogEntry(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(STATUS_CHANGE_LOG, id);
  }

  @Post()
  createStatusChangeLogEntry(
    @Body({ schema: createBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.create(STATUS_CHANGE_LOG, userId, body);
  }

  @Patch(':id')
  updateStatusChangeLogEntry(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(STATUS_CHANGE_LOG, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteStatusChangeLogEntry(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(STATUS_CHANGE_LOG, userId, id);
  }
}
