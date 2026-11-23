import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { usePhoneOtp } from "@/lib/use-phone-otp";
import { OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp-resend";
import { DELIVERY_STATUS_LABEL, DELIVERY_STATUSES, NEXT_DELIVERY_ACTION_LABEL, nextDeliveryStatus, type DeliveryStatus } from "@shared/delivery-flow";
import { Bike, CheckCircle2, Clock, IndianRupee, LogOut, MapPin, Package, Phone, RefreshCcw, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const REFRESH_MS = 10_000;

function time(value: Date | string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function paymentText(method: string, status: string) {
  const label = method === "cash_on_delivery" ? "Cash on Delivery" : method === "upi_qr" ? "UPI" : method === "pay_after_delivery" ? "Pay after delivery" : "Paid online";
  return `${label} · ${status === "paid" ? "Paid" : status === "refunded" ? "Refunded" : status === "failed" ? "Failed" : "Not paid yet"}`;
}

function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f7f4eb]">
    <header className="sticky top-0 z-30 border-b bg-card"><div className="container flex h-16 items-center justify-between gap-2"><div className="flex items-center gap-2"><BrandMark compact /><span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">Delivery</span></div>{right}</div></header>
    <main className="container max-w-3xl py-6">{children}</main>
  </div>;
}

/** Phone + OTP login for delivery boys. The server lets in only active delivery boys the owner added. */
function DeliveryLogin() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { request, confirm, simulated } = usePhoneOtp({
    purpose: "delivery",
    onSent: isSimulated => { setSent(true); setCooldown(OTP_RESEND_COOLDOWN_SECONDS); setError(null); toast.success(isSimulated ? "Test mode: enter 1234." : "OTP sent to your mobile number."); },
    onVerified: () => toast.success("Logged in"),
  });
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown(seconds => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);
  useEffect(() => { if (request.error) setError(request.error.message); }, [request.error]);
  useEffect(() => { if (confirm.error) setError(confirm.error.message); }, [confirm.error]);

  return <Shell>
    <div className="mx-auto mt-6 max-w-sm rounded-[1.5rem] border bg-card p-6">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-primary"><Bike className="h-6 w-6" /></span>
      <h1 className="mt-4 font-editorial text-3xl font-semibold">Delivery partner login</h1>
      <p className="mt-2 text-sm text-muted-foreground">Only delivery boys added and activated by the HariCart owner can log in here.</p>
      <form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); setError(null); if (!sent) request.mutate(phone); else confirm.mutate({ phone, code }); }}>
        <Input value={phone} onChange={event => { setPhone(event.target.value); setSent(false); setCode(""); }} placeholder="Mobile number" inputMode="tel" aria-label="Mobile number" required />
        {sent && <Input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={simulated ? "Enter 1234" : "6-digit OTP"} inputMode="numeric" aria-label="OTP code" autoFocus required />}
        {error && <p role="alert" className="flex gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        <Button type="submit" className="w-full rounded-full" disabled={request.isPending || confirm.isPending}>{!sent ? (request.isPending ? "Sending…" : "Send OTP") : confirm.isPending ? "Checking…" : "Verify and log in"}</Button>
        {sent && <Button type="button" variant="ghost" className="w-full rounded-full text-xs" disabled={cooldown > 0 || request.isPending} onClick={() => request.mutate(phone)}>{cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}</Button>}
      </form>
    </div>
  </Shell>;
}

type DeliveryOrder = Awaited<ReturnType<ReturnType<typeof trpc.useUtils>["client"]["delivery"]["orders"]["query"]>>[number];

