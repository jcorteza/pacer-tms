import { config } from 'dotenv';

config({ path: '../.env' });

export const TEST_DB_NAME = 'pacer_test';

/** DATABASE_URL with its database name swapped, so tests never touch dev data. */
function withDatabase(name: string): string {
  const url = new URL(process.env.DATABASE_URL!);
  url.pathname = `/${name}`;
  return url.toString();
}

/** Connection to the server's default database, used to create/drop the test DB. */
export const adminUrl = () => withDatabase('postgres');

export const testDatabaseUrl = () => withDatabase(TEST_DB_NAME);
