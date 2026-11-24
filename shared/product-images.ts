/**
 * Product photos: up to 5 per item. The first photo is the cover shown on product cards.
 * The database keeps the full list in catalogProducts.imageUrls (JSON) and the cover in
 * catalogProducts.imageUrl, so older screens that read only imageUrl keep working.
 */
export const MAX_PRODUCT_IMAGES = 5;
export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

/** Trim, drop empty values and duplicates, and keep at most 5. */
export function normalizeProductImages(urls: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
    if (result.length === MAX_PRODUCT_IMAGES) break;
  }
  return result;
}

/** Read the saved photo list. Items saved before this feature only have imageUrl. */
export function parseProductImages(imageUrls: string | null | undefined, imageUrl?: string | null): string[] {
  if (imageUrls) {
    try {
      const parsed = JSON.parse(imageUrls);
      if (Array.isArray(parsed)) {
        const list = normalizeProductImages(parsed.filter((item): item is string => typeof item === "string"));
        if (list.length) return list;
      }
    } catch {
      /* fall back to the single cover photo */
    }
  }
  return normalizeProductImages([imageUrl]);
}

/** Move one photo to the front so it becomes the cover. */
export function makeCoverImage(urls: string[], index: number): string[] {
  if (index <= 0 || index >= urls.length) return urls;
  return [urls[index], ...urls.slice(0, index), ...urls.slice(index + 1)];
}