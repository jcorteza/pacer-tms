import type { INestApplication } from '@nestjs/common';
import { closeDatabase } from '../src/db/test/helpers.js';
import { apiClient, createTestApp } from './support/app.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('GET /ping responds 200 with status ok, for healthchecks', () => {
    return apiClient(app).get('/ping').expect(200).expect({ status: 'ok' });
  });
});
