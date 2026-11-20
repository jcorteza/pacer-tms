import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard.js';
import { createCrudController } from '../common/crud/crud.controller.js';
import { CrudService } from '../common/crud/crud.service.js';
import { StatusChangeLogService } from '../status-change-log/status-change-log.service.js';
import { CRUD_RESOURCES } from './resources.js';

@Module({
  controllers: CRUD_RESOURCES.map(createCrudController),
  providers: [CrudService, StatusChangeLogService, SessionGuard],
})
export class ResourcesModule {}
