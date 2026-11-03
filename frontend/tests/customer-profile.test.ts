import { describe, expect, it } from "vitest";
import { buildAddressUpdateConfirmation, buildOwnCustomerProfile, canViewCustomerProfile, shouldShowCustomerProfile } from "../src/lib/customer-profile";

describe("HariCart customer profile privacy", () => {
  it("shows the profile control only for customer roles", () => {
    expect(canViewCustomerProfile("customer")).toBe(true);
    expect(canViewCustomerProfile("user")).toBe(true);
    expect(canViewCustomerProfile("admin")).toBe(false);
    expect(canViewCustomerProfile("shop_owner")).toBe(false);
    expect(canViewCustomerProfile("delivery_boy")).toBe(false);
    expect(canViewCustomerProfile(undefined)).toBe(false);
    expect(shouldShowCustomerProfile("customer", true, true)).toBe(true);
    expect(shouldShowCustomerProfile("customer", true, false)).toBe(false);
    expect(shouldShowCustomerProfile("admin", true, true)).toBe(false);
    expect(shouldShowCustomerProfile("shop_owner", true, true)).toBe(false);
    expect(shouldShowCustomerProfile("customer", false, true)).toBe(false);
  });

  it("builds a confirmation that names the updated apartment address", () => {
    expect(buildAddressUpdateConfirmation({ blockNumber: "B-2", flatNumber: "104" })).toBe("Address updated successfully · Block B-2 · Flat 104");
  });

  it("projects only the signed-in resident's safe details", () => {
    const ownProfile = buildOwnCustomerProfile({
      userId: 27,
      fullName: "Asha Resident",
      phone: "+919170367884",
      blockNumber: "A",
      flatNumber: "204",
      passwordHash: "never-return-this",
      verificationStatus: "verified",
    });

    expect(ownProfile).toEqual({
      fullName: "Asha Resident",
      phone: "+919170367884",
      blockNumber: "A",
      flatNumber: "204",
    });
    expect(ownProfile).not.toHaveProperty("userId");
    expect(ownProfile).not.toHaveProperty("passwordHash");
    expect(ownProfile).not.toHaveProperty("verificationStatus");
  });
});
