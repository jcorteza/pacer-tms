import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { sessions, users } from '../src/db/schema.js';
import { closeDatabase, db, resetDatabase } from '../src/db/test/helpers.js';
import { hashPassword } from '../src/users/password.js';
import { ROLES } from '../src/users/roles.js';
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
    expect(res.body.isDemoUser).toBe(false);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(twelveHours - 60_000);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(twelveHours);
  });

  it('also returns the signed-in user, without their password hash', async () => {
    const user = await createUser({
      firstName: 'Dana',
      lastName: 'Whitfield',
      email: 'dana@larkspurfreight.test',
      roles: ['Dispatcher'],
      passwordHash: await hashPassword('s3cret-pass'),
    });

    const res = await api().post('/sessions').send({ email: 'dana@larkspurfreight.test', password: 's3cret-pass' }).expect(201);

    expect(res.body.user).toEqual({
      id: user.id,
      firstName: 'Dana',
      lastName: 'Whitfield',
      email: 'dana@larkspurfreight.test',
      roles: ['Dispatcher'],
    });
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

  it('given no credentials outside demo mode, responds 400 and creates no session', async () => {
    await api().post('/sessions').expect(400);

    expect(await db.select().from(sessions)).toHaveLength(0);
  });
});

describe('POST /sessions in demo mode', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('given no credentials, starts a 12 hour demo session for a Demo User holding every role', async () => {
    const res = await api().post('/sessions').expect(201);

    const twelveHours = 12 * 60 * 60 * 1000;
    expect(res.body.isDemoUser).toBe(true);
    expect(res.body.userId).toBe(res.body.user.id);
    expect(res.body.user).toMatchObject({ firstName: 'Demo', lastName: 'User' });
    expect(res.body.user.roles).toHaveLength(ROLES.length);
    expect(res.body.user.roles).toEqual(expect.arrayContaining([...ROLES]));
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(twelveHours - 60_000);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(twelveHours);
  });

  it('stores the session as a demo session', async () => {
    const res = await api().post('/sessions').expect(201);

    const [stored] = await db.select().from(sessions).where(eq(sessions.id, res.body.id));
    expect(stored).toMatchObject({ userId: res.body.user.id, isDemoUser: true });
  });

  it('gives every session its own user', async () => {
    const first = await api().post('/sessions').expect(201);
    const second = await api().post('/sessions').expect(201);

    expect(second.body.user.id).not.toBe(first.body.user.id);
    expect(await db.select().from(users)).toHaveLength(2);
  });

  it('lets the demo session write, like any signed-in user', async () => {
    const { body: session } = await api().post('/sessions').expect(201);

    await api()
      .post('/clients')
      .set({ 'x-session-id': session.id })
      .send({
        name: 'Demo client',
        billingAddress: '1 Billing St',
        billingContact: { name: 'Bill', email: 'bill@c.test', phone: '555-0100' },
        shippingContact: { name: 'Ship', email: 'ship@c.test', phone: '555-0101' },
      })
      .expect(201);
  });

  it('lets the demo user manage users too, since it holds the management roles', async () => {
    const { body: session } = await api().post('/sessions').expect(201);

    await api()
      .post('/users')
      .set({ 'x-session-id': session.id })
      .send({ firstName: 'Grace', lastName: 'Hopper', email: 'grace@larkspur.test', password: 'compiler-queen', roles: ['Dispatcher'] })
      .expect(201);
  });

  it('given a real account\'s valid credentials, responds 403 and starts no session (login is disabled)', async () => {
    await createUser({ email: 'ada@larkspur.test', passwordHash: await hashPassword('s3cret-pass') });

    await api().post('/sessions').send({ email: 'ada@larkspur.test', password: 's3cret-pass' }).expect(403);

    expect(await db.select().from(sessions)).toHaveLength(0);
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
});
