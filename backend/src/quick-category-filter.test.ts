import { describe, expect, it } from "vitest";
import { matchesCatalogCategory } from "@shared/catalog-filter";

describe("quick category filters", () => {
  const item = (tags: string[], title = "Sample item") => ({ category: "All", title, description: null, tags });

  it("shows only the selected category", () => {
    expect(matchesCatalogCategory({ ...item(["clothes"]), category: "Clothes" })).toBe(true);
    expect(matchesCatalogCategory({ ...item(["grocery"]), category: "Clothes" })).toBe(false);
    expect(matchesCatalogCategory({ ...item(["fresh vegetable"]), category: "Fresh Vegetable" })).toBe(true);
    expect(matchesCatalogCategory({ ...item(["fresh fruit"]), category: "Fresh Fruit" })).toBe(true);
    expect(matchesCatalogCategory({ ...item(["electronics"], "Wireless headphones"), category: "Electronics" })).toBe(true);
    expect(matchesCatalogCategory({ ...item(["grocery"], "Rice"), category: "Electronics" })).toBe(false);
  });

  it("recognizes grocery and fresh fallback items", () => {
    expect(matchesCatalogCategory({ ...item(["daily essentials"]), category: "Grocery" })).toBe(true);
    expect(matchesCatalogCategory({ ...item([]), category: "Fresh Vegetable" })).toBe(true);
    expect(matchesCatalogCategory({ ...item(["fruit"]), category: "Fresh Vegetable" })).toBe(false);
  });
});
