import { describe, expect, it } from "vitest";
import { getSharePayload, isNativeShareAvailable, shareAppText, shareAppTitle } from "./share";

describe("app sharing", () => {
  it("builds a branded share payload with the current app URL", () => {
    expect(getSharePayload("https://society-mart.example")).toEqual({
      title: shareAppTitle,
      text: shareAppText,
      url: "https://society-mart.example",
    });
  });

  it("detects native sharing without requiring it on unsupported browsers", () => {
    expect(isNativeShareAvailable({ share: async () => undefined })).toBe(true);
    expect(isNativeShareAvailable(undefined)).toBe(false);
  });
});
