import { count, is, sql } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import type { Db, Tx } from '../db.js';
import * as schema from '../schema.js';
import { seedCustomers } from './customers.js';
import { seedLogistics } from './logistics.js';
import { seedDocuments, seedInvoices, seedStatusLog } from './paperwork.js';
import { assignItemLocations, seedUsers, seedWarehouses } from './people.js';

export { DEMO_USER_EMAIL } from './people.js';

const tables = Object.values<unknown>(schema).filter((t): t is PgTable => is(t, PgTable));

async function isEmpty(tx: Tx) {
  for (const table of tables) {
    if ((await tx.select({ n: count() }).from(table))[0].n > 0) return false;
  }
  return true;
}

async function wipe(tx: Tx) {
  const { rows } = await tx.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`);
  const names = rows.map((r) => `"${r.tablename}"`).join(', ');
  await tx.execute(sql.raw(`truncate ${names} restart identity cascade`));
}

/**
 * Fills an empty database with Larkspur Freight sample data. Refuses to touch a
 * database that already has data unless `reset` is set, which wipes it first.
 */
export async function seedDatabase(db: Db, { reset = false }: { reset?: boolean } = {}) {
  await db.transaction(async (tx) => {
    if (reset) await wipe(tx);
    else if (!(await isEmpty(tx))) throw new Error('Database is not empty; run with reset to wipe and reseed it');

    const now = new Date();
    const people = await seedUsers(tx);
    const warehouse = await seedWarehouses(tx, people.warehouseManagers);
    const customers = await seedCustomers(tx);
    await assignItemLocations(tx, customers.items.map((i) => i.id), warehouse.locations);

    const logistics = await seedLogistics(tx, now, customers, warehouse, people.warehouseStaff);
    await seedInvoices(tx, logistics);
    await seedDocuments(tx, now, logistics);
    await seedStatusLog(tx, logistics, { dispatcher: people.dispatcher.id, warehouse: people.warehouseStaff[0].id });
  });
}
