import type { INestApplication } from '@nestjs/common';
import { closeDatabase, createBuilding, createUser, createWarehouse, resetDatabase } from '../src/db/test/helpers.js';
import { apiClient, createTestApp, signedIn } from './support/app.js';

let app: INestApplication;
let header: Record<string, string>;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app.close();
  await closeDatabase();
});
beforeEach(async () => {
  await resetDatabase();
  // Sites, buildings and locations are written by warehouse management.
  header = (await signedIn({ roles: ['Warehouse Management'] })).header;
});

const api = () => apiClient(app);
const post = (path: string, body: Record<string, unknown>) => api().post(`/${path}`).set(header).send(body);
const del = (path: string, id: number) => api().delete(`/${path}/${id}`).set(header).expect(204);

const siteBody = async (name = 'Central DC') => ({
  name,
  managerId: (await createUser()).id,
  phone: '614-555-0100',
  address: '1200 Industrial Pkwy',
  city: 'Columbus',
  state: 'OH',
  zip: '43228',
});

describe('generated codes', () => {
  describe('warehouse codes', () => {
    it('given no code, numbers sites A1, A2, A3 in order', async () => {
      const first = await post('warehouse-codes', await siteBody('Central DC')).expect(201);
      const second = await post('warehouse-codes', await siteBody('Northgate Depot')).expect(201);
      const third = await post('warehouse-codes', await siteBody('Eastside Cross-dock')).expect(201);

      expect([first.body.code, second.body.code, third.body.code]).toEqual(['A1', 'A2', 'A3']);
    });

    it('given an explicit code, keeps it', async () => {
      const res = await post('warehouse-codes', { ...(await siteBody()), code: 'WH7' }).expect(201);

      expect(res.body.code).toBe('WH7');
    });

    it('given an explicit code that is not in the sequence, carries on from A1', async () => {
      await post('warehouse-codes', { ...(await siteBody()), code: 'WH07' }).expect(201);

      const res = await post('warehouse-codes', await siteBody('Northgate Depot')).expect(201);

      expect(res.body.code).toBe('A1');
    });

    it('given an explicit code that is taken, responds 409', async () => {
      await post('warehouse-codes', { ...(await siteBody()), code: 'A1' }).expect(201);

      await post('warehouse-codes', { ...(await siteBody('Other')), code: 'A1' }).expect(409);
    });

    it('never reuses the code of a deleted site', async () => {
      const first = await post('warehouse-codes', await siteBody()).expect(201);
      await del('warehouse-codes', first.body.id);

      const next = await post('warehouse-codes', await siteBody('Northgate Depot')).expect(201);

      expect(next.body.code).toBe('A2');
    });
  });

  describe('building codes', () => {
    it('given no code, numbers buildings from A1 independently of site codes', async () => {
      const site = await createWarehouse('WH01');
      const a = await post('building-codes', { warehouseId: site.id, name: 'Building A', type: 'storage' }).expect(201);
      const b = await post('building-codes', { warehouseId: site.id, name: 'Dock 1', type: 'transport' }).expect(201);

      expect([a.body.code, b.body.code]).toEqual(['A1', 'A2']);
    });

    it('continues the sequence across sites', async () => {
      const [one, two] = [await createWarehouse('WH01'), await createWarehouse('WH02')];
      await post('building-codes', { warehouseId: one.id, name: 'Main', type: 'storage' }).expect(201);

      const res = await post('building-codes', { warehouseId: two.id, name: 'Annex', type: 'storage' }).expect(201);

      expect(res.body.code).toBe('A2');
    });

    it('given an unknown type, responds 400', async () => {
      const site = await createWarehouse('WH01');

      await post('building-codes', { warehouseId: site.id, name: 'Main', type: 'garage' }).expect(400);
    });

    it('does not need a building letter', async () => {
      const site = await createWarehouse('WH01');

      const res = await post('building-codes', { warehouseId: site.id, name: 'Main', type: 'storage' }).expect(201);

      expect(res.body.building).toBeNull();
    });
  });

  describe('item location codes', () => {
    it('given no code, numbers locations A1, A2 in order', async () => {
      const building = await createBuilding((await createWarehouse('WH01')).id, 'BA01');
      const first = await post('item-locations', { buildingId: building.id, description: 'Aisle 4 · Rack C' }).expect(201);
      const second = await post('item-locations', { buildingId: building.id, description: 'Aisle 1 · Rack A' }).expect(201);

      expect([first.body.code, second.body.code]).toEqual(['A1', 'A2']);
    });

    it('rolls from A9 to B1', async () => {
      const building = await createBuilding((await createWarehouse('WH01')).id, 'BA01');
      for (let n = 0; n < 9; n++) await post('item-locations', { buildingId: building.id }).expect(201);

      const tenth = await post('item-locations', { buildingId: building.id }).expect(201);

      expect(tenth.body.code).toBe('B1');
    });
  });
});
