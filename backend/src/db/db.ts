import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/** The database as @nestjs/drizzle injects it (`@InjectDrizzle()`), or a transaction of it. */
export type Db = NodePgDatabase;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
