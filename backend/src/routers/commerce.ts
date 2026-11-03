/**
 * Commerce router — backend-agnostic tRPC surface for the storefront.
 *
 * The router is intentionally thin: zod validates input, then delegates to the
 * named functions exported from `server/_core/shopify`. If we ever swap
 * commerce backends, only `_core/shopify.ts` + `_core/shopifyNormalize.ts`
 * change — this router stays put.
 */

import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  addCartLines,
  createCart,
  getCart,
  getCollectionByHandle,
  listCollections,
  removeCartLines,
  updateCartLines,
} from "../_core/shopify";
import type { CartLineInput, CartLineUpdate } from "../_core/shopify";
import { appSettings, cartItems, carts, catalogProducts } from "../../drizzle/schema";
import type { Cart, Product } from "@shared/commerce/types";
import { getDb, getVerifiedResidentProfile } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { AVAILABILITY_SETTING_KEY, DEFAULT_CATEGORY_AVAILABILITY, getProductAvailabilityCategory, parseCategoryAvailability, isCategoryAvailable } from "@shared/category-availability";
import { DAILY_DISCOUNT_BANNERS_SETTING_KEY, DAILY_DISCOUNT_BANNER_SETTING_KEY, DEFAULT_DAILY_DISCOUNT_BANNERS, parseDailyDiscountBanners } from "@shared/daily-discount";
import { DEFAULT_SPLASH_DURATION_MS, SPLASH_DURATION_SETTING_KEY, parseSplashDuration } from "@shared/splash-settings";

export function isMarketOpenValue(settingValue: string | null | undefined) {
  return settingValue !== "off";
}

export async function isMarketOpen() {
  const db = await getDb();
  if (!db) return true;
  const [setting] = await db.select({ value: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, "market_status")).limit(1);
  return isMarketOpenValue(setting?.value);
}

export function isPublishedLocalCatalogProduct(product: typeof catalogProducts.$inferSelect) {
  return Boolean(product.isAvailable && product.stockQuantity > 0);
}

export function filterPublishedLocalCatalogProducts<T extends typeof catalogProducts.$inferSelect>(products: T[]) {
  return products.filter(isPublishedLocalCatalogProduct);
}

export function selectCustomerLocalCatalogProducts<T extends typeof catalogProducts.$inferSelect>(products: T[], first = 24): Product[] {
  return filterPublishedLocalCatalogProducts(products).slice(0, first).map(normalizeLocalCatalogProduct);
}

export function normalizeLocalCatalogProduct(product: typeof catalogProducts.$inferSelect): Product {
  const price = { amount: String(product.price), currencyCode: "INR" };
  const compareAtPrice = product.compareAtPrice ? { amount: String(product.compareAtPrice), currencyCode: "INR" } : null;
  const variantId = product.shopifyVariantId || `local:${product.id}`;
  return {
    id: `local:${product.id}`,
    handle: product.handle,
    title: product.name,
    description: product.description || `${product.name} · ${product.unitLabel}`,
    descriptionHtml: "",
    productType: "Local catalog",
    vendor: "HariCart",
    tags: [product.categoryId ? String(product.categoryId) : (/fruit|apple|banana|mango|orange|grape|papaya|guava|pomegranate|kiwi|melon|lemon/i.test(product.name + product.description) ? "Fresh Fruit" : "Fresh Vegetable")],
    images: product.imageUrl ? [{ url: product.imageUrl, altText: product.name }] : [],
    priceRange: { min: price, max: price },
    options: [{ name: "Unit", values: [product.unitLabel] }],
    isLocalCatalogItem: true,
    stockQuantity: product.stockQuantity,
    unitLabel: product.unitLabel,
    variants: [{
      id: variantId,
      title: product.unitLabel,
      price,
      compareAtPrice,
      availableForSale: isPublishedLocalCatalogProduct(product),
      selectedOptions: [{ name: "Unit", value: product.unitLabel }],
    }],
  };
}

const cartLineInputSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

const cartLineUpdateSchema = z.object({
  lineId: z.string().min(1),
  /** 0 means "remove this line" — the route forwards to removeLines. */
  quantity: z.number().int().min(0).max(99),
});

const LOCAL_CART_PREFIX = "local:cart:";
const LOCAL_LINE_PREFIX = "local:line:";

