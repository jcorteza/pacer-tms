import { getTableColumns } from 'drizzle-orm';
import { createSchemaFactory } from 'drizzle-orm/zod';
import { z } from 'zod';
import type { SoftDeletable } from './crud.config.js';

/** Dates arrive as ISO strings in JSON, so coerce those and nothing else. */
const { createInsertSchema, createUpdateSchema } = createSchemaFactory({ coerce: { date: true } });

/** Columns the server sets; clients can never write them (so PATCH can't un-delete a row). */
const SERVER_SET = ['id', 'deletedAt', 'createdAt', 'at', 'trackingCode'];

/**
 * drizzle-zod builds its schema type from each table's exact column types, which
 * a table known only as `SoftDeletable` can't provide. The shape is only known at
 * runtime here, so these are typed as plain object schemas.
 */
type BodySchema = z.ZodObject<z.ZodRawShape>;

/** The `pick` mask of every column a client may write. */
const clientWritable = (table: SoftDeletable) =>
  Object.fromEntries(
    Object.keys(getTableColumns(table))
      .filter((k) => !SERVER_SET.includes(k))
      .map((k) => [k, true as const]),
  );

/** Body schemas for POST (all required fields) and PATCH (any non-empty subset); unknown keys are rejected. */
export function crudSchemas(table: SoftDeletable) {
  const keep = clientWritable(table);
  const insertBase = createInsertSchema(table as never) as unknown as BodySchema;
  const updateBase = createUpdateSchema(table as never) as unknown as BodySchema;

  const insert = insertBase.pick(keep).strict();
  const update = updateBase
    .pick(keep)
    .strict()
    .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update');
  return { insert, update };
}

/** `?page=` for list endpoints: a whole number from 1, defaulting to the first page. */
export const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1) });
