export const AVAILABILITY_SETTING_KEY = "category_availability";

export const AVAILABILITY_CATEGORIES = [
  { key: "vegetables", label: "Fresh Vegetables", icon: "🥦" },
  { key: "fruits", label: "Fresh Fruits", icon: "🍓" },
  { key: "grocery", label: "Grocery", icon: "🛍️" },
  { key: "clothes", label: "Clothes", icon: "👚" },
] as const;

export type AvailabilityCategoryKey = (typeof AVAILABILITY_CATEGORIES)[number]["key"];
export type CategoryAvailability = {
  enabled: boolean;
  openMarket: boolean;
  start: string;
  end: string;
};
export type CategoryAvailabilitySettings = Record<AvailabilityCategoryKey, CategoryAvailability>;

export const DEFAULT_CATEGORY_AVAILABILITY: CategoryAvailabilitySettings = {
  vegetables: { enabled: true, openMarket: false, start: "00:00", end: "23:59" },
  fruits: { enabled: true, openMarket: false, start: "00:00", end: "23:59" },
  grocery: { enabled: true, openMarket: false, start: "00:00", end: "23:59" },
  clothes: { enabled: true, openMarket: false, start: "00:00", end: "23:59" },
};

export function parseCategoryAvailability(value?: string | null): CategoryAvailabilitySettings {
  if (!value) return DEFAULT_CATEGORY_AVAILABILITY;
  try {
    const parsed = JSON.parse(value) as Partial<CategoryAvailabilitySettings>;
    return Object.fromEntries(AVAILABILITY_CATEGORIES.map(({ key }) => {
      const item: Partial<CategoryAvailability> = parsed[key] ?? {};
      return [key, {
        ...DEFAULT_CATEGORY_AVAILABILITY[key],
        ...item,
        enabled: item.enabled !== false,
        openMarket: item.openMarket === true,
      }];
    })) as CategoryAvailabilitySettings;
  } catch {
    return DEFAULT_CATEGORY_AVAILABILITY;
  }
}

export function getProductAvailabilityCategory(title: string, description: string | null | undefined, tags: string[]): AvailabilityCategoryKey {
  const text = `${title} ${description || ""} ${tags.join(" ")}`.toLowerCase();
  if (/cloth|fashion|apparel|wear|garment/.test(text)) return "clothes";
  if (/fruit|phal|apple|banana|mango|orange|grape|papaya|guava|pomegranate|kiwi|melon|lemon/.test(text)) return "fruits";
  if (/grocery|daily|essential|kirana|household|snack|beverage/.test(text)) return "grocery";
  return "vegetables";
}

function minuteOfDay(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? (hours * 60) + minutes : 0;
}

/**
 * The shop's own clock. Opening hours are typed in Indian time, so the check must use
 * Indian time everywhere — the live server (Render) runs on UTC, 5½ hours behind.
 */
export const SHOP_TIME_ZONE = "Asia/Kolkata";

/** Minutes since midnight in the shop's time zone (0–1439). */
export function shopMinuteOfDay(now = new Date(), timeZone = SHOP_TIME_ZONE): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0) % 24;
    const minute = Number(parts.find(part => part.type === "minute")?.value ?? 0);
    return hour * 60 + minute;
  } catch {
    // Very old browsers without time-zone support: fall back to India's fixed offset (UTC+5:30).
    return Math.floor(((now.getTime() / 60000) + 330) % 1440);
  }
}

/** "06:00" → "6:00 AM" */
export function formatShopTime(value: string): string {
  const total = minuteOfDay(value);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours < 12 ? "AM" : "PM";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Short text for a product card, e.g. "Vegetables: 6:00 AM – 9:00 PM" or "Vegetables: closed today". */
export function categoryHoursLabel(category: AvailabilityCategoryKey, settings: CategoryAvailabilitySettings): string {
  const rule = settings[category];
  const label = AVAILABILITY_CATEGORIES.find(item => item.key === category)?.label ?? category;
  if (!rule.enabled) return rule.openMarket ? `${label}: open market coming soon` : `${label}: closed today`;
  return `${label}: ${formatShopTime(rule.start)} – ${formatShopTime(rule.end)}`;
}

export function isCategoryAvailable(settings: CategoryAvailabilitySettings, category: AvailabilityCategoryKey, now = new Date()) {
  const rule = settings[category];
  if (!rule.enabled) return false;
  const current = shopMinuteOfDay(now);
  const start = minuteOfDay(rule.start);
  const end = minuteOfDay(rule.end);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

export function categoryUnavailableMessage(category: AvailabilityCategoryKey, settings: CategoryAvailabilitySettings) {
  if (settings[category].openMarket && !settings[category].enabled) return "This product is not available at this time — Open market coming soon.";
  return `This product is not available right now. ${categoryHoursLabel(category, settings)}.`;
}