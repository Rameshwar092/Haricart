import { describe, expect, it } from "vitest";
import { DELIVERY_AVAILABILITY_NOTE, DELIVERY_PROMISE_LABEL } from "@shared/delivery";

describe("delivery promise messaging", () => {
  it("uses the GreenGate 10-minute delivery label", () => {
    expect(DELIVERY_PROMISE_LABEL).toBe("10 min delivery · GreenGate");
    expect(DELIVERY_AVAILABILITY_NOTE).toContain("GreenGate");
  });
});
