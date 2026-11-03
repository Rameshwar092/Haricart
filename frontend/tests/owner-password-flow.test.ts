import { describe, expect, it } from "vitest";
import { isValidOwnerPassword, ownerPasswordsMatch } from "../src/lib/owner-password";

describe("Owner password setup flow", () => {
  it("requires a six-character minimum password during first-time setup", () => {
    expect(isValidOwnerPassword("12345")).toBe(false);
    expect(isValidOwnerPassword("123456")).toBe(true);
    expect(isValidOwnerPassword(" 123456 ")).toBe(true);
  });

  it("requires the confirmation field to exactly match the created password", () => {
    expect(ownerPasswordsMatch("green-gate-2026", "green-gate-2026")).toBe(true);
    expect(ownerPasswordsMatch("green-gate-2026", "green-gate-2025")).toBe(false);
    expect(ownerPasswordsMatch("green-gate-2026", "")).toBe(false);
    expect(ownerPasswordsMatch("", "")).toBe(false);
  });
});
