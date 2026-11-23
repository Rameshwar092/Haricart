import { normalizePhone } from "@shared/phone";
import { TRPCError } from "@trpc/server";
import { alias } from "drizzle-orm/mysql-core";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { appSettings, auditLogs, banners, catalogProducts, categories, commissions, communityInvites, deliveryAssignments, deliveryPartners, notifications, orderItems, orders, payments, residentProfiles, shops, users, vehicleServiceRequests } from "../../drizzle/schema";
import { getDb } from "../db";
import { isOwnerPhone } from "../_core/env";
import { ADMIN_SETTABLE_ACCOUNT_STATUSES } from "@shared/delivery-flow";
import { writeAuditLog } from "../audit";
import { assignOrder, releaseOpenOrders, requireDb, sendNotifications, unassignOrder } from "../delivery-service";
import { getResidentPhoneOpenId } from "./community";
import { adminProcedure, router } from "../_core/trpc";
import { MAX_SPLASH_DURATION_MS, MIN_SPLASH_DURATION_MS, SPLASH_DURATION_SETTING_KEY, clampSplashDuration } from "@shared/splash-settings";

const categoryInput = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(80), slug: z.string().trim().min(2).max(100), description: z.string().max(255).optional(), isActive: z.boolean().default(true) });
const inventoryInput = z.object({ id: z.number().int().positive(), price: z.string().regex(/^\d+(\.\d{1,2})?$/), stockQuantity: z.number().int().min(0), isAvailable: z.boolean() });
const bannerInput = z.object({ id: z.number().int().positive().optional(), title: z.string().trim().min(2).max(160), subtitle: z.string().max(255).optional(), actionUrl: z.string().max(255).optional(), imageUrl: z.string().url().max(2000).optional(), isActive: z.boolean().default(true), displayOrder: z.number().int().min(0).default(0) });
const deliveryPhoneSchema = z.string().trim().min(8).max(32).transform(normalizePhone).refine(phone => /^\+[1-9]\d{7,14}$/.test(phone), "Enter a valid 10-digit mobile number.");
const deliveryBoyInput = z.object({ fullName: z.string().trim().min(2, "Enter the delivery boy's name.").max(120), phone: deliveryPhoneSchema, notes: z.string().trim().max(500).optional() });

/** Role changes from the general people list. Delivery boys are managed only from the Delivery Team panel. Exported for tests. */
export function checkRoleChange(target: { id: number; role: string } | undefined, newRole: string, actorId: number): { ok: true } | { ok: false; message: string } {
  if (!target) return { ok: false, message: "User not found." };
  if (newRole === "delivery_boy") return { ok: false, message: "Add delivery boys from the Delivery Team panel, so they are checked and activated by you." };
  if (target.role === "delivery_boy") return { ok: false, message: "This is a delivery account. Suspend or deactivate it from the Delivery Team panel." };
  if (target.id === actorId && newRole !== "admin") return { ok: false, message: "You cannot remove your own owner access." };
  return { ok: true };
}

const shopInput = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(120), description: z.string().max(2000).optional(), status: z.enum(["active", "paused"]).default("active"), commissionRate: z.string().regex(/^\d+(\.\d{1,2})?$/), ownerUserId: z.number().int().positive().nullable().optional() });

