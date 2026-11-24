import { normalizeProductImages } from "./product-images";

export const formatCatalogOrigin = (value: string | null | undefined) => value?.trim() || "India";

export type CatalogProductDraft = {
  name: string;
  price: string;
  compareAtPrice?: string;
  countryOfOrigin?: string;
  stockQuantity: string | number;
  unitLabel?: string;
  imageUrl?: string;
  /** All photos, cover first (up to 5). When given, imageUrl is set to the first one. */
  imageUrls?: string[];
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
  imageUrls?: string[];
  description?: string;
  shopId?: number;
  isAvailable: boolean;
};

export function buildCatalogProductPayload(draft: CatalogProductDraft): CatalogProductPayload {
  const imageUrls = draft.imageUrls ? normalizeProductImages(draft.imageUrls) : undefined;
  return {
    name: draft.name.trim(),
    price: draft.price,
    compareAtPrice: draft.compareAtPrice?.trim() || undefined,
    countryOfOrigin: formatCatalogOrigin(draft.countryOfOrigin),
    stockQuantity: Math.max(0, Number(draft.stockQuantity) || 0),
    unitLabel: draft.unitLabel?.trim() || "kg",
    imageUrl: imageUrls ? imageUrls[0] : draft.imageUrl?.trim() || undefined,
    ...(imageUrls ? { imageUrls } : {}),
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
  imageUrls?: string[];
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
    ...(payload.imageUrls ? { imageUrls: payload.imageUrls } : {}),
    isAvailable: payload.isAvailable,
  };
}

export function getCatalogVisibilityState(isAvailable: boolean, stockQuantity: string | number) {
  return isAvailable && Math.max(0, Number(stockQuantity) || 0) > 0 ? "live" : isAvailable ? "out_of_stock" : "paused";
}