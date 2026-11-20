import type { INestApplication } from '@nestjs/common';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PostgresExceptionFilter } from './common/postgres-exception.filter.js';

/** Global pipes and filters, shared by main.ts and the e2e tests so both run the same app. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.useGlobalFilters(new PostgresExceptionFilter(app.get(HttpAdapterHost).httpAdapter));
}
