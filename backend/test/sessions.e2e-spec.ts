import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { sessions } from '../src/db/schema.js';
import { closeDatabase, db, resetDatabase } from '../src/db/test/helpers.js';
import { hashPassword } from '../src/users/password.js';
import { createTestApp, signedIn } from './support/app.js';
import { createUser } from '../src/db/test/helpers.js';

let app: INestApplication;
const api = () => request(app.getHttpServer());

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
  await closeDatabase();
});
beforeEach(resetDatabase);

describe('POST /sessions', () => {
  it('given the right credentials, starts a session that lasts 12 hours', async () => {
    const user = await createUser({ email: 'ada@larkspur.test', passwordHash: await hashPassword('s3cret-pass') });

    const res = await api().post('/sessions').send({ email: 'ada@larkspur.test', password: 's3cret-pass' }).expect(201);

    const twelveHours = 12 * 60 * 60 * 1000;
    expect(res.body.userId).toBe(user.id);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(twelveHours - 60_000);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(twelveHours);
  });

  it('given the wrong password, responds 401 and creates no session', async () => {
    await createUser({ email: 'ada@larkspur.test', passwordHash: await hashPassword('s3cret-pass') });

    await api().post('/sessions').send({ email: 'ada@larkspur.test', password: 'wrong' }).expect(401);

    expect(await db.select().from(sessions)).toHaveLength(0);
  });

  it('given an unknown email, responds 401', async () => {
    await api().post('/sessions').send({ email: 'nobody@larkspur.test', password: 'whatever' }).expect(401);
  });

  it('given a malformed body, responds 400', async () => {
    await api().post('/sessions').send({ email: 'not-an-email' }).expect(400);
  });
});

describe('DELETE /sessions/:id', () => {
  it('removes the session, so its header stops working', async () => {
    const { session, header } = await signedIn();

    await api().delete(`/sessions/${session.id}`).expect(204);

    expect(await db.select().from(sessions).where(eq(sessions.id, session.id))).toHaveLength(0);
    await api().post('/clients').set(header).send({}).expect(401);
  });

  it('given an unknown session, responds 404', async () => {
    await api().delete('/sessions/6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11').expect(404);
  });
});

describe('session on writes', () => {
  it('given an expired session, responds 401', async () => {
    const { session, header } = await signedIn();
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, session.id));

    await api().post('/clients').set(header).send({}).expect(401);
  });

  it('given an anonymous session (no user), responds 401', async () => {
    const [anonymous] = await db.insert(sessions).values({}).returning();

    await api().post('/clients').set({ 'x-session-id': anonymous.id }).send({}).expect(401);
  });
});
