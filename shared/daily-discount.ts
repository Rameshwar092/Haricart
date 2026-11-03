export const DAILY_DISCOUNT_BANNER_SETTING_KEY = "daily_discount_banner";
export const DAILY_DISCOUNT_BANNERS_SETTING_KEY = "daily_discount_banners";
export const DEFAULT_DAILY_DISCOUNT_BANNER = "आज के Extra Discount Deals";

export const DISCOUNT_BANNER_CATEGORIES = [
  { key: "All", label: "All Products", icon: "🌿" },
  { key: "Fresh Vegetable", label: "Fresh Vegetables", icon: "🥦" },
  { key: "Fresh Fruit", label: "Fresh Fruits", icon: "🍓" },
  { key: "Grocery", label: "Grocery", icon: "🛍️" },
  { key: "Clothes", label: "Clothes", icon: "👚" },
  { key: "Electronics", label: "Electronics", icon: "🎧" },
] as const;

export type DiscountBannerCategory = (typeof DISCOUNT_BANNER_CATEGORIES)[number]["key"];
export type DailyDiscountBanners = Record<DiscountBannerCategory, string>;

export const DEFAULT_DAILY_DISCOUNT_BANNERS: DailyDiscountBanners = Object.fromEntries(
  DISCOUNT_BANNER_CATEGORIES.map(({ key }) => [key, DEFAULT_DAILY_DISCOUNT_BANNER]),
) as DailyDiscountBanners;

export function getDailyDiscountBanner(banners: DailyDiscountBanners | undefined, category: string): string {
  if (!banners) return DEFAULT_DAILY_DISCOUNT_BANNER;
  const selected = banners[category as DiscountBannerCategory];
  return selected || banners.All || DEFAULT_DAILY_DISCOUNT_BANNER;
}

export function parseDailyDiscountBanners(value?: string | null): DailyDiscountBanners {
  if (!value) return DEFAULT_DAILY_DISCOUNT_BANNERS;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.fromEntries(DISCOUNT_BANNER_CATEGORIES.map(({ key }) => [
      key,
      typeof parsed[key] === "string" && parsed[key].trim() ? parsed[key].trim() : DEFAULT_DAILY_DISCOUNT_BANNERS[key],
    ])) as DailyDiscountBanners;
  } catch {
    const legacy = value.trim();
    return legacy ? { ...DEFAULT_DAILY_DISCOUNT_BANNERS, All: legacy } : DEFAULT_DAILY_DISCOUNT_BANNERS;
  }
}
