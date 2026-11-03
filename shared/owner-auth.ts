import crypto from "crypto";

// Development-only fallback. In production the Owner ID must come from the
// OWNER_SECRET_ID setting (or the hashed custom ID saved in the database);
// the well-known default is never accepted there.
const DEV_FALLBACK_OWNER_ID = "haricart-owner-7884";

function getFallbackOwnerId(): string | null {
  const configured = process.env.OWNER_SECRET_ID?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? null : DEV_FALLBACK_OWNER_ID;
}

export const DEFAULT_OWNER_ID = getFallbackOwnerId() ?? "";

export function hashOwnerId(ownerId: string): string {
  return crypto.createHash("sha256").update(ownerId.trim()).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function verifyOwnerSecretId(secretId: string | null | undefined, storedHash?: string | null): boolean {
  if (!secretId) return false;
  const trimmed = secretId.trim();
  if (!trimmed) return false;
  if (storedHash) {
    return safeEqualHex(hashOwnerId(trimmed), storedHash);
  }
  const fallback = getFallbackOwnerId();
  if (!fallback) return false;
  return safeEqualHex(hashOwnerId(trimmed), hashOwnerId(fallback));
}
