import { describe, expect, it } from "vitest";
import {
  getLaunchSplashDuration,
  getLaunchSplashLabel,
  HARI_CART_LOGO_URL,
  LAUNCH_SPLASH_DURATION_MS,
  launchSplashCopy,
  shouldShowLaunchSplash,
} from "../src/lib/launch-splash";

describe("HariCart launch splash", () => {
  it("uses HariCart branding and the stored approved logo", () => {
    expect(launchSplashCopy.title).toBe("HariCart");
    expect(launchSplashCopy.subtitle).toContain("Fresh groceries");
    expect(HARI_CART_LOGO_URL).toBe("/brand/icon-512.png");
    expect(getLaunchSplashLabel()).toBe("HariCart loading");
  });

  it("shows until the launch timer completes", () => {
    expect(shouldShowLaunchSplash(false)).toBe(true);
    expect(shouldShowLaunchSplash(true)).toBe(false);
  });

  it("shortens the launch duration for reduced-motion users", () => {
    expect(getLaunchSplashDuration(false)).toBe(LAUNCH_SPLASH_DURATION_MS);
    expect(getLaunchSplashDuration(true)).toBe(600);
  });
});
