import { describe, expect, it } from "vitest";
import { OWNER_DISPLAY_NAME } from "./brand";

describe("brand attribution", () => {
  it("uses the requested owner name", () => {
    expect(OWNER_DISPLAY_NAME).toBe("Shailesh Kumar");
  });
});
