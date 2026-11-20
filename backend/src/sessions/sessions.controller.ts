import { Body, Controller, Delete, HttpCode, Inject, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { SessionsService } from './sessions.service.js';

const loginBody = z.strictObject({ email: z.email(), password: z.string().min(1) });

@Controller('sessions')
export class SessionsController {
  constructor(@Inject(SessionsService) private readonly sessions: SessionsService) {}

  @Post()
  login(@Body({ schema: loginBody }) body: { email: string; password: string }) {
    return this.sessions.login(body.email, body.password);
  }

  @Delete(':id')
  @HttpCode(204)
  logout(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessions.logout(id);
  }
}
