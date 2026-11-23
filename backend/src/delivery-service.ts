/**
 * Delivery team logic shared by the owner's Admin Panel (admin.delivery.*) and the
 * delivery boy's dashboard (delivery.*). Every rule here runs on the server.
 */
import { TRPCError } from "@trpc/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { deliveryAssignments, deliveryPartners, notifications, orders, shops, users } from "../drizzle/schema";
import { canReassignDelivery, DELIVERY_STATUS_LABEL, type DeliveryStatus } from "@shared/delivery-flow";
import { getDb } from "./db";
import { writeAuditLog } from "./audit";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Actor = { id: number; role: string };
type RequestLike = { ip?: string; headers?: Record<string, string | string[] | undefined> } | undefined;
type Recipient = { userId: number; role: "customer" | "shop_owner" | "delivery_boy" | "admin" };

/** mysql2 returns a ResultSetHeader for UPDATE; tests/mocks may return other shapes. */
export function affectedRows(result: unknown) {
  const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number } | undefined;
  return typeof header?.affectedRows === "number" ? header.affectedRows : 1;
}

export async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

/** In-app messages; each person gets one copy. */
export async function sendNotifications(db: Db, recipients: Array<Recipient | null | undefined>, message: { orderId?: number | null; title: string; body: string; actionUrl?: string; type?: string }) {
  const seen = new Set<number>();
  const rows = recipients.filter((recipient): recipient is Recipient => {
    if (!recipient?.userId || seen.has(recipient.userId)) return false;
    seen.add(recipient.userId);
    return true;
  }).map(recipient => ({ userId: recipient.userId, orderId: message.orderId ?? null, audienceRole: recipient.role, title: message.title, body: message.body, type: message.type || "order_update", actionUrl: message.actionUrl || (recipient.role === "delivery_boy" ? "/delivery" : recipient.role === "admin" ? "/admin" : "/orders") }));
  if (rows.length) await db.insert(notifications).values(rows);
}

export async function adminRecipients(db: Db): Promise<Recipient[]> {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return admins.map(admin => ({ userId: admin.id, role: "admin" as const }));
}

export async function shopOwnerRecipient(db: Db, shopId: number): Promise<Recipient | null> {
  const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, shopId)).limit(1);
  return shop?.ownerUserId ? { userId: shop.ownerUserId, role: "shop_owner" } : null;
}

export async function deliveryBoyName(db: Db, userId: number | null | undefined) {
  if (!userId) return null;
  const [partner] = await db.select({ fullName: deliveryPartners.fullName }).from(deliveryPartners).where(eq(deliveryPartners.userId, userId)).limit(1);
  if (partner?.fullName) return partner.fullName;
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.name || `Delivery partner #${userId}`;
}

/** Only an ACTIVE delivery boy can be given orders. Suspended, deactivated and waiting accounts cannot. */
export async function requireActiveDeliveryBoy(db: Db, userId: number) {
  const [target] = await db.select({ id: users.id, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, userId)).limit(1);
  if (!target || target.role !== "delivery_boy") throw new TRPCError({ code: "BAD_REQUEST", message: "Orders can only be given to a delivery boy from your delivery team." });
  if (target.accountStatus !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "This delivery boy is not active, so he cannot get new orders. Activate him first." });
  return target;
}

/**
 * Give an order to a delivery boy, or move it to another one.
 * Keeps a history row, writes the audit log, and tells the new (and old) delivery boy.
 */
export async function assignOrder(input: { orderId: number; deliveryUserId: number; reason?: string | null; actor: Actor; req?: RequestLike }) {
  const db = await requireDb();
  await requireActiveDeliveryBoy(db, input.deliveryUserId);
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  if (order.status === "cancelled" || order.status === "delivered") throw new TRPCError({ code: "BAD_REQUEST", message: `This order is already ${order.status}.` });
  if (order.deliveryUserId === input.deliveryUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "This order is already assigned to this delivery boy." });
  if (order.deliveryUserId && !canReassignDelivery(order.deliveryStatus as DeliveryStatus | null, order.status)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This order is already out for delivery, so it cannot be moved to another delivery boy." });
  }
  const previous = order.deliveryUserId;
  const action = previous ? "reassigned" as const : "assigned" as const;
  const now = new Date();
  await db.transaction(async tx => {
    // The extra conditions make sure nobody changed the order in between (no double assignment).
    const result = await tx.update(orders).set({ deliveryUserId: input.deliveryUserId, deliveryStatus: "assigned", assignedAt: now, acceptedAt: null, pickedUpAt: null })
      .where(and(eq(orders.id, order.id), previous ? eq(orders.deliveryUserId, previous) : sql`${orders.deliveryUserId} is null`, eq(orders.status, order.status)));
    if (affectedRows(result) !== 1) throw new TRPCError({ code: "CONFLICT", message: "The order changed just now. Please refresh and try again." });
    await tx.insert(deliveryAssignments).values({ orderId: order.id, deliveryUserId: input.deliveryUserId, previousDeliveryUserId: previous, assignedByUserId: input.actor.id, action, reason: input.reason || null });
  });
  await writeAuditLog({ actor: input.actor, action: previous ? "order_reassigned" : "order_assigned", orderId: order.id, targetUserId: input.deliveryUserId, details: { orderNumber: order.orderNumber, previousDeliveryUserId: previous, reason: input.reason || null }, req: input.req });
  const name = await deliveryBoyName(db, input.deliveryUserId);
  await sendNotifications(db, [{ userId: input.deliveryUserId, role: "delivery_boy" }], { orderId: order.id, title: "New order assigned", body: `Order ${order.orderNumber} for Flat ${order.apartmentUnit} · ₹${Number(order.total).toFixed(2)} is assigned to you. Please accept it.`, type: "delivery_assignment" });
  if (previous) await sendNotifications(db, [{ userId: previous, role: "delivery_boy" }], { orderId: order.id, title: "Order moved", body: `Order ${order.orderNumber} was given to another delivery partner. You do not need to deliver it.`, type: "delivery_assignment" });
  return { success: true, action, deliveryUserId: input.deliveryUserId, deliveryBoyName: name };
}