function parseLocalId(value: string, prefix: string) {
  if (!value.startsWith(prefix)) return null;
  const id = Number(value.slice(prefix.length));
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isLocalVariantId(value: string) {
  return parseLocalId(value, "local:") !== null;
}

function localCartId(id: number) {
  return `${LOCAL_CART_PREFIX}${id}`;
}

function localLineId(id: number) {
  return `${LOCAL_LINE_PREFIX}${id}`;
}

async function getLocalProductsForLines(lines: CartLineInput[]) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const productIds = Array.from(new Set(lines.map(line => parseLocalId(line.variantId, "local:")).filter((id): id is number => id !== null)));
  if (productIds.length !== lines.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Local catalog items cannot be mixed with online-store items in the same bag." });
  const products = await db.select().from(catalogProducts).where(inArray(catalogProducts.id, productIds));
  const [availabilitySetting] = await db.select({ value: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, AVAILABILITY_SETTING_KEY)).limit(1);
  const availabilitySettings = parseCategoryAvailability(availabilitySetting?.value);
  const byId = new Map(products.map(product => [product.id, product]));
  return lines.map(line => {
    const productId = parseLocalId(line.variantId, "local:");
    const product = productId ? byId.get(productId) : undefined;
    if (!product || !isPublishedLocalCatalogProduct(product)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This local product is no longer available." });
    const productCategory = getProductAvailabilityCategory(product.name, product.description, product.categoryId ? [String(product.categoryId)] : []);
    if (!isCategoryAvailable(availabilitySettings, productCategory)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This product is not available at this time. Please check the category timing later." });
    if (line.quantity > product.stockQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: `${product.name} has only ${product.stockQuantity} in stock.` });
    return { line, product };
  });
}

async function getLocalCart(cartId: string, userId?: number): Promise<Cart | null> {
  const cartNumericId = parseLocalId(cartId, LOCAL_CART_PREFIX);
  if (!cartNumericId) return null;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartNumericId), eq(carts.status, "active"))).limit(1);
  if (!cart) return null;
  if (userId !== undefined && cart.customerUserId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "This basket belongs to another customer." });
  const rows = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
  const productIds = rows.map(row => row.catalogProductId).filter((id): id is number => id !== null);
  const products = productIds.length ? await db.select().from(catalogProducts).where(inArray(catalogProducts.id, productIds)) : [];
  const productById = new Map(products.map(product => [product.id, product]));
  const items = rows.flatMap(row => {
    const product = row.catalogProductId ? productById.get(row.catalogProductId) : undefined;
    if (!product) return [];
    const unitPrice = { amount: String(row.unitPriceSnapshot), currencyCode: "INR" };
    return [{ lineId: localLineId(row.id), variantId: `local:${product.id}`, productHandle: product.handle, productTitle: product.name, variantTitle: product.unitLabel, image: product.imageUrl ? { url: product.imageUrl, altText: product.name } : null, unitPrice, quantity: row.quantity, lineTotal: { amount: (Number(row.unitPriceSnapshot) * row.quantity).toFixed(2), currencyCode: "INR" } }];
  });
  const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal.amount), 0).toFixed(2);
  return { id: cartId, checkoutUrl: "", items, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: { amount: subtotal, currencyCode: "INR" }, total: { amount: subtotal, currencyCode: "INR" } };
}

async function createLocalCart(lines: CartLineInput[], userId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const validated = await getLocalProductsForLines(lines);
  const [created] = await db.insert(carts).values({ customerUserId: userId, status: "active" }).$returningId();
  if (!created?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create the basket." });
  await db.insert(cartItems).values(validated.map(({ line, product }) => ({ cartId: created.id, catalogProductId: product.id, shopifyVariantId: product.shopifyVariantId, quantity: line.quantity, unitPriceSnapshot: product.price })));
  const cart = await getLocalCart(localCartId(created.id), userId);
  if (!cart) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load the new basket." });
  return cart;
}

async function addLocalCartLines(cartId: string, lines: CartLineInput[], userId: number) {
  const cartNumericId = parseLocalId(cartId, LOCAL_CART_PREFIX);
  if (!cartNumericId) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid local basket." });
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartNumericId), eq(carts.status, "active"), eq(carts.customerUserId, userId))).limit(1);
  if (!cart) throw new TRPCError({ code: "NOT_FOUND", message: "Basket not found." });
  const validated = await getLocalProductsForLines(lines);
  for (const { line, product } of validated) {
    const [existing] = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.catalogProductId, product.id))).limit(1);
    if (existing) {
      const nextQuantity = existing.quantity + line.quantity;
      if (nextQuantity > product.stockQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: `${product.name} has only ${product.stockQuantity} in stock.` });
      await db.update(cartItems).set({ quantity: nextQuantity }).where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, catalogProductId: product.id, shopifyVariantId: product.shopifyVariantId, quantity: line.quantity, unitPriceSnapshot: product.price });
    }
  }
  const updated = await getLocalCart(cartId, userId);
  if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load the basket." });
  return updated;
}

