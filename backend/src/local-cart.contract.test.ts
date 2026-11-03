import { beforeEach, describe, expect, it, vi } from "vitest";
import { carts, cartItems, catalogProducts, notifications, orderItems, orders, payments, shops, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const { getDbMock, getVerifiedResidentProfileMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getVerifiedResidentProfileMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: getDbMock,
  getVerifiedResidentProfile: getVerifiedResidentProfileMock,
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const customer = {
  id: 7,
  openId: "local-cart-test",
  name: "GreenGate Customer",
  email: "customer@example.com",
  loginMethod: "otp",
  role: "customer",
  createdAt: new Date("2026-08-18T00:00:00Z"),
  updatedAt: new Date("2026-08-18T00:00:00Z"),
  lastSignedIn: new Date("2026-08-18T00:00:00Z"),
} as AuthenticatedUser;

const product = {
  id: 42,
  shopId: 1,
  categoryId: null,
  shopifyProductId: null,
  shopifyVariantId: null,
  handle: "fresh-tomato",
  name: "Tomato",
  description: "Fresh tomatoes",
  imageUrl: "/api/media/catalog-products/tomato.png",
  price: "60.00",
  compareAtPrice: null,
  stockQuantity: 3,
  unitLabel: "1 kg",
  isAvailable: true,
  createdAt: new Date("2026-08-18T00:00:00Z"),
  updatedAt: new Date("2026-08-18T00:00:00Z"),
} as const;

function makeFakeDb() {
  let cartRow: Record<string, unknown> | null = null;
  let itemRows: Array<Record<string, unknown>> = [];
  let orderRows: Array<Record<string, unknown>> = [];
  let nextItemId = 1;

  const rowsFor = (table: unknown) => {
    if (table === carts) return cartRow ? [cartRow] : [];
    if (table === cartItems) return itemRows;
    if (table === catalogProducts) return [product];
    if (table === shops) return [{ id: 1, status: "active", ownerUserId: 8 }];
    if (table === users) return [{ id: 1, role: "admin" }];
    return [];
  };

  const selectBuilder = (table: unknown) => {
    const rows = rowsFor(table);
    const builder = {
      where: () => builder,
      orderBy: () => builder,
      limit: async () => rows,
      then: (resolve: (value: unknown[]) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(rows).then(resolve, reject),
    };
    return builder;
  };

  const insert = (table: unknown) => ({
    values: (values: Record<string, unknown> | Array<Record<string, unknown>>) => {
      const entries = Array.isArray(values) ? values : [values];
      if (table === carts) {
        cartRow = { id: 10, customerUserId: entries[0]?.customerUserId, status: "active" };
      }
      if (table === cartItems) {
        itemRows.push(...entries.map(entry => ({ id: nextItemId++, ...entry })));
      }
      if (table === orders) {
        orderRows.push(...entries.map(entry => ({ id: 55, ...entry })));
      }
      const mutation = {
        $returningId: async () => [{ id: table === orders ? 55 : 10 }],
        then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve().then(() => resolve(undefined), reject),
      };
      return mutation;
    },
  });

  let stockUpdates = 0;
  const update = (table: unknown) => ({
    set: (values: Record<string, unknown>) => ({
      where: async () => {
        if (table === cartItems && itemRows[0]) itemRows = itemRows.map(row => ({ ...row, ...values }));
        if (table === carts) {
          // Only an active basket can be converted into an order (once).
          if (!cartRow || cartRow.status !== "active") return [{ affectedRows: 0 }];
          cartRow = { ...cartRow, ...values };
          return [{ affectedRows: 1 }];
        }
        if (table === catalogProducts) stockUpdates += 1;
        return [{ affectedRows: 1 }];
      },
    }),
  });

  const db = {
    select: () => ({ from: (table: unknown) => selectBuilder(table) }),
    insert,
    update,
    delete: (table: unknown) => ({
      where: async () => {
        if (table === cartItems) itemRows = [];
      },
    }),
    transaction: async <T>(callback: (tx: { insert: typeof insert; update: typeof update }) => Promise<T>) => callback({ insert, update }),
  };

  return { ...db, getOrderRows: () => orderRows, getStockUpdates: () => stockUpdates, getCartStatus: () => cartRow?.status };
}

describe("local catalog cart contract", () => {
  let fakeDb: ReturnType<typeof makeFakeDb>;

  beforeEach(() => {
    getDbMock.mockReset();
    fakeDb = makeFakeDb();
    getDbMock.mockResolvedValue(fakeDb);
    getVerifiedResidentProfileMock.mockReset();
    getVerifiedResidentProfileMock.mockResolvedValue({ apartmentUnit: "A-101" });
  });

  it("supports Add-to-bag create, add, update, and remove for a local product", async () => {
    const caller = appRouter.createCaller(makeCtx(customer));
    const created = await caller.commerce.cart.create({ lines: [{ variantId: "local:42", quantity: 1 }] });

    expect(created).toMatchObject({ id: "local:cart:10", itemCount: 1, subtotal: { amount: "60.00", currencyCode: "INR" } });
    expect(created.items[0]).toMatchObject({ variantId: "local:42", productTitle: "Tomato", quantity: 1 });

    const added = await caller.commerce.cart.addLines({ cartId: created.id, lines: [{ variantId: "local:42", quantity: 1 }] });
    expect(added.itemCount).toBe(2);

    const updated = await caller.commerce.cart.updateLines({ cartId: created.id, lines: [{ lineId: added.items[0]!.lineId, quantity: 3 }] });
    expect(updated.itemCount).toBe(3);

    const removed = await caller.commerce.cart.removeLines({ cartId: created.id, lineIds: [updated.items[0]!.lineId] });
    expect(removed.itemCount).toBe(0);
  });

  it("places a local basket through the COD offline-order path for a verified resident", async () => {
    const caller = appRouter.createCaller(makeCtx(customer));
    const created = await caller.commerce.cart.create({ lines: [{ variantId: "local:42", quantity: 1 }] });

    const order = await caller.community.orders.placeOffline({ cartId: created.id, paymentMethod: "cash_on_delivery" });

    expect(order).toMatchObject({ success: true, orderId: 55, paymentMethod: "cash_on_delivery", paymentStatus: "pending" });
    expect(fakeDb.getOrderRows()[0]).toMatchObject({ apartmentUnit: "A-101" });
    expect(fakeDb.getStockUpdates()).toBe(1);
    expect(fakeDb.getCartStatus()).toBe("converted");
  });

  it("does not turn the same basket into a second order (double tap / second tab)", async () => {
    const caller = appRouter.createCaller(makeCtx(customer));
    const created = await caller.commerce.cart.create({ lines: [{ variantId: "local:42", quantity: 1 }] });
    await caller.community.orders.placeOffline({ cartId: created.id, paymentMethod: "cash_on_delivery" });
    await expect(caller.community.orders.placeOffline({ cartId: created.id, paymentMethod: "cash_on_delivery" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fakeDb.getOrderRows()).toHaveLength(1);
  });

  it("blocks Shopify online checkout for local baskets so COD or pay-after-delivery is used", async () => {
    const caller = appRouter.createCaller(makeCtx(customer));
    await expect(caller.commerce.cart.checkout({ cartId: "local:cart:10" })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: expect.stringContaining("Online checkout is unavailable"),
    });
  });
});
