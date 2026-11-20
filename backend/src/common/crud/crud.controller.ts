import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Type,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/current-user.decorator.js';
import { SessionGuard } from '../../auth/session.guard.js';
import type { CrudConfig, Id } from './crud.config.js';
import { CrudService } from './crud.service.js';
import { crudSchemas, pageQuery } from './crud.schemas.js';

/**
 * Builds the standard controller for one resource: list (paginated), get,
 * create, update and soft delete, all behind a signed-in session.
 */
export function createCrudController(config: CrudConfig): Type<unknown> {
  const { insert, update } = crudSchemas(config.table, { generatedCode: config.generatedCode === true });
  const idPipe = config.idType === 'int' ? ParseIntPipe : ParseUUIDPipe;

  @Controller(config.path)
  @UseGuards(SessionGuard)
  class CrudController {
    constructor(@Inject(CrudService) private readonly crud: CrudService) {}

    @Get()
    list(@Query({ schema: pageQuery }) query: { page: number }) {
      return this.crud.list(config, query.page);
    }

    @Get(':id')
    get(@Param('id', idPipe) id: Id) {
      return this.crud.get(config, id);
    }

    @Post()
    create(@Body({ schema: insert }) body: Record<string, unknown>, @CurrentUser() userId: string) {
      return this.crud.create(config, userId, body);
    }

    @Patch(':id')
    update(@Param('id', idPipe) id: Id, @Body({ schema: update }) body: Record<string, unknown>, @CurrentUser() userId: string) {
      return this.crud.update(config, userId, id, body);
    }

    @Delete(':id')
    @HttpCode(204)
    remove(@Param('id', idPipe) id: Id, @CurrentUser() userId: string) {
      return this.crud.remove(config, userId, id);
    }
  }

  return CrudController;
}
