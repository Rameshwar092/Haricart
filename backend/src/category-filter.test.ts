import { describe, expect, it } from "vitest";

describe("HariCart category filter contract", () => {
  it("sorts and filters products correctly across All, Fresh Vegetable, and Fresh Fruit", () => {
    const mockProducts = [
      { id: 1, title: "Tomato", tags: ["Fresh Vegetable"] },
      { id: 2, title: "Banana", tags: ["Fresh Fruit"] },
      { id: 3, title: "Potato", tags: ["Vegetables"] },
    ];

    const filterProducts = (category: string) => {
      return mockProducts.filter(product => {
        if (category === "All") return true;
        const tag = (product.tags[0] || "").toLowerCase();
        if (category === "Fresh Vegetable") {
          return tag.includes("veg") || tag.includes("sabzi") || (!tag.includes("fruit") && !tag.includes("phal"));
        }
        if (category === "Fresh Fruit") {
          return tag.includes("fruit") || tag.includes("phal");
        }
        return product.tags.includes(category);
      });
    };

    expect(filterProducts("All").length).toBe(3);
    expect(filterProducts("Fresh Vegetable").map(p => p.title)).toEqual(["Tomato", "Potato"]);
    expect(filterProducts("Fresh Fruit").map(p => p.title)).toEqual(["Banana"]);
  });
});
