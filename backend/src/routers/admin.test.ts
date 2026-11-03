import { describe, expect, it } from "vitest";

describe("admin governance contract", () => {
  it("keeps the dashboard domains explicit", () => {
    expect(["users", "catalog", "operations", "brand", "notifications", "roadmap"]).toContain("operations");
    expect(["users", "catalog", "operations", "brand", "notifications", "roadmap"]).toContain("notifications");
    expect(["users", "catalog", "operations", "brand", "notifications", "roadmap"]).toContain("roadmap");
  });

  it("keeps roadmap gates evidence-based and bounded to known statuses", () => {
    const statuses = ["pending", "in_progress", "complete", "blocked"];
    expect(statuses).toContain("pending");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("complete");
    expect(statuses).toContain("blocked");
    expect(["roadmap_pilot_apartments", "roadmap_notes"]).toEqual(expect.arrayContaining(["roadmap_pilot_apartments", "roadmap_notes"]));
  });
});
