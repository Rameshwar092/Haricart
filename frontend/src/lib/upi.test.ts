import { describe, expect, it } from "vitest";
import { buildHariCartUpiUri, getHariCartUpiDisplay, HARI_CART_PAYEE_NAME, HARI_CART_UPI_ID } from "./upi";

describe("HariCart UPI payments", () => {
  it("builds a branded, amount-aware UPI intent", () => {
    const uri = buildHariCartUpiUri({ amount: 149.5, orderNumber: "SC-1001" });
    const params = new URL(uri);
    expect(uri.startsWith("upi://pay?")).toBe(true);
    expect(params.searchParams.get("pa")).toBe(HARI_CART_UPI_ID);
    expect(params.searchParams.get("pn")).toBe(HARI_CART_PAYEE_NAME);
    expect(params.searchParams.get("am")).toBe("149.50");
    expect(params.searchParams.get("cu")).toBe("INR");
    expect(params.searchParams.get("tn")).toContain("SC-1001");
    expect(params.searchParams.get("tr")).toBe("SC-1001");
  });

  it("exposes the exact fallback UPI identity", () => {
    expect(getHariCartUpiDisplay()).toBe("HariCart · shaileshgbx@okicici");
  });

  it("rejects zero or negative amounts", () => {
    expect(() => buildHariCartUpiUri({ amount: 0 })).toThrow("positive payment amount");
    expect(() => buildHariCartUpiUri({ amount: -10 })).toThrow("positive payment amount");
  });
});
