import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The signed-in user's id, as set by SessionGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => context.switchToHttp().getRequest().userId,
);
