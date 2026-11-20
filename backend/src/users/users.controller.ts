import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
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

@Controller('users')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}

  /** Guarded: the list shows every user's email, unlike creating the first account. */
  @Get()
  @UseGuards(SessionGuard)
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
  ) {
    return this.users.changePassword(id, body.currentPassword, body.newPassword);
  }

  @Patch(':id/settings')
  settings(@Param('id', ParseUUIDPipe) id: string, @Body({ schema: settingsBody }) body: Record<string, unknown>) {
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
