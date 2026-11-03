/**
 * One phone number = one format everywhere: E.164, e.g. "+919876543210".
 *
 *   "9876543210", "09876543210", "919876543210", "+91 98765 43210",
 *   "+91-98765-43210" and "(+91) 98765 43210"  →  "+919876543210"
 *
 * A plain 10-digit number is treated as Indian (+91). Numbers that already
 * start with "+" keep their own country code.
 */
export function normalizePhone(raw: string): string {
  const trimmed = (raw ?? "").trim();
  const hasPlus = trimmed.startsWith("+") || trimmed.startsWith("(+");
  let digits = trimmed.replace(/\D/g, "");

  if (hasPlus) return digits ? `+${digits}` : "";
  // International "00" prefix, e.g. 0091 98765 43210
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  // Indian trunk prefix, e.g. 09876543210
  if (/^0[6-9]\d{9}$/.test(digits)) digits = digits.slice(1);
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
  return digits;
}

/** True for a usable mobile number: + then 8–15 digits. */
export function isValidPhone(raw: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhone(raw));
}

/** "+919876543210" → "+91 98765 43210" (for showing to people). */
export function formatPhoneForDisplay(raw: string): string {
  const phone = normalizePhone(raw);
  const indian = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return indian ? `+91 ${indian[1]} ${indian[2]}` : phone;
}

/**
 * Ways the same number may have been saved before numbers were normalized.
 * Used to find older accounts and invites, so nobody loses their history.
 */
export function legacyPhoneVariants(raw: string): string[] {
  const phone = normalizePhone(raw);
  const variants = new Set<string>([phone, raw.trim(), raw.trim().replace(/\s+/g, " ")]);
  const indian = /^\+91(\d{10})$/.exec(phone);
  if (indian) {
    const local = indian[1];
    const a = local.slice(0, 5);
    const b = local.slice(5);
    [
      local,
      `0${local}`,
      `91${local}`,
      `+91 ${local}`,
      `+91-${local}`,
      `+91 ${a} ${b}`,
      `+91 ${a}-${b}`,
      `${a} ${b}`,
      `91 ${local}`,
    ].forEach(value => variants.add(value));
  }
  return Array.from(variants).filter(Boolean);
}
