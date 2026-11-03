import { describe, expect, it } from "vitest";
import { generateBrandedHariCartQrDataUrl } from "../src/lib/brandedQr";
import { getBrandedHariCartQrConfig } from "@shared/branded-qr-config";

describe("Branded HariCart QR generator and config", () => {
  it("generates a valid data URL in non-browser environment", async () => {
    const dataUrl = await generateBrandedHariCartQrDataUrl("upi://pay?pa=test@okicici&pn=HariCart", 200);
    expect(typeof dataUrl).toBe("string");
    expect(dataUrl.startsWith("data:image/")).toBe(true);
  });

  it("produces correct branded configuration options for HariCart", () => {
    const config = getBrandedHariCartQrConfig("upi://pay?pa=shaileshgbx@okicici&pn=HariCart&am=150.00", 300);
    expect(config.darkColor).toBe("#185c35");
    expect(config.errorCorrectionLevel).toBe("H");
    expect(config.footerText).toBe("HariCart Fresh Vegetable");
    expect(config.centerLogoPath).toBe("/favicon.ico");
    expect(config.size).toBe(300);
    expect(config.margin).toBe(2);
  });
});
