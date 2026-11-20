import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { seedDatabase } from './index.js';

// `pnpm db:seed` fills an empty database; `pnpm db:seed --reset` wipes it first.
config({ path: '../.env' });

const db = drizzle({ connection: process.env.DATABASE_URL! });
try {
  await seedDatabase(db, { reset: process.argv.includes('--reset') });
  console.log('Seeded Larkspur Freight sample data.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await db.$client.end();
}
