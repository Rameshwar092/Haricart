import { describe, expect, it } from "vitest";
import { canAddToCart, marketClosedMessage } from "./market";

describe("market availability", () => {
  it("only permits add to cart when the market is open and the item is available", () => {
    expect(canAddToCart(true, true)).toBe(true);
    expect(canAddToCart(false, true)).toBe(false);
    expect(canAddToCart(true, false)).toBe(false);
  });

  it("provides a clear closed-market message", () => {
    expect(marketClosedMessage()).toContain("temporarily closed");
  });
});
