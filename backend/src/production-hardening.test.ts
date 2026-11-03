import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { isOtpSimulationAllowed, toE164 } from "./routers/community";
import { validateConfig } from "./_core/config";
import { verifyOwnerSecretId } from "@shared/owner-auth";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.unstubAllGlobals();
});

function guestCtx() {
  return { user: null, req: { protocol: "https", headers: {} }, res: { cookie: vi.fn(), clearCookie: vi.fn() } } as never;
}

function clearTwilio() {
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_VERIFY_SERVICE_SID;
}

describe("production safety", () => {
  it("turns the 1234 test OTP off in production unless explicitly enabled", () => {
    process.env.NODE_ENV = "production";
    delete process.env.OTP_SIMULATION;
    expect(isOtpSimulationAllowed()).toBe(false);
    process.env.OTP_SIMULATION = "true";
    expect(isOtpSimulationAllowed()).toBe(true);
    process.env.NODE_ENV = "development";
    delete process.env.OTP_SIMULATION;
    expect(isOtpSimulationAllowed()).toBe(true);
  });

  it("rejects the 1234 code in production when Twilio is not configured", async () => {
    process.env.NODE_ENV = "production";
    clearTwilio();
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.community.resident.requestOtp({ phone: "9170367884" })).rejects.toThrow(/not available/);
    await expect(caller.community.resident.confirmOtp({ phone: "9170367884", code: "1234" })).rejects.toThrow(/not available/);
  });

  it("rejects the 1234 code in production when Twilio says the code is wrong", async () => {
    process.env.NODE_ENV = "production";
    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA-test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "pending" }) }));
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.community.resident.confirmOtp({ phone: "9170367884", code: "1234" })).rejects.toThrow("That verification code is not valid.");
  });

  it("reports a failed SMS send in production instead of pretending it worked", async () => {
    process.env.NODE_ENV = "production";
    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA-test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    const caller = appRouter.createCaller(guestCtx());
    await expect(caller.community.resident.requestOtp({ phone: "9170367884" })).rejects.toThrow(/could not send/);
  });

  it("sends Indian numbers to Twilio in +91 format", () => {
    expect(toE164("9170367884")).toBe("+919170367884");
    expect(toE164("+91 91703 67884")).toBe("+919170367884");
    expect(toE164("919170367884")).toBe("+919170367884");
  });

  it("never accepts the well-known default Owner ID in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.OWNER_SECRET_ID;
    expect(verifyOwnerSecretId("haricart-owner-7884")).toBe(false);
    process.env.OWNER_SECRET_ID = "my-private-owner-id";
    expect(verifyOwnerSecretId("my-private-owner-id")).toBe(true);
    expect(verifyOwnerSecretId("haricart-owner-7884")).toBe(false);
  });

  it("refuses to start in production without a strong JWT_SECRET and a database", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => validateConfig({ NODE_ENV: "production", JWT_SECRET: "short" } as NodeJS.ProcessEnv)).toThrow(/JWT_SECRET[\s\S]*DATABASE_URL/);
    expect(() => validateConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(40), DATABASE_URL: "mysql://u:p@h/db" } as NodeJS.ProcessEnv)).not.toThrow();
    warn.mockRestore();
  });
});
