import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildInventoryCardSubmitPayload, buildProductCreatorSubmitPayload } from "../../frontend/src/pages/OperationsPortal";

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

describe("OperationsPortal catalog submit paths", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "../frontend/src/pages/OperationsPortal.tsx"),
    "utf8",
  );

  beforeEach(() => {
    state.inserted = null;
    state.product = null;
  });

  it("carries the uploaded photo result through the admin create payload into persistence", async () => {
    expect(source).toContain("const uploaded = await uploadImage.mutateAsync");
    expect(source).toContain("setImageUrl(uploaded.url)");
    expect(source).toContain("onCreate(payload)");

    const uploadedPhoto = { url: "/api/media/catalog-products/17/tomato.png" };
    const payload = buildProductCreatorSubmitPayload({
      name: " Tomato ",
      price: "60",
      compareAtPrice: "75",
      countryOfOrigin: "India",
      stockQuantity: "3",
      unitLabel: "kg",
      imageUrl: uploadedPhoto.url,
      description: "Fresh tomato",
      shopId: "7",
      isAvailable: true,
    }, true);

    expect(payload).not.toBeNull();
    const caller = communityRouter.createCaller({
      user: { id: 1, role: "admin" },
    } as never);
    const result = await caller.shop.inventory.create(payload!);

    expect(result.success).toBe(true);
    expect(state.inserted).toMatchObject({
      imageUrl: uploadedPhoto.url,
      stockQuantity: 3,
      isAvailable: true,
      countryOfOrigin: "India",
    });
  });

  it("submits InventoryCard edit state unchanged through the update payload and persistence contract", async () => {
    expect(source).toContain("buildInventoryCardSubmitPayload");
    expect(source).toContain("update.mutate(buildInventoryCardSubmitPayload(product.id");

    state.product = {
      id: 42,
      shopId: 7,
      name: "Tomato",
      description: "Fresh tomato",
      price: "60",
      compareAtPrice: "75",
      countryOfOrigin: "India",
      stockQuantity: 1,
      unitLabel: "kg",
      imageUrl: "/api/media/catalog-products/17/old-tomato.png",
      isAvailable: true,
    };

    const payload = buildInventoryCardSubmitPayload(42, {
      name: " Tomato ",
      price: "65",
      compareAtPrice: "80",
      countryOfOrigin: "India",
      stockQuantity: "5",
      unitLabel: "kg",
      imageUrl: " /api/media/catalog-products/17/new-tomato.png ",
      description: "Fresh tomato, edited",
      isAvailable: true,
    });

    const caller = communityRouter.createCaller({
      user: { id: 1, role: "admin" },
    } as never);
    const result = await caller.shop.inventory.update(payload);

    expect(result.success).toBe(true);
    expect(state.product).toMatchObject({
      imageUrl: "/api/media/catalog-products/17/new-tomato.png",
      stockQuantity: 5,
      isAvailable: true,
      price: "65",
      compareAtPrice: "80",
    });
  });
});

export {};
