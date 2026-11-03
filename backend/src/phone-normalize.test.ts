import { describe, expect, it } from "vitest";
import { formatPhoneForDisplay, isValidPhone, legacyPhoneVariants, normalizePhone } from "@shared/phone";
import { getLegacyResidentPhoneOpenIds, getResidentPhoneOpenId, isPhoneVerificationComplete, toE164 } from "./routers/community";

describe("one phone number, one format", () => {
  const same = ["9876543210", "09876543210", "919876543210", "+919876543210", "+91 98765 43210", "+91-98765-43210", "(+91) 98765 43210", " 98765 43210 ", "0091 9876543210"];

  it("turns every common way of typing an Indian number into +91XXXXXXXXXX", () => {
    for (const typed of same) expect(normalizePhone(typed), typed).toBe("+919876543210");
    expect(toE164("98765 43210")).toBe("+919876543210");
  });

  it("gives every format the same account", () => {
    const ids = new Set(same.map(getResidentPhoneOpenId));
    expect(ids.size).toBe(1);
    expect(getResidentPhoneOpenId("9876543210")).not.toBe(getResidentPhoneOpenId("9876543211"));
  });

  it("keeps other countries' numbers when they start with +", () => {
    expect(normalizePhone("+1 (415) 555-0100")).toBe("+14155550100");
    expect(isValidPhone("+1 415 555 0100")).toBe(true);
  });

  it("rejects numbers that are too short", () => {
    expect(isValidPhone("12345")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("shows numbers in a readable way", () => {
    expect(formatPhoneForDisplay("9876543210")).toBe("+91 98765 43210");
  });

  it("finds accounts and invites saved under older formats", () => {
    const variants = legacyPhoneVariants("+919876543210");
    expect(variants).toEqual(expect.arrayContaining(["9876543210", "+91 98765 43210", "+919876543210"]));
    const legacy = getLegacyResidentPhoneOpenIds("9876543210");
    expect(legacy.length).toBeGreaterThan(3);
    expect(legacy).not.toContain(getResidentPhoneOpenId("9876543210"));
  });

  it("accepts a verified profile saved under a different format", () => {
    expect(isPhoneVerificationComplete({ phone: "+91 98765 43210", phoneVerifiedAt: new Date() }, "9876543210")).toBe(true);
    expect(isPhoneVerificationComplete({ phone: "9876543211", phoneVerifiedAt: new Date() }, "9876543210")).toBe(false);
  });
});
