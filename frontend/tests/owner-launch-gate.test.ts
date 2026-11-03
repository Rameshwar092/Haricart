import { describe, expect, it } from "vitest";
import { shouldRequireOwnerVerification, shouldShowOwnerLaunchGate } from "../src/lib/owner-launch-gate";

describe("Owner app-launch security gate", () => {
  it("requires the Owner button to use verification for admin and shop owners only", () => {
    expect(shouldRequireOwnerVerification("admin")).toBe(true);
    expect(shouldRequireOwnerVerification("shop_owner")).toBe(true);
    expect(shouldRequireOwnerVerification("user")).toBe(false);
    expect(shouldRequireOwnerVerification(null)).toBe(false);
  });

  it("does not gate while auth is loading", () => {
    expect(
      shouldShowOwnerLaunchGate({
        authLoading: true,
        isAuthenticated: false,
        role: "admin",
        hasStoredOwnerPassword: false,
        isUnlockedInSession: false,
      })
    ).toBe(false);
  });

  it("does not gate unauthenticated users or ordinary customers", () => {
    expect(
      shouldShowOwnerLaunchGate({
        authLoading: false,
        isAuthenticated: false,
        role: "user",
        hasStoredOwnerPassword: false,
        isUnlockedInSession: false,
      })
    ).toBe(false);

    expect(
      shouldShowOwnerLaunchGate({
        authLoading: false,
        isAuthenticated: true,
        role: "user",
        hasStoredOwnerPassword: false,
        isUnlockedInSession: false,
      })
    ).toBe(false);
  });

  it("gates authenticated admin/owner when no password is set or session is locked", () => {
    expect(
      shouldShowOwnerLaunchGate({
        authLoading: false,
        isAuthenticated: true,
        role: "admin",
        hasStoredOwnerPassword: false,
        isUnlockedInSession: false,
      })
    ).toBe(true);

    expect(
      shouldShowOwnerLaunchGate({
        authLoading: false,
        isAuthenticated: true,
        role: "shop_owner",
        hasStoredOwnerPassword: true,
        isUnlockedInSession: false,
      })
    ).toBe(true);
  });

  it("unlocks when owner has stored password and session is unlocked", () => {
    expect(
      shouldShowOwnerLaunchGate({
        authLoading: false,
        isAuthenticated: true,
        role: "admin",
        hasStoredOwnerPassword: true,
        isUnlockedInSession: true,
      })
    ).toBe(false);
  });
});
