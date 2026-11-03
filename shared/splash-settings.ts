export const SPLASH_DURATION_SETTING_KEY = "haricart_splash_duration_ms";
export const DEFAULT_SPLASH_DURATION_MS = 1500;
export const MIN_SPLASH_DURATION_MS = 600;
export const MAX_SPLASH_DURATION_MS = 5000;

export function clampSplashDuration(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_SPLASH_DURATION_MS;
  return Math.min(MAX_SPLASH_DURATION_MS, Math.max(MIN_SPLASH_DURATION_MS, Math.round(value)));
}

export function parseSplashDuration(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return clampSplashDuration(parsed);
}

export function formatSplashDurationLabel(durationMs: number) {
  const seconds = clampSplashDuration(durationMs) / 1000;
  return `${seconds.toFixed(seconds % 1 === 0 ? 0 : 1)} seconds`;
}
