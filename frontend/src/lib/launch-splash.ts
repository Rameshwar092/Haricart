import { DEFAULT_SPLASH_DURATION_MS, clampSplashDuration } from "@shared/splash-settings";

export const LAUNCH_SPLASH_DURATION_MS = DEFAULT_SPLASH_DURATION_MS;
export const LAUNCH_SPLASH_TITLE = "HariCart";
export const LAUNCH_SPLASH_SUBTITLE = "Fresh groceries, right at your door.";

export function getLaunchSplashLabel() {
  return `${LAUNCH_SPLASH_TITLE} loading`;
}

export function shouldShowLaunchSplash(hasCompletedLaunch: boolean) {
  return !hasCompletedLaunch;
}

export function getLaunchSplashDuration(reducedMotion: boolean, configuredDurationMs = LAUNCH_SPLASH_DURATION_MS) {
  return reducedMotion ? 600 : clampSplashDuration(configuredDurationMs);
}

export const HARI_CART_LOGO_URL = "/brand/icon-512.png";

export const launchSplashCopy = {
  title: LAUNCH_SPLASH_TITLE,
  subtitle: LAUNCH_SPLASH_SUBTITLE,
};

export type LaunchSplashCopy = typeof launchSplashCopy;
