export const formatCatalogOrigin = (value: string | null | undefined) => value?.trim() || "India";

export type CatalogProductDraft = {
  name: string;
  price: string;
  compareAtPrice?: string;
  countryOfOrigin?: string;
  stockQuantity: string | number;
  unitLabel?: string;
  imageUrl?: string;
  description?: string;
  shopId?: string | number;
  isAvailable: boolean;
};

export type CatalogProductPayload = {
  name: string;
  price: string;
  compareAtPrice?: string;
  countryOfOrigin: string;
  stockQuantity: number;
  unitLabel: string;
  imageUrl?: string;
  description?: string;
  shopId?: number;
  isAvailable: boolean;
};

export function buildCatalogProductPayload(draft: CatalogProductDraft): CatalogProductPayload {
  return {
    name: draft.name.trim(),
    price: draft.price,
    compareAtPrice: draft.compareAtPrice?.trim() || undefined,
    countryOfOrigin: formatCatalogOrigin(draft.countryOfOrigin),
    stockQuantity: Math.max(0, Number(draft.stockQuantity) || 0),
    unitLabel: draft.unitLabel?.trim() || "kg",
    imageUrl: draft.imageUrl?.trim() || undefined,
    description: draft.description?.trim() || undefined,
    shopId: draft.shopId === undefined || draft.shopId === "" ? undefined : Number(draft.shopId),
    isAvailable: draft.isAvailable,
  };
}

export type CatalogProductUpdatePayload = {
  id: number;
  name: string;
  description?: string;
  price: string;
  compareAtPrice: string | null;
  countryOfOrigin: string;
  stockQuantity: number;
  unitLabel: string;
  imageUrl: string | null;
  isAvailable: boolean;
};

export function buildCatalogProductUpdatePayload(id: number, draft: CatalogProductDraft): CatalogProductUpdatePayload {
  const payload = buildCatalogProductPayload(draft);
  return {
    id,
    name: payload.name,
    description: payload.description,
    price: payload.price,
    compareAtPrice: payload.compareAtPrice ?? null,
    countryOfOrigin: payload.countryOfOrigin,
    stockQuantity: payload.stockQuantity,
    unitLabel: payload.unitLabel,
    imageUrl: payload.imageUrl ?? null,
    isAvailable: payload.isAvailable,
  };
}

export function getCatalogVisibilityState(isAvailable: boolean, stockQuantity: string | number) {
  return isAvailable && Math.max(0, Number(stockQuantity) || 0) > 0 ? "live" : isAvailable ? "out_of_stock" : "paused";
}
