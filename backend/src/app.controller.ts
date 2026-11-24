import { Controller, Get, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { PING_LIMIT } from './auth/rate-limits.js';
import type { Db } from './db/db.js';

@Controller()
@UseGuards(ThrottlerGuard)
export class AppController {
  constructor(@InjectDrizzle() private readonly db: Db) {}

  /** Healthcheck: 200 when the app is serving requests and the database answers, 503 when it does not. */
  @Get('ping')
  @Throttle(PING_LIMIT)
  async ping() {
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok' };
  }
}
