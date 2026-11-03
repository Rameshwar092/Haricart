import { describe, expect, it } from "vitest";
import { verifyOwnerSecretId } from "@shared/owner-auth";

describe("HariCart Owner ID security", () => {
  it("accepts the valid default owner secret ID", () => {
    expect(verifyOwnerSecretId("haricart-owner-7884")).toBe(true);
  });

  it("rejects incorrect owner secret IDs", () => {
    expect(verifyOwnerSecretId("wrong-pin")).toBe(false);
    expect(verifyOwnerSecretId("")).toBe(false);
    expect(verifyOwnerSecretId(null)).toBe(false);
  });
});
