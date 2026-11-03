export type CustomerRole = "admin" | "shop_owner" | "delivery_boy" | "customer" | "user";

export type OwnResidentProfile = {
  fullName?: string | null;
  phone?: string | null;
  blockNumber?: string | null;
  flatNumber?: string | null;
  passwordHash?: string | null;
  [key: string]: unknown;
};

export function canViewCustomerProfile(role: CustomerRole | null | undefined) {
  return role === "customer" || role === "user";
}

export function shouldShowCustomerProfile(role: CustomerRole | null | undefined, isAuthenticated: boolean, isVerifiedResident: boolean) {
  return isAuthenticated && isVerifiedResident && canViewCustomerProfile(role);
}

export function buildOwnCustomerProfile(profile: OwnResidentProfile | null | undefined) {
  if (!profile) return null;
  return {
    fullName: profile.fullName ?? null,
    phone: profile.phone ?? null,
    blockNumber: profile.blockNumber ?? null,
    flatNumber: profile.flatNumber ?? null,
  };
}

export function buildAddressUpdateConfirmation(address: { blockNumber: string; flatNumber: string }) {
  return `Address updated successfully · Block ${address.blockNumber} · Flat ${address.flatNumber}`;
}
