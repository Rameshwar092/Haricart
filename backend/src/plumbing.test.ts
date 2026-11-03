import { describe, expect, it } from "vitest";
import { PLUMBING_SERVICES } from "@shared/plumbing";

describe("HariCart plumber services", () => {
  it("includes the complete requested service menu", () => {
    expect(PLUMBING_SERVICES).toHaveLength(20);
    expect(PLUMBING_SERVICES).toContain("Tap Repair / Replacement");
    expect(PLUMBING_SERVICES).toContain("Water Leakage Repair");
    expect(PLUMBING_SERVICES).toContain("Bathroom Fittings Installation");
    expect(PLUMBING_SERVICES).toContain("Emergency Plumbing");
  });
});
