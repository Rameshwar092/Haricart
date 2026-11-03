export type CartMutationErrorLike = {
  data?: { code?: string };
  message?: string;
};

export function isLocalCatalogVariantId(variantId: string): boolean {
  return /^local:\d+$/.test(variantId);
}

export function shouldRecreateLocalCart(error: unknown): boolean {
  const candidate = (error ?? {}) as CartMutationErrorLike;
  const code = candidate.data?.code;
  if (code === "FORBIDDEN" || code === "NOT_FOUND") return true;
  const message = candidate.message?.toLowerCase() || "";
  return message.includes("basket belongs to another customer") || message.includes("basket not found");
}

export function localCatalogAddErrorMessage(isAuthenticated: boolean, isVerifiedResident: boolean): string | null {
  if (!isAuthenticated) return "Please sign in or complete mobile OTP registration before adding items.";
  if (!isVerifiedResident) return "Complete OTP, Block Number, and Flat Number verification before adding items.";
  return null;
}
