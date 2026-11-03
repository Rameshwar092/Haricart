import { describe, expect, it } from "vitest";
import { isOwnerPhone, phoneKey } from "./_core/env";
import { sdk } from "./_core/sdk";
import { isValidProductImageUrl } from "./routers/community";

describe("owner login by phone (no outside login service)", () => {
  it("matches owner numbers whatever the formatting", () => {
    const owners = "+91 98765 43210, 9123456789";
    expect(isOwnerPhone("9876543210", owners)).toBe(true);
    expect(isOwnerPhone("+919876543210", owners)).toBe(true);
    expect(isOwnerPhone("+91 91234 56789", owners)).toBe(true);
    expect(isOwnerPhone("9876543211", owners)).toBe(false);
    expect(phoneKey("+91 98765-43210")).toBe("9876543210");
  });

  it("never treats short or empty numbers as the owner", () => {
    expect(isOwnerPhone("", "")).toBe(false);
    expect(isOwnerPhone("43210", "+91 98765 43210")).toBe(false);
    expect(isOwnerPhone("9876543210", "")).toBe(false);
  });

  it("signs and verifies its own session tokens", async () => {
    const token = await sdk.createSessionToken("phone_abc", { name: "Owner" });
    const session = await sdk.verifySession(token);
    expect(session).toEqual({ openId: "phone_abc", appId: "haricart", name: "Owner" });
    expect(await sdk.verifySession(`${token}x`)).toBeNull();
    expect(await sdk.verifySession(undefined)).toBeNull();
  });

  it("only accepts photos stored in HariCart's database or HTTPS links", () => {
    expect(isValidProductImageUrl("/api/media/catalog-products/1/photo_ab12cd34.png")).toBe(true);
    expect(isValidProductImageUrl("/manus-storage/old.png")).toBe(false);
    expect(isValidProductImageUrl("http://insecure.example.com/a.png")).toBe(false);
  });
});
