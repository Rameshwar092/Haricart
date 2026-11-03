export const DELIVERY_WINDOW_SECONDS = 10 * 60;

export function getDeliveryWindowRemaining(startedAtMs: number, nowMs = Date.now()): number {
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  return Math.max(0, DELIVERY_WINDOW_SECONDS - elapsedSeconds);
}

export function formatDeliveryCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, "0");
  const seconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