async function updateLocalCartLines(cartId: string, updates: CartLineUpdate[], userId: number) {
  const cartNumericId = parseLocalId(cartId, LOCAL_CART_PREFIX);
  if (!cartNumericId) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid local basket." });
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartNumericId), eq(carts.status, "active"), eq(carts.customerUserId, userId))).limit(1);
  if (!cart) throw new TRPCError({ code: "NOT_FOUND", message: "Basket not found." });
  const [availabilitySetting] = await db.select({ value: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, AVAILABILITY_SETTING_KEY)).limit(1);
  const availabilitySettings = parseCategoryAvailability(availabilitySetting?.value);
  for (const update of updates) {
    const itemId = parseLocalId(update.lineId, LOCAL_LINE_PREFIX);
    if (!itemId) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid local basket line." });
    const [item] = await db.select().from(cartItems).where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cart.id))).limit(1);
    if (!item) continue;
    if (update.quantity === 0) {
      await db.delete(cartItems).where(eq(cartItems.id, item.id));
      continue;
    }
    const productId = item.catalogProductId;
    const [product] = productId ? await db.select().from(catalogProducts).where(eq(catalogProducts.id, productId)).limit(1) : [];
    if (!product || !isPublishedLocalCatalogProduct(product) || update.quantity > product.stockQuantity) throw new TRPCError({ code: "BAD_REQUEST", message: "The requested quantity is no longer available." });
    const productCategory = getProductAvailabilityCategory(product.name, product.description, product.categoryId ? [String(product.categoryId)] : []);
    if (!isCategoryAvailable(availabilitySettings, productCategory)) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This product is not available at this time. Please check the category timing later." });
    await db.update(cartItems).set({ quantity: update.quantity }).where(eq(cartItems.id, item.id));
  }
  const updated = await getLocalCart(cartId, userId);
  if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load the basket." });
  return updated;
}

async function removeLocalCartLines(cartId: string, lineIds: string[], userId: number) {
  const cartNumericId = parseLocalId(cartId, LOCAL_CART_PREFIX);
  if (!cartNumericId) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid local basket." });
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [cart] = await db.select().from(carts).where(and(eq(carts.id, cartNumericId), eq(carts.status, "active"), eq(carts.customerUserId, userId))).limit(1);
  if (!cart) throw new TRPCError({ code: "NOT_FOUND", message: "Basket not found." });
  const itemIds = lineIds.map(lineId => parseLocalId(lineId, LOCAL_LINE_PREFIX)).filter((id): id is number => id !== null);
  if (itemIds.length) await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), inArray(cartItems.id, itemIds)));
  const updated = await getLocalCart(cartId, userId);
  if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to load the basket." });
  return updated;
}

export async function getCustomerCart(cartId: string, userId?: number) {
  if (cartId.startsWith(LOCAL_CART_PREFIX)) {
    if (userId === undefined) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in to access your local basket." });
    return getLocalCart(cartId, userId);
  }
  return getCart(cartId);
}

