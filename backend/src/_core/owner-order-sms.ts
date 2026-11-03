export type OwnerOrderSmsInput = {
  orderNumber: string;
  amount: string | number;
  apartmentUnit: string;
};

export function buildOwnerOrderSmsBody({ orderNumber, amount, apartmentUnit }: OwnerOrderSmsInput) {
  return `HariCart new order ${orderNumber} received. Amount INR ${Number(amount || 0).toFixed(2)}. Unit ${apartmentUnit}. Open the owner order queue to view details.`;
}

function isE164(value: string | undefined): value is string {
  return Boolean(value && /^\+\d{10,15}$/.test(value));
}

export async function sendOwnerOrderSms(input: OwnerOrderSmsInput): Promise<boolean> {
  if ((process.env.NODE_ENV === "test" || process.env.VITEST) && process.env.RUN_TWILIO_LIVE_TESTS !== "true") {
    return false;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;
  const toPhone = process.env.OWNER_ALERT_PHONE;

  if (!accountSid || !authToken || !isE164(fromPhone) || !isE164(toPhone)) {
    console.warn("[Twilio] Owner order SMS skipped: Account SID, token, sender, or recipient is not configured in E.164 format.");
    return false;
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
  const body = new URLSearchParams({
    From: fromPhone,
    To: toPhone,
    Body: buildOwnerOrderSmsBody(input),
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(`[Twilio] Owner order SMS failed (${response.status})${detail ? `: ${detail}` : ""}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Twilio] Owner order SMS request failed:", error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
