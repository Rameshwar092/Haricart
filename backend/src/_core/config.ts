/**
 * Checks the server settings once at startup.
 * In production a missing *required* setting stops the server with a clear
 * message instead of running in an unsafe or half-working state.
 */
type Check = { name: string; ok: boolean; why: string };

export function validateConfig(env: NodeJS.ProcessEnv = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const has = (key: string) => Boolean(env[key]?.trim());

  const required: Check[] = [
    { name: "JWT_SECRET", ok: (env.JWT_SECRET?.length ?? 0) >= 32, why: "signs login sessions; use at least 32 random characters (e.g. `openssl rand -hex 32`)" },
    { name: "DATABASE_URL", ok: has("DATABASE_URL"), why: "MySQL connection string" },
  ];

  const recommended: Check[] = [
    { name: "OWNER_PHONES", ok: has("OWNER_PHONES"), why: "your mobile number(s); they become the owner/admin when they log in with OTP" },
    { name: "OWNER_SECRET_ID", ok: has("OWNER_SECRET_ID"), why: "private Owner ID for the owner screens" },
    { name: "FIREBASE_PROJECT_ID (or TWILIO_*)", ok: has("FIREBASE_PROJECT_ID") || (has("TWILIO_ACCOUNT_SID") && has("TWILIO_AUTH_TOKEN") && has("TWILIO_VERIFY_SERVICE_SID")), why: "real SMS OTP for customer login" },
  ];

  const missingRequired = required.filter(c => !c.ok);
  const missingRecommended = recommended.filter(c => !c.ok);

  for (const c of missingRecommended) {
    console.warn(`[Config] ${c.name} is not set — ${c.why}.`);
  }
  if (isProduction && env.OTP_SIMULATION === "true") {
    console.warn("[Config] OTP_SIMULATION=true: the test code 1234 is accepted. Turn this OFF for real customers.");
  }

  if (missingRequired.length) {
    const lines = missingRequired.map(c => `  - ${c.name}: ${c.why}`).join("\n");
    if (isProduction) {
      throw new Error(`Missing or invalid required settings:\n${lines}\nSet them in backend/.env or your hosting dashboard.`);
    }
    console.warn(`[Config] Missing settings (ok for local development):\n${lines}`);
  }

  return { missingRequired: missingRequired.map(c => c.name), missingRecommended: missingRecommended.map(c => c.name) };
}
