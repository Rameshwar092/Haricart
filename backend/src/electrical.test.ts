import { describe, expect, it } from "vitest";
import { ELECTRICAL_SERVICES } from "@shared/electrical";

describe("HariCart electrician services", () => {
  it("includes the complete resident electrical service menu", () => {
    expect(ELECTRICAL_SERVICES).toHaveLength(20);
    expect(ELECTRICAL_SERVICES).toContain("Switch / Socket Repair");
    expect(ELECTRICAL_SERVICES).toContain("Wiring Repair");
    expect(ELECTRICAL_SERVICES).toContain("AC Electrical Connection");
    expect(ELECTRICAL_SERVICES).toContain("Emergency Electrician");
  });
});
