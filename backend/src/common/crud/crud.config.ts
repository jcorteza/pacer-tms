import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';

/** Every CRUD table has an `id` and the soft-delete column. */
export type SoftDeletable = PgTable & { id: PgColumn; deletedAt: PgColumn };

/** What CrudService needs to serve one resource; each resource's controller holds its own. */
export type CrudConfig = {
  /** What the automatic status-change log records, e.g. `carrier-invoice`. */
  entityType: string;
  table: SoftDeletable;
  pageSize: number;
  /** The status-change log doesn't log itself. */
  logsWrites?: false;
  /** `code` may be left out of a create; the server numbers it A1, A2, ... (see common/codes.ts). */
  generatedCode?: true;
};

export type Id = number | string;
