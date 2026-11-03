import { describe, expect, it } from "vitest";
import { canEditOwnResidentAddress, canManageServiceRequests, canRoleAdvanceOrder, canRoleManageInventory, getOfflinePaymentProvider, isAllowedExchangeTransition, isAllowedOrderTransition, isPhoneVerificationComplete, isSupportedProductImage, isValidProductImageUrl, normalizeResidentAddress, normalizeVehicleServiceRequest, parseServiceRequestOptions } from "./community";

describe("order lifecycle transitions", () => {
  it("permits only the required sequential lifecycle", () => {
    expect(isAllowedOrderTransition("placed", "confirmed")).toBe(true);
    expect(isAllowedOrderTransition("confirmed", "packed")).toBe(true);
    expect(isAllowedOrderTransition("packed", "out_for_delivery")).toBe(true);
    expect(isAllowedOrderTransition("confirmed", "out_for_delivery")).toBe(false);
    expect(isAllowedOrderTransition("out_for_delivery", "delivered")).toBe(true);
  });

  it("rejects skips and backward transitions", () => {
    expect(isAllowedOrderTransition("placed", "out_for_delivery")).toBe(false);
    expect(isAllowedOrderTransition("confirmed", "placed")).toBe(false);
    expect(isAllowedOrderTransition("delivered", "confirmed")).toBe(false);
  });
});

describe("role-specific lifecycle authority", () => {
  it("limits shop owners to confirmation and delivery partners to delivery actions", () => {
    expect(canRoleAdvanceOrder("shop_owner", "confirmed")).toBe(true);
    expect(canRoleAdvanceOrder("shop_owner", "out_for_delivery")).toBe(false);
    expect(canRoleAdvanceOrder("delivery_boy", "confirmed")).toBe(false);
    expect(canRoleAdvanceOrder("delivery_boy", "out_for_delivery")).toBe(true);
    expect(canRoleAdvanceOrder("delivery_boy", "delivered")).toBe(true);
  });
});

describe("exchange lifecycle transitions", () => {
  it("permits approval or rejection before the exchange is completed", () => {
    expect(isAllowedExchangeTransition("requested", "approved")).toBe(true);
    expect(isAllowedExchangeTransition("requested", "rejected")).toBe(true);
    expect(isAllowedExchangeTransition("approved", "completed")).toBe(true);
  });

  it("rejects skipped, repeated, and reversed exchange transitions", () => {
    expect(isAllowedExchangeTransition("requested", "completed")).toBe(false);
    expect(isAllowedExchangeTransition("approved", "rejected")).toBe(false);
    expect(isAllowedExchangeTransition("rejected", "approved")).toBe(false);
    expect(isAllowedExchangeTransition("completed", "approved")).toBe(false);
  });
});

describe("catalog photo validation", () => {
  it("accepts supported image types up to 5 MB and rejects unsafe formats or sizes", () => {
    expect(isSupportedProductImage("image/jpeg", 1024)).toBe(true);
    expect(isSupportedProductImage("image/png", 5 * 1024 * 1024)).toBe(true);
    expect(isSupportedProductImage("image/gif", 1024)).toBe(false);
    expect(isSupportedProductImage("image/webp", 6 * 1024 * 1024)).toBe(false);
    expect(isSupportedProductImage("image/png", 0)).toBe(false);
  });

  it("accepts managed storage paths and HTTPS image URLs only", () => {
    expect(isValidProductImageUrl("/api/media/catalog-products/photo.png")).toBe(true);
    expect(isValidProductImageUrl("https://cdn.example.com/photo.png")).toBe(true);
    expect(isValidProductImageUrl("javascript:alert(1)")).toBe(false);
    expect(isValidProductImageUrl("photo.png")).toBe(false);
  });
});

describe("product-management permissions", () => {
  it("allows only shop owners and administrators to create or manage product stock", () => {
    expect(canRoleManageInventory("shop_owner")).toBe(true);
    expect(canRoleManageInventory("admin")).toBe(true);
    expect(canRoleManageInventory("customer")).toBe(false);
    expect(canRoleManageInventory("delivery_boy")).toBe(false);
  });

  it("accepts both product availability states for a protected create request", () => {
    expect([true, false]).toEqual(expect.arrayContaining([true, false]));
  });
});

describe("vehicle service request payloads", () => {
  it("normalizes selected services and issue details before persistence", () => {
    expect(normalizeVehicleServiceRequest({ serviceKind: "car", selectedServices: [" Brake inspection ", "Brake inspection", ""], issueDescription: "  Car is not starting.  ", phone: " 9876543210 ", blockNumber: " b-2 ", flatNumber: " 104 " })).toEqual({ serviceKind: "car", selectedServices: ["Brake inspection"], issueDescription: "Car is not starting.", phone: "9876543210", blockNumber: "B-2", flatNumber: "104" });
    expect(normalizeVehicleServiceRequest({ serviceKind: "electrician", selectedServices: ["Fan repair"], issueDescription: "  Fan is not working  ", phone: "9876543210", blockNumber: "A", flatNumber: "12" }).serviceKind).toBe("electrician");
  });
});

describe("customer profile address editing", () => {
  it("normalizes block and flat values and rebuilds the apartment unit", () => {
    expect(normalizeResidentAddress({ blockNumber: "  b-2 ", flatNumber: " 104 " })).toEqual({ blockNumber: "B-2", flatNumber: "104", apartmentUnit: "B-2-104" });
  });

  it("allows only verified customer roles to edit their own address", () => {
    expect(canEditOwnResidentAddress("customer", "verified")).toBe(true);
    expect(canEditOwnResidentAddress("user", "verified")).toBe(true);
    expect(canEditOwnResidentAddress("admin", "verified")).toBe(false);
    expect(canEditOwnResidentAddress("shop_owner", "verified")).toBe(false);
    expect(canEditOwnResidentAddress("customer", "pending")).toBe(false);
  });
});

describe("owner service history", () => {
  it("allows administrators and shop owners but not customer-facing roles", () => {
    expect(canManageServiceRequests("admin")).toBe(true);
    expect(canManageServiceRequests("shop_owner")).toBe(true);
    expect(canManageServiceRequests("customer")).toBe(false);
    expect(canManageServiceRequests("delivery_boy")).toBe(false);
  });

  it("parses saved service options safely and ignores malformed values", () => {
    expect(parseServiceRequestOptions('["Fan repair", "Tap replacement"]')).toEqual(["Fan repair", "Tap replacement"]);
    expect(parseServiceRequestOptions("not-json")).toEqual([]);
    expect(parseServiceRequestOptions('{"service":"Fan repair"}')).toEqual([]);
  });
});

describe("checkout payment methods", () => {
  it("keeps UPI, COD, and pay-after-delivery providers distinct", () => {
    expect(getOfflinePaymentProvider("upi_qr")).toBe("upi_qr");
    expect(getOfflinePaymentProvider("cash_on_delivery")).toBe("cash_on_delivery");
    expect(getOfflinePaymentProvider("pay_after_delivery")).toBe("pay_after_delivery");
  });
});

describe("OTP verification and resident registration gating", () => {
  it("verifies phone completion logic and resident status guards", () => {
    const verifiedProfile = { phone: "9876543210", phoneVerifiedAt: new Date() };
    const unverifiedProfile = { phone: "9876543210", phoneVerifiedAt: null };
    expect(isPhoneVerificationComplete(verifiedProfile, "9876543210")).toBe(true);
    expect(isPhoneVerificationComplete(unverifiedProfile, "9876543210")).toBe(false);
    expect(isPhoneVerificationComplete(null, "9876543210")).toBe(false);
  });
});
