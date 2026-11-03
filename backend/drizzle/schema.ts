import { boolean, customType, decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/** Binary file contents (up to 16 MB per row). Used for product photos. */
const mediumBlob = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "mediumblob",
});

export const userRoles = ["user", "customer", "admin", "shop_owner", "delivery_boy"] as const;
export const residentVerificationStatuses = ["pending", "verified", "rejected"] as const;
export { ORDER_STATUSES as orderStatuses, ORDER_ITEM_STATUSES as orderItemStatuses } from "../../shared/order-flow";
import { ORDER_ITEM_STATUSES, ORDER_STATUSES } from "../../shared/order-flow";
export const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;
export const paymentMethods = ["online_checkout", "upi_qr", "cash_on_delivery", "pay_after_delivery"] as const;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", userRoles).default("customer").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const residentProfiles = mysqlTable("residentProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  phone: varchar("phone", { length: 32 }),
  fullName: varchar("fullName", { length: 160 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  blockNumber: varchar("blockNumber", { length: 32 }),
  flatNumber: varchar("flatNumber", { length: 32 }),
  apartmentUnit: varchar("apartmentUnit", { length: 32 }).notNull(),
  building: varchar("building", { length: 64 }).default("GreenGate Residences").notNull(),
  verificationStatus: mysqlEnum("verificationStatus", residentVerificationStatuses).default("pending").notNull(),
  verificationNote: varchar("verificationNote", { length: 255 }),
  phoneVerifiedAt: timestamp("phoneVerifiedAt"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  ownerUserId: int("ownerUserId"),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "paused"]).default("active").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).default("12.50").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: varchar("description", { length: 255 }),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const catalogProducts = mysqlTable("catalogProducts", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  categoryId: int("categoryId"),
  shopifyProductId: varchar("shopifyProductId", { length: 255 }).unique(),
  shopifyVariantId: varchar("shopifyVariantId", { length: 255 }),
  handle: varchar("handle", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  countryOfOrigin: varchar("countryOfOrigin", { length: 80 }).default("India").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  compareAtPrice: decimal("compareAtPrice", { precision: 10, scale: 2 }),
  stockQuantity: int("stockQuantity").default(0).notNull(),
  unitLabel: varchar("unitLabel", { length: 40 }).default("each").notNull(),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  customerUserId: int("customerUserId").notNull(),
  shopifyCartId: varchar("shopifyCartId", { length: 255 }).unique(),
  status: mysqlEnum("status", ["active", "converted", "abandoned"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId").notNull(),
  catalogProductId: int("catalogProductId"),
  shopifyVariantId: varchar("shopifyVariantId", { length: 255 }),
  quantity: int("quantity").notNull(),
  unitPriceSnapshot: decimal("unitPriceSnapshot", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 36 }).notNull().unique(),
  customerUserId: int("customerUserId").notNull(),
  shopId: int("shopId").notNull(),
  deliveryUserId: int("deliveryUserId"),
  apartmentUnit: varchar("apartmentUnit", { length: 32 }).notNull(),
  status: mysqlEnum("status", ORDER_STATUSES).default("placed").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", paymentStatuses).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", paymentMethods).default("online_checkout").notNull(),
  paymentProvider: varchar("paymentProvider", { length: 64 }).default("shopify_checkout").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("deliveryFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  note: varchar("note", { length: 500 }),
  placedAt: timestamp("placedAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
  outForDeliveryAt: timestamp("outForDeliveryAt"),
  deliveredAt: timestamp("deliveredAt"),
  packedAt: timestamp("packedAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: varchar("cancelReason", { length: 255 }),
  cancelledByRole: varchar("cancelledByRole", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  catalogProductId: int("catalogProductId"),
  title: varchar("title", { length: 160 }).notNull(),
  variantTitle: varchar("variantTitle", { length: 100 }),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  itemStatus: mysqlEnum("itemStatus", ORDER_ITEM_STATUSES).default("ok").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerReference: varchar("providerReference", { length: 255 }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 8 }).default("USD").notNull(),
  status: mysqlEnum("status", paymentStatuses).default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().unique(),
  shopId: int("shopId").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["pending", "earned", "paid"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const exchangeRequests = mysqlTable("exchangeRequests", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  customerUserId: int("customerUserId").notNull(),
  reason: varchar("reason", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["requested", "approved", "rejected", "completed"]).default("requested").notNull(),
  resolutionNote: varchar("resolutionNote", { length: 500 }),
  reviewedByUserId: int("reviewedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vehicleServiceRequests = mysqlTable("vehicleServiceRequests", {
  id: int("id").autoincrement().primaryKey(),
  residentUserId: int("residentUserId").notNull(),
  serviceKind: mysqlEnum("serviceKind", ["electrician", "plumber", "tuition", "fitness", "car", "bike"]).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  blockNumber: varchar("blockNumber", { length: 32 }).notNull(),
  flatNumber: varchar("flatNumber", { length: 32 }).notNull(),
  selectedServices: text("selectedServices").notNull(),
  issueDescription: varchar("issueDescription", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["submitted", "contacted", "closed"]).default("submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  orderId: int("orderId"),
  audienceRole: mysqlEnum("audienceRole", userRoles).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 64 }).default("order_update").notNull(),
  actionUrl: varchar("actionUrl", { length: 255 }),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const banners = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }),
  imageUrl: text("imageUrl"),
  actionUrl: varchar("actionUrl", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  displayOrder: int("displayOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const appSettings = mysqlTable("appSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue").notNull(),
  updatedByUserId: int("updatedByUserId"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ResidentProfile = typeof residentProfiles.$inferSelect;
/** Uploaded product photos, kept in the database so no outside storage service is needed. */
export const mediaFiles = mysqlTable("mediaFiles", {
  id: int("id").autoincrement().primaryKey(),
  storageKey: varchar("storageKey", { length: 191 }).notNull().unique(),
  mimeType: varchar("mimeType", { length: 64 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  data: mediumBlob("data").notNull(),
  uploadedByUserId: int("uploadedByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type UserRole = (typeof userRoles)[number];

export const communityInvites = mysqlTable("communityInvites", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 120 }),
  apartmentUnit: varchar("apartmentUnit", { length: 32 }).notNull(),
  invitedByUserId: int("invitedByUserId"),
  status: mysqlEnum("status", ["pending", "joined", "revoked"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
