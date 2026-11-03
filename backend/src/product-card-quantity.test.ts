import { describe, expect, it } from "vitest";
import { buildProductCardPlusAction, canQueueProductCardPlus, canStartProductCardPlus, type ProductCardCartLine } from "@shared/product-card";

describe("ProductCard plus-only quantity action", () => {
  it("adds one on the first tap and increments the same cart line on later taps", () => {
    const lines: ProductCardCartLine[] = [];
    const applyPlus = (variantId: string) => {
      const existingLine = lines.find(line => line.variantId === variantId);
      const action = buildProductCardPlusAction(variantId, existingLine);
      if (action.kind === "add") {
        lines.push({ lineId: `line-${variantId}`, variantId: action.variantId, quantity: action.quantity });
      } else {
        const line = lines.find(candidate => candidate.lineId === action.lineId);
        if (line) line.quantity = action.quantity;
      }
    };

    applyPlus("local:1");
    expect(lines).toEqual([{ lineId: "line-local:1", variantId: "local:1", quantity: 1 }]);

    applyPlus("local:1");
    applyPlus("local:1");
    expect(lines).toEqual([{ lineId: "line-local:1", variantId: "local:1", quantity: 3 }]);
  });

  it("allows repeated taps to queue for an available product without sharing state", () => {
    expect(canStartProductCardPlus(true, true)).toBe(false);
    expect(canStartProductCardPlus(true, false)).toBe(true);
    expect(canQueueProductCardPlus(true)).toBe(true);
    expect(canQueueProductCardPlus(false)).toBe(false);
  });

  it("keeps separate products in separate cart lines", () => {
    const lines: ProductCardCartLine[] = [];
    const applyPlus = (variantId: string) => {
      const existingLine = lines.find(line => line.variantId === variantId);
      const action = buildProductCardPlusAction(variantId, existingLine);
      if (action.kind === "add") {
        lines.push({ lineId: `line-${variantId}`, variantId: action.variantId, quantity: action.quantity });
      } else {
        const line = lines.find(candidate => candidate.lineId === action.lineId);
        if (line) line.quantity = action.quantity;
      }
    };

    applyPlus("local:1");
    applyPlus("local:2");
    applyPlus("local:2");

    expect(lines).toEqual([
      { lineId: "line-local:1", variantId: "local:1", quantity: 1 },
      { lineId: "line-local:2", variantId: "local:2", quantity: 2 },
    ]);
  });
});
