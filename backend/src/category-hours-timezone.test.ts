import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORY_AVAILABILITY, categoryHoursLabel, categoryUnavailableMessage, formatShopTime, isCategoryAvailable, shopMinuteOfDay } from "@shared/category-availability";

describe("opening hours use Indian time, even on a UTC server", () => {
  // 21:18 in India = 15:48 UTC (what a Render server's own clock says).
  const ninePmIndia = new Date("2026-11-21T15:48:00Z");

  it("reads the clock in Asia/Kolkata", () => {
    expect(shopMinuteOfDay(ninePmIndia)).toBe(21 * 60 + 18);
    expect(shopMinuteOfDay(new Date("2026-11-21T18:45:00Z"))).toBe(15); // 00:15 next day in India
  });

  it("checks the window against Indian time", () => {
    const settings = { ...DEFAULT_CATEGORY_AVAILABILITY, vegetables: { enabled: true, openMarket: false, start: "06:00", end: "21:00" } };
    expect(isCategoryAvailable(settings, "vegetables", ninePmIndia)).toBe(false);
    expect(isCategoryAvailable(settings, "vegetables", new Date("2026-11-21T10:00:00Z"))).toBe(true); // 3:30 PM India
    expect(isCategoryAvailable(DEFAULT_CATEGORY_AVAILABILITY, "vegetables", ninePmIndia)).toBe(true);
  });

  it("explains when a product can be ordered", () => {
    const settings = { ...DEFAULT_CATEGORY_AVAILABILITY, vegetables: { enabled: true, openMarket: false, start: "06:00", end: "21:00" }, fruits: { enabled: false, openMarket: false, start: "00:00", end: "23:59" } };
    expect(formatShopTime("06:00")).toBe("6:00 AM");
    expect(formatShopTime("21:30")).toBe("9:30 PM");
    expect(formatShopTime("00:00")).toBe("12:00 AM");
    expect(categoryHoursLabel("vegetables", settings)).toBe("Fresh Vegetables: 6:00 AM – 9:00 PM");
    expect(categoryHoursLabel("fruits", settings)).toBe("Fresh Fruits: closed today");
    expect(categoryUnavailableMessage("vegetables", settings)).toContain("6:00 AM – 9:00 PM");
  });
});