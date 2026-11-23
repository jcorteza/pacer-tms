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

describe('without a session', () => {
  const someId = '6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11';

  it.each([
    ['get', '/users'],
    ['post', '/users'],
    ['patch', `/users/${someId}`],
    ['post', `/users/${someId}/password`],
    ['patch', `/users/${someId}/settings`],
    ['post', `/users/${someId}/roles`],
    ['delete', `/users/${someId}/roles/Dispatcher`],
  ] as const)('%s %s responds 401', async (method, path) => {
    await api()[method](path).send({}).expect(401);
  });

  it('creates no user', async () => {
    await api().post('/users').send(newUser).expect(401);

    expect(await db.select().from(users)).toHaveLength(0);
  });

  it('changes nothing on an existing user', async () => {
    const user = await createUser({ firstName: 'Ada', roles: ['Warehouse'], passwordHash: await hashPassword('old-pass') });

    await api().patch(`/users/${user.id}`).send({ firstName: 'Renamed' }).expect(401);
    await api().post(`/users/${user.id}/password`).send({ currentPassword: 'old-pass', newPassword: 'new-pass-1' }).expect(401);
    await api().patch(`/users/${user.id}/settings`).send({ theme: 'dark' }).expect(401);
    await api().post(`/users/${user.id}/roles`).send({ role: 'Dispatcher' }).expect(401);

    const after = await stored(user.id);
    expect(after).toMatchObject({ firstName: 'Ada', roles: ['Warehouse'], settings: {} });
    expect(await verifyPassword('old-pass', after.passwordHash)).toBe(true);
  });
});

