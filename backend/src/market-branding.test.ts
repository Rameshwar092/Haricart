import { describe, expect, it } from "vitest";
import { MARKET_PROMO } from "@shared/market-branding";

describe("HariCart market promotion", () => {
  it("uses the Lucknow all-in-one market positioning", () => {
    expect(MARKET_PROMO.headline).toContain("लखनऊ");
    expect(MARKET_PROMO.headline).toContain("बाज़ार");
    expect(MARKET_PROMO.accent).toBe("All-in-One Market");
    expect(MARKET_PROMO.description).toContain("सब्ज़ी");
    expect(MARKET_PROMO.description).toContain("किराना");
    expect(MARKET_PROMO.description).toContain("Extra Discount Deals");
  });
});
