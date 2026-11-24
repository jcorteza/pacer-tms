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
import { clients } from '../db/schema.js';

const CLIENTS: CrudConfig = {
  entityType: 'client',
  table: clients as SoftDeletable,
  pageSize: 20,
};
const { insert: createBody, update: updateBody } = crudSchemas(CLIENTS.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('clients')
@UseGuards(SessionGuard, ThrottlerGuard)
export class ClientsController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getClients(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(CLIENTS, query.page);
  }

  @Get(':id')
  getClient(@Param('id', ParseUUIDPipe) id: string) {
    return this.crud.get(CLIENTS, id);
  }

  @Post()
  createClient(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(CLIENTS, userId, body);
  }

  @Patch(':id')
  updateClient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(CLIENTS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteClient(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() userId: string) {
    return this.crud.remove(CLIENTS, userId, id);
  }
}
