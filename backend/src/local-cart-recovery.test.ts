import { describe, expect, it } from "vitest";
import {
  isLocalCatalogVariantId,
  localCatalogAddErrorMessage,
  shouldRecreateLocalCart,
} from "@shared/local-cart";

describe("local catalog add-to-bag recovery", () => {
  it("recognizes local catalog variants without confusing Shopify variants", () => {
    expect(isLocalCatalogVariantId("local:42")).toBe(true);
    expect(isLocalCatalogVariantId("gid://shopify/ProductVariant/42")).toBe(false);
    expect(isLocalCatalogVariantId("local:tomato")).toBe(false);
  });

  it("recreates stale or cross-user local baskets", () => {
    expect(shouldRecreateLocalCart({ data: { code: "NOT_FOUND" } })).toBe(true);
    expect(shouldRecreateLocalCart({ data: { code: "FORBIDDEN" } })).toBe(true);
    expect(shouldRecreateLocalCart(new Error("Basket not found."))).toBe(true);
    expect(shouldRecreateLocalCart({ data: { code: "UNAUTHORIZED" } })).toBe(false);
    expect(shouldRecreateLocalCart({ data: { code: "BAD_REQUEST" } })).toBe(false);
  });

  it("gives a clear add requirement for unauthenticated or unverified residents", () => {
    expect(localCatalogAddErrorMessage(false, false)).toMatch(/sign in/i);
    expect(localCatalogAddErrorMessage(true, false)).toMatch(/block number/i);
    expect(localCatalogAddErrorMessage(true, true)).toBeNull();
  });
});
