import type { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { statusChangeLog } from '../src/db/schema.js';
import { closeDatabase, db, resetDatabase } from '../src/db/test/helpers.js';
import { createTestApp, signedIn } from './support/app.js';
import { resources, type Resource } from './support/resources.js';

let app: INestApplication;
let header: Record<string, string>;
let actorId: string;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
  await closeDatabase();
});
beforeEach(async () => {
  await resetDatabase();
  const { user, header: h } = await signedIn();
  actorId = user.id;
  header = h;
});

const api = () => request(app.getHttpServer());

/** POSTs one row as the signed-in user and returns its body. */
async function create(resource: Resource, body: Record<string, unknown>) {
  const res = await api().post(`/${resource.path}`).set(header).send(body).expect(201);
  return res.body as { id: number | string } & Record<string, unknown>;
}

describe.each(resources)('/$path', (resource) => {
  describe('POST', () => {
    it('given a valid body, creates the row and returns it with its id', async () => {
      const body = (await resource.setup())(1);

      const created = await create(resource, body);

      expect(created.id).toBeDefined();
      expect(created).toMatchObject(body);
    });

    it('given an invalid body, responds 400', async () => {
      await resource.setup();

      await api().post(`/${resource.path}`).set(header).send({}).expect(400);
    });

    it('given no session, responds 401', async () => {
      const body = (await resource.setup())(1);

      await api().post(`/${resource.path}`).send(body).expect(401);
    });
  });

  describe('GET /:id', () => {
    it('given an existing row, returns it', async () => {
      const created = await create(resource, (await resource.setup())(1));

      const res = await api().get(`/${resource.path}/${created.id}`).set(header).expect(200);

      expect(res.body).toMatchObject(created);
    });

    it('given an unknown id, responds 404', async () => {
      const created = await create(resource, (await resource.setup())(1));
      const unknownId = typeof created.id === 'number' ? 999_999 : randomUUID();

      await api().get(`/${resource.path}/${unknownId}`).set(header).expect(404);
    });

    it('given no session, responds 401', async () => {
      const created = await create(resource, (await resource.setup())(1));

      await api().get(`/${resource.path}/${created.id}`).expect(401);
    });

    it('given a malformed id, responds 400', async () => {
      await api().get(`/${resource.path}/not-an-id`).set(header).expect(400);
    });
  });

  describe('PATCH /:id', () => {
    it('given a partial update, changes only those fields', async () => {
      const created = await create(resource, (await resource.setup())(1));

      const res = await api().patch(`/${resource.path}/${created.id}`).set(header).send(resource.patch).expect(200);

      expect(res.body).toMatchObject({ ...created, ...resource.patch });
    });

    it('given an unknown id, responds 404', async () => {
      const created = await create(resource, (await resource.setup())(1));
      const unknownId = typeof created.id === 'number' ? 999_999 : randomUUID();

      await api().patch(`/${resource.path}/${unknownId}`).set(header).send(resource.patch).expect(404);
    });

    it('given no session, responds 401', async () => {
      const created = await create(resource, (await resource.setup())(1));

      await api().patch(`/${resource.path}/${created.id}`).send(resource.patch).expect(401);
    });
  });

  describe('GET (list)', () => {
    it(`pages ${resource.pageSize} rows at a time, with the total`, async () => {
      const body = await resource.setup();
      for (let n = 1; n <= resource.pageSize + 1; n++) await create(resource, body(n));

      const first = await api().get(`/${resource.path}?page=1`).set(header).expect(200);
      const second = await api().get(`/${resource.path}?page=2`).set(header).expect(200);

      expect(first.body).toMatchObject({
        page: 1,
        pageSize: resource.pageSize,
        total: resource.pageSize + 1,
        totalPages: 2,
      });
      expect(first.body.data).toHaveLength(resource.pageSize);
      expect(second.body.data).toHaveLength(1);
    });

    it('given no page, returns page 1', async () => {
      await create(resource, (await resource.setup())(1));

      const res = await api().get(`/${resource.path}`).set(header).expect(200);

      expect(res.body.page).toBe(1);
    });

    it('given no session, responds 401', async () => {
      await api().get(`/${resource.path}`).expect(401);
    });

    it('given an invalid page, responds 400', async () => {
      await api().get(`/${resource.path}?page=0`).set(header).expect(400);
    });
  });

  describe('DELETE /:id (soft delete)', () => {
    it('hides the row from reads and lists but keeps it in the table', async () => {
      const created = await create(resource, (await resource.setup())(1));

      await api().delete(`/${resource.path}/${created.id}`).set(header).expect(204);

      await api().get(`/${resource.path}/${created.id}`).set(header).expect(404);
      const list = await api().get(`/${resource.path}`).set(header).expect(200);
      expect(list.body.total).toBe(0);
      const [row] = await db.select().from(resource.table).where(eq(resource.table.id, created.id));
      expect(row.deletedAt).toBeInstanceOf(Date);
    });

    it('given an already-deleted row, responds 404', async () => {
      const created = await create(resource, (await resource.setup())(1));
      await api().delete(`/${resource.path}/${created.id}`).set(header).expect(204);

      await api().delete(`/${resource.path}/${created.id}`).set(header).expect(404);
    });

    it('given no session, responds 401', async () => {
      const created = await create(resource, (await resource.setup())(1));

      await api().delete(`/${resource.path}/${created.id}`).expect(401);
    });
  });

  if (resource.logsWrites !== false) {
    describe('status-change log', () => {
      const logged = (entityId: string, action: string) =>
        db
          .select()
          .from(statusChangeLog)
          .where(
            and(
              eq(statusChangeLog.entityType, resource.entityType),
              eq(statusChangeLog.entityId, entityId),
              eq(statusChangeLog.action, action),
            ),
          );

      it('records who created, updated and deleted the row', async () => {
        const created = await create(resource, (await resource.setup())(1));
        const id = String(created.id);
        await api().patch(`/${resource.path}/${id}`).set(header).send(resource.patch).expect(200);
        await api().delete(`/${resource.path}/${id}`).set(header).expect(204);

        for (const action of ['create', 'update', 'delete']) {
          const entries = await logged(id, action);
          expect(entries, action).toHaveLength(1);
          expect(entries[0].userId).toBe(actorId);
        }
      });

      it('writes nothing when the request is rejected', async () => {
        await resource.setup();

        await api().post(`/${resource.path}`).set(header).send({}).expect(400);

        expect(await db.select().from(statusChangeLog).where(eq(statusChangeLog.entityType, resource.entityType))).toHaveLength(0);
      });
    });
  }
});
