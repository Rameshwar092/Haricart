import { describe, expect, it } from "vitest";
import { shouldOpenUpiPaymentDialog } from "@shared/payment-flow";

describe("checkout payment flow", () => {
  it("opens the QR dialog only for UPI payment selection", () => {
    expect(shouldOpenUpiPaymentDialog("upi_qr")).toBe(true);
    expect(shouldOpenUpiPaymentDialog("online_checkout")).toBe(false);
    expect(shouldOpenUpiPaymentDialog("cash_on_delivery")).toBe(false);
  });
});
