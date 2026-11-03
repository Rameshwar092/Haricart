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

export function isCategoryAvailable(settings: CategoryAvailabilitySettings, category: AvailabilityCategoryKey, now = new Date()) {
  const rule = settings[category];
  if (!rule.enabled) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  const start = minuteOfDay(rule.start);
  const end = minuteOfDay(rule.end);
  return start <= end ? current >= start && current <= end : current >= start || current <= end;
}

export function categoryUnavailableMessage(category: AvailabilityCategoryKey, settings: CategoryAvailabilitySettings) {
  return settings[category].openMarket
    ? "This product is not available at this time — Open market coming soon."
    : "This product is not available at this time. Please check the category timing later.";
}
