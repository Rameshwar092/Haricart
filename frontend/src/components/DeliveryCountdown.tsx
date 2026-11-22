/**
 * "Arriving in 09:42" — the 10-minute delivery countdown.
 * It starts when the ORDER IS PLACED (not when items go into the bag), using the order's
 * own placed time, so it stays correct after a refresh or on another phone.
 */
import { DELIVERY_WINDOW_SECONDS, formatDeliveryCountdown, getDeliveryWindowRemaining } from "@shared/delivery-timer";
import { Timer } from "lucide-react";
import { useEffect, useState } from "react";

export function DeliveryCountdown({ placedAt, compact = false }: { placedAt: Date | string | number; compact?: boolean }) {
  const startedAtMs = new Date(placedAt).getTime();
  const [remaining, setRemaining] = useState(() => getDeliveryWindowRemaining(startedAtMs));

  useEffect(() => {
    const update = () => setRemaining(getDeliveryWindowRemaining(startedAtMs));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [startedAtMs]);

  if (!Number.isFinite(startedAtMs)) return null;
  const percentLeft = Math.min(100, Math.max(0, (remaining / DELIVERY_WINDOW_SECONDS) * 100));

  if (compact) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
        <Timer className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        {remaining > 0 ? <>Arriving in <span className="font-mono">{formatDeliveryCountdown(remaining)}</span></> : "Arriving any moment now"}
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-800">10-minute delivery</p>
          <p className="mt-1 text-xs text-emerald-700">{remaining > 0 ? "Your order is on its way to your flat." : "Arriving any moment now."}</p>
        </div>
        <span className="font-mono text-2xl font-bold text-emerald-900">{formatDeliveryCountdown(remaining)}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-200">
        <div className="h-full rounded-full bg-emerald-600 transition-[width] duration-500" style={{ width: `${percentLeft}%` }} />
      </div>
    </div>
  );
}