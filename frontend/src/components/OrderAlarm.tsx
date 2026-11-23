import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  ORDER_ALARM_POLL_MS,
  RING_REPEAT_MS,
  alarmHeadline,
  alarmTitle,
  findNewOrderIds,
  isAlarmRole,
  isSoundUnlocked,
  playOrderChime,
  readAlarmEnabled,
  saveAlarmEnabled,
  shouldRing,
  unlockSound,
  workspacePathForRole,
} from "@/lib/order-alarm";
import { BellOff, BellRing, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function showSystemNotification(title: string, body: string, openPath: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const notification = new Notification(title, { body, tag: "haricart-new-order", icon: "/brand/icon-192.png" });
    notification.onclick = () => {
      window.focus();
      if (window.location.pathname !== openPath) window.location.href = openPath;
      notification.close();
    };
  } catch {
    // Some phone browsers only allow notifications from an installed app; the sound and banner still work.
  }
}

/**
 * Rings and shows a banner for the owner, shop owner and delivery staff when an
 * order needs them. Mounted once for the whole app, so it works on every page.
 */
export function OrderAlarm() {
  const { user } = useAuth();
  const role = isAlarmRole(user?.role) ? user.role : null;
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [enabled, setEnabled] = useState(readAlarmEnabled);
  const [soundReady, setSoundReady] = useState(isSoundUnlocked);
  const [silencedIds, setSilencedIds] = useState<Set<number>>(() => new Set());
  const knownIdsRef = useRef<Set<number> | null>(null);
  const baseTitleRef = useRef(typeof document === "undefined" ? "HariCart" : document.title);

  const alerts = trpc.community.orders.alerts.useQuery(undefined, {
    enabled: Boolean(role),
    refetchInterval: ORDER_ALARM_POLL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const waitingOrders = alerts.data?.orders ?? [];
  const waitingIds = useMemo(() => waitingOrders.map(order => order.id), [waitingOrders]);
  const ringing = shouldRing({ enabled, waitingIds, silencedIds });

  // Browsers block sound until the first tap; unlock it on any tap anywhere.
  useEffect(() => {
    if (!role || soundReady) return;
    const unlock = () => void unlockSound().then(setSoundReady);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [role, soundReady]);

  // A new order arrived: refresh the order lists, pop a message and a phone notification.
  useEffect(() => {
    if (!role || !alerts.data) return;
    const fresh = findNewOrderIds(knownIdsRef.current, waitingIds);
    knownIdsRef.current = new Set(waitingIds);
    // Forget silenced orders that are no longer waiting.
    setSilencedIds(previous => {
      const next = new Set(Array.from(previous).filter(id => waitingIds.includes(id)));
      return next.size === previous.size ? previous : next;
    });
    if (!fresh.length) return;
    void utils.community.orders.mine.invalidate();
    void utils.admin.operations.orders.invalidate();
    if (role === "delivery_boy") void utils.delivery.orders.invalidate();
    const newest = waitingOrders.find(order => fresh.includes(order.id)) ?? waitingOrders[0];
    const amount = newest ? `₹${Number(newest.total).toFixed(0)}` : "";
    const title = role === "delivery_boy" ? "New order assigned to you" : "New order!";
    const body = newest ? `Flat ${newest.apartmentUnit} · ${amount} · #${newest.orderNumber.slice(-6).toUpperCase()}` : "Open HariCart to see it.";
    toast.success(`${title} ${body}`, { duration: 8000 });
    showSystemNotification(`HariCart: ${title}`, body, workspacePathForRole(role));
    try {
      navigator.vibrate?.([300, 150, 300]);
    } catch {
      /* not supported */
    }
  }, [alerts.data, role, utils, waitingIds, waitingOrders]);

  // Ring now and every few seconds while an order waits.
  useEffect(() => {
    if (!ringing || !soundReady) return;
    playOrderChime();
    const timer = window.setInterval(() => playOrderChime(), RING_REPEAT_MS);
    return () => window.clearInterval(timer);
  }, [ringing, soundReady]);

  // Show the count in the browser tab title.
  useEffect(() => {
    if (!role) return;
    document.title = alarmTitle(baseTitleRef.current, enabled ? waitingIds.length : 0, role);
    return () => {
      document.title = baseTitleRef.current;
    };
  }, [enabled, role, waitingIds.length]);

  if (!role) return null;

  const turnOnSound = async () => {
    const unlocked = await unlockSound();
    setSoundReady(unlocked);
    if (unlocked) playOrderChime();
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    } catch {
      /* ignore */
    }
    if (!enabled) {
      setEnabled(true);
      saveAlarmEnabled(true);
    }
  };

  const toggleAlarm = () => {
    const next = !enabled;
    setEnabled(next);
    saveAlarmEnabled(next);
    toast.message(next ? "Order alarm is on." : "Order alarm is off. Orders will still appear in your list.");
  };

  const openPath = workspacePathForRole(role);
  const showBanner = waitingIds.length > 0 && enabled;
  const needsSoundTap = enabled && !soundReady;

  if (!showBanner && !needsSoundTap) {
    return (
      <button type="button" onClick={toggleAlarm} aria-label={enabled ? "Order alarm is on. Turn it off" : "Order alarm is off. Turn it on"} title={enabled ? "Order alarm on" : "Order alarm off"} className="fixed bottom-24 right-4 z-40 grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-primary shadow-lg md:bottom-6">
        {enabled ? <BellRing className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
      </button>
    );
  }

  return (
    <div role="status" aria-live="assertive" className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md md:bottom-6 md:right-6 md:left-auto md:mx-0 md:w-96">
      <div className={`rounded-2xl border p-4 shadow-2xl ${showBanner ? "border-amber-300 bg-amber-50" : "border-border bg-card"}`}>
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${showBanner ? "bg-amber-400 text-amber-950" : "bg-accent text-primary"} ${ringing && soundReady ? "animate-bounce" : ""}`}>
            {needsSoundTap && !showBanner ? <Volume2 className="h-5 w-5" /> : <BellRing className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{showBanner ? alarmHeadline(waitingIds.length, role) : "Turn on the order sound"}</p>
            <p className="text-xs leading-5 text-muted-foreground">
              {showBanner
                ? waitingOrders.slice(0, 3).map(order => `Flat ${order.apartmentUnit} · ₹${Number(order.total).toFixed(0)}`).join("  •  ")
                : "Your browser needs one tap before HariCart can ring for new orders."}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {needsSoundTap && <button type="button" onClick={turnOnSound} className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">Turn on sound</button>}
          {showBanner && window.location.pathname !== openPath && <button type="button" onClick={() => navigate(openPath)} className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">Open orders</button>}
          {showBanner && ringing && <button type="button" onClick={() => setSilencedIds(new Set(waitingIds))} className="h-9 rounded-xl border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900">Stop ringing</button>}
          <button type="button" onClick={toggleAlarm} className="h-9 rounded-xl px-3 text-xs font-semibold text-muted-foreground underline-offset-2 hover:underline">Turn alarm off</button>
        </div>
      </div>
    </div>
  );
}