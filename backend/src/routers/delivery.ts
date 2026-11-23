/**
 * The delivery boy's own dashboard. Every procedure uses deliveryProcedure, so only an
 * ACTIVE delivery boy can call it, and every query is limited to orders assigned to HIM.
 */
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { deliveryPartners, orderItems, orders, payments, residentProfiles, users } from "../../drizzle/schema";
import { DELIVERY_STATUS_LABEL, canSeeCustomerPhone, isAllowedDeliveryTransition, maskPhone, nextDeliveryStatus, type DeliveryStatus } from "@shared/delivery-flow";
import { deliveryProcedure, router } from "../_core/trpc";
import { writeAuditLog } from "../audit";
import { adminRecipients, affectedRows, deliveryBoyName, deliveryStepCopy, requireDb, sendNotifications, shopOwnerRecipient } from "../delivery-service";

/** Steps a delivery boy may set himself. "assigned" is set only by the owner. */
const deliveryStepSchema = z.enum(["accepted", "picked_up", "out_for_delivery", "delivered"]);

/** What must be true about the order itself before each delivery step. Exported for tests. */
export function checkDeliveryStep(order: { status: string; deliveryStatus: DeliveryStatus | null; paymentMethod: string; paymentStatus: string }, to: z.infer<typeof deliveryStepSchema>, cashCollected: boolean): { ok: true } | { ok: false; message: string } {
  if (order.status === "cancelled") return { ok: false, message: "This order was cancelled. You do not need to deliver it." };
  if (!isAllowedDeliveryTransition(order.deliveryStatus, to)) {
    const next = nextDeliveryStatus(order.deliveryStatus);
    return { ok: false, message: next ? `This order is ${DELIVERY_STATUS_LABEL[order.deliveryStatus as DeliveryStatus]}. The next step is ${DELIVERY_STATUS_LABEL[next]}.` : "This order is already delivered." };
  }
  if (to === "picked_up" && order.status === "placed") return { ok: false, message: "The shop has not confirmed this order yet. Pick it up after it is confirmed." };
  if (to === "out_for_delivery" && order.status !== "packed") return { ok: false, message: "Pick up the order from the shop first." };
  if (to === "delivered" && order.status !== "out_for_delivery") return { ok: false, message: "Mark the order Out for Delivery first." };
  if (to === "delivered" && order.paymentMethod === "cash_on_delivery" && order.paymentStatus !== "paid" && !cashCollected) {
    return { ok: false, message: "This is a Cash on Delivery order. Collect the cash and tick “Cash collected” before marking it delivered." };
  }
  return { ok: true };
}

