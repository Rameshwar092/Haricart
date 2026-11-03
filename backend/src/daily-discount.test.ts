import { describe, expect, it } from "vitest";
import { DAILY_DISCOUNT_BANNERS_SETTING_KEY, DAILY_DISCOUNT_BANNER_SETTING_KEY, DEFAULT_DAILY_DISCOUNT_BANNER, DEFAULT_DAILY_DISCOUNT_BANNERS, DISCOUNT_BANNER_CATEGORIES, parseDailyDiscountBanners } from "@shared/daily-discount";

describe("HariCart category discount banners", () => {
  it("uses stable setting keys and non-empty defaults for every category", () => {
    expect(DAILY_DISCOUNT_BANNER_SETTING_KEY).toBe("daily_discount_banner");
    expect(DAILY_DISCOUNT_BANNERS_SETTING_KEY).toBe("daily_discount_banners");
    expect(DEFAULT_DAILY_DISCOUNT_BANNER.trim().length).toBeGreaterThan(0);
    for (const { key } of DISCOUNT_BANNER_CATEGORIES) expect(DEFAULT_DAILY_DISCOUNT_BANNERS[key].trim().length).toBeGreaterThan(0);
  });

  it("preserves custom messages and fills missing category values with defaults", () => {
    const banners = parseDailyDiscountBanners(JSON.stringify({ All: "Weekend mega sale", Grocery: "Kitchen essentials extra off" }));
    expect(banners.All).toBe("Weekend mega sale");
    expect(banners.Grocery).toBe("Kitchen essentials extra off");
    expect(banners["Fresh Vegetable"]).toBe(DEFAULT_DAILY_DISCOUNT_BANNER);
  });

  it("keeps the previous single-banner setting compatible", () => {
    expect(parseDailyDiscountBanners("Lucknow special deal").All).toBe("Lucknow special deal");
  });
});
