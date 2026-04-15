import { db } from './db';
import { auditLog } from './schema';

interface AuditEntry {
  userId?: number;
  username: string;
  action: string;
  target?: string;
  detail?: string;
  ip?: string;
}

export function audit(entry: AuditEntry) {
  try {
    db.insert(auditLog).values({
      userId: entry.userId ?? null,
      username: entry.username,
      action: entry.action,
      target: entry.target ?? null,
      detail: entry.detail ?? null,
      ip: entry.ip ?? null,
    }).run();
  } catch {
    // Never crash the app for audit failures
  }
}
