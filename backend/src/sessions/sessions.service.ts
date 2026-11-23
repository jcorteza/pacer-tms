import { randomUUID } from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/db.js';
import { sessions, users } from '../db/schema.js';
import { hashPassword, verifyPassword } from '../users/password.js';
import { ROLES } from '../users/roles.js';

type SessionRow = typeof sessions.$inferSelect;
type UserRow = typeof users.$inferSelect;

/** A session as clients see it: the row plus its user, never the password hash. */
const withUser = (session: SessionRow, { id, firstName, lastName, email, roles }: UserRow) => ({
  ...session,
  user: { id, firstName, lastName, email, roles },
});

@Injectable()
export class SessionsService {
  constructor(@InjectDrizzle() private readonly db: Db) {}

  /** Same 401 for an unknown email and a wrong password, so neither reveals which accounts exist. */
  async login(email: string, password: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const [session] = await this.db.insert(sessions).values({ userId: user.id }).returning();
    return withUser(session, user);
  }

  /** Demo mode: no credentials. Each visit gets its own Demo User holding every role, so it can edit every page. */
  async startDemo() {
    const passwordHash = await hashPassword(randomUUID()); // nobody knows it, so the account can't be logged into
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          firstName: 'Demo',
          lastName: 'User',
          email: `demo-${randomUUID()}@larkspurfreight.test`,
          passwordHash,
          roles: [...ROLES],
        })
        .returning();
      const [session] = await tx.insert(sessions).values({ userId: user.id, isDemoUser: true }).returning();
      return withUser(session, user);
    });
  }

  /** Demo mode has no accounts to sign in to, so credentials are refused rather than checked. */
  refuseLogin(): never {
    throw new ForbiddenException('Login is disabled in demo mode');
  }

  /** Logging out removes the row outright (sessions are the one hard delete). */
  async logout(id: string) {
    const removed = await this.db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
    if (removed.length === 0) throw new NotFoundException();
  }
}
