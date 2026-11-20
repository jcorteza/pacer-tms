import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, count, eq, isNull } from 'drizzle-orm';
import { buildPage, pageWindow } from '../pagination.js';
import type { Db, Tx } from '../../db/db.js';
import { StatusChangeLogService } from '../../status-change-log/status-change-log.service.js';
import type { CrudConfig, Id } from './crud.config.js';

type Body = Record<string, unknown>;
type Row = { id: Id } & Body;

/** The five operations every resource shares: soft-delete aware, with automatic status-change logging. */
@Injectable()
export class CrudService {
  constructor(
    @InjectDrizzle() private readonly db: Db,
    @Inject(StatusChangeLogService) private readonly log: StatusChangeLogService,
  ) {}

  async list({ table, pageSize }: CrudConfig, page: number) {
    const live = isNull(table.deletedAt);
    const { limit, offset } = pageWindow(page, pageSize);
    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(table).where(live).orderBy(table.id).limit(limit).offset(offset),
      this.db.select({ total: count() }).from(table).where(live),
    ]);
    return buildPage(rows, { total, page, pageSize });
  }

  async get({ table }: CrudConfig, id: Id) {
    const [row] = await this.db.select().from(table).where(and(eq(table.id, id), isNull(table.deletedAt)));
    if (!row) throw new NotFoundException();
    return row;
  }

  create(config: CrudConfig, userId: string, body: Body) {
    return this.db.transaction(async (tx) => {
      const [row] = (await tx.insert(config.table).values(body).returning()) as Row[];
      await this.record(tx, config, 'create', row.id, userId);
      return row;
    });
  }

  update(config: CrudConfig, userId: string, id: Id, body: Body) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.update(config.table).set(body).where(this.live(config, id)).returning();
      if (!row) throw new NotFoundException();
      await this.record(tx, config, 'update', id, userId);
      return row;
    });
  }

  /** Soft delete: the row stays, hidden from every read. */
  async remove(config: CrudConfig, userId: string, id: Id) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(config.table)
        .set({ deletedAt: new Date() })
        .where(this.live(config, id))
        .returning({ id: config.table.id });
      if (!row) throw new NotFoundException();
      await this.record(tx, config, 'delete', id, userId);
    });
  }

  private live({ table }: CrudConfig, id: Id) {
    return and(eq(table.id, id), isNull(table.deletedAt));
  }

  private async record(tx: Tx, config: CrudConfig, action: 'create' | 'update' | 'delete', id: Id, userId: string) {
    if (config.logsWrites === false) return;
    await this.log.record(tx, { entityType: config.entityType, entityId: String(id), action, userId });
  }
}
