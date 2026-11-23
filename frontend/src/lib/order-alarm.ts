/**
 * New-order alarm rules (no React here, so they can be tested).
 *
 * - The owner / shop owner hears a ringing sound while any order is waiting to
 *   be confirmed. Delivery staff hear it while an order assigned to them is ready.
 * - "Stop ringing" silences the orders on screen; a NEW order starts it again.
 * - Confirming the order removes it from the waiting list, so the ringing stops.
 */

/** How often the alarm asks the server for waiting orders. */
export const ORDER_ALARM_POLL_MS = 5_000;
/** How often staff order lists refresh on their own. */
export const STAFF_ORDERS_REFRESH_MS = 5_000;
/** How often a customer's order status refreshes on their own. */
export const CUSTOMER_ORDERS_REFRESH_MS = 10_000;
/** Slower check when the customer has no order on the way. */
export const CUSTOMER_ORDERS_IDLE_REFRESH_MS = 30_000;
/** Gap between rings while an order is waiting. */
export const RING_REPEAT_MS = 4_000;

export const ALARM_PREFERENCE_KEY = "haricart-order-alarm";

export type AlarmRole = "admin" | "shop_owner" | "delivery_boy";

export function isAlarmRole(role: string | null | undefined): role is AlarmRole {
  return role === "admin" || role === "shop_owner" || role === "delivery_boy";
}

/** Where the "Open orders" button takes each role. */
export function workspacePathForRole(role: AlarmRole): string {
  return role === "delivery_boy" ? "/delivery" : role === "shop_owner" ? "/shop" : "/admin";
}

/** Orders that were not there at the last check. On the very first check nothing counts as new. */
export function findNewOrderIds(previousIds: ReadonlySet<number> | null, currentIds: readonly number[]): number[] {
  if (!previousIds) return [];
  return currentIds.filter(id => !previousIds.has(id));
}

/** Keep ringing while at least one waiting order has not been silenced. */
export function shouldRing(options: { enabled: boolean; waitingIds: readonly number[]; silencedIds: ReadonlySet<number> }): boolean {
  if (!options.enabled) return false;
  return options.waitingIds.some(id => !options.silencedIds.has(id));
}

/** Browser tab title, so a waiting order is visible even from another tab. */
export function alarmTitle(baseTitle: string, waiting: number, role: AlarmRole): string {
  if (waiting <= 0) return baseTitle;
  const label = role === "delivery_boy" ? (waiting === 1 ? "order to deliver" : "orders to deliver") : waiting === 1 ? "new order" : "new orders";
  return `(${waiting}) ${label} · ${baseTitle.replace(/^\(\d+\)[^·]*·\s*/, "")}`;
}

/** Short words for the alarm banner. */
export function alarmHeadline(waiting: number, role: AlarmRole): string {
  if (role === "delivery_boy") return waiting === 1 ? "1 new order assigned — please accept" : `${waiting} new orders assigned — please accept`;
  return waiting === 1 ? "1 new order waiting" : `${waiting} new orders waiting`;
}

export function readAlarmEnabled(): boolean {
  try {
    return localStorage.getItem(ALARM_PREFERENCE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function saveAlarmEnabled(enabled: boolean) {
  try {
    localStorage.setItem(ALARM_PREFERENCE_KEY, enabled ? "on" : "off");
  } catch {
    /* private mode: keep the choice for this visit only */
  }
}

// ---------- sound (made in the browser, no audio file needed) ----------

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioContext ??= new Ctor();
  return audioContext;
}

/** Browsers only allow sound after the person taps the page once. */
export function isSoundUnlocked(): boolean {
  return getAudioContext()?.state === "running";
}

export async function unlockSound(): Promise<boolean> {
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state !== "running") await context.resume();
  } catch {
    return false;
  }
  return context.state === "running";
}

/** A bright three-note shop-bell chime, about one second long. */
export function playOrderChime(volume = 0.35) {
  const context = getAudioContext();
  if (!context || context.state !== "running") return;
  const start = context.currentTime + 0.02;
  const notes = [880, 1175, 1568];
  notes.forEach((frequency, index) => {
    const at = start + index * 0.18;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.5);
  });
}