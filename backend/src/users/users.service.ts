import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { count, eq, sql } from 'drizzle-orm';
import { isDemoMode } from '../common/demo-mode.js';
import { buildPage, pageWindow } from '../common/pagination.js';
import type { Db } from '../db/db.js';
import { users } from '../db/schema.js';
import { hashPassword, verifyPassword } from './password.js';
import type { Role } from './roles.js';

type UserRow = typeof users.$inferSelect;

/** A user as clients see it: never the password hash. */
const toPublic = ({ passwordHash: _hash, ...user }: UserRow) => user;

@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: Db) {}

  async list(page: number, role?: Role) {
    const pageSize = 50;
    const { limit, offset } = pageWindow(page, pageSize);
    const where = role ? sql`${role} = any(${users.roles})` : undefined;
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(users).where(where).orderBy(users.lastName, users.firstName, users.id).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    return buildPage(rows.map(toPublic), { total, page, pageSize });
  }

  async create(body: { firstName: string; lastName: string; email: string; password: string; roles: Role[] }) {
    const { password, roles, ...profile } = body;
    const [user] = await this.db
      .insert(users)
      .values({ ...profile, roles: [...new Set(roles)], passwordHash: await hashPassword(password) })
      .returning();
    return toPublic(user);
  }

  async update(id: string, body: Partial<Pick<UserRow, 'firstName' | 'lastName' | 'email'>>) {
    const [user] = await this.db.update(users).set(body).where(eq(users.id, id)).returning();
    if (!user) throw new NotFoundException();
    return toPublic(user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    if (isDemoMode()) throw new ForbiddenException('Password changes are disabled in demo mode');
    const user = await this.find(id);
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new ForbiddenException('Current password is incorrect');
    }
    await this.db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, id));
  }

  /** Shallow merge: keys sent replace those keys, everything else is kept. */
  async mergeSettings(id: string, settings: Record<string, unknown>) {
    const [user] = await this.db
      .update(users)
      .set({ settings: sql`${users.settings} || ${JSON.stringify(settings)}::jsonb` })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new NotFoundException();
    return toPublic(user);
  }

  /** Adding a role the user already has changes nothing. */
  async addRole(id: string, role: Role) {
    const [user] = await this.db
      .update(users)
      .set({ roles: sql`case when ${role} = any(${users.roles}) then ${users.roles} else array_append(${users.roles}, ${role}) end` })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new NotFoundException();
    return toPublic(user);
  }

  /** A user always keeps at least one role. */
  removeRole(id: string, role: Role) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx.select().from(users).where(eq(users.id, id)).for('update');
      if (!user) throw new NotFoundException();
      if (!user.roles.includes(role)) return toPublic(user);
      if (user.roles.length === 1) throw new ConflictException('A user must keep at least one role');
      const [updated] = await tx
        .update(users)
        .set({ roles: user.roles.filter((r) => r !== role) })
        .where(eq(users.id, id))
        .returning();
      return toPublic(updated);
    });
  }

  private async find(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    if (!user) throw new NotFoundException();
    return user;
  }
}
