import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/db.js';
import { users } from '../db/schema.js';
import type { Role } from '../users/roles.js';

const ALLOWED_ROLES = 'allowedRoles';

/**
 * Limits a route to users holding at least one of `roles`; anyone else gets 403.
 * Needs a signed-in session, so use it on a route or controller that SessionGuard already covers
 * (a controller-level guard runs before a route-level one).
 */
export const RequireAnyRole = (...roles: readonly Role[]) =>
  applyDecorators(SetMetadata(ALLOWED_ROLES, roles), UseGuards(RolesGuard));

/**
 * Reads the caller's roles from the database on every request, not from the session,
 * so adding or removing a role takes effect immediately.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @InjectDrizzle() private readonly db: Db,
  ) {}

  async canActivate(context: ExecutionContext) {
    const allowed = this.reflector.getAllAndOverride<readonly Role[] | undefined>(ALLOWED_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;

    const { userId } = context.switchToHttp().getRequest();
    const [user] = await this.db.select({ roles: users.roles }).from(users).where(eq(users.id, userId));
    if (!user?.roles.some((role) => allowed.includes(role))) throw new ForbiddenException('Your role cannot do this');
    return true;
  }
}