/** Take an order back from a delivery boy (before it is out for delivery). */
export async function unassignOrder(input: { orderId: number; reason?: string | null; actor: Actor; req?: RequestLike }) {
  const db = await requireDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
  if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
  if (!order.deliveryUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "This order has no delivery boy." });
  if (!canReassignDelivery(order.deliveryStatus as DeliveryStatus | null, order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "This order is already out for delivery or finished." });
  const previous = order.deliveryUserId;
  await db.transaction(async tx => {
    const result = await tx.update(orders).set({ deliveryUserId: null, deliveryStatus: null, assignedAt: null, acceptedAt: null, pickedUpAt: null }).where(and(eq(orders.id, order.id), eq(orders.deliveryUserId, previous)));
    if (affectedRows(result) !== 1) throw new TRPCError({ code: "CONFLICT", message: "The order changed just now. Please refresh and try again." });
    await tx.insert(deliveryAssignments).values({ orderId: order.id, deliveryUserId: null, previousDeliveryUserId: previous, assignedByUserId: input.actor.id, action: "unassigned", reason: input.reason || null });
  });
  await writeAuditLog({ actor: input.actor, action: "order_unassigned", orderId: order.id, targetUserId: previous, details: { orderNumber: order.orderNumber, reason: input.reason || null }, req: input.req });
  await sendNotifications(db, [{ userId: previous, role: "delivery_boy" }], { orderId: order.id, title: "Order taken back", body: `Order ${order.orderNumber} is no longer assigned to you.`, type: "delivery_assignment" });
  return { success: true };
}

/**
 * When a delivery boy is suspended or deactivated, orders that have not left the shop with him
 * are taken back so the owner can give them to someone else. Orders already out for delivery stay
 * with him (the owner can finish them from the Admin Panel).
 */
export async function releaseOpenOrders(db: Db, deliveryUserId: number, actor: Actor, reason: string, req?: RequestLike) {
  const open = await db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders)
    .where(and(eq(orders.deliveryUserId, deliveryUserId), inArray(orders.deliveryStatus, ["assigned", "accepted", "picked_up"]), sql`${orders.status} not in ('delivered', 'cancelled', 'out_for_delivery')`));
  for (const order of open) {
    await db.transaction(async tx => {
      await tx.update(orders).set({ deliveryUserId: null, deliveryStatus: null, assignedAt: null, acceptedAt: null, pickedUpAt: null }).where(and(eq(orders.id, order.id), eq(orders.deliveryUserId, deliveryUserId)));
      await tx.insert(deliveryAssignments).values({ orderId: order.id, deliveryUserId: null, previousDeliveryUserId: deliveryUserId, assignedByUserId: actor.id, action: "unassigned", reason });
    });
    await writeAuditLog({ actor, action: "order_unassigned", orderId: order.id, targetUserId: deliveryUserId, details: { orderNumber: order.orderNumber, reason }, req });
  }
  const [still] = await db.select({ value: sql<number>`count(*)` }).from(orders).where(and(eq(orders.deliveryUserId, deliveryUserId), eq(orders.status, "out_for_delivery")));
  return { released: open.length, stillOutForDelivery: Number(still?.value || 0) };
}

export function deliveryStepCopy(status: DeliveryStatus, orderNumber: string, name: string | null) {
  const who = name || "The delivery partner";
  switch (status) {
    case "accepted": return { title: "Order accepted", body: `${who} accepted order ${orderNumber}.` };
    case "picked_up": return { title: "Order picked up", body: `${who} picked up order ${orderNumber} from the shop.` };
    case "out_for_delivery": return { title: "Order out for delivery", body: `${who} is on the way with order ${orderNumber}.` };
    case "delivered": return { title: "Order delivered", body: `Order ${orderNumber} was delivered by ${who} at ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}.` };
    default: return { title: `Order ${DELIVERY_STATUS_LABEL[status]}`, body: `Order ${orderNumber} is now ${DELIVERY_STATUS_LABEL[status].toLowerCase()}.` };
  }
}