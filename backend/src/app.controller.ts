import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import type { Db } from './db/db.js';

@Controller()
export class AppController {
  constructor(@InjectDrizzle() private readonly db: Db) {}

  /** Healthcheck: 200 when the app is serving requests and the database answers, 503 when it does not. */
  @Get('ping')
  async ping() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok' };
  }
}
