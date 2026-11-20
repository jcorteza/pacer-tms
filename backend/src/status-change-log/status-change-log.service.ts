import { Injectable } from '@nestjs/common';
import type { Tx } from '../db/db.js';
import { statusChangeLog } from '../db/schema.js';

export type LogEntry = {
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  userId: string;
};

/** The automatic writes into the audit trail; the log's own CRUD lives with the other resources. */
@Injectable()
export class StatusChangeLogService {
  /** Takes the caller's transaction so the row and its log entry commit (or roll back) together. */
  async record(tx: Tx, { entityType, entityId, action, userId }: LogEntry) {
    await tx.insert(statusChangeLog).values({
      entityType,
      entityId,
      action,
      description: `${action} ${entityType} ${entityId}`,
      userId,
    });
  }
}
