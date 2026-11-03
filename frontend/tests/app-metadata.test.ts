import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const manifestPath = resolve(projectRoot, "public/manifest.webmanifest");
const indexPath = resolve(projectRoot, "index.html");

describe("HariCart home-screen identity", () => {
  it("declares the HariCart H-branded manifest icon and standalone install mode", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name: string;
      short_name: string;
      display: string;
      theme_color: string;
      icons: Array<{ src: string; type: string; purpose: string }>;
    };

    expect(manifest.name).toContain("HariCart");
    expect(manifest.short_name).toBe("HariCart");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#214d35");
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({
        src: "/brand/icon-512.png",
        type: "image/png",
        purpose: "maskable",
      }),
    ]));
  });

  it("links favicon and Apple home-screen metadata to the same HariCart mark", () => {
    const indexHtml = readFileSync(indexPath, "utf8");
    const iconPath = "/brand/apple-touch-icon.png";

    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(indexHtml).toContain('rel="icon" type="image/svg+xml" href="/brand/haricart-logo.svg"');
    expect(indexHtml).toContain(`rel="apple-touch-icon" href="${iconPath}"`);
    expect(indexHtml).toContain('name="application-name" content="HariCart"');
    expect(indexHtml).toContain('name="mobile-web-app-title" content="HariCart"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-title" content="HariCart"');
    expect(indexHtml).not.toMatch(/manus/i);
  });
});
