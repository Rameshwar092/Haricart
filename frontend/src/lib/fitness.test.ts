import { describe, expect, it } from "vitest";
import { FITNESS_OPTIONS } from "./fitness";

describe("fitness provider options", () => {
  it("keeps the basic client-facing service choices stable", () => {
    expect(FITNESS_OPTIONS).toEqual([
      "Weight loss",
      "Muscle gain",
      "Yoga",
      "Home workout",
      "Diet guidance",
    ]);
  });
});
