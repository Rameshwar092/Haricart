export function canAddToCart(marketOpen: boolean, availableForSale: boolean) {
  return marketOpen && availableForSale;
}

export function marketClosedMessage() {
  return "HariCart is temporarily closed. Please check back soon.";
}
