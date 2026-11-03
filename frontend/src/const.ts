export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Your live website address (used in share links and QR codes).
// Set VITE_PUBLIC_SITE_URL in frontend/.env, e.g. https://haricart.in
const configuredSiteUrl = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
export const PUBLIC_HARICART_URL = configuredSiteUrl && !configuredSiteUrl.includes("your-domain.com") ? configuredSiteUrl.replace(/\/?$/, "/") : "";

/** Link to share: the configured live address, or the address this page was opened from. */
export function getPublicShareUrl(): string {
  if (PUBLIC_HARICART_URL) return PUBLIC_HARICART_URL;
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/`;
}

/** Id of the phone-number sign-in box on the home page. */
export const SIGN_IN_SECTION_ID = "community";

/**
 * Send the visitor to HariCart's own phone OTP sign-in (on the home page).
 * Everyone — customers, delivery staff and the owner — signs in this way.
 */
export const startLogin = () => {
  if (typeof window === "undefined") return;
  if (window.location.pathname !== "/") {
    window.location.href = `/#${SIGN_IN_SECTION_ID}`;
    return;
  }
  document.getElementById(SIGN_IN_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "center" });
};
