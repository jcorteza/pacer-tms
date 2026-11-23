import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { closeDatabase, resetDatabase } from '../src/db/test/helpers.js';
import { apiClient, createTestApp, signedIn } from './support/app.js';

let app: INestApplication;
const withoutKey = () => request(app.getHttpServer());

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
  await closeDatabase();
});
beforeEach(resetDatabase);

type Route = { method: 'get' | 'post' | 'patch' | 'delete'; path: string };

/** Every route Nest registered, read from Express so a new controller is covered without editing this spec. */
function registeredRoutes(): Route[] {
  const { router } = app.getHttpAdapter().getInstance() as {
    router: { stack: { route?: { path: string; methods: Record<string, boolean> } }[] };
  };
  return router.stack.flatMap(({ route }) =>
    route ? Object.keys(route.methods).map((method) => ({ method, path: route.path }) as Route) : [],
  );
}

/** The guard answers before any pipe sees the params, so any placeholder will do. */
const withParams = (path: string) => path.replace(/:\w+/g, '1');

describe('API key', () => {
  it('given no key, every route responds 401', async () => {
    const routes = registeredRoutes();
    expect(routes.length).toBeGreaterThan(0);

    const results = await Promise.all(
      routes.map(async ({ method, path }) => ({
        route: `${method.toUpperCase()} ${path}`,
        status: (await withoutKey()[method](withParams(path))).status,
      })),
    );

    expect(results.filter(({ status }) => status !== 401)).toEqual([]);
  });

  it('covers the unauthenticated routes too: the ping healthcheck and login', async () => {
    await withoutKey().get('/ping').expect(401);
    await withoutKey().post('/sessions').send({ email: 'ada@larkspur.test', password: 'whatever' }).expect(401);
  });

  it('given a wrong key, responds 401', async () => {
    await withoutKey().get('/ping').set('x-api-key', 'not-the-key').expect(401);
  });

  it('given a valid session but no key, responds 401', async () => {
    const { header } = await signedIn();

    await withoutKey().get('/clients').set(header).expect(401);
  });

  it('given the key but no session, a session-protected route still responds 401', async () => {
    const res = await apiClient(app).get('/clients').expect(401);

    expect(res.body.message).toBe('Missing or invalid session');
  });

  it('given the key and a valid session, lets the request through', async () => {
    const { header } = await signedIn();

    await apiClient(app).get('/clients').set(header).expect(200);
  });
});
