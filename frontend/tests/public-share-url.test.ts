import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicShareUrl, PUBLIC_HARICART_URL } from "../src/const";

describe("HariCart public share URL", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares the address the app was opened from when no live address is configured", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "haricart.example.in",
        origin: "https://haricart.example.in",
      },
    });

    expect(PUBLIC_HARICART_URL).toBe("");
    expect(getPublicShareUrl()).toBe("https://haricart.example.in/");
  });
});
