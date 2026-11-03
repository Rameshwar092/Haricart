export function toMoneyNumber(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function calculateSalePrice(mrp: string | number, discountPercent: string | number): string {
  const original = toMoneyNumber(mrp);
  const discount = Math.min(100, Math.max(0, toMoneyNumber(discountPercent)));
  if (original <= 0) return "";
  return (original * (1 - discount / 100)).toFixed(2);
}

export function calculateDiscountPercent(mrp: string | number | null | undefined, salePrice: string | number | null | undefined): number {
  const original = toMoneyNumber(mrp);
  const sale = toMoneyNumber(salePrice);
  if (original <= 0 || sale >= original) return 0;
  return Math.round(((original - sale) / original) * 100);
}

export function formatDiscountBadge(mrp: string | number | null | undefined, salePrice: string | number | null | undefined): string | null {
  const discount = calculateDiscountPercent(mrp, salePrice);
  return discount > 0 ? `↓ ${discount}% OFF` : null;
}

export function normalizePricing(mrp: string | number, salePrice?: string | number | null) {
  const original = toMoneyNumber(mrp);
  const sale = salePrice === undefined || salePrice === null || salePrice === "" ? original : toMoneyNumber(salePrice);
  if (original <= 0 || sale <= 0 || sale > original) return { mrp: original, salePrice: Math.min(original, Math.max(0, sale)), discountPercent: 0 };
  return { mrp: original, salePrice: sale, discountPercent: calculateDiscountPercent(original, sale) };
}

export function formatPriceInput(value: string): string {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
}
