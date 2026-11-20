import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildingCodes, itemLocations, warehouseCodes } from '../schema.js';
import {
  closeDatabase,
  createBuilding,
  createClient,
  createItem,
  createUser,
  createWarehouse,
  db,
  expectPgError,
  resetDatabase,
} from './helpers.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('warehouse codes', () => {
  it.each(['AB', 'AB1', 'AB12'])('given a %s code (2–4 chars), when saved, then it is accepted', async (code) => {
    expect((await createWarehouse(code)).code).toBe(code);
  });

  it('given a 1-char code, when saved, then it is rejected', async () => {
    await expectPgError(createWarehouse('A'), '23514');
  });

  it('given a 5-char code, when saved, then it is rejected', async () => {
    await expectPgError(createWarehouse('AB123'), '22001');
  });

  it('given an existing code, when another warehouse uses it, then it is rejected', async () => {
    await createWarehouse('WH01');
    await expectPgError(createWarehouse('WH01'), '23505');
  });

  it('given a manager that does not exist, when saved, then it is rejected', async () => {
    await expectPgError(
      db.insert(warehouseCodes).values({
        code: 'WH02',
        name: 'Site WH02',
        managerId: '00000000-0000-0000-0000-000000000000',
        phone: '1',
        address: 'a',
        city: 'c',
        state: 'NV',
        zip: '89501',
      }),
      '23503',
    );
  });
});

describe('building codes', () => {
  it('given 2–4 char codes, when saved, then they are accepted; 1 char is rejected', async () => {
    const wh = await createWarehouse();
    await createBuilding(wh.id, 'A2');
    await expectPgError(createBuilding(wh.id, 'A'), '23514');
  });

  it('given a code used in another warehouse, when reused, then it is rejected (unique across sites)', async () => {
    const [a, b] = [await createWarehouse('WH01'), await createWarehouse('WH02')];
    await createBuilding(a.id, 'A2');
    await expectPgError(createBuilding(b.id, 'A2'), '23505');
  });

  it('given a warehouse that does not exist, when a building references it, then it is rejected', async () => {
    await expectPgError(
      db.insert(buildingCodes).values({ code: 'A2', warehouseId: 999, name: 'Main', type: 'storage' }),
      '23503',
    );
  });

  it('given a type other than storage or transport, when saved, then it is rejected', async () => {
    const wh = await createWarehouse();
    await expectPgError(
      db.insert(buildingCodes).values({ code: 'A2', warehouseId: wh.id, name: 'Main', type: 'garage' as never }),
      '23514',
    );
  });

  it('given no type, when saved, then it is rejected', async () => {
    const wh = await createWarehouse();
    await expectPgError(
      db.insert(buildingCodes).values({ code: 'A2', warehouseId: wh.id, name: 'Main' } as never),
      '23502',
    );
  });

  it('given no letter, when saved, then it is accepted (the letter is optional)', async () => {
    const wh = await createWarehouse();
    const [building] = await db
      .insert(buildingCodes)
      .values({ code: 'A2', warehouseId: wh.id, name: 'Dock 1', type: 'transport' })
      .returning();
    expect(building.building).toBeNull();
  });
});

describe('site and building names', () => {
  it('given a warehouse with no name, when saved, then it is rejected', async () => {
    const manager = await createUser();
    await expectPgError(
      db.insert(warehouseCodes).values({
        code: 'WH03', managerId: manager.id, phone: '1', address: 'a', city: 'c', state: 'NV', zip: '89501',
      } as never),
      '23502',
    );
  });
});

describe('item locations', () => {
  async function setup() {
    const wh = await createWarehouse();
    const building = await createBuilding(wh.id);
    const client = await createClient();
    return { building, item: await createItem(client.id) };
  }

  it('given a location with no item, when saved, then it is accepted', async () => {
    const { building } = await setup();
    const [loc] = await db.insert(itemLocations).values({ code: 'L001', buildingId: building.id }).returning();
    expect(loc.itemId).toBeNull();
  });

  it('given an item already in a location, when assigned to a second one, then it is rejected', async () => {
    const { building, item } = await setup();
    await db.insert(itemLocations).values({ code: 'L001', buildingId: building.id, itemId: item.id });
    await expectPgError(
      db.insert(itemLocations).values({ code: 'L002', buildingId: building.id, itemId: item.id }),
      '23505',
    );
  });

  it('given 2–4 char codes, when 1 char or a duplicate is saved, then it is rejected', async () => {
    const { building } = await setup();
    await db.insert(itemLocations).values({ code: 'L1', buildingId: building.id });
    await expectPgError(db.insert(itemLocations).values({ code: 'L', buildingId: building.id }), '23514');
    await expectPgError(db.insert(itemLocations).values({ code: 'L1', buildingId: building.id }), '23505');
  });

  it('given an existing user, when a warehouse is created with them as manager, then the warehouse stores that user as its manager', async () => {
    const manager = await createUser();
    const [warehouse] = await db
      .insert(warehouseCodes)
      .values({ code: 'WH09', name: 'Site WH09', managerId: manager.id, phone: '1', address: 'a', city: 'c', state: 'NV', zip: '89501' })
      .returning();
    expect(warehouse.managerId).toBe(manager.id);
  });
});