export const adminRouter = router({
  dashboard: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { orders: 0, paidRevenue: 0, customers: 0, pendingResidents: 0, activeProducts: 0 };
    const [orderCount] = await db.select({ value: sql<number>`count(*)` }).from(orders);
    const [revenue] = await db.select({ value: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(eq(payments.status, "paid"));
    const [customerCount] = await db.select({ value: sql<number>`count(*)` }).from(users).where(eq(users.role, "customer"));
    const [pendingCount] = await db.select({ value: sql<number>`count(*)` }).from(residentProfiles).where(eq(residentProfiles.verificationStatus, "pending"));
    const [productCount] = await db.select({ value: sql<number>`count(*)` }).from(catalogProducts).where(eq(catalogProducts.isAvailable, true));
    return { orders: Number(orderCount?.value || 0), paidRevenue: Number(revenue?.value || 0), customers: Number(customerCount?.value || 0), pendingResidents: Number(pendingCount?.value || 0), activeProducts: Number(productCount?.value || 0) };
  }),
  users: router({
    list: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(users).orderBy(desc(users.createdAt)) : []; }),
    residentApplications: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select({ profile: residentProfiles, name: users.name, email: users.email, role: users.role }).from(residentProfiles).innerJoin(users, eq(residentProfiles.userId, users.id)).orderBy(desc(residentProfiles.createdAt)) : []; }),
    verifyResident: adminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(["verified", "rejected"]), note: z.string().max(255).optional() })).mutation(async ({ input }) => {
      const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(residentProfiles).set({ verificationStatus: input.status, verificationNote: input.note || null, verifiedAt: input.status === "verified" ? new Date() : null }).where(eq(residentProfiles.userId, input.userId));
      return { success: true };
    }),
    updateRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["customer", "shop_owner", "delivery_boy", "admin"]) })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [target] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      const check = checkRoleChange(target, input.role, ctx.user.id);
      if (!check.ok) throw new TRPCError({ code: target ? "BAD_REQUEST" : "NOT_FOUND", message: check.message });
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      await writeAuditLog({ actor: { id: ctx.user.id, role: ctx.user.role }, action: "role_changed", targetUserId: input.userId, details: { from: target!.role, to: input.role }, req: ctx.req as never });
      return { success: true };
    }),
  }),
  catalog: router({
    categories: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(categories).orderBy(categories.displayOrder) : []; }),
    products: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(catalogProducts).orderBy(desc(catalogProducts.updatedAt)) : []; }),
    saveCategory: adminProcedure.input(categoryInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); if (input.id) { await db.update(categories).set({ name: input.name, slug: input.slug, description: input.description || null, isActive: input.isActive }).where(eq(categories.id, input.id)); } else { await db.insert(categories).values({ name: input.name, slug: input.slug, description: input.description, isActive: input.isActive }); } return { success: true }; }),
    deleteCategory: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(catalogProducts).set({ categoryId: null }).where(eq(catalogProducts.categoryId, input.id)); await db.delete(categories).where(eq(categories.id, input.id)); return { success: true }; }),
    updateInventory: adminProcedure.input(inventoryInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(catalogProducts).set({ price: input.price, stockQuantity: input.stockQuantity, isAvailable: input.isAvailable }).where(eq(catalogProducts.id, input.id)); return { success: true }; }),
    deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.delete(catalogProducts).where(eq(catalogProducts.id, input.id)); return { success: true }; }),
  }),
  roadmap: router({
    readiness: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { metrics: { verifiedResidents: 0, activeShops: 0, availableProducts: 0, deliveryPartners: 0, totalOrders: 0, openOrders: 0, deliveredOrders: 0, averageOrderValue: 0, stockOuts: 0, serviceRequests: 0, openServiceRequests: 0 }, gates: { residentValidation: "pending", supplierSetup: "pending", complianceReview: "pending", qaStatus: "pending", pilotStatus: "pending", expansionStatus: "pending" }, settings: { pilotApartments: "2", notes: "" } };
      const [[verified], [activeShops], [availableProducts], [deliveryPartners], [totalOrders], [openOrders], [deliveredOrders], [averageOrderValue], [stockOuts], [serviceRequests], [openServiceRequests]] = await Promise.all([
        db.select({ value: sql<number>`count(*)` }).from(residentProfiles).where(eq(residentProfiles.verificationStatus, "verified")),
        db.select({ value: sql<number>`count(*)` }).from(shops).where(eq(shops.status, "active")),
        db.select({ value: sql<number>`count(*)` }).from(catalogProducts).where(sql`${catalogProducts.isAvailable} = true and ${catalogProducts.stockQuantity} > 0`),
        db.select({ value: sql<number>`count(*)` }).from(users).where(eq(users.role, "delivery_boy")),
        db.select({ value: sql<number>`count(*)` }).from(orders),
        db.select({ value: sql<number>`count(*)` }).from(orders).where(sql`${orders.status} not in ('delivered', 'cancelled')`),
        db.select({ value: sql<number>`count(*)` }).from(orders).where(eq(orders.status, "delivered")),
        db.select({ value: sql<number>`coalesce(avg(${orders.total}), 0)` }).from(orders).where(sql`${orders.status} <> 'cancelled'`),
        db.select({ value: sql<number>`count(*)` }).from(catalogProducts).where(sql`${catalogProducts.stockQuantity} <= 0 and ${catalogProducts.isAvailable} = true`),
        db.select({ value: sql<number>`count(*)` }).from(vehicleServiceRequests),
        db.select({ value: sql<number>`count(*)` }).from(vehicleServiceRequests).where(sql`${vehicleServiceRequests.status} <> 'closed'`),
      ]);
      const settingRows = await db.select({ key: appSettings.settingKey, value: appSettings.settingValue }).from(appSettings).where(sql`${appSettings.settingKey} like 'roadmap_%'`);
      const settingMap = Object.fromEntries(settingRows.map(row => [row.key, row.value]));
      return {
        metrics: {
          verifiedResidents: Number(verified?.value || 0), activeShops: Number(activeShops?.value || 0), availableProducts: Number(availableProducts?.value || 0), deliveryPartners: Number(deliveryPartners?.value || 0), totalOrders: Number(totalOrders?.value || 0), openOrders: Number(openOrders?.value || 0), deliveredOrders: Number(deliveredOrders?.value || 0), averageOrderValue: Number(Number(averageOrderValue?.value || 0).toFixed(2)), stockOuts: Number(stockOuts?.value || 0), serviceRequests: Number(serviceRequests?.value || 0), openServiceRequests: Number(openServiceRequests?.value || 0),
        },
        gates: { residentValidation: settingMap.roadmap_resident_validation || "pending", supplierSetup: settingMap.roadmap_supplier_setup || "pending", complianceReview: settingMap.roadmap_compliance_review || "pending", qaStatus: settingMap.roadmap_qa_status || "pending", pilotStatus: settingMap.roadmap_pilot_status || "pending", expansionStatus: settingMap.roadmap_expansion_status || "pending" },
        settings: { pilotApartments: settingMap.roadmap_pilot_apartments || "2", notes: settingMap.roadmap_notes || "" },
      };
    }),
    saveSetting: adminProcedure.input(z.object({ key: z.enum(["roadmap_resident_validation", "roadmap_supplier_setup", "roadmap_compliance_review", "roadmap_qa_status", "roadmap_pilot_status", "roadmap_expansion_status", "roadmap_pilot_apartments", "roadmap_notes"]), value: z.string().trim().max(1000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(appSettings).values({ settingKey: input.key, settingValue: input.value, updatedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { settingValue: input.value, updatedByUserId: ctx.user.id } });
      return { success: true, key: input.key, value: input.value };
    }),
  }),
  operations: router({
    orders: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(orders).orderBy(desc(orders.createdAt)) : []; }),
    orderDetails: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      const [customer] = await db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(eq(users.id, order.customerUserId)).limit(1);
      const [resident] = await db.select().from(residentProfiles).where(eq(residentProfiles.userId, order.customerUserId)).limit(1);
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
      const { passwordHash: _passwordHash, ...safeResident } = resident || ({} as typeof residentProfiles.$inferSelect);
      return { order, customer: customer || null, resident: resident ? safeResident : null, items, payment: payment || null };
    }),
    /** Only ACTIVE delivery boys can be picked for an order. */
    deliveryCandidates: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: users.id, name: sql<string>`coalesce(${deliveryPartners.fullName}, ${users.name})`, phone: deliveryPartners.phone }).from(users).leftJoin(deliveryPartners, eq(deliveryPartners.userId, users.id)).where(and(eq(users.role, "delivery_boy"), eq(users.accountStatus, "active")));
    }),
    assignDelivery: adminProcedure.input(z.object({ orderId: z.number().int().positive(), deliveryUserId: z.number().int().positive(), reason: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => assignOrder({ ...input, actor: { id: ctx.user.id, role: ctx.user.role }, req: ctx.req as never })),
    shops: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(shops).orderBy(desc(shops.createdAt)) : []; }),
    saveShop: adminProcedure.input(shopInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const values = { name: input.name, description: input.description || null, status: input.status, commissionRate: input.commissionRate, ownerUserId: input.ownerUserId ?? null }; if (input.id) await db.update(shops).set(values).where(eq(shops.id, input.id)); else await db.insert(shops).values(values); return { success: true }; }),
    deleteShop: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [usage] = await db.select({ value: sql<number>`count(*)` }).from(catalogProducts).where(eq(catalogProducts.shopId, input.id)); if (Number(usage?.value || 0) > 0) throw new TRPCError({ code: "CONFLICT", message: "This shop still has catalog products. Pause it or remove its products before deleting." }); await db.delete(shops).where(eq(shops.id, input.id)); return { success: true }; }),
    payments: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(payments).orderBy(desc(payments.createdAt)) : []; }),
    updatePayment: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "paid", "failed", "refunded"]), providerReference: z.string().max(255).optional() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const [payment] = await db.select({ orderId: payments.orderId }).from(payments).where(eq(payments.id, input.id)).limit(1); if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment record not found." }); await db.update(payments).set({ status: input.status, providerReference: input.providerReference || null, paidAt: input.status === "paid" ? new Date() : null }).where(eq(payments.id, input.id)); await db.update(orders).set({ paymentStatus: input.status }).where(eq(orders.id, payment.orderId)); return { success: true }; }),
    market: adminProcedure.query(async () => { const db = await getDb(); if (!db) return { isOpen: true }; const [setting] = await db.select({ value: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, "market_status")).limit(1); return { isOpen: setting?.value !== "off" }; }),
    setMarket: adminProcedure.input(z.object({ isOpen: z.boolean() })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.insert(appSettings).values({ settingKey: "market_status", settingValue: input.isOpen ? "on" : "off", updatedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { settingValue: input.isOpen ? "on" : "off", updatedByUserId: ctx.user.id } }); return { success: true, isOpen: input.isOpen }; }),
    commissions: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(commissions).orderBy(desc(commissions.createdAt)) : []; }),
    reports: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { totalOrders: 0, totalRevenue: 0, totalCommission: 0, codOrders: 0, onlineOrders: 0, paidOrders: 0 };
      const [orderStats] = await db.select({ count: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${orders.total}), 0)` }).from(orders).where(sql`${orders.status} <> 'cancelled'`);
      const [commissionStats] = await db.select({ total: sql<number>`coalesce(sum(${commissions.amount}), 0)` }).from(commissions);
      const [codCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(sql`${orders.paymentMethod} = 'cash_on_delivery' and ${orders.status} <> 'cancelled'`);
      const totalOrdersNum = Number(orderStats?.count || 0);
      const codOrdersNum = Number(codCount?.count || 0);
      const onlineOrdersNum = Math.max(0, totalOrdersNum - codOrdersNum);
      const [paidCount] = await db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.paymentStatus, "paid"));
      return {
        totalOrders: Number(orderStats?.count || 0),
        totalRevenue: Number(orderStats?.revenue || 0),
        totalCommission: Number(commissionStats?.total || 0),
        codOrders: Number(codCount?.count || 0),
        onlineOrders: onlineOrdersNum,
        paidOrders: Number(paidCount?.count || 0),
      };
    }),
  }),
  /** Delivery team: only the owner/admin can add, activate, suspend or deactivate delivery boys. */
  delivery: router({
    team: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        userId: users.id, userName: users.name, accountStatus: users.accountStatus, lastSignedIn: users.lastSignedIn, createdAt: users.createdAt,
        fullName: deliveryPartners.fullName, phone: deliveryPartners.phone, notes: deliveryPartners.notes, activatedAt: deliveryPartners.activatedAt, statusReason: deliveryPartners.statusReason, statusChangedAt: deliveryPartners.statusChangedAt,
      }).from(users).leftJoin(deliveryPartners, eq(deliveryPartners.userId, users.id)).where(eq(users.role, "delivery_boy")).orderBy(desc(users.createdAt));
      if (!rows.length) return [];
      const counts = await db.select({
        deliveryUserId: orders.deliveryUserId,
        active: sql<number>`coalesce(sum(case when ${orders.status} not in ('delivered', 'cancelled') then 1 else 0 end), 0)`,
        delivered: sql<number>`coalesce(sum(case when ${orders.status} = 'delivered' then 1 else 0 end), 0)`,
      }).from(orders).where(inArray(orders.deliveryUserId, rows.map(row => row.userId))).groupBy(orders.deliveryUserId);
      return rows.map(row => {
        const count = counts.find(item => item.deliveryUserId === row.userId);
        return { userId: row.userId, name: row.fullName || row.userName || `Delivery partner #${row.userId}`, phone: row.phone, notes: row.notes, accountStatus: row.accountStatus, lastSignedIn: row.lastSignedIn, createdAt: row.createdAt, activatedAt: row.activatedAt, statusReason: row.statusReason, statusChangedAt: row.statusChangedAt, activeOrders: Number(count?.active || 0), deliveredOrders: Number(count?.delivered || 0) };
      });
    }),
    /** Creates the delivery boy's own account. It stays "waiting" until the owner activates it. */
    add: adminProcedure.input(deliveryBoyInput).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      if (isOwnerPhone(input.phone)) throw new TRPCError({ code: "BAD_REQUEST", message: "This is one of the owner's numbers. Use a different number for the delivery boy." });
      const openId = getResidentPhoneOpenId(input.phone);
      const [existing] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.openId, openId)).limit(1);
      if (existing?.role === "admin" || existing?.role === "shop_owner") throw new TRPCError({ code: "CONFLICT", message: "This number already belongs to an owner or shop account." });
      if (existing?.role === "delivery_boy") throw new TRPCError({ code: "CONFLICT", message: "This number is already in your delivery team." });
      const [samePhone] = await db.select({ id: deliveryPartners.id }).from(deliveryPartners).where(eq(deliveryPartners.phone, input.phone)).limit(1);
      if (samePhone) throw new TRPCError({ code: "CONFLICT", message: "This number is already in your delivery team." });
      const userId = await db.transaction(async tx => {
        let id = existing?.id;
        if (id) await tx.update(users).set({ role: "delivery_boy", accountStatus: "pending", name: input.fullName }).where(eq(users.id, id));
        else {
          const [created] = await tx.insert(users).values({ openId, name: input.fullName, loginMethod: "phone", role: "delivery_boy", accountStatus: "pending" }).$returningId();
          id = created?.id;
        }
        if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create the delivery account." });
        await tx.insert(deliveryPartners).values({ userId: id, fullName: input.fullName, phone: input.phone, notes: input.notes || null, createdByUserId: ctx.user.id, statusChangedAt: new Date() });
        return id;
      });
      await writeAuditLog({ actor: { id: ctx.user.id, role: ctx.user.role }, action: "delivery_boy_created", targetUserId: userId, details: { fullName: input.fullName, phone: input.phone, convertedExistingAccount: Boolean(existing) }, req: ctx.req as never });
      return { success: true, userId, accountStatus: "pending" as const, convertedExistingAccount: Boolean(existing) };
    }),
    update: adminProcedure.input(z.object({ userId: z.number().int().positive(), fullName: z.string().trim().min(2).max(120), notes: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (target?.role !== "delivery_boy") throw new TRPCError({ code: "NOT_FOUND", message: "Delivery boy not found." });
      await db.update(deliveryPartners).set({ fullName: input.fullName, notes: input.notes || null }).where(eq(deliveryPartners.userId, input.userId));
      await db.update(users).set({ name: input.fullName }).where(eq(users.id, input.userId));
      await writeAuditLog({ actor: { id: ctx.user.id, role: ctx.user.role }, action: "delivery_boy_updated", targetUserId: input.userId, details: { fullName: input.fullName }, req: ctx.req as never });
      return { success: true };
    }),
    /** Activate, suspend or deactivate. Takes effect on the delivery boy's very next request. */
    setStatus: adminProcedure.input(z.object({ userId: z.number().int().positive(), status: z.enum(ADMIN_SETTABLE_ACCOUNT_STATUSES), reason: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [target] = await db.select({ id: users.id, role: users.role, accountStatus: users.accountStatus }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target || target.role !== "delivery_boy") throw new TRPCError({ code: "NOT_FOUND", message: "Delivery boy not found." });
      if (target.accountStatus === input.status) throw new TRPCError({ code: "BAD_REQUEST", message: `This account is already ${input.status}.` });
      const now = new Date();
      await db.update(users).set({ accountStatus: input.status }).where(eq(users.id, target.id));
      await db.update(deliveryPartners).set({ statusReason: input.reason || null, statusChangedAt: now, ...(input.status === "active" ? { activatedByUserId: ctx.user.id, activatedAt: now } : {}) }).where(eq(deliveryPartners.userId, target.id));
      await writeAuditLog({ actor: { id: ctx.user.id, role: ctx.user.role }, action: "account_status_changed", targetUserId: target.id, details: { from: target.accountStatus, to: input.status, reason: input.reason || null }, req: ctx.req as never });
      let released = { released: 0, stillOutForDelivery: 0 };
      if (input.status !== "active") released = await releaseOpenOrders(db, target.id, { id: ctx.user.id, role: ctx.user.role }, `Delivery boy ${input.status}`, ctx.req as never);
      if (input.status === "active") await sendNotifications(db, [{ userId: target.id, role: "delivery_boy" }], { title: "Your delivery account is active", body: "The owner activated your HariCart delivery account. You will get orders here.", type: "account" });
      return { success: true, status: input.status, ...released };
    }),
    assign: adminProcedure.input(z.object({ orderId: z.number().int().positive(), deliveryUserId: z.number().int().positive(), reason: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => assignOrder({ ...input, actor: { id: ctx.user.id, role: ctx.user.role }, req: ctx.req as never })),
    unassign: adminProcedure.input(z.object({ orderId: z.number().int().positive(), reason: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => unassignOrder({ ...input, actor: { id: ctx.user.id, role: ctx.user.role }, req: ctx.req as never })),
    /** Orders for the assignment board: everything still open, plus the latest deliveries. */
    board: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return { open: [], delivered: [] };
      const columns = { id: orders.id, orderNumber: orders.orderNumber, apartmentUnit: orders.apartmentUnit, status: orders.status, deliveryStatus: orders.deliveryStatus, deliveryUserId: orders.deliveryUserId, total: orders.total, paymentMethod: orders.paymentMethod, paymentStatus: orders.paymentStatus, placedAt: orders.placedAt, assignedAt: orders.assignedAt, acceptedAt: orders.acceptedAt, pickedUpAt: orders.pickedUpAt, outForDeliveryAt: orders.outForDeliveryAt, deliveredAt: orders.deliveredAt, deliveryBoyName: sql<string | null>`coalesce(${deliveryPartners.fullName}, ${users.name})` };
      const open = await db.select(columns).from(orders).leftJoin(users, eq(users.id, orders.deliveryUserId)).leftJoin(deliveryPartners, eq(deliveryPartners.userId, orders.deliveryUserId)).where(sql`${orders.status} not in ('delivered', 'cancelled')`).orderBy(desc(orders.placedAt)).limit(100);
      const delivered = await db.select(columns).from(orders).leftJoin(users, eq(users.id, orders.deliveryUserId)).leftJoin(deliveryPartners, eq(deliveryPartners.userId, orders.deliveryUserId)).where(eq(orders.status, "delivered")).orderBy(desc(orders.deliveredAt)).limit(20);
      return { open, delivered };
    }),
    history: adminProcedure.input(z.object({ orderId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const boy = alias(users, "boy");
      const previousBoy = alias(users, "previousBoy");
      const by = alias(users, "by");
      return db.select({ id: deliveryAssignments.id, action: deliveryAssignments.action, reason: deliveryAssignments.reason, createdAt: deliveryAssignments.createdAt, deliveryBoy: boy.name, previousDeliveryBoy: previousBoy.name, assignedBy: by.name })
        .from(deliveryAssignments).leftJoin(boy, eq(boy.id, deliveryAssignments.deliveryUserId)).leftJoin(previousBoy, eq(previousBoy.id, deliveryAssignments.previousDeliveryUserId)).leftJoin(by, eq(by.id, deliveryAssignments.assignedByUserId))
        .where(eq(deliveryAssignments.orderId, input.orderId)).orderBy(desc(deliveryAssignments.createdAt), desc(deliveryAssignments.id));
    }),
    /** Security record: logins, status changes, assignments and delivery steps. */
    audit: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(500).default(100) }).optional()).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const actor = alias(users, "actor");
      const target = alias(users, "target");
      return db.select({ id: auditLogs.id, action: auditLogs.action, actorRole: auditLogs.actorRole, actorName: actor.name, targetName: target.name, orderId: auditLogs.orderId, details: auditLogs.details, ipAddress: auditLogs.ipAddress, createdAt: auditLogs.createdAt })
        .from(auditLogs).leftJoin(actor, eq(actor.id, auditLogs.actorUserId)).leftJoin(target, eq(target.id, auditLogs.targetUserId))
        .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(input?.limit ?? 100);
    }),
  }),
  invites: router({
    list: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(communityInvites).orderBy(desc(communityInvites.createdAt)) : []; }),
    add: adminProcedure.input(z.object({ phone: z.string().min(8).max(32), name: z.string().max(120).optional(), apartmentUnit: z.string().min(1).max(32) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const phone = normalizePhone(input.phone);
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid 10-digit mobile number." });
      await db.insert(communityInvites).values({ phone, name: input.name || null, apartmentUnit: input.apartmentUnit, invitedByUserId: ctx.user.id, status: "pending" })
        .onDuplicateKeyUpdate({ set: { name: input.name || null, apartmentUnit: input.apartmentUnit } });
      return { success: true };
    }),
    revoke: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(communityInvites).set({ status: "revoked" }).where(eq(communityInvites.id, input.id));
      return { success: true };
    }),
  }),
  brand: router({
    banners: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(banners).orderBy(banners.displayOrder) : []; }),
    settings: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(appSettings).orderBy(appSettings.settingKey) : []; }),
    saveBanner: adminProcedure.input(bannerInput).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const values = { title: input.title, subtitle: input.subtitle || null, imageUrl: input.imageUrl || null, actionUrl: input.actionUrl || null, isActive: input.isActive, displayOrder: input.displayOrder }; if (input.id) await db.update(banners).set(values).where(eq(banners.id, input.id)); else await db.insert(banners).values(values); return { success: true }; }),
    deleteBanner: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.delete(banners).where(eq(banners.id, input.id)); return { success: true }; }),
    saveSetting: adminProcedure.input(z.object({ key: z.string().min(2).max(100), value: z.string().max(2000) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.insert(appSettings).values({ settingKey: input.key, settingValue: input.value, updatedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { settingValue: input.value, updatedByUserId: ctx.user.id } }); return { success: true }; }),
    setSplashDuration: adminProcedure.input(z.object({ durationMs: z.number().int().min(MIN_SPLASH_DURATION_MS).max(MAX_SPLASH_DURATION_MS) })).mutation(async ({ ctx, input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const durationMs = clampSplashDuration(input.durationMs); await db.insert(appSettings).values({ settingKey: SPLASH_DURATION_SETTING_KEY, settingValue: String(durationMs), updatedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { settingValue: String(durationMs), updatedByUserId: ctx.user.id } }); return { success: true, durationMs }; }),
  }),
  notifications: router({
    broadcast: adminProcedure.input(z.object({ title: z.string().trim().min(2).max(160), body: z.string().trim().min(2).max(1000), audience: z.enum(["all", "customer", "shop_owner", "delivery_boy"]) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); const recipients = input.audience === "all" ? await db.select({ id: users.id, role: users.role }).from(users) : await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.role, input.audience)); if (recipients.length) await db.insert(notifications).values(recipients.map(user => ({ userId: user.id, audienceRole: user.role, title: input.title, body: input.body, type: "admin_broadcast" }))); return { sent: recipients.length }; }),
  }),
});