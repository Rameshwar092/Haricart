import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DELIVERY_WINDOW_SECONDS, getDeliveryWindowRemaining } from "../../shared/delivery-timer";

const read = (path: string) => readFileSync(resolve(__dirname, path), "utf8");

describe("10-minute delivery countdown starts when the order is placed", () => {
  it("is not started by filling the bag", () => {
    const home = read("../src/pages/Home.tsx");
    expect(home).not.toContain("delivery-window-started-at");
    expect(home).toContain("Delivered in about 10 minutes after you place the order");
    expect(home).toContain("placedAt: Date.now()");
  });

  it("counts down from the order's own placed time, also on My orders", () => {
    expect(read("../src/pages/Orders.tsx")).toContain("<DeliveryCountdown placedAt={order.placedAt} compact />");
    const placedAt = Date.parse("2026-11-22T13:00:00Z");
    expect(getDeliveryWindowRemaining(placedAt, placedAt)).toBe(DELIVERY_WINDOW_SECONDS);
    expect(getDeliveryWindowRemaining(placedAt, placedAt + 90_000)).toBe(DELIVERY_WINDOW_SECONDS - 90);
    expect(getDeliveryWindowRemaining(placedAt, placedAt + 11 * 60_000)).toBe(0);
  });
});