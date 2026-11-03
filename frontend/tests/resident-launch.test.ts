import { describe, expect, it } from "vitest";
import { getResidentOnboardingStep, RESIDENT_ONBOARDING_STEPS, shouldShowResidentLaunchGate } from "../src/lib/resident-launch";

describe("HariCart resident launch gate", () => {
  it("keeps the storefront behind the gate until a resident is verified", () => {
    expect(shouldShowResidentLaunchGate({ authLoading: false, isAuthenticated: false, isVerifiedResident: false, isPrivileged: false })).toBe(true);
    expect(shouldShowResidentLaunchGate({ authLoading: false, isAuthenticated: true, isVerifiedResident: false, isPrivileged: false })).toBe(true);
    expect(shouldShowResidentLaunchGate({ authLoading: false, isAuthenticated: true, isVerifiedResident: true, isPrivileged: false })).toBe(false);
  });

  it("does not block authenticated owner/admin routes", () => {
    expect(shouldShowResidentLaunchGate({ authLoading: false, isAuthenticated: true, isVerifiedResident: false, isPrivileged: true })).toBe(false);
  });

  it("does not make an authentication-loading flash look like an onboarding state", () => {
    expect(shouldShowResidentLaunchGate({ authLoading: true, isAuthenticated: false, isVerifiedResident: false, isPrivileged: false })).toBe(false);
  });

  it("preserves the required Mobile to Flat order", () => {
    expect(RESIDENT_ONBOARDING_STEPS).toEqual(["Mobile", "OTP", "Block", "Flat"]);
    expect(getResidentOnboardingStep({ authenticated: false, otpRequested: false, phoneVerified: false, detailStep: "block" })).toBe("Mobile");
    expect(getResidentOnboardingStep({ authenticated: true, otpRequested: true, phoneVerified: false, detailStep: "block" })).toBe("OTP");
    expect(getResidentOnboardingStep({ authenticated: true, otpRequested: true, phoneVerified: true, detailStep: "block" })).toBe("Block");
    expect(getResidentOnboardingStep({ authenticated: true, otpRequested: true, phoneVerified: true, detailStep: "flat" })).toBe("Flat");
  });
});
