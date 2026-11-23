import { BadRequestException, Body, Controller, Delete, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { isDemoMode } from '../common/demo-mode.js';
import { SessionsService } from './sessions.service.js';

const loginBody = z.strictObject({ email: z.email(), password: z.string().min(1) });

/** No body at all, or an empty one. */
const isEmpty = (body: unknown) => body == null || (typeof body === 'object' && Object.keys(body).length === 0);

@Controller('sessions')
export class SessionsController {
  constructor(@Inject(SessionsService) private readonly sessions: SessionsService) {}

  /** Signs in with credentials; in demo mode, takes none and starts a demo session instead. */
  @Post()
  login(@Body() body: unknown) {
    if (isDemoMode()) return isEmpty(body) ? this.sessions.startDemo() : this.sessions.refuseLogin();

    const credentials = loginBody.safeParse(body);
    if (!credentials.success) throw new BadRequestException(credentials.error.issues.map((issue) => issue.message));
    return this.sessions.login(credentials.data.email, credentials.data.password);
  }

  @Delete(':id')
  @HttpCode(204)
  logout(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.logout(id);
  }
}
