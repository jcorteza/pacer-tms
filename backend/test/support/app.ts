import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { sessions } from '../../src/db/schema.js';
import { db, createUser } from '../../src/db/test/helpers.js';
import { AppModule } from '../../src/app.module.js';
import type { Role } from '../../src/users/roles.js';
import { configureApp } from '../../src/configure-app.js';

/** The app as main.ts builds it (same pipes and filters), on the test database. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

/** A signed-in user holding a management role, the minimum for listing and managing users. */
export const signedInManager = (roles: Role[] = ['Operations Management']) => signedIn({ roles });

/** A user with a live session, for specs that write. Returns the header to send. */
export async function signedIn(over: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser(over);
  const [session] = await db.insert(sessions).values({ userId: user.id }).returning();
  return { user, session, header: { 'x-session-id': session.id } };
}
