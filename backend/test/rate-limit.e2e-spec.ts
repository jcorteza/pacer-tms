import type { INestApplication } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ModulesContainer } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { sessions } from '../src/db/schema.js';
import { closeDatabase, createUser, db, resetDatabase } from '../src/db/test/helpers.js';
import { hashPassword } from '../src/users/password.js';
import { apiClient, createTestApp, signedIn } from './support/app.js';

/** The limits the app ships with. Every other e2e spec runs with the default raised (see use-test-database.ts). */
const WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_LIMIT = 150;
const LOGIN_ATTEMPTS = 5;
const PASSWORD_ATTEMPTS = 3;
/** The compose healthcheck calls /ping every 5 seconds, so 60 in 5 minutes, plus a little headroom. */
const PING_LIMIT = 75;
const BLOCK_MS = WINDOW_MS;

let app: INestApplication;
const api = () => apiClient(app);

// Each test gets a fresh app, so no counter carries over from the one before.
beforeEach(async () => {
  vi.stubEnv('RATE_LIMIT_DEFAULT', undefined);
  await resetDatabase();
  app = await createTestApp();
});
afterEach(async () => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  await app.close();
});
afterAll(closeDatabase);

/** Sends the request `times` times in a row and returns each response status. */
async function statuses(times: number, send: () => PromiseLike<{ status: number }>) {
  const results: number[] = [];
  for (let n = 0; n < times; n++) results.push((await send()).status);
  return results;
}

const allOk = (times: number) => Array<number>(times).fill(200);

describe('the default limit', () => {
  it(`lets a user make ${DEFAULT_LIMIT} requests to a route in 5 minutes, then responds 429 with Retry-After`, async () => {
    const { header } = await signedIn();
    const list = () => api().get('/clients').set(header);

    expect(await statuses(DEFAULT_LIMIT, list)).toEqual(allOk(DEFAULT_LIMIT));

    const res = await list();
    expect(res.status).toBe(429);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('counts each route separately, so one busy route does not block the others', async () => {
    const { header } = await signedIn();
    await statuses(DEFAULT_LIMIT + 1, () => api().get('/clients').set(header));

    await api().get('/clients').set(header).expect(429);
    await api().get('/carriers').set(header).expect(200);
    await api().get('/clients/6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11').set(header).expect(404);
  });

  it('counts each user separately', async () => {
    const busy = await signedIn();
    const other = await signedIn();
    await statuses(DEFAULT_LIMIT + 1, () => api().get('/clients').set(busy.header));

    await api().get('/clients').set(busy.header).expect(429);
    await api().get('/clients').set(other.header).expect(200);
  });

  it('counts a user once however many sessions they hold', async () => {
    const { user, header } = await signedIn();
    const [second] = await db.insert(sessions).values({ userId: user.id }).returning();
    await statuses(DEFAULT_LIMIT, () => api().get('/clients').set(header));

    await api().get('/clients').set({ 'x-session-id': second.id }).expect(429);
  });

  it('counts a request again once the 5 minutes have passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { header } = await signedIn();
    await statuses(DEFAULT_LIMIT + 1, () => api().get('/clients').set(header));
    await api().get('/clients').set(header).expect(429);

    vi.advanceTimersByTime(WINDOW_MS + 1_000);

    await api().get('/clients').set(header).expect(200);
  });

  it('answers 401, never 429, to a request without a valid session, however many it sends', async () => {
    const unknownSession = { 'x-session-id': '6f1c2f0e-8f3b-4d57-9a38-3f1d2f9a0c11' };

    const results = await statuses(DEFAULT_LIMIT + 5, () => api().get('/clients').set(unknownSession));

    expect(new Set(results)).toEqual(new Set([401]));
  });
});

describe('login', () => {
  const email = 'ada@larkspur.test';
  const login = (password: string, as = email) => api().post('/sessions').send({ email: as, password });

  beforeEach(async () => {
    await createUser({ email, passwordHash: await hashPassword('s3cret-pass') });
  });

  it(`allows ${LOGIN_ATTEMPTS} attempts, then blocks that email, even for the right password`, async () => {
    expect(await statuses(LOGIN_ATTEMPTS, () => login('wrong'))).toEqual(Array(LOGIN_ATTEMPTS).fill(401));

    const blocked = await login('wrong');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    await login('s3cret-pass').expect(429);
  });

  it('keeps blocking for 5 minutes, then lets the user sign in again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    await statuses(LOGIN_ATTEMPTS + 1, () => login('wrong'));

    vi.advanceTimersByTime(BLOCK_MS - 1_000);
    await login('s3cret-pass').expect(429);

    vi.advanceTimersByTime(2_000);
    await login('s3cret-pass').expect(201);
  });

  it('does not block other emails, and ignores letter case in the blocked one', async () => {
    await createUser({ email: 'grace@larkspur.test', passwordHash: await hashPassword('compiler-queen') });
    await statuses(LOGIN_ATTEMPTS + 1, () => login('wrong'));

    await login('compiler-queen', 'grace@larkspur.test').expect(201);
    await login('s3cret-pass', 'ADA@larkspur.test').expect(429);
  });

  it('in demo mode, which takes no credentials, only holds sign-ins to the default limit', async () => {
    vi.stubEnv('DEMO_MODE', 'true');

    const results = await statuses(LOGIN_ATTEMPTS + 1, () => api().post('/sessions'));

    expect(new Set(results)).toEqual(new Set([201]));
  });

  it('counts successful sign-ins too', async () => {
    expect(await statuses(LOGIN_ATTEMPTS, () => login('s3cret-pass'))).toEqual(Array(LOGIN_ATTEMPTS).fill(201));

    await login('s3cret-pass').expect(429);
  });
});

