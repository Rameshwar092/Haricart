import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { FirebaseTokenError, verifyFirebasePhoneToken } from "./_core/firebaseAuth";

const PROJECT = "haricart-test";
let privateKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;
const now = Math.floor(Date.now() / 1000);

async function makeToken(overrides: Record<string, unknown> = {}, opts: { issuer?: string; audience?: string; key?: CryptoKey } = {}) {
  return new SignJWT({ phone_number: "+919170367884", auth_time: now - 5, firebase: { sign_in_provider: "phone" }, ...overrides })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("firebase-uid-1")
    .setIssuer(opts.issuer ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(opts.audience ?? PROJECT)
    .setIssuedAt(now - 5)
    .setExpirationTime(now + 3600)
    .sign(opts.key ?? privateKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey as CryptoKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256", use: "sig" };
  keys = createLocalJWKSet({ keys: [jwk] });
});

afterEach(() => vi.restoreAllMocks());

describe("Firebase phone OTP token check", () => {
  it("accepts a fresh phone-login token for our project", async () => {
    const claims = await verifyFirebasePhoneToken(await makeToken(), { projectId: PROJECT, keys });
    expect(claims).toMatchObject({ uid: "firebase-uid-1", phoneNumber: "+919170367884" });
  });

  it("rejects tokens from another Firebase project", async () => {
    const token = await makeToken({}, { issuer: "https://securetoken.google.com/other-app", audience: "other-app" });
    await expect(verifyFirebasePhoneToken(token, { projectId: PROJECT, keys })).rejects.toBeInstanceOf(FirebaseTokenError);
  });

  it("rejects tokens signed with someone else's key", async () => {
    const forged = await generateKeyPair("RS256");
    const token = await makeToken({}, { key: forged.privateKey as CryptoKey });
    await expect(verifyFirebasePhoneToken(token, { projectId: PROJECT, keys })).rejects.toBeInstanceOf(FirebaseTokenError);
  });

  it("rejects non-phone logins and old logins", async () => {
    await expect(verifyFirebasePhoneToken(await makeToken({ firebase: { sign_in_provider: "password" } }), { projectId: PROJECT, keys })).rejects.toThrow(/phone sign-in/);
    await expect(verifyFirebasePhoneToken(await makeToken({ phone_number: undefined }), { projectId: PROJECT, keys })).rejects.toThrow(/phone number/);
    await expect(verifyFirebasePhoneToken(await makeToken({ auth_time: now - 3600 }), { projectId: PROJECT, keys })).rejects.toThrow(/too old/);
  });

  it("refuses to work when FIREBASE_PROJECT_ID is not set", async () => {
    await expect(verifyFirebasePhoneToken(await makeToken(), { projectId: "", keys })).rejects.toThrow(/not configured/);
  });
});
