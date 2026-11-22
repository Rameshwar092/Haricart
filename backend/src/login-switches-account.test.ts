import { describe, expect, it } from "vitest";
import { getResidentPhoneOpenId, shouldSwitchAccount } from "./routers/community";

describe("logging in with a number opens that number's own account", () => {
  it("switches when the browser is logged in as someone else (e.g. the owner)", () => {
    const owner = getResidentPhoneOpenId("9876543210");
    expect(shouldSwitchAccount(owner, "9000000777")).toBe(true);
  });

  it("keeps the session when it is already this number, in any format", () => {
    const customer = getResidentPhoneOpenId("9000000777");
    expect(shouldSwitchAccount(customer, "+91 90000 00777")).toBe(false);
  });

  it("adds the number to an older account that was not made by phone login", () => {
    expect(shouldSwitchAccount("legacy-account-123", "9000000777")).toBe(false);
  });

  it("starts a session when nobody is logged in", () => {
    expect(shouldSwitchAccount(null, "9000000777")).toBe(true);
  });
});