describe('POST /users/:id/password', () => {
  const change = (userId: string, header: Record<string, string>, currentPassword: string) =>
    api().post(`/users/${userId}/password`).set(header).send({ currentPassword, newPassword: 'new-pass-1' });

  it(`allows ${PASSWORD_ATTEMPTS} attempts, then blocks that user for 5 minutes, even for the right password`, async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { user, header } = await signedIn({ passwordHash: await hashPassword('old-pass') });

    expect(await statuses(PASSWORD_ATTEMPTS, () => change(user.id, header, 'guess'))).toEqual(
      Array(PASSWORD_ATTEMPTS).fill(403),
    );
    await change(user.id, header, 'old-pass').expect(429);

    vi.advanceTimersByTime(BLOCK_MS + 1_000);
    await change(user.id, header, 'old-pass').expect(204);
  });

  it('does not block other users', async () => {
    const blocked = await signedIn({ passwordHash: await hashPassword('old-pass') });
    const other = await signedIn({ passwordHash: await hashPassword('their-pass') });
    await statuses(PASSWORD_ATTEMPTS + 1, () => change(blocked.user.id, blocked.header, 'guess'));

    await change(other.user.id, other.header, 'their-pass').expect(204);
  });
});

describe('GET /ping', () => {
  const ping = () => api().get('/ping');

  it(`allows ${PING_LIMIT} in 5 minutes (the compose healthcheck needs 60), then responds 429`, async () => {
    expect(await statuses(PING_LIMIT, ping)).toEqual(allOk(PING_LIMIT));

    await ping().expect(429);
  });

  it('answers 401, never 429, to a wrong API key', async () => {
    const results = await statuses(PING_LIMIT + 5, () =>
      request(app.getHttpServer()).get('/ping').set('x-api-key', 'wrong'),
    );

    expect(new Set(results)).toEqual(new Set([401]));
  });
});

describe('every resource', () => {
  it.each(['clients', 'carriers', 'orders', 'shipments', 'items', 'warehouse-codes', 'status-change-log'])(
    'has its own counter: %s',
    async (path) => {
      const { header } = await signedIn();
      await statuses(DEFAULT_LIMIT + 1, () => api().get(`/${path}`).set(header));

      await api().get(`/${path}`).set(header).expect(429);
      await api().get('/invoices').set(header).expect(200);
    },
  );
});

describe('every controller', () => {
  it('is behind the throttler, so a new controller cannot forget it', () => {
    const modules = app.get(ModulesContainer);
    const controllers = [...modules.values()].flatMap((module) => [...module.controllers.values()]);
    expect(controllers.length).toBeGreaterThan(0);

    const unthrottled = controllers
      .filter(({ metatype }) => !(Reflect.getMetadata(GUARDS_METADATA, metatype!) ?? []).includes(ThrottlerGuard))
      .map(({ name }) => name);

    expect(unthrottled).toEqual([]);
  });
});
