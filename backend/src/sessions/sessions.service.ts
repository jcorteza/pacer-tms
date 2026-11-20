import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/db.js';
import { sessions, users } from '../db/schema.js';
import { verifyPassword } from '../users/password.js';

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
    return session;
  }

  /** Logging out removes the row outright (sessions are the one hard delete). */
  async logout(id: string) {
    const removed = await this.db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
    if (removed.length === 0) throw new NotFoundException();
  }
}
