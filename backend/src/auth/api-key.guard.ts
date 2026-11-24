import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

export const API_KEY_HEADER = 'x-api-key';

/** Hashing first gives both sides the same length, which timingSafeEqual requires. */
const digest = (value: string) => createHash('sha256').update(value).digest();

/**
 * Requires the shared API key in the `x-api-key` header on every request.
 * Registered globally (APP_GUARD), so routes added later are covered without opting in.
 * Refuses to be created without an API_KEY, so the app cannot start unprotected.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor() {
    const key = process.env.API_KEY;
    if (!key) throw new Error('API_KEY must be set: every route requires it.');
    this.expected = digest(key);
  }

  canActivate(context: ExecutionContext) {
    const provided = context.switchToHttp().getRequest().headers[API_KEY_HEADER];
    if (typeof provided !== 'string' || !timingSafeEqual(digest(provided), this.expected)) {
      throw new UnauthorizedException('Missing or invalid API key');
    }
    return true;
  }
}
