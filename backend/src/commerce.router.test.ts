import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { filterPublishedLocalCatalogProducts, isPublishedLocalCatalogProduct, normalizeLocalCatalogProduct, selectCustomerLocalCatalogProducts } from "./routers/commerce";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.SHOPIFY_STORE_DOMAIN = "test.myshopify.com";
  process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN = "test-token";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function ok(data: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ data }),
    text: async () => "",
  } as Response);
}

const rawVariant = {
  id: "gid://shopify/ProductVariant/1",
  title: "Default Title",
  availableForSale: true,
  price: { amount: "385.00", currencyCode: "USD" },
  compareAtPrice: null,
  selectedOptions: [{ name: "Title", value: "Default Title" }],
};

const rawProduct = {
  id: "gid://shopify/Product/1",
  title: "Aria",
  handle: "aria",
  description: "",
  descriptionHtml: "",
  productType: "Sculpted",
  vendor: "Maison",
  tags: ["Stoneware"],
  options: [{ name: "Title", values: ["Default Title"] }],
  priceRange: {
    minVariantPrice: { amount: "385.00", currencyCode: "USD" },
    maxVariantPrice: { amount: "385.00", currencyCode: "USD" },
  },
  images: {
    edges: [
      { node: { url: "https://img/1.jpg", altText: null, width: 800, height: 1000 } },
    ],
  },
  variants: { edges: [{ node: rawVariant }] },
};

describe("commerce.products", () => {
  it("does not request Shopify preview products for the customer list", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const products = await caller.commerce.products.list();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(products.every(product => product.isLocalCatalogItem === true)).toBe(true);
  }, 15000);

  it("maps a missing handle to a NOT_FOUND TRPCError", async () => {
    ok({ productByHandle: null });

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.commerce.products.byHandle({ handle: "nope" })
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("local catalog storefront visibility", () => {
  const localProduct = {
    id: 42,
    shopId: 1,
    categoryId: null,
    shopifyProductId: null,
    shopifyVariantId: null,
    handle: "fresh-spinach",
    name: "Fresh Spinach",
    description: "Leafy greens",
    imageUrl: "https://cdn.example.com/spinach.jpg",
    price: "45.00",
    compareAtPrice: null,
    stockQuantity: 12,
    unitLabel: "500 g",
    isAvailable: true,
    createdAt: new Date("2026-08-17T00:00:00Z"),
    updatedAt: new Date("2026-08-17T00:00:00Z"),
  } as const;

  it("returns only published local catalog products for the customer storefront", () => {
    const visible = selectCustomerLocalCatalogProducts([
      localProduct,
      { ...localProduct, id: 43, handle: "hidden-cucumber", name: "Hidden Cucumber", isAvailable: false },
    ]);

    expect(visible).toHaveLength(1);
    expect(visible[0]?.isLocalCatalogItem).toBe(true);
    expect(visible[0]?.handle).toBe("fresh-spinach");
    expect(visible.some(product => product.handle === "aria")).toBe(false);
  });

  it("publishes available local rows into the customer product contract", () => {
    expect(isPublishedLocalCatalogProduct(localProduct)).toBe(true);
    const product = normalizeLocalCatalogProduct(localProduct);
    expect(product.handle).toBe("fresh-spinach");
    expect(product.images[0]?.url).toBe(localProduct.imageUrl);
    expect(product.priceRange.min).toEqual({ amount: "45.00", currencyCode: "INR" });
    expect(product.variants[0]?.id).toBe("local:42");
    expect(product.variants[0]?.availableForSale).toBe(true);
  });

  it("publishes customer metadata for local catalog cards", () => {
    const product = normalizeLocalCatalogProduct(localProduct);
    expect(product.isLocalCatalogItem).toBe(true);
    expect(product.stockQuantity).toBe(12);
    expect(product.unitLabel).toBe("500 g");
  });

  it("preserves persisted storage paths for storefront image rendering", () => {
    const storagePath = "/api/media/catalog-products/1/1770000000000-fresh-spinach.png";
    const product = normalizeLocalCatalogProduct({ ...localProduct, imageUrl: storagePath });
    expect(product.images).toEqual([{ url: storagePath, altText: "Fresh Spinach" }]);
  });

  it("hides unavailable or out-of-stock local rows", () => {
    expect(isPublishedLocalCatalogProduct({ ...localProduct, isAvailable: false })).toBe(false);
    expect(isPublishedLocalCatalogProduct({ ...localProduct, stockQuantity: 0 })).toBe(false);
  });

  it("removes a hidden item from the customer list and restores it when shown", () => {
    const hidden = { ...localProduct, isAvailable: false };
    expect(filterPublishedLocalCatalogProducts([hidden])).toHaveLength(0);
    const shown = { ...hidden, isAvailable: true };
    const visible = filterPublishedLocalCatalogProducts([shown]);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.id).toBe(localProduct.id);
  });
});

describe("commerce.cart", () => {
  it("creates a cart, normalizes lines, and appends channel=online_store to the checkout URL", async () => {
    ok({
      cartCreate: {
        cart: {
          id: "gid://shopify/Cart/1",
          checkoutUrl: "https://test.myshopify.com/checkout/abc",
          totalQuantity: 2,
          cost: {
            totalAmount: { amount: "770.00", currencyCode: "USD" },
            subtotalAmount: { amount: "770.00", currencyCode: "USD" },
          },
          lines: {
            edges: [
              {
                node: {
                  id: "gid://shopify/CartLine/1",
                  quantity: 2,
                  cost: { totalAmount: { amount: "770.00", currencyCode: "USD" } },
                  merchandise: {
                    id: rawVariant.id,
                    title: "Default Title",
                    price: { amount: "385.00", currencyCode: "USD" },
                    product: {
                      handle: "aria",
                      title: "Aria",
                      images: {
                        edges: [{ node: { url: "https://img/1.jpg", altText: null } }],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        userErrors: [],
      },
    });

    const caller = appRouter.createCaller(makeCtx());
    const cart = await caller.commerce.cart.create({
      lines: [{ variantId: rawVariant.id, quantity: 2 }],
    });

    expect(cart.id).toBe("gid://shopify/Cart/1");
    expect(cart.itemCount).toBe(2);
    expect(cart.checkoutUrl).toMatch(/\?channel=online_store$/);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({
      lineId: "gid://shopify/CartLine/1",
      variantId: rawVariant.id,
      productHandle: "aria",
      quantity: 2,
    });
  });

  it("maps Shopify userErrors onto a BAD_REQUEST TRPCError", async () => {
    ok({
      cartCreate: {
        cart: null,
        userErrors: [{ message: "merchandise does not exist", field: ["lines"] }],
      },
    });

    const caller = appRouter.createCaller(makeCtx());

    await expect(
      caller.commerce.cart.create({
        lines: [{ variantId: "gid://shopify/ProductVariant/999", quantity: 1 }],
      })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("merchandise does not exist"),
    });
  });

  it("ignores Shopify collection handles for the local-only customer list", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const products = await caller.commerce.products.list({ collectionHandle: "missing-collection" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(products.every(product => product.isLocalCatalogItem === true)).toBe(true);
  });
});
