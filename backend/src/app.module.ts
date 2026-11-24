import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DrizzleModule } from '@nestjs/drizzle';
import { ThrottlerModule } from '@nestjs/throttler';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppController } from './app.controller.js';
import { ApiKeyGuard } from './auth/api-key.guard.js';
import { DEFAULT_WINDOW, defaultLimit } from './auth/rate-limits.js';
import { throttleTracker } from './auth/throttle-tracker.js';
import { ResourcesModule } from './resources/resources.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    DrizzleModule.forRoot({
      drizzle,
      connection: process.env.DATABASE_URL!,
    }),
    // Counters live in memory, which is right for one backend instance. Controllers opt in with ThrottlerGuard after SessionGuard.
    // The factory runs when the app starts, so a bad RATE_LIMIT_DEFAULT stops it there.
    ThrottlerModule.forRootAsync({
      useFactory: () => ({ throttlers: [{ ttl: DEFAULT_WINDOW, limit: defaultLimit() }], getTracker: throttleTracker }),
    }),
    ResourcesModule,
    SessionsModule,
    UsersModule,
  ],
  controllers: [AppController],
  // Global guards run before controller guards, so the key is checked before any session.
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AppModule {}
