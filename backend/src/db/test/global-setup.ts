import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { TEST_DB_NAME, adminUrl, testDatabaseUrl } from './test-database-url.js';

async function recreateTestDatabase(create: boolean) {
  const admin = new pg.Client({ connectionString: adminUrl() });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
  if (create) await admin.query(`CREATE DATABASE ${TEST_DB_NAME}`);
  await admin.end();
}

// Given the compose Postgres, create a throwaway database and apply the
// generated migrations to it; drop it once the run is over.
export async function setup() {
  await recreateTestDatabase(true);
  const pool = new pg.Pool({ connectionString: testDatabaseUrl() });
  await migrate(drizzle({ client: pool }),{ migrationsFolder: './drizzle' });
  await pool.end();
}

export const teardown = () => recreateTestDatabase(false);
