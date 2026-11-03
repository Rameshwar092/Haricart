export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  /** Phone numbers that become the owner/admin when they log in, comma separated. */
  ownerPhones: process.env.OWNER_PHONES ?? "",
  isProduction: process.env.NODE_ENV === "production",
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
  shopifyStorefrontApiAccessToken: process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "",
};

/** Last 10 digits of a phone number, so "+91 98765 43210" and "9876543210" match. */
export function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

/** True when this phone number is listed in OWNER_PHONES. */
export function isOwnerPhone(phone: string, ownerPhones: string = ENV.ownerPhones): boolean {
  const key = phoneKey(phone);
  if (key.length < 10) return false;
  return ownerPhones
    .split(",")
    .map(entry => phoneKey(entry))
    .some(owner => owner.length === 10 && owner === key);
}
