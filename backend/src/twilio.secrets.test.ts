import { describe, expect, it } from "vitest";

describe("Twilio OTP credentials", () => {
  // Checks your real settings; skipped when TWILIO_FROM_PHONE is not set (e.g. CI).
  it.skipIf(!process.env.TWILIO_FROM_PHONE)("has an E.164-formatted SMS sender number configured", () => {
    expect(process.env.TWILIO_FROM_PHONE).toMatch(/^\+[1-9]\d{7,14}$/);
  });

  const liveIt = process.env.RUN_TWILIO_LIVE_TESTS === "true" ? it : it.skip;

  liveIt("authenticates against the configured Twilio account and recognizes the sender number", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_FROM_PHONE;
    expect(accountSid).toBeTruthy();
    expect(authToken).toBeTruthy();
    expect(fromPhone).toBeTruthy();

    const authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(fromPhone!)}`, {
      headers: { Authorization: authorization },
    });
    expect(response.ok).toBe(true);
    const payload = (await response.json()) as { incoming_phone_numbers?: Array<{ phone_number?: string }> };
    expect(payload.incoming_phone_numbers?.some(number => number.phone_number === fromPhone)).toBe(true);
  }, 15000);
});
