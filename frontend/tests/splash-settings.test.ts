import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPLASH_DURATION_MS,
  MAX_SPLASH_DURATION_MS,
  MIN_SPLASH_DURATION_MS,
  clampSplashDuration,
  formatSplashDurationLabel,
  parseSplashDuration,
} from "../../shared/splash-settings";
import { getLaunchSplashDuration } from "../src/lib/launch-splash";

describe("HariCart splash duration settings", () => {
  it("clamps invalid and out-of-range values to the safe launch window", () => {
    expect(parseSplashDuration(undefined)).toBe(DEFAULT_SPLASH_DURATION_MS);
    expect(clampSplashDuration(MIN_SPLASH_DURATION_MS - 1)).toBe(MIN_SPLASH_DURATION_MS);
    expect(clampSplashDuration(MAX_SPLASH_DURATION_MS + 1)).toBe(MAX_SPLASH_DURATION_MS);
    expect(parseSplashDuration("not-a-number")).toBe(DEFAULT_SPLASH_DURATION_MS);
  });

  it("uses the configured duration for normal motion and the reduced-motion fallback otherwise", () => {
    expect(getLaunchSplashDuration(false, 3200)).toBe(3200);
    expect(getLaunchSplashDuration(true, 3200)).toBe(600);
    expect(formatSplashDurationLabel(3200)).toBe("3.2 seconds");
  });
});
