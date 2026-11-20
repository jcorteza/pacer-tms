import { integer, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Integer identity primary key (uuid is reserved for tables whose id is a credential or public-facing). */
export const intId = () => integer('id').primaryKey().generatedAlwaysAsIdentity();

export const uuidId = () => uuid('id').primaryKey().defaultRandom();

export const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const createdAt = () => timestamptz('created_at').notNull().defaultNow();

/** Money, weights, volumes and dimensions: exact decimals, never floats. */
export const exactDecimal = (name: string) => numeric(name, { precision: 12, scale: 2 });

/** Soft delete: set instead of removing the row; null means live. */
export const deletedAt = () => timestamptz('deleted_at');
