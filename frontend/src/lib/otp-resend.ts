export const OTP_RESEND_COOLDOWN_SECONDS = 30;

export function formatOtpCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `00:${String(safeSeconds).padStart(2, "0")}`;
}

export function canResendOtp({
  phone,
  otpRequested,
  phoneVerified,
  secondsRemaining,
  requestPending,
}: {
  phone: string;
  otpRequested: boolean;
  phoneVerified: boolean;
  secondsRemaining: number;
  requestPending: boolean;
}): boolean {
  return Boolean(phone.trim()) && otpRequested && !phoneVerified && secondsRemaining <= 0 && !requestPending;
}
