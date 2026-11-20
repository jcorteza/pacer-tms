import { Module } from '@nestjs/common';
import { SessionGuard } from '../auth/session.guard.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({ controllers: [UsersController], providers: [UsersService, SessionGuard] })
export class UsersModule {}
