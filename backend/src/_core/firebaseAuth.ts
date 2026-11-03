import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Verifies a Firebase Authentication ID token on the server.
 *
 * The browser signs the customer in with Firebase phone OTP and sends us the
 * resulting ID token. We check its signature against Google's public keys and
 * that it was issued for OUR Firebase project — so nobody can fake a login.
 * Only FIREBASE_PROJECT_ID is needed (no service-account key file).
 */
const GOOGLE_SECURETOKEN_KEYS = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
);

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const getKeys = () => (jwks ??= createRemoteJWKSet(GOOGLE_SECURETOKEN_KEYS, { cooldownDuration: 30_000, cacheMaxAge: 6 * 60 * 60 * 1000 }));

export const getFirebaseProjectId = () => process.env.FIREBASE_PROJECT_ID?.trim() || "";
export const isFirebaseConfigured = () => Boolean(getFirebaseProjectId());

export class FirebaseTokenError extends Error {}

export type FirebasePhoneClaims = { uid: string; phoneNumber: string; authTime: number };

/** Max age of the OTP login we accept (the token is used right after the OTP check). */
const MAX_AUTH_AGE_SECONDS = 10 * 60;

export async function verifyFirebasePhoneToken(
  idToken: string,
  options: { projectId?: string; keys?: Parameters<typeof jwtVerify>[1]; now?: number } = {}
): Promise<FirebasePhoneClaims> {
  const projectId = options.projectId ?? getFirebaseProjectId();
  if (!projectId) throw new FirebaseTokenError("Firebase is not configured (FIREBASE_PROJECT_ID).");

  let payload: JWTPayload & { phone_number?: unknown; auth_time?: unknown; firebase?: { sign_in_provider?: unknown } };
  try {
    ({ payload } = await jwtVerify(idToken, (options.keys ?? getKeys()) as never, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
      currentDate: options.now ? new Date(options.now * 1000) : undefined,
    }));
  } catch (error) {
    throw new FirebaseTokenError(`Invalid Firebase token: ${error instanceof Error ? error.message : String(error)}`);
  }

  const now = options.now ?? Math.floor(Date.now() / 1000);
  const authTime = typeof payload.auth_time === "number" ? payload.auth_time : 0;
  if (!payload.sub) throw new FirebaseTokenError("Firebase token has no user id.");
  if (typeof payload.phone_number !== "string" || !payload.phone_number) throw new FirebaseTokenError("Firebase token has no verified phone number.");
  if (payload.firebase?.sign_in_provider !== "phone") throw new FirebaseTokenError("Firebase token was not issued by phone sign-in.");
  if (!authTime || now - authTime > MAX_AUTH_AGE_SECONDS) throw new FirebaseTokenError("Firebase login is too old; please verify the OTP again.");

  return { uid: payload.sub, phoneNumber: payload.phone_number, authTime };
}
