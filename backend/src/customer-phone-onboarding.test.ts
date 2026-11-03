import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { appRouter } from "./routers";
import { getResidentPhoneOpenId } from "./routers/community";

const { getDbMock, getUserByOpenIdMock, upsertUserMock, createSessionTokenMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getUserByOpenIdMock: vi.fn(),
  upsertUserMock: vi.fn(),
  createSessionTokenMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: getDbMock,
  getResidentProfileByUserId: vi.fn(),
  getUserByOpenId: getUserByOpenIdMock,
  getVerifiedResidentProfile: vi.fn(),
  upsertUser: upsertUserMock,
}));

vi.mock("./_core/sdk", () => ({
  sdk: { createSessionToken: createSessionTokenMock },
}));

vi.mock("./_core/cookies", () => ({
  getSessionCookieOptions: vi.fn(() => ({ httpOnly: true, secure: true, sameSite: "none", path: "/" })),
}));

function makeGuestContext() {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const now = new Date("2026-08-22T00:00:00Z");
  return {
    user: undefined,
    req: { protocol: "https", headers: {} },
    res: { cookie: (name: string, value: string, options: Record<string, unknown>) => cookies.push({ name, value, options }) },
    cookies,
    now,
  };
}

function createEmptyCommunityDb() {
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const insertDuplicate = vi.fn().mockResolvedValue(undefined);
  const insertValues = vi.fn().mockReturnValue({ onDuplicateKeyUpdate: insertDuplicate });
  const select = vi.fn((projection?: unknown) => {
    const from = vi.fn((table: unknown) => {
      const where = vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) }));
      const limit = vi.fn().mockResolvedValue([]);
      return { where, limit };
    });
    return { from };
  });
  return {
    select,
    update: vi.fn().mockReturnValue({ set: updateSet }),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  };
}

describe("HariCart customer phone onboarding", () => {
  it("derives a stable app identity from a normalized phone number", () => {
    expect(getResidentPhoneOpenId("  +91 9170367884  ")).toBe(getResidentPhoneOpenId("+91 9170367884"));
    expect(getResidentPhoneOpenId("+91 9170367884")).toMatch(/^phone_[a-f0-9]{58}$/);
  });

  it("issues a secure app session after a valid guest simulation OTP", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_VERIFY_SERVICE_SID;
    const db = createEmptyCommunityDb();
    getDbMock.mockResolvedValue(db);
    const user = { id: 42, openId: getResidentPhoneOpenId("9170367884"), name: null, role: "customer" };
    getUserByOpenIdMock.mockResolvedValue(user);
    upsertUserMock.mockResolvedValue(undefined);
    createSessionTokenMock.mockResolvedValue("signed-phone-session");
    const ctx = makeGuestContext();

    const result = await appRouter.createCaller(ctx as never).community.resident.confirmOtp({ phone: "9170367884", code: "1234" });

    expect(result).toMatchObject({ success: true, sessionIssued: true });
    expect(upsertUserMock).toHaveBeenCalledWith(expect.objectContaining({ openId: user.openId, loginMethod: "phone" }));
    expect(createSessionTokenMock).toHaveBeenCalledWith(user.openId, expect.objectContaining({ expiresInMs: expect.any(Number) }));
    expect(ctx.cookies).toEqual([expect.objectContaining({ name: "app_session_id", value: "signed-phone-session" })]);
    getDbMock.mockReset();
    getUserByOpenIdMock.mockReset();
    upsertUserMock.mockReset();
    createSessionTokenMock.mockReset();
  });

  it("keeps customer onboarding limited to Mobile, OTP, Block, and Flat", () => {
    const homePath = resolve(dirname(fileURLToPath(import.meta.url)), "../../frontend/src/pages/Home.tsx");
    const source = readFileSync(homePath, "utf8");
    expect(source).toContain("completeRegistration.useMutation");
    expect(source).toContain("Mobile number");
    expect(source).toContain("Block Number");
    expect(source).toContain("Flat Number");
    expect(source).not.toContain("Start resident verification");
    expect(source).not.toContain("Create password");
    expect(source).not.toContain("placeholder=\"Full name\"");
  });

  it("returns a structured simulation response when Twilio rejects an OTP request", async () => {
    const previous = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    };
    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    process.env.TWILIO_AUTH_TOKEN = "token-test";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA-test";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    try {
      const result = await appRouter.createCaller(makeGuestContext() as never).community.resident.requestOtp({ phone: "9170367884" });
      expect(result).toEqual({ success: true, simulated: true });
    } finally {
      vi.unstubAllGlobals();
      if (previous.accountSid === undefined) delete process.env.TWILIO_ACCOUNT_SID; else process.env.TWILIO_ACCOUNT_SID = previous.accountSid;
      if (previous.authToken === undefined) delete process.env.TWILIO_AUTH_TOKEN; else process.env.TWILIO_AUTH_TOKEN = previous.authToken;
      if (previous.serviceSid === undefined) delete process.env.TWILIO_VERIFY_SERVICE_SID; else process.env.TWILIO_VERIFY_SERVICE_SID = previous.serviceSid;
    }
  });

  it("accepts the documented simulation OTP when Twilio verification is unavailable", async () => {
    const previous = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
    };
    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    process.env.TWILIO_AUTH_TOKEN = "token-test";
    process.env.TWILIO_VERIFY_SERVICE_SID = "VA-test";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Twilio unavailable")));
    const db = createEmptyCommunityDb();
    getDbMock.mockResolvedValue(db);
    getUserByOpenIdMock.mockResolvedValue({ id: 43, openId: getResidentPhoneOpenId("9170367884"), name: null, role: "customer" });
    upsertUserMock.mockResolvedValue(undefined);
    createSessionTokenMock.mockResolvedValue("signed-phone-session-2");
    try {
      const result = await appRouter.createCaller(makeGuestContext() as never).community.resident.confirmOtp({ phone: "9170367884", code: "1234" });
      expect(result).toMatchObject({ success: true, sessionIssued: true });
    } finally {
      vi.unstubAllGlobals();
      getDbMock.mockReset();
      getUserByOpenIdMock.mockReset();
      upsertUserMock.mockReset();
      createSessionTokenMock.mockReset();
      if (previous.accountSid === undefined) delete process.env.TWILIO_ACCOUNT_SID; else process.env.TWILIO_ACCOUNT_SID = previous.accountSid;
      if (previous.authToken === undefined) delete process.env.TWILIO_AUTH_TOKEN; else process.env.TWILIO_AUTH_TOKEN = previous.authToken;
      if (previous.serviceSid === undefined) delete process.env.TWILIO_VERIFY_SERVICE_SID; else process.env.TWILIO_VERIFY_SERVICE_SID = previous.serviceSid;
    }
  });

});