describe('POST /users', () => {
  it('creates the user, stores only a hash, and never returns it', async () => {
    const { header } = await signedIn();

    const res = await api().post('/users').set(header).send(newUser).expect(201);

    expect(res.body).toMatchObject({ firstName: 'Grace', email: 'grace@larkspur.test', roles: ['Dispatcher'] });
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
    expect(await verifyPassword('compiler-queen', (await stored(res.body.id)).passwordHash)).toBe(true);
  });

  it('given a duplicate email, responds 409', async () => {
    const { header } = await signedIn();
    await api().post('/users').set(header).send(newUser).expect(201);

    await api().post('/users').set(header).send(newUser).expect(409);
  });

  it('given an unknown role, responds 400', async () => {
    const { header } = await signedIn();

    await api().post('/users').set(header).send({ ...newUser, roles: ['Wizard'] }).expect(400);
  });

  it('given no roles, responds 400', async () => {
    const { header } = await signedIn();

    await api().post('/users').set(header).send({ ...newUser, roles: [] }).expect(400);
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
});

describe('PATCH /users/:id', () => {
  it('updates profile fields', async () => {
    const { header } = await signedIn();
    const user = await createUser();

    const res = await api().patch(`/users/${user.id}`).set(header).send({ firstName: 'Renamed' }).expect(200);

    expect(res.body.firstName).toBe('Renamed');
  });

  it('given a password in the body, rejects it (use the password endpoint)', async () => {
    const { header } = await signedIn();
    const user = await createUser({ passwordHash: await hashPassword('old-pass') });

    await api().patch(`/users/${user.id}`).set(header).send({ password: 'sneaky' }).expect(400);

    expect(await verifyPassword('old-pass', (await stored(user.id)).passwordHash)).toBe(true);
  });

  it('given an unknown user, responds 404', async () => {
    const { header } = await signedIn();

    await api().patch('/users/6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11').set(header).send({ firstName: 'x' }).expect(404);
  });
});

describe('POST /users/:id/password', () => {
  it('given the current password, changes the signed-in user\'s own password', async () => {
    const { user, header } = await signedIn({ passwordHash: await hashPassword('old-pass') });

    await api().post(`/users/${user.id}/password`).set(header).send({ currentPassword: 'old-pass', newPassword: 'new-pass-1' }).expect(204);

    expect(await verifyPassword('new-pass-1', (await stored(user.id)).passwordHash)).toBe(true);
  });

  it('given the wrong current password, responds 403 and changes nothing', async () => {
    const { user, header } = await signedIn({ passwordHash: await hashPassword('old-pass') });

    await api().post(`/users/${user.id}/password`).set(header).send({ currentPassword: 'guess', newPassword: 'new-pass-1' }).expect(403);

    expect(await verifyPassword('old-pass', (await stored(user.id)).passwordHash)).toBe(true);
  });

  it('given another user\'s id, responds 403 and changes nothing, even with their current password', async () => {
    const { header } = await signedIn();
    const other = await createUser({ passwordHash: await hashPassword('their-pass') });

    await api().post(`/users/${other.id}/password`).set(header).send({ currentPassword: 'their-pass', newPassword: 'new-pass-1' }).expect(403);

    expect(await verifyPassword('their-pass', (await stored(other.id)).passwordHash)).toBe(true);
  });

  it('given an id that matches no user, responds 403 like any other id that is not the caller\'s', async () => {
    const { header } = await signedIn();

    await api()
      .post('/users/6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11/password')
      .set(header)
      .send({ currentPassword: 'x', newPassword: 'new-pass-1' })
      .expect(403);
  });
});

describe('POST /users/:id/password in demo mode', () => {
  beforeEach(() => {
    vi.stubEnv('DEMO_MODE', 'true');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('responds 403 and changes nothing, even for the caller\'s own account with the right current password', async () => {
    const { user, header } = await signedIn({ passwordHash: await hashPassword('old-pass') });

    await api().post(`/users/${user.id}/password`).set(header).send({ currentPassword: 'old-pass', newPassword: 'new-pass-1' }).expect(403);

    expect(await verifyPassword('old-pass', (await stored(user.id)).passwordHash)).toBe(true);
  });
});

describe('PATCH /users/:id/settings', () => {
  it('merges the given keys into the signed-in user\'s own settings', async () => {
    const { user, header } = await signedIn({ settings: { theme: 'dark', timezone: 'UTC' } });

    const res = await api().patch(`/users/${user.id}/settings`).set(header).send({ timezone: 'America/Los_Angeles' }).expect(200);

    expect(res.body.settings).toEqual({ theme: 'dark', timezone: 'America/Los_Angeles' });
  });

  it('given another user\'s id, responds 403 and changes nothing', async () => {
    const { header } = await signedIn();
    const other = await createUser({ settings: { theme: 'dark' } });

    await api().patch(`/users/${other.id}/settings`).set(header).send({ theme: 'light' }).expect(403);

    expect((await stored(other.id)).settings).toEqual({ theme: 'dark' });
  });
});

describe('roles', () => {
  it('POST /users/:id/roles adds a role', async () => {
    const { header } = await signedIn();
    const user = await createUser({ roles: ['Warehouse'] });

    const res = await api().post(`/users/${user.id}/roles`).set(header).send({ role: 'Dispatcher' }).expect(201);

    expect(res.body.roles).toEqual(['Warehouse', 'Dispatcher']);
  });

  it('POST /users/:id/roles given a role they already have, adds nothing twice', async () => {
    const { header } = await signedIn();
    const user = await createUser({ roles: ['Warehouse'] });

    const res = await api().post(`/users/${user.id}/roles`).set(header).send({ role: 'Warehouse' }).expect(201);

    expect(res.body.roles).toEqual(['Warehouse']);
  });

  it('POST /users/:id/roles given an unknown role, responds 400', async () => {
    const { header } = await signedIn();
    const user = await createUser();

    await api().post(`/users/${user.id}/roles`).set(header).send({ role: 'Wizard' }).expect(400);
  });

  it('DELETE /users/:id/roles/:role removes a role', async () => {
    const { header } = await signedIn();
    const user = await createUser({ roles: ['Warehouse', 'Dispatcher'] });

    const res = await api().delete(`/users/${user.id}/roles/Dispatcher`).set(header).expect(200);

    expect(res.body.roles).toEqual(['Warehouse']);
  });

  it('DELETE /users/:id/roles/:role given their only role, responds 409', async () => {
    const { header } = await signedIn();
    const user = await createUser({ roles: ['Warehouse'] });

    await api().delete(`/users/${user.id}/roles/Warehouse`).set(header).expect(409);

    expect((await stored(user.id)).roles).toEqual(['Warehouse']);
  });
});
