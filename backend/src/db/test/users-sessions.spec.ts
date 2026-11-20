import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Role } from '../../users/roles.js';
import { sessions, users } from '../schema.js';
import { closeDatabase, createUser, db, expectPgError, resetDatabase } from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('users', () => {
  it('given an existing email, when another user signs up with it, then it is rejected', async () => {
    await createUser({ email: 'ada@larkspur.test' });
    await expectPgError(createUser({ email: 'ada@larkspur.test' }), '23505');
  });

  it('given an empty roles list, when a user is saved, then it is rejected', async () => {
    await expectPgError(createUser({ roles: [] }), '23514');
  });

  it('given no roles at all, when a user is saved, then it is rejected', async () => {
    await expectPgError(
      db
        .insert(users)
        .values({ firstName: 'A', lastName: 'B', email: 'x@y.test', passwordHash: 'h' } as never),
      '23502',
    );
  });

  it('given several roles, when a user is saved, then they round-trip as a list', async () => {
    const roles: Role[] = ['Dispatcher', 'Operations Management'];
    const user = await createUser({ roles });
    expect(user.roles).toEqual(roles);
  });

  it('given no settings, when a user is saved, then settings defaults to {}', async () => {
    expect((await createUser()).settings).toEqual({});
  });

  it('given a user without a password hash, when saved, then it is rejected', async () => {
    await expectPgError(
      db
        .insert(users)
        .values({ firstName: 'A', lastName: 'B', email: 'x@y.test', roles: ['Warehouse'] } as never),
      '23502',
    );
  });
});

describe('sessions', () => {
  it('given an anonymous visitor, when a session is created, then user_id is null and it expires in ~12 hours', async () => {
    const [session] = await db.insert(sessions).values({}).returning();
    expect(session.userId).toBeNull();
    const hours = (session.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThan(12.1);
  });

  it('given a user that does not exist, when a session references it, then it is rejected', async () => {
    await expectPgError(
      db.insert(sessions).values({ userId: '00000000-0000-0000-0000-000000000000' }),
      '23503',
    );
  });

  it('given a logged-in session, when its user is deleted, then the session is removed too', async () => {
    const user = await createUser();
    const [session] = await db.insert(sessions).values({ userId: user.id }).returning();
    await db.delete(users).where(eq(users.id, user.id));
    expect(await db.select().from(sessions).where(eq(sessions.id, session.id))).toHaveLength(0);
  });
});
