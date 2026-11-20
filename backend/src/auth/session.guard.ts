import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, isNotNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/db.js';
import { sessions } from '../db/schema.js';

export const SESSION_HEADER = 'x-session-id';

/**
 * Requires a live, signed-in session in the `x-session-id` header and puts its
 * user id on the request. Anonymous and expired sessions are rejected.
 * Stands in for the Passport guard that replaces it in the auth phase.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@InjectDrizzle() private readonly db: Db) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const id = z.uuid().safeParse(request.headers[SESSION_HEADER]);
    if (!id.success) throw new UnauthorizedException('Missing or invalid session');

    const [session] = await this.db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(and(eq(sessions.id, id.data), isNotNull(sessions.userId), sql`${sessions.expiresAt} > now()`));
    if (!session) throw new UnauthorizedException('Session expired or unknown');

    request.userId = session.userId;
    return true;
  }
}
