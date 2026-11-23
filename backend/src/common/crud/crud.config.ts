import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { Role } from '../../users/roles.js';

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
  /** Roles allowed to create, update and delete. Left out, any signed-in user may. Reads are open either way. */
  writeRoles?: readonly Role[];
  /** `code` may be left out of a create; the server numbers it A1, A2, ... (see common/codes.ts). */
  generatedCode?: true;
};

export type Id = number | string;
