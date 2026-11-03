import { describe, expect, it, vi } from "vitest";
import { buildOwnerOrderSmsBody, sendOwnerOrderSms } from "./_core/owner-order-sms";

describe("owner order SMS alerts", () => {
  it("builds a compact INR order alert without exposing unnecessary customer data", () => {
    expect(buildOwnerOrderSmsBody({ orderNumber: "SM-ABC-1", amount: "125.5", apartmentUnit: "A-101" })).toBe(
      "HariCart new order SM-ABC-1 received. Amount INR 125.50. Unit A-101. Open the owner order queue to view details."
    );
  });

  it("skips network delivery during ordinary test runs even when credentials exist", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousLiveFlag = process.env.RUN_TWILIO_LIVE_TESTS;
    process.env.NODE_ENV = "test";
    delete process.env.RUN_TWILIO_LIVE_TESTS;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      await expect(sendOwnerOrderSms({ orderNumber: "SM-TEST-1", amount: 10, apartmentUnit: "A-101" })).resolves.toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
      if (previousLiveFlag === undefined) delete process.env.RUN_TWILIO_LIVE_TESTS; else process.env.RUN_TWILIO_LIVE_TESTS = previousLiveFlag;
    }
  });

  it("skips sending when Twilio sender configuration is incomplete", async () => {
    const previous = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromPhone: process.env.TWILIO_FROM_PHONE,
      ownerPhone: process.env.OWNER_ALERT_PHONE,
    };
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_PHONE;
    delete process.env.OWNER_ALERT_PHONE;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      await expect(sendOwnerOrderSms({ orderNumber: "SM-ABC-1", amount: 10, apartmentUnit: "A-101" })).resolves.toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      if (previous.accountSid === undefined) delete process.env.TWILIO_ACCOUNT_SID; else process.env.TWILIO_ACCOUNT_SID = previous.accountSid;
      if (previous.authToken === undefined) delete process.env.TWILIO_AUTH_TOKEN; else process.env.TWILIO_AUTH_TOKEN = previous.authToken;
      if (previous.fromPhone === undefined) delete process.env.TWILIO_FROM_PHONE; else process.env.TWILIO_FROM_PHONE = previous.fromPhone;
      if (previous.ownerPhone === undefined) delete process.env.OWNER_ALERT_PHONE; else process.env.OWNER_ALERT_PHONE = previous.ownerPhone;
    }
  });
});
