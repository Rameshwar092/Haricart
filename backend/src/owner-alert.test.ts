import { describe, expect, it } from "vitest";

describe("owner SMS alert configuration", () => {
  // Checks your real settings; skipped when OWNER_ALERT_PHONE is not set (e.g. CI).
  it.skipIf(!process.env.OWNER_ALERT_PHONE)("accepts the configured owner phone format", () => {
    expect(process.env.OWNER_ALERT_PHONE).toMatch(/^\+\d{10,15}$/);
  });

  it.skipIf(process.env.RUN_TWILIO_LIVE_TESTS !== "true" || !/^AC[a-zA-Z0-9]+$/.test(process.env.TWILIO_ACCOUNT_SID || ""))("validates real Twilio credentials", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    expect(process.env.TWILIO_FROM_PHONE).toMatch(/^\+\d{10,15}$/);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
