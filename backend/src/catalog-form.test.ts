import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCatalogProductPayload } from "@shared/catalog";

describe("Local Catalog Add item form", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "../frontend/src/pages/OperationsPortal.tsx"),
    "utf8",
  );
  const communitySource = fs.readFileSync(
    path.resolve(process.cwd(), "src/routers/community.ts"),
    "utf8",
  );
  const schemaSource = fs.readFileSync(
    path.resolve(process.cwd(), "drizzle/schema.ts"),
    "utf8",
  );

  it("keeps the photo-first fields and storefront visibility guidance", () => {
    expect(source).toContain("Add photos and videos");
    expect(source).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(source).toContain("Item name (required)");
    expect(source).toContain("MRP (required) · ₹");
    expect(source).toContain("Discount % (optional)");
    expect(source).toContain("Sale Price (calculated) · ₹");
    expect(source).toContain("Description (optional)");
    expect(source).toContain("Country of origin (required)");
    expect(source).toContain("More fields");
    expect(source).toContain("Hide this item");
    expect(source).toContain("Use stock 1 or more to show this item on the customer storefront with its photo.");
    expect(source).toContain("buildCatalogProductPayload");
    expect(communitySource).toContain('countryOfOrigin: z.string().trim().min(2).max(80).default("India")');
    expect(communitySource).toContain("countryOfOrigin: input.countryOfOrigin");
    expect(schemaSource).toContain('countryOfOrigin: varchar("countryOfOrigin", { length: 80 }).default("India").notNull()');
  });

  it("preserves uploaded photo, stock, availability, and origin in the submit payload", () => {
    expect(buildCatalogProductPayload({
      name: " Tomato ",
      price: "60",
      compareAtPrice: "75",
      countryOfOrigin: "India",
      stockQuantity: "4",
      unitLabel: "kg",
      imageUrl: " /api/media/catalog-products/tomato.png ",
      description: "Fresh tomato",
      shopId: "2",
      isAvailable: true,
    })).toEqual({
      name: "Tomato",
      price: "60",
      compareAtPrice: "75",
      countryOfOrigin: "India",
      stockQuantity: 4,
      unitLabel: "kg",
      imageUrl: "/api/media/catalog-products/tomato.png",
      description: "Fresh tomato",
      shopId: 2,
      isAvailable: true,
    });

    expect(buildCatalogProductPayload({
      name: "Potato",
      price: "40",
      stockQuantity: 0,
      unitLabel: "kg",
      imageUrl: "potato.png",
      isAvailable: false,
    })).toMatchObject({
      imageUrl: "potato.png",
      stockQuantity: 0,
      countryOfOrigin: "India",
      isAvailable: false,
    });
  });
});

export {};
