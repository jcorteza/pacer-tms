import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard } from '../auth/session.guard.js';
import type { Role } from './roles.js';
import {
  addRoleBody,
  changePasswordBody,
  createUserBody,
  listUsersQuery,
  roleParam,
  settingsBody,
  updateUserBody,
} from './users.schemas.js';
import { UsersService } from './users.service.js';

/** Password and settings are personal: nobody changes another user's, whether or not that user exists. */
function ownAccountOnly(id: string, signedInUserId: string) {
  if (id !== signedInUserId) throw new ForbiddenException('You can only change your own account');
}

/** Every route needs a signed-in session; accounts are created by administrators, never publicly. */
@Controller('users')
@UseGuards(SessionGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  @Get()
  list(@Query({ schema: listUsersQuery }) query: { page: number; role?: Role }) {
    return this.users.list(query.page, query.role);
  }

  @Post()
  create(@Body({ schema: createUserBody }) body: Parameters<UsersService['create']>[0]) {
    return this.users.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body({ schema: updateUserBody }) body: Parameters<UsersService['update']>[1]) {
    return this.users.update(id, body);
  }

  @Post(':id/password')
  @HttpCode(204)
  changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: changePasswordBody }) body: { currentPassword: string; newPassword: string },
    @CurrentUser() userId: string,
  ) {
    ownAccountOnly(id, userId);
    return this.users.changePassword(id, body.currentPassword, body.newPassword);
  }

  @Patch(':id/settings')
  settings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body({ schema: settingsBody }) body: Record<string, unknown>,
    @CurrentUser() userId: string,
  ) {
    ownAccountOnly(id, userId);
    return this.users.mergeSettings(id, body);
  }

  @Post(':id/roles')
  addRole(@Param('id', ParseUUIDPipe) id: string, @Body({ schema: addRoleBody }) body: { role: Role }) {
    return this.users.addRole(id, body.role);
  }

  @Delete(':id/roles/:role')
  removeRole(@Param('id', ParseUUIDPipe) id: string, @Param('role', { schema: roleParam }) role: Role) {
    return this.users.removeRole(id, role);
  }
}
