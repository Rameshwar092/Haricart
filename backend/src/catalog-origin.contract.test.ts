import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatalogOriginLabel } from "../../frontend/src/components/CatalogOriginLabel";

const { state, fakeDb } = vi.hoisted(() => {
  const state: {
    inserted: Record<string, unknown> | null;
    product: Record<string, unknown> | null;
  } = { inserted: null, product: null };

  const fakeDb = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => (state.product ? [state.product] : []),
        }),
        orderBy: async () => (state.product ? [state.product] : []),
      }),
    }),
    insert: () => ({
      values: async (values: Record<string, unknown>) => {
        state.inserted = values;
      },
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          if (state.product) Object.assign(state.product, values);
        },
      }),
    }),
  };

  return { state, fakeDb };
});

vi.mock("./db", () => ({
  getDb: async () => fakeDb,
}));

import { communityRouter } from "./routers/community";

describe("Local Catalog country-of-origin persistence", () => {
  beforeEach(() => {
    state.inserted = null;
    state.product = null;
  });

  it("persists the selected origin on create and update without using the production database", async () => {
    const caller = communityRouter.createCaller({
      user: { id: 1, role: "admin" },
    } as never);

    const created = await caller.shop.inventory.create({
      shopId: 7,
      name: "Mango",
      description: "Fresh mangoes",
      price: "120",
      compareAtPrice: "140",
      countryOfOrigin: "India",
      stockQuantity: 5,
      unitLabel: "kg",
      imageUrl: "/api/media/catalog-products/mango.png",
      isAvailable: true,
    });

    expect(created.success).toBe(true);
    expect(state.inserted?.countryOfOrigin).toBe("India");
    expect(state.inserted?.imageUrl).toBe("/api/media/catalog-products/mango.png");
    expect(state.inserted?.stockQuantity).toBe(5);
    expect(state.inserted?.isAvailable).toBe(true);

    state.product = {
      id: 42,
      shopId: 7,
      name: "Mango",
      description: "Fresh mangoes",
      price: "120",
      compareAtPrice: "140",
      countryOfOrigin: "India",
      stockQuantity: 5,
      unitLabel: "kg",
      imageUrl: "/api/media/catalog-products/mango.png",
      isAvailable: true,
    };

    const updated = await caller.shop.inventory.update({
      id: 42,
      name: "Mango",
      description: "Fresh mangoes",
      price: "125",
      compareAtPrice: "145",
      countryOfOrigin: "Imported",
      stockQuantity: 4,
      unitLabel: "kg",
      imageUrl: "/api/media/catalog-products/mango.png",
      isAvailable: true,
    });

    expect(updated.success).toBe(true);
    expect(state.product.countryOfOrigin).toBe("Imported");
    expect(state.product.price).toBe("125");
    expect(state.product.imageUrl).toBe("/api/media/catalog-products/mango.png");
    expect(state.product.stockQuantity).toBe(4);
    expect(state.product.isAvailable).toBe(true);

    const inventory = await caller.shop.inventory.list();
    expect(inventory).toHaveLength(1);
    expect(inventory[0]?.countryOfOrigin).toBe("Imported");
    expect(inventory[0]?.imageUrl).toBe("/api/media/catalog-products/mango.png");
    expect(inventory[0]?.stockQuantity).toBe(4);
    expect(inventory[0]?.isAvailable).toBe(true);
    expect(renderToStaticMarkup(createElement(CatalogOriginLabel, { value: inventory[0]?.countryOfOrigin }))).toContain("Origin: Imported");
  });
});

export {};
