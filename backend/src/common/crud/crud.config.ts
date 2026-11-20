import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

/** Every CRUD table has an `id` and the soft-delete column. */
export type SoftDeletable = PgTable & { id: PgColumn; deletedAt: PgColumn };

/** Everything the generic controller and service need to serve one resource. */
export type CrudConfig = {
  /** URL segment, e.g. `carrier-invoices`. */
  path: string;
  /** What the automatic status-change log records, e.g. `carrier-invoice`. */
  entityType: string;
  table: SoftDeletable;
  idType: 'int' | 'uuid';
  pageSize: number;
  /** The status-change log doesn't log itself. */
  logsWrites?: false;
};

export type Id = number | string;
