import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({
  getDb: getDbMock,
  getResidentProfileByUserId: vi.fn(),
  getVerifiedResidentProfile: vi.fn(),
}));

function makeCtx(): TrpcContext {
  const now = new Date("2026-08-21T00:00:00Z");
  return {
    user: {
      id: 99,
      openId: "otp-test-user",
      name: "OTP Tester",
      email: "otp@example.com",
      loginMethod: "phone",
      role: "customer",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("HariCart OTP resilience and simulation fallback", () => {
  it("returns success with simulation when Twilio credentials are missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const caller = appRouter.createCaller(makeCtx());
    const res = await caller.community.resident.requestOtp({ phone: "9170367884" });
    expect(res).toMatchObject({ success: true, simulated: true });
  });

  it("falls back to structured Simulation Mode when Twilio is configured but unavailable", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC_FAKE";
    process.env.TWILIO_AUTH_TOKEN = "TOKEN_FAKE";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA_FAKE";

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.community.resident.requestOtp({ phone: "9170367884" })).resolves.toMatchObject({
      success: true,
      simulated: true,
    });

    fetchSpy.mockRestore();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
  });
});

  it("accepts only the documented 1234 test code in simulation mode", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;

    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where: updateWhere });
    getDbMock.mockResolvedValue({
      select: vi.fn().mockReturnValue({ from }),
      update: vi.fn().mockReturnValue({ set }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    });

    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.community.resident.confirmOtp({ phone: "9170367884", code: "1234" })).resolves.toMatchObject({ success: true });
    await expect(caller.community.resident.confirmOtp({ phone: "9170367884", code: "0000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    getDbMock.mockReset();
  });
