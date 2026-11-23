import { auditLogs } from "../drizzle/schema";
import { getDb } from "./db";

/** Everything the security record keeps track of. */
export type AuditAction =
  | "delivery_login"
  | "delivery_login_blocked"
  | "admin_login"
  | "delivery_boy_created"
  | "delivery_boy_updated"
  | "account_status_changed"
  | "role_changed"
  | "order_assigned"
  | "order_reassigned"
  | "order_unassigned"
  | "delivery_status_changed"
  | "account_deletion_requested";

type RequestLike = { ip?: string; headers?: Record<string, string | string[] | undefined> } | undefined;

function requestIp(req: RequestLike): string | null {
  if (!req) return null;
  const forwarded = req.headers?.["x-forwarded-for"];
  const value = req.ip || (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]) || null;
  return value ? value.trim().slice(0, 64) : null;
}

/**
 * Adds one row to the audit log. Rows are only ever added, never changed.
 * If writing the record fails, the error is logged on the server but the user's action still completes.
 */
export async function writeAuditLog(entry: {
  actor?: { id: number; role: string } | null;
  action: AuditAction;
  targetUserId?: number | null;
  orderId?: number | null;
  details?: Record<string, unknown>;
  req?: RequestLike;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      actorUserId: entry.actor?.id ?? null,
      actorRole: entry.actor?.role ?? null,
      action: entry.action,
      targetUserId: entry.targetUserId ?? null,
      orderId: entry.orderId ?? null,
      details: entry.details ? JSON.stringify(entry.details).slice(0, 4000) : null,
      ipAddress: requestIp(entry.req),
    });
  } catch (error) {
    console.error("[Audit] Could not write audit log:", error instanceof Error ? error.message : error);
  }
}