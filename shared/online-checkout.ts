export function getOnlineCheckoutDestination(checkoutUrl: string | null | undefined) {
  const normalized = checkoutUrl?.trim();
  return normalized ? normalized : null;
}
