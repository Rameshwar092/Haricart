import { randomBytes, scryptSync } from "node:crypto";

const HASH_VERSION = "scrypt-v1";
const KEY_LENGTH = 64;

export function hashResidentPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${HASH_VERSION}$${salt}$${derivedKey}`;
}

export function isResidentPasswordHash(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith(`${HASH_VERSION}$`) && value.split("$").length === 3;
}
