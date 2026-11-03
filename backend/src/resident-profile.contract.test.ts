import { describe, expect, it } from "vitest";
import { getResidentProfileByUserId } from "./db";

describe("resident profile query contract", () => {
  it("returns null rather than undefined when no database-backed profile is available", async () => {
    const profile = await getResidentProfileByUserId(987654321);
    expect(profile).not.toBeUndefined();
    expect(profile === null || typeof profile === "object").toBe(true);
  });
});
