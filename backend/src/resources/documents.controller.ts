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
import { documents } from '../db/schema.js';

const DOCUMENTS: CrudConfig = {
  entityType: 'document',
  table: documents as SoftDeletable,
  pageSize: 50,
};
const { insert: createBody, update: updateBody } = crudSchemas(DOCUMENTS.table);

/** Every route needs a signed-in session, and each user's requests to a route are rate limited. */
@Controller('documents')
@UseGuards(SessionGuard, ThrottlerGuard)
export class DocumentsController {
  constructor(@Inject(CrudService) private readonly crud: CrudService) {}

  @Get()
  getDocuments(@Query({ schema: pageQuery }) query: { page: number }) {
    return this.crud.list(DOCUMENTS, query.page);
  }

  @Get(':id')
  getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.crud.get(DOCUMENTS, id);
  }

  @Post()
  createDocument(@Body({ schema: createBody }) body: Record<string, unknown>, @CurrentUser() userId: string) {
    return this.crud.create(DOCUMENTS, userId, body);
  }

  @Patch(':id')
  updateDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body({ schema: updateBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    return this.crud.update(DOCUMENTS, userId, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  deleteDocument(@Param('id', ParseIntPipe) id: number, @CurrentUser() userId: string) {
    return this.crud.remove(DOCUMENTS, userId, id);
  }
}
