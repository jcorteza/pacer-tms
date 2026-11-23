import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { users } from '../src/db/schema.js';
import { closeDatabase, createUser, db, resetDatabase } from '../src/db/test/helpers.js';
import { hashPassword, verifyPassword } from '../src/users/password.js';
import { createTestApp, signedIn } from './support/app.js';

let app: INestApplication;
const api = () => request(app.getHttpServer());
const stored = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];

const newUser = {
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@larkspur.test',
  password: 'compiler-queen',
  roles: ['Dispatcher'],
};

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
  await closeDatabase();
});
beforeEach(resetDatabase);

describe('POST /users', () => {
  it('creates the user, stores only a hash, and never returns it', async () => {
    const res = await api().post('/users').send(newUser).expect(201);

    expect(res.body).toMatchObject({ firstName: 'Grace', email: 'grace@larkspur.test', roles: ['Dispatcher'] });
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
    expect(await verifyPassword('compiler-queen', (await stored(res.body.id)).passwordHash)).toBe(true);
  });

  it('given a duplicate email, responds 409', async () => {
    await api().post('/users').send(newUser).expect(201);

    await api().post('/users').send(newUser).expect(409);
  });

  it('given an unknown role, responds 400', async () => {
    await api().post('/users').send({ ...newUser, roles: ['Wizard'] }).expect(400);
  });

  it('given no roles, responds 400', async () => {
    await api().post('/users').send({ ...newUser, roles: [] }).expect(400);
  });
});

describe('GET /users', () => {
  it('lists users without their password hashes', async () => {
    const { header } = await signedIn();
    await createUser({ firstName: 'Grace', lastName: 'Hopper' });

    const res = await api().get('/users').set(header).expect(200);

    expect(res.body).toMatchObject({ page: 1, pageSize: 50, total: 2 });
    expect(res.body.data).toHaveLength(2);
    for (const user of res.body.data) {
      expect(user).toMatchObject({ id: expect.any(String), firstName: expect.any(String), email: expect.any(String) });
      expect(user.passwordHash).toBeUndefined();
    }
  });

  it('given ?role=, lists only users holding that role', async () => {
    const { header } = await signedIn({ roles: ['Dispatcher'] });
    const manager = await createUser({ firstName: 'Priya', roles: ['Warehouse Management', 'Warehouse'] });
    await createUser({ roles: ['Warehouse'] });

    const res = await api().get('/users').query({ role: 'Warehouse Management' }).set(header).expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.data.map((u: { id: string }) => u.id)).toEqual([manager.id]);
  });

  it('given an unknown role, responds 400', async () => {
    const { header } = await signedIn();

    await api().get('/users').query({ role: 'Wizard' }).set(header).expect(400);
  });

  it('given no session, responds 401', async () => {
    await api().get('/users').expect(401);
  });
});

describe('PATCH /users/:id', () => {
  it('updates profile fields', async () => {
    const user = await createUser();

    const res = await api().patch(`/users/${user.id}`).send({ firstName: 'Renamed' }).expect(200);

    expect(res.body.firstName).toBe('Renamed');
  });

  it('given a password in the body, ignores it (use the password endpoint)', async () => {
    const user = await createUser({ passwordHash: await hashPassword('old-pass') });

    await api().patch(`/users/${user.id}`).send({ password: 'sneaky' }).expect(400);

    expect(await verifyPassword('old-pass', (await stored(user.id)).passwordHash)).toBe(true);
  });

  it('given an unknown user, responds 404', async () => {
    await api().patch('/users/6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11').send({ firstName: 'x' }).expect(404);
  });
});

describe('POST /users/:id/password', () => {
  it('given the current password, changes it', async () => {
    const user = await createUser({ passwordHash: await hashPassword('old-pass') });

    await api().post(`/users/${user.id}/password`).send({ currentPassword: 'old-pass', newPassword: 'new-pass-1' }).expect(204);

    expect(await verifyPassword('new-pass-1', (await stored(user.id)).passwordHash)).toBe(true);
  });

  it('given the wrong current password, responds 403 and changes nothing', async () => {
    const user = await createUser({ passwordHash: await hashPassword('old-pass') });

    await api().post(`/users/${user.id}/password`).send({ currentPassword: 'guess', newPassword: 'new-pass-1' }).expect(403);

    expect(await verifyPassword('old-pass', (await stored(user.id)).passwordHash)).toBe(true);
  });
});

describe('POST /users/:id/password in demo mode', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('responds 403 and changes nothing, even with the right current password', async () => {
    const user = await createUser({ passwordHash: await hashPassword('old-pass') });

    await api().post(`/users/${user.id}/password`).send({ currentPassword: 'old-pass', newPassword: 'new-pass-1' }).expect(403);

    expect(await verifyPassword('old-pass', (await stored(user.id)).passwordHash)).toBe(true);
  });
});

describe('PATCH /users/:id/settings', () => {
  it('merges the given keys into the existing settings', async () => {
    const user = await createUser({ settings: { theme: 'dark', timezone: 'UTC' } });

    const res = await api().patch(`/users/${user.id}/settings`).send({ timezone: 'America/Los_Angeles' }).expect(200);

    expect(res.body.settings).toEqual({ theme: 'dark', timezone: 'America/Los_Angeles' });
  });
});

describe('roles', () => {
  it('POST /users/:id/roles adds a role', async () => {
    const user = await createUser({ roles: ['Warehouse'] });

    const res = await api().post(`/users/${user.id}/roles`).send({ role: 'Dispatcher' }).expect(201);

    expect(res.body.roles).toEqual(['Warehouse', 'Dispatcher']);
  });

  it('POST /users/:id/roles given a role they already have, adds nothing twice', async () => {
    const user = await createUser({ roles: ['Warehouse'] });

    const res = await api().post(`/users/${user.id}/roles`).send({ role: 'Warehouse' }).expect(201);

    expect(res.body.roles).toEqual(['Warehouse']);
  });

  it('POST /users/:id/roles given an unknown role, responds 400', async () => {
    const user = await createUser();

    await api().post(`/users/${user.id}/roles`).send({ role: 'Wizard' }).expect(400);
  });

  it('DELETE /users/:id/roles/:role removes a role', async () => {
    const user = await createUser({ roles: ['Warehouse', 'Dispatcher'] });

    const res = await api().delete(`/users/${user.id}/roles/Dispatcher`).expect(200);

    expect(res.body.roles).toEqual(['Warehouse']);
  });

  it('DELETE /users/:id/roles/:role given their only role, responds 409', async () => {
    const user = await createUser({ roles: ['Warehouse'] });

    await api().delete(`/users/${user.id}/roles/Warehouse`).expect(409);

    expect((await stored(user.id)).roles).toEqual(['Warehouse']);
  });
});
