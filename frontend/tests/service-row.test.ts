import { describe, expect, it } from "vitest";
import { shouldShowResidentServiceRow } from "../src/lib/service-row";

describe("resident service row visibility", () => {
  const customerHome = {
    isCustomerSurface: true,
    cartOpen: false,
    availabilityOpen: false,
    discountBannerOpen: false,
    welcomeOpen: false,
  };

  it("shows services only on the unobstructed customer home surface", () => {
    expect(shouldShowResidentServiceRow(customerHome)).toBe(true);
  });

  it("hides services while other customer panels are open", () => {
    expect(shouldShowResidentServiceRow({ ...customerHome, cartOpen: true })).toBe(false);
    expect(shouldShowResidentServiceRow({ ...customerHome, availabilityOpen: true })).toBe(false);
    expect(shouldShowResidentServiceRow({ ...customerHome, discountBannerOpen: true })).toBe(false);
    expect(shouldShowResidentServiceRow({ ...customerHome, welcomeOpen: true })).toBe(false);
  });

  it("hides services from unverified and owner/admin surfaces", () => {
    expect(shouldShowResidentServiceRow({ ...customerHome, isCustomerSurface: false })).toBe(false);
  });
});
