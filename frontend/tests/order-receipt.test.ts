import { describe, expect, it } from "vitest";
import { getReceiptFilename } from "@/lib/order-receipt";

describe("order receipt download", () => {
  it("creates a safe PDF filename from the order number", () => {
    expect(getReceiptFilename("SM/ABC 123")).toBe("haricart-receipt-SM-ABC-123.pdf");
  });
});
