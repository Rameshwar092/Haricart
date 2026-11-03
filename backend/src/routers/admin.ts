import { normalizePhone } from "@shared/phone";
import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { appSettings, banners, catalogProducts, categories, commissions, communityInvites, notifications, orderItems, orders, payments, residentProfiles, shops, users, vehicleServiceRequests } from "../../drizzle/schema";
import { getDb } from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { MAX_SPLASH_DURATION_MS, MIN_SPLASH_DURATION_MS, SPLASH_DURATION_SETTING_KEY, clampSplashDuration } from "@shared/splash-settings";

const categoryInput = z.object({ id: z.number().int().positive().optional(), name: z.string().trim().min(2).max(80), slug: z.string().trim().min(2).max(100), description: z.string().max(255).optional(), isActive: z.boolean().default(true) });
const inventoryInput = z.object({ id: z.number().int().positive(), price: z.string().regex(/^\d+(\.\d{1,2})?$/), stockQuantity: z.number().int().min(0), isAvailable: z.boolean() });
const bannerInput = z.object({ id: z.number().int().positive().optional(), title: z.string().trim().min(2).max(160), subtitle: z.string().max(255).optional(), actionUrl: z.string().max(255).optional(), imageUrl: z.string().url().max(2000).optional(), isActive: z.boolean().default(true), displayOrder: z.number().int().min(0).default(0) });
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
    updateRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["customer", "shop_owner", "delivery_boy", "admin"]) })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId)); return { success: true }; }),
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
      return { order, customer: customer || null, resident: resident || null, items, payment: payment || null };
    }),
    deliveryCandidates: adminProcedure.query(async () => { const db = await getDb(); return db ? db.select().from(users).where(eq(users.role, "delivery_boy")) : []; }),
    assignDelivery: adminProcedure.input(z.object({ orderId: z.number().int().positive(), deliveryUserId: z.number().int().positive() })).mutation(async ({ input }) => { const db = await getDb(); if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" }); await db.update(orders).set({ deliveryUserId: input.deliveryUserId }).where(eq(orders.id, input.orderId)); return { success: true }; }),
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
