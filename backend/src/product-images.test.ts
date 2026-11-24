import { describe, expect, it } from "vitest";
import { buildCatalogProductPayload, buildCatalogProductUpdatePayload } from "../../shared/catalog";
import { MAX_PRODUCT_IMAGES, makeCoverImage, normalizeProductImages, parseProductImages } from "../../shared/product-images";
import { productImageColumns } from "./routers/community";

describe("product photos (up to 5)", () => {
  const six = ["/api/media/a.png", "/api/media/b.png", "/api/media/c.png", "/api/media/d.png", "/api/media/e.png", "/api/media/f.png"];

  it("keeps at most 5 photos, without empty values or duplicates", () => {
    expect(MAX_PRODUCT_IMAGES).toBe(5);
    expect(normalizeProductImages(six)).toHaveLength(5);
    expect(normalizeProductImages([" /api/media/a.png ", "", "/api/media/a.png", null])).toEqual(["/api/media/a.png"]);
  });

  it("reads the saved list, and falls back to the single photo of older items", () => {
    expect(parseProductImages(JSON.stringify(six.slice(0, 3)), "/api/media/a.png")).toEqual(six.slice(0, 3));
    expect(parseProductImages(null, "/api/media/old.png")).toEqual(["/api/media/old.png"]);
    expect(parseProductImages("not json", "/api/media/old.png")).toEqual(["/api/media/old.png"]);
    expect(parseProductImages(null, null)).toEqual([]);
  });

  it("the cover is always the first photo", () => {
    expect(makeCoverImage(["a", "b", "c"], 2)).toEqual(["c", "a", "b"]);
    expect(productImageColumns(["/x.png", "/y.png"])).toEqual({ imageUrl: "/x.png", imageUrls: JSON.stringify(["/x.png", "/y.png"]) });
    expect(productImageColumns([])).toEqual({ imageUrl: null, imageUrls: null });
  });

  it("the form sends all photos and sets the cover", () => {
    const payload = buildCatalogProductPayload({ name: "Mango", price: "120", stockQuantity: 3, imageUrls: six, isAvailable: true });
    expect(payload.imageUrls).toHaveLength(5);
    expect(payload.imageUrl).toBe(six[0]);
    expect(buildCatalogProductUpdatePayload(9, { name: "Mango", price: "120", stockQuantity: 3, imageUrls: [], isAvailable: true })).toMatchObject({ imageUrl: null, imageUrls: [] });
  });
});