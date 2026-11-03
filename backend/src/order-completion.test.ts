import { describe, expect, it } from "vitest";
import { getOrderCompletionNote } from "@shared/order-completion";

describe("order completion confirmation", () => {
  it("explains COD completion", () => {
    expect(getOrderCompletionNote("cash_on_delivery")).toContain("Cash on Delivery selected");
  });

  it("explains secure online checkout completion", () => {
    expect(getOrderCompletionNote("online_checkout")).toContain("Secure online checkout opened");
  });
});
