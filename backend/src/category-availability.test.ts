import { describe, expect, it } from "vitest";
import { categoryUnavailableMessage, DEFAULT_CATEGORY_AVAILABILITY, isCategoryAvailable, parseCategoryAvailability } from "@shared/category-availability";

describe("category availability", () => {
  it("evaluates category windows and disabled categories", () => {
    const settings = { ...DEFAULT_CATEGORY_AVAILABILITY, vegetables: { enabled: true, openMarket: false, start: "09:00", end: "18:00" }, fruits: { ...DEFAULT_CATEGORY_AVAILABILITY.fruits, enabled: false } };
    expect(isCategoryAvailable(settings, "vegetables", new Date("2026-08-24T12:30:00"))).toBe(true);
    expect(isCategoryAvailable(settings, "vegetables", new Date("2026-08-24T20:30:00"))).toBe(false);
    expect(isCategoryAvailable(settings, "fruits", new Date("2026-08-24T12:30:00"))).toBe(false);
  });

  it("preserves owner open-market messaging and safely parses stored settings", () => {
    const settings = parseCategoryAvailability(JSON.stringify({ fruits: { enabled: false, openMarket: true, start: "10:00", end: "14:00" } }));
    expect(settings.fruits).toEqual({ enabled: false, openMarket: true, start: "10:00", end: "14:00" });
    expect(categoryUnavailableMessage("fruits", settings)).toContain("Open market coming soon");
    expect(parseCategoryAvailability("not-json").vegetables.enabled).toBe(true);
  });
});
