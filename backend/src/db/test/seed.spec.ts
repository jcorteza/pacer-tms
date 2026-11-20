import { count, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '../seed/index.js';
import * as schema from '../schema.js';
import { closeDatabase, db, resetDatabase } from './helpers.js';

const tables = Object.values<unknown>(schema).filter((t): t is PgTable => is(t, PgTable));
const rowCounts = () => Promise.all(tables.map(async (t) => (await db.select({ n: count() }).from(t))[0].n));

beforeAll(async () => {
  await resetDatabase();
  await seedDatabase(db);
}, 60_000);
afterAll(closeDatabase);

describe('running the seed again', () => {
  it('refuses when the database already has data, and leaves it untouched', async () => {
    const before = await rowCounts();

    await expect(seedDatabase(db)).rejects.toThrow(/not empty/i);

    expect(await rowCounts()).toEqual(before);
  });

  it('with reset, wipes and reseeds to the same row counts', async () => {
    const before = await rowCounts();

    await seedDatabase(db, { reset: true });

    expect(await rowCounts()).toEqual(before);
  }, 60_000);
});