export const deliveryRouter = router({
  /** The logged-in delivery boy's own profile and today's numbers ("today" in India time; the server stores UTC). */
  me: deliveryProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const [partner] = await db.select().from(deliveryPartners).where(eq(deliveryPartners.userId, ctx.user.id)).limit(1);
    const [counts] = await db.select({
      active: sql<number>`coalesce(sum(case when ${orders.status} not in ('delivered', 'cancelled') then 1 else 0 end), 0)`,
      deliveredToday: sql<number>`coalesce(sum(case when ${orders.deliveryStatus} = 'delivered' and date(${orders.deliveredAt} + interval 330 minute) = date(utc_timestamp() + interval 330 minute) then 1 else 0 end), 0)`,
      deliveredTotal: sql<number>`coalesce(sum(case when ${orders.deliveryStatus} = 'delivered' then 1 else 0 end), 0)`,
    }).from(orders).where(eq(orders.deliveryUserId, ctx.user.id));
    return {
      id: ctx.user.id,
      name: partner?.fullName || ctx.user.name || "Delivery partner",
      phone: partner?.phone || null,
      accountStatus: ctx.user.accountStatus,
      activeOrders: Number(counts?.active || 0),
      deliveredToday: Number(counts?.deliveredToday || 0),
      deliveredTotal: Number(counts?.deliveredTotal || 0),
    };
  }),

  /** Only orders assigned to this delivery boy. The customer's phone is hidden after delivery. */
  orders: deliveryProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    const rows = await db.select().from(orders).where(eq(orders.deliveryUserId, ctx.user.id)).orderBy(desc(orders.assignedAt), desc(orders.createdAt)).limit(100);
    if (!rows.length) return [];
    const customerIds = Array.from(new Set(rows.map(order => order.customerUserId)));
    const [items, profiles, customers] = await Promise.all([
      db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map(order => order.id))),
      db.select({ userId: residentProfiles.userId, fullName: residentProfiles.fullName, phone: residentProfiles.phone, blockNumber: residentProfiles.blockNumber, flatNumber: residentProfiles.flatNumber, building: residentProfiles.building }).from(residentProfiles).where(inArray(residentProfiles.userId, customerIds)),
      db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, customerIds)),
    ]);
    return rows.map(order => {
      const profile = profiles.find(row => row.userId === order.customerUserId);
      const customer = customers.find(row => row.id === order.customerUserId);
      const phoneVisible = canSeeCustomerPhone(order.status);
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryStatus: order.deliveryStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        note: order.note,
        placedAt: order.placedAt,
        assignedAt: order.assignedAt,
        acceptedAt: order.acceptedAt,
        pickedUpAt: order.pickedUpAt,
        outForDeliveryAt: order.outForDeliveryAt,
        deliveredAt: order.deliveredAt,
        cancelReason: order.cancelReason,
        customer: {
          name: profile?.fullName || customer?.name || "Resident",
          phone: phoneVisible ? profile?.phone || null : maskPhone(profile?.phone),
          phoneVisible,
          blockNumber: profile?.blockNumber || null,
          flatNumber: profile?.flatNumber || null,
          apartmentUnit: order.apartmentUnit,
          building: profile?.building || null,
        },
        items: items.filter(item => item.orderId === order.id).map(item => ({ id: item.id, title: item.title, variantTitle: item.variantTitle, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal, itemStatus: item.itemStatus })),
      };
    });
  }),

  /** Move one of HIS orders to the next delivery step. */
  updateStatus: deliveryProcedure.input(z.object({ orderId: z.number().int().positive(), status: deliveryStepSchema, cashCollected: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const db = await requireDb();
    const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
    // Same answer for "does not exist" and "belongs to someone else", so nobody can probe other orders.
    if (!order || order.deliveryUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This order is not assigned to you." });
    const check = checkDeliveryStep({ status: order.status, deliveryStatus: order.deliveryStatus, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus }, input.status, Boolean(input.cashCollected));
    if (!check.ok) throw new TRPCError({ code: "BAD_REQUEST", message: check.message });

    const now = new Date();
    const collectCash = input.status === "delivered" && order.paymentMethod === "cash_on_delivery" && order.paymentStatus !== "paid";
    const patch = {
      deliveryStatus: input.status,
      ...(input.status === "accepted" ? { acceptedAt: now } : {}),
      ...(input.status === "picked_up" ? { pickedUpAt: now, ...(order.status === "confirmed" ? { status: "packed" as const, packedAt: now } : {}) } : {}),
      ...(input.status === "out_for_delivery" ? { status: "out_for_delivery" as const, outForDeliveryAt: now } : {}),
      ...(input.status === "delivered" ? { status: "delivered" as const, deliveredAt: now } : {}),
      ...(collectCash ? { paymentStatus: "paid" as const } : {}),
    };
    await db.transaction(async tx => {
      // Only works if the order is still his and still at the step he saw (no double taps, no races).
      const result = await tx.update(orders).set(patch).where(and(eq(orders.id, order.id), eq(orders.deliveryUserId, ctx.user.id), order.deliveryStatus ? eq(orders.deliveryStatus, order.deliveryStatus) : sql`${orders.deliveryStatus} is null`, eq(orders.status, order.status)));
      if (affectedRows(result) !== 1) throw new TRPCError({ code: "CONFLICT", message: "This order changed just now. Please refresh." });
      if (collectCash) await tx.update(payments).set({ status: "paid", paidAt: now, providerReference: `Cash collected by delivery partner #${ctx.user.id}` }).where(eq(payments.orderId, order.id));
    });

    await writeAuditLog({ actor: { id: ctx.user.id, role: ctx.user.role }, action: "delivery_status_changed", orderId: order.id, targetUserId: ctx.user.id, details: { orderNumber: order.orderNumber, from: order.deliveryStatus, to: input.status, cashCollected: collectCash || undefined }, req: ctx.req as never });

    const name = await deliveryBoyName(db, ctx.user.id);
    const copy = deliveryStepCopy(input.status, order.orderNumber, name);
    const admins = await adminRecipients(db);
    if (input.status === "out_for_delivery" || input.status === "delivered") {
      await sendNotifications(db, [{ userId: order.customerUserId, role: "customer" }, await shopOwnerRecipient(db, order.shopId), ...admins], { orderId: order.id, ...copy });
    } else {
      await sendNotifications(db, admins, { orderId: order.id, ...copy });
    }
    return { success: true, deliveryStatus: input.status, deliveredAt: input.status === "delivered" ? now : null };
  }),
});