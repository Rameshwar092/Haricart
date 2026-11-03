import { describe, expect, it } from "vitest";
import { DELIVERY_WINDOW_SECONDS, formatDeliveryCountdown, getDeliveryWindowRemaining } from "@shared/delivery-timer";

describe("delivery countdown", () => {
  it("starts at ten minutes and counts down from a stored start time", () => {
    const startedAt = 1_000_000;
    expect(DELIVERY_WINDOW_SECONDS).toBe(600);
    expect(getDeliveryWindowRemaining(startedAt, startedAt)).toBe(600);
    expect(getDeliveryWindowRemaining(startedAt, startedAt + 61_000)).toBe(539);
    expect(formatDeliveryCountdown(539)).toBe("08:59");
  });

  it("never goes below zero after the delivery window is reached", () => {
    expect(getDeliveryWindowRemaining(1_000_000, 1_700_000)).toBe(0);
    expect(formatDeliveryCountdown(0)).toBe("00:00");
  });
});