export const commerceRouter = router({
  dailyDiscountBanner: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { banners: DEFAULT_DAILY_DISCOUNT_BANNERS };
    const settings = await db.select({ key: appSettings.settingKey, value: appSettings.settingValue }).from(appSettings).where(inArray(appSettings.settingKey, [DAILY_DISCOUNT_BANNERS_SETTING_KEY, DAILY_DISCOUNT_BANNER_SETTING_KEY]));
    const categorySetting = settings.find(setting => setting.key === DAILY_DISCOUNT_BANNERS_SETTING_KEY);
    const legacySetting = settings.find(setting => setting.key === DAILY_DISCOUNT_BANNER_SETTING_KEY);
    return { banners: categorySetting ? parseDailyDiscountBanners(categorySetting.value) : parseDailyDiscountBanners(legacySetting?.value) };
  }),
  splashSettings: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { durationMs: DEFAULT_SPLASH_DURATION_MS };
    const [setting] = await db.select({ value: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, SPLASH_DURATION_SETTING_KEY)).limit(1);
    return { durationMs: parseSplashDuration(setting?.value) };
  }),
  availability: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { settings: DEFAULT_CATEGORY_AVAILABILITY, checkedAt: new Date().toISOString() };
    const [setting] = await db.select({ value: appSettings.settingValue }).from(appSettings).where(eq(appSettings.settingKey, AVAILABILITY_SETTING_KEY)).limit(1);
    const settings = parseCategoryAvailability(setting?.value);
    return { settings, checkedAt: new Date().toISOString(), available: Object.fromEntries(Object.keys(settings).map(key => [key, isCategoryAvailable(settings, key as keyof typeof settings)])) };
  }),
  products: router({
    list: publicProcedure
      .input(
        z
          .object({
            first: z.number().int().min(1).max(100).optional(),
            collectionHandle: z.string().min(1).optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const options = input ?? {};
        const db = await getDb();
        if (!db) return [];
        const localRows = await db.select().from(catalogProducts)
          .where(and(eq(catalogProducts.isAvailable, true), gt(catalogProducts.stockQuantity, 0)))
          .orderBy(desc(catalogProducts.updatedAt))
          .limit(options.first ?? 24);
        return selectCustomerLocalCatalogProducts(localRows, options.first ?? 24);
      }),
    byHandle: publicProcedure
      .input(z.object({ handle: z.string().min(1) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found in the HariCart local catalog." });
        const [localProduct] = await db.select().from(catalogProducts).where(eq(catalogProducts.handle, input.handle)).limit(1);
        if (localProduct && isPublishedLocalCatalogProduct(localProduct)) return normalizeLocalCatalogProduct(localProduct);
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found in the HariCart local catalog." });
      }),
  }),
  collections: router({
    list: publicProcedure
      .input(z.object({ first: z.number().int().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        return listCollections(input?.first);
      }),
    byHandle: publicProcedure
      .input(z.object({ handle: z.string().min(1) }))
      .query(async ({ input }) => {
        return getCollectionByHandle(input.handle);
      }),
  }),
  cart: router({
    create: publicProcedure
      .input(z.object({ lines: z.array(cartLineInputSchema).min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        const hasLocalLines = input.lines.some(line => isLocalVariantId(line.variantId));
        if (hasLocalLines) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in before adding local catalog products." });
          if (!input.lines.every(line => isLocalVariantId(line.variantId))) throw new TRPCError({ code: "BAD_REQUEST", message: "Local catalog items cannot be mixed with online-store items in the same bag." });
          return createLocalCart(input.lines, ctx.user.id);
        }
        return createCart(input.lines);
      }),
    get: publicProcedure
      .input(z.object({ cartId: z.string().min(1) }))
      .query(async ({ ctx, input }) => {
        return getCustomerCart(input.cartId, ctx.user?.id);
      }),
    addLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1),
          lines: z.array(cartLineInputSchema).min(1).max(50),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.cartId.startsWith(LOCAL_CART_PREFIX)) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in before updating the local basket." });
          return addLocalCartLines(input.cartId, input.lines, ctx.user.id);
        }
        return addCartLines(input.cartId, input.lines);
      }),
    updateLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1),
          lines: z.array(cartLineUpdateSchema).min(1).max(50),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // qty 0 means "remove this line" — split the request so the client
        // never has to call two procedures for a single user gesture.
        const toRemove = input.lines.filter(l => l.quantity === 0).map(l => l.lineId);
        const toUpdate = input.lines.filter(l => l.quantity > 0);

        if (input.cartId.startsWith(LOCAL_CART_PREFIX)) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in before updating the local basket." });
          return updateLocalCartLines(input.cartId, input.lines, ctx.user.id);
        }
        let cart = null;
        if (toUpdate.length) {
          cart = await updateCartLines(input.cartId, toUpdate);
        }
        if (toRemove.length) {
          cart = await removeCartLines(input.cartId, toRemove);
        }
        if (!cart) cart = await getCart(input.cartId);
        return cart;
      }),
    removeLines: publicProcedure
      .input(
        z.object({
          cartId: z.string().min(1),
          lineIds: z.array(z.string().min(1)).min(1).max(50),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.cartId.startsWith(LOCAL_CART_PREFIX)) {
          if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Please sign in before updating the local basket." });
          return removeLocalCartLines(input.cartId, input.lineIds, ctx.user.id);
        }
        return removeCartLines(input.cartId, input.lineIds);
      }),
    checkout: protectedProcedure
      .input(z.object({ cartId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!(await isMarketOpen())) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "HariCart is temporarily closed. Please check back soon." });
        }
        const resident = await getVerifiedResidentProfile(ctx.user.id);
        if (!resident) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Checkout is available only to verified GreenGate residents." });
        }
        if (input.cartId.startsWith(LOCAL_CART_PREFIX)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Online checkout is unavailable for local catalog items. Choose Cash on Delivery or Pay After Delivery." });
        }
        const cart = await getCart(input.cartId);
        if (!cart?.checkoutUrl) throw new TRPCError({ code: "NOT_FOUND", message: "Cart checkout is unavailable." });
        return { checkoutUrl: cart.checkoutUrl, apartmentUnit: resident.apartmentUnit };
      }),
  }),
});

export type CommerceRouter = typeof commerceRouter;