function OrderCard({ order, busy, onStep }: { order: DeliveryOrder; busy: boolean; onStep: (status: Exclude<DeliveryStatus, "assigned">, cashCollected: boolean) => void }) {
  const [cashCollected, setCashCollected] = useState(false);
  const next = nextDeliveryStatus(order.deliveryStatus as DeliveryStatus | null) as Exclude<DeliveryStatus, "assigned"> | null;
  const cancelled = order.status === "cancelled";
  const needsCash = next === "delivered" && order.paymentMethod === "cash_on_delivery" && order.paymentStatus !== "paid";
  const waitingForShop = next === "picked_up" && order.status === "placed";
  const currentIndex = order.deliveryStatus ? DELIVERY_STATUSES.indexOf(order.deliveryStatus as DeliveryStatus) : -1;
  const address = [order.customer.blockNumber && `Block ${order.customer.blockNumber}`, order.customer.flatNumber && `Flat ${order.customer.flatNumber}`].filter(Boolean).join(", ") || `Flat ${order.customer.apartmentUnit}`;

  return <article className={`rounded-[1.25rem] border bg-card p-4 ${order.deliveryStatus === "assigned" && !cancelled ? "border-primary ring-2 ring-primary/20" : ""}`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div><p className="text-xs font-semibold text-muted-foreground">{order.orderNumber}</p><p className="mt-0.5 text-lg font-semibold">{order.customer.name}</p></div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${cancelled ? "bg-rose-100 text-rose-800" : order.deliveryStatus === "delivered" ? "bg-emerald-100 text-emerald-800" : "bg-accent text-primary"}`}>{cancelled ? "Cancelled" : DELIVERY_STATUS_LABEL[order.deliveryStatus as DeliveryStatus] || "—"}</span>
    </div>

    <div className="mt-3 grid gap-2 text-sm">
      <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><span className="font-semibold">{address}</span>{order.customer.building ? <span className="text-muted-foreground"> · {order.customer.building}</span> : null}</span></p>
      <p className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-primary" />{order.customer.phoneVisible && order.customer.phone ? <a href={`tel:${order.customer.phone}`} className="font-semibold text-primary underline-offset-2 hover:underline">{order.customer.phone}</a> : <span className="text-muted-foreground">{order.customer.phone || "No phone"} (hidden after the order is finished)</span>}</p>
      <p className="flex items-center gap-2"><IndianRupee className="h-4 w-4 shrink-0 text-primary" /><span><span className="font-semibold">₹{Number(order.total).toFixed(2)}</span> · {paymentText(order.paymentMethod, order.paymentStatus)}</span></p>
      {order.note && <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs">Note: {order.note}</p>}
    </div>

    <ul className="mt-3 divide-y rounded-xl border text-sm">{order.items.map(item => <li key={item.id} className={`flex justify-between gap-2 px-3 py-2 ${item.itemStatus === "out_of_stock" ? "text-muted-foreground line-through" : ""}`}><span><Package className="mr-1.5 inline h-3.5 w-3.5" />{item.title}{item.variantTitle ? ` (${item.variantTitle})` : ""}</span><span className="font-semibold">× {item.quantity}</span></li>)}</ul>

    {!cancelled && <ol className="mt-3 flex flex-wrap gap-1.5 text-[11px]">{DELIVERY_STATUSES.map((step, index) => <li key={step} className={`rounded-full px-2 py-0.5 font-semibold ${index <= currentIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{DELIVERY_STATUS_LABEL[step]}</li>)}</ol>}
    <p className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground"><span><Clock className="mr-1 inline h-3 w-3" />Assigned {time(order.assignedAt) || "—"}</span>{order.deliveredAt && <span><CheckCircle2 className="mr-1 inline h-3 w-3" />Delivered {time(order.deliveredAt)}</span>}</p>
    {cancelled && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">This order was cancelled{order.cancelReason ? `: ${order.cancelReason}` : "."} You do not need to deliver it.</p>}

    {!cancelled && next && <div className="mt-4 space-y-2">
      {needsCash && <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900"><input type="checkbox" checked={cashCollected} onChange={event => setCashCollected(event.target.checked)} className="h-4 w-4" />Cash collected: ₹{Number(order.total).toFixed(2)}</label>}
      {waitingForShop && <p className="text-xs text-muted-foreground">Waiting for the shop to confirm this order before pick-up.</p>}
      <Button className="h-11 w-full rounded-full text-base" disabled={busy || waitingForShop || (needsCash && !cashCollected)} onClick={() => onStep(next, cashCollected)}>{busy ? "Saving…" : NEXT_DELIVERY_ACTION_LABEL[order.deliveryStatus as DeliveryStatus]}</Button>
    </div>}
  </article>;
}

export default function DeliveryDashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const isDeliveryBoy = isAuthenticated && user?.role === "delivery_boy";
  const me = trpc.delivery.me.useQuery(undefined, { enabled: isDeliveryBoy, refetchInterval: REFRESH_MS * 3 });
  const orders = trpc.delivery.orders.useQuery(undefined, { enabled: isDeliveryBoy, refetchInterval: REFRESH_MS });
  const [tab, setTab] = useState<"active" | "done">("active");
  const [busyId, setBusyId] = useState<number | null>(null);
  const update = trpc.delivery.updateStatus.useMutation({
    onSuccess: data => { void orders.refetch(); void me.refetch(); toast.success(`Saved: ${DELIVERY_STATUS_LABEL[data.deliveryStatus]}`); },
    onError: error => { toast.error(error.message); void orders.refetch(); },
    onSettled: () => setBusyId(null),
  });

  if (loading) return <Shell><p className="py-20 text-center text-muted-foreground">Loading…</p></Shell>;
  if (!isAuthenticated) return <DeliveryLogin />;
  if (!isDeliveryBoy) {
    return <Shell><div className="mx-auto mt-10 max-w-md rounded-[1.5rem] border border-dashed bg-card p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 font-editorial text-2xl font-semibold">This page is only for delivery partners</h1><p className="mt-2 text-sm text-muted-foreground">Your account cannot open the delivery dashboard.</p><div className="mt-5 flex justify-center gap-2"><Link href={user?.role === "admin" ? "/admin" : "/"}><Button className="rounded-full">{user?.role === "admin" ? "Open Admin Panel" : "Go to HariCart"}</Button></Link><Button variant="outline" className="rounded-full" onClick={() => void logout()}>Log out</Button></div></div></Shell>;
  }

  const rows = orders.data || [];
  const active = rows.filter(order => order.status !== "delivered" && order.status !== "cancelled");
  const done = rows.filter(order => order.status === "delivered" || order.status === "cancelled");
  const shown = tab === "active" ? active : done;

  return <Shell right={<div className="flex items-center gap-1.5"><NotificationBell /><Button variant="ghost" size="sm" className="rounded-full" onClick={() => void logout()} aria-label="Log out"><LogOut className="h-4 w-4" /></Button></div>}>
    <section className="rounded-[1.5rem] bg-[#122319] p-5 text-white">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-white/70">Delivery dashboard</p>
      <h1 className="mt-1 font-editorial text-3xl font-semibold">Hi, {me.data?.name || user?.name || "partner"}</h1>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-semibold">{me.data?.activeOrders ?? active.length}</p><p className="text-[11px] text-white/70">Open orders</p></div>
        <div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-semibold">{me.data?.deliveredToday ?? 0}</p><p className="text-[11px] text-white/70">Delivered today</p></div>
        <div className="rounded-xl bg-white/10 p-3"><p className="text-2xl font-semibold">{me.data?.deliveredTotal ?? 0}</p><p className="text-[11px] text-white/70">All deliveries</p></div>
      </div>
    </section>

    <div className="mt-5 flex items-center justify-between gap-2">
      <div className="inline-flex rounded-full border bg-card p-1 text-sm">
        <button type="button" onClick={() => setTab("active")} className={`rounded-full px-4 py-1.5 font-semibold ${tab === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Active ({active.length})</button>
        <button type="button" onClick={() => setTab("done")} className={`rounded-full px-4 py-1.5 font-semibold ${tab === "done" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Completed ({done.length})</button>
      </div>
      <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void orders.refetch()} disabled={orders.isFetching}><RefreshCcw className={`mr-1 h-4 w-4 ${orders.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
    </div>

    <div className="mt-4 space-y-4">
      {shown.map(order => <OrderCard key={order.id} order={order} busy={busyId === order.id} onStep={(status, cashCollected) => { setBusyId(order.id); update.mutate({ orderId: order.id, status, cashCollected }); }} />)}
      {!shown.length && <p className="rounded-[1.25rem] border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">{tab === "active" ? "No orders assigned to you right now. New orders will ring here." : "No completed orders yet."}</p>}
    </div>
  </Shell>;
}