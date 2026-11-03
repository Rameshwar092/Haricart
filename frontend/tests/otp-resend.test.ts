import { describe, expect, it } from "vitest";
import { canResendOtp, formatOtpCountdown, OTP_RESEND_COOLDOWN_SECONDS } from "../src/lib/otp-resend";

describe("OTP resend countdown", () => {
  it("uses a 30-second cooldown and formats remaining time consistently", () => {
    expect(OTP_RESEND_COOLDOWN_SECONDS).toBe(30);
    expect(formatOtpCountdown(30)).toBe("00:30");
    expect(formatOtpCountdown(5)).toBe("00:05");
    expect(formatOtpCountdown(0)).toBe("00:00");
    expect(formatOtpCountdown(-3)).toBe("00:00");
  });

  it("only enables resend after cooldown, with a valid phone and pending OTP", () => {
    const base = { phone: "9170367884", otpRequested: true, phoneVerified: false, requestPending: false };
    expect(canResendOtp({ ...base, secondsRemaining: 1 })).toBe(false);
    expect(canResendOtp({ ...base, secondsRemaining: 0 })).toBe(true);
    expect(canResendOtp({ ...base, secondsRemaining: 0, requestPending: true })).toBe(false);
    expect(canResendOtp({ ...base, secondsRemaining: 0, phone: "" })).toBe(false);
    expect(canResendOtp({ ...base, secondsRemaining: 0, phoneVerified: true })).toBe(false);
    expect(canResendOtp({ ...base, secondsRemaining: 0, otpRequested: false })).toBe(false);
  });
});
