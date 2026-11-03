import { describe, expect, it } from "vitest";
import { getOnlineCheckoutDestination } from "@shared/online-checkout";

describe("online checkout destination", () => {
  it("preserves a valid hosted checkout URL", () => {
    expect(getOnlineCheckoutDestination("  https://checkout.example.test/order/123  ")).toBe("https://checkout.example.test/order/123");
  });

  it("returns null when the provider has not returned a checkout URL", () => {
    expect(getOnlineCheckoutDestination("")).toBeNull();
    expect(getOnlineCheckoutDestination(undefined)).toBeNull();
  });
});
