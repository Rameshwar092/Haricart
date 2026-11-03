import { describe, expect, it } from "vitest";
import { matchesCatalogCategory } from "@shared/catalog-filter";
import { matchesCatalogSearch } from "@shared/catalog-search";

type SearchProduct = { title: string; description?: string | null; tags: string[] };

function filterCatalog(products: SearchProduct[], query: string, category: string) {
  return products.filter(product => matchesCatalogSearch({ query, title: product.title, description: product.description, tags: product.tags }) && matchesCatalogCategory({ category, title: product.title, description: product.description, tags: product.tags }));
}

describe("HariCart live search", () => {
  const products = [
    { title: "Fresh Tomato", tags: ["Fresh Vegetable"] },
    { title: "Green Banana", tags: ["Fresh Fruit"] },
    { title: "Dishwash Liquid", tags: ["Daily Essentials"] },
  ];

  it("updates matches case-insensitively as the customer types", () => {
    expect(filterCatalog(products, "tom", "All").map(product => product.title)).toEqual(["Fresh Tomato"]);
    expect(filterCatalog(products, "BANANA", "All").map(product => product.title)).toEqual(["Green Banana"]);
  });

  it("matches category keywords and selected categories together", () => {
    expect(filterCatalog(products, "veg", "All").map(product => product.title)).toEqual(["Fresh Tomato"]);
    expect(filterCatalog(products, "tamatar", "Fresh Vegetable").map(product => product.title)).toEqual(["Fresh Tomato"]);
    expect(filterCatalog(products, "green", "Fresh Vegetable")).toEqual([]);
    expect(filterCatalog(products, "green", "Fresh Fruit").map(product => product.title)).toEqual(["Green Banana"]);
  });

  it("searches descriptions and tags, not only the visible title", () => {
    const catalog = [{ title: "Daily Basket", description: "Crisp farm vegetables", tags: ["Fresh Vegetable", "farm produce"] }];
    expect(filterCatalog(catalog, "farm", "All").map(product => product.title)).toEqual(["Daily Basket"]);
    expect(filterCatalog(catalog, "vegetables", "Fresh Vegetable").map(product => product.title)).toEqual(["Daily Basket"]);
  });
});

export { filterCatalog };
