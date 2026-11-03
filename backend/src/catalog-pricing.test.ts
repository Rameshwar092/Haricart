import { describe, expect, it } from "vitest";
import { calculateDiscountPercent, calculateSalePrice, formatDiscountBadge, normalizePricing } from "@shared/catalog-pricing";

describe("catalog pricing", () => {
  it("calculates sale price from MRP and discount", () => {
    expect(calculateSalePrice("100", "20")).toBe("80.00");
    expect(normalizePricing("100", "80")).toEqual({ mrp: 100, salePrice: 80, discountPercent: 20 });
  });

  it("formats a real discount badge and avoids fake discounts", () => {
    expect(calculateDiscountPercent("60", "26")).toBe(57);
    expect(formatDiscountBadge("60", "26")).toBe("↓ 57% OFF");
    expect(formatDiscountBadge("50", "50")).toBeNull();
  });
});
