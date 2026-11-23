import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { ACCOUNT_STATUS_LABEL, DELIVERY_STATUS_LABEL, canReassignDelivery, type AccountStatus, type DeliveryStatus } from "@shared/delivery-flow";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@shared/order-flow";
import { Bike, CheckCircle2, ClipboardList, History, PauseCircle, Phone, PlayCircle, ShieldCheck, UserPlus, XCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

const statusStyle: Record<AccountStatus, string> = {
  active: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  suspended: "bg-orange-100 text-orange-800",
  deactivated: "bg-rose-100 text-rose-800",
};

const auditLabel: Record<string, string> = {
  delivery_login: "Delivery login",
  delivery_login_blocked: "Login blocked",
  admin_login: "Owner login",
  delivery_boy_created: "Delivery boy added",
  delivery_boy_updated: "Details edited",
  account_status_changed: "Account status changed",
  role_changed: "Role changed",
  order_assigned: "Order assigned",
  order_reassigned: "Order reassigned",
  order_unassigned: "Order taken back",
  delivery_status_changed: "Delivery step",
  account_deletion_requested: "Account deletion request",
};

function time(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function auditSummary(details: string | null) {
  if (!details) return "";
  try {
    const parsed = JSON.parse(details) as Record<string, unknown>;
    if (parsed.from !== undefined || parsed.to !== undefined) return `${String(parsed.from ?? "none")} → ${String(parsed.to ?? "none")}${parsed.reason ? ` · ${String(parsed.reason)}` : ""}`;
    if (parsed.orderNumber) return String(parsed.orderNumber);
    if (parsed.fullName) return `${String(parsed.fullName)}${parsed.phone ? ` · ${String(parsed.phone)}` : ""}`;
    if (parsed.phone) return `${String(parsed.phone)}${parsed.reason ? ` · ${String(parsed.reason)}` : ""}`;
    return "";
  } catch {
    return "";
  }
}

/**
 * Owner-only: add delivery boys, activate / suspend / deactivate them, give orders to
 * active delivery boys, and read the security log. Every action is checked again on the server.
 */
export function DeliveryTeamPanel() {
  const utils = trpc.useUtils();
  const team = trpc.admin.delivery.team.useQuery(undefined, { refetchInterval: 20_000 });
  const board = trpc.admin.delivery.board.useQuery(undefined, { refetchInterval: 10_000 });
  const audit = trpc.admin.delivery.audit.useQuery({ limit: 60 }, { refetchInterval: 20_000 });
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [historyFor, setHistoryFor] = useState<number | null>(null);
  const history = trpc.admin.delivery.history.useQuery({ orderId: historyFor || 1 }, { enabled: Boolean(historyFor) });

  const refreshAll = () => Promise.all([utils.admin.delivery.team.invalidate(), utils.admin.delivery.board.invalidate(), utils.admin.delivery.audit.invalidate(), utils.admin.operations.deliveryCandidates.invalidate(), utils.admin.delivery.history.invalidate()]);
  const add = trpc.admin.delivery.add.useMutation({
    onSuccess: data => { setFullName(""); setPhone(""); setNotes(""); void refreshAll(); toast.success(data.convertedExistingAccount ? "Added. This number had a customer account; it is now a delivery account waiting for activation." : "Delivery boy added. Press Activate when you approve him."); },
    onError: error => toast.error(error.message),
  });
  const setStatus = trpc.admin.delivery.setStatus.useMutation({
    onSuccess: data => {
      void refreshAll();
      const extra = data.released ? ` ${data.released} open order(s) were taken back — please give them to someone else.` : "";
      const still = data.stillOutForDelivery ? ` ${data.stillOutForDelivery} order(s) are still out for delivery with him.` : "";
      toast.success(`Account ${ACCOUNT_STATUS_LABEL[data.status].toLowerCase()}.${extra}${still}`);
    },
    onError: error => toast.error(error.message),
  });
  const assign = trpc.admin.delivery.assign.useMutation({ onSuccess: data => { void refreshAll(); toast.success(`${data.action === "reassigned" ? "Reassigned" : "Assigned"} to ${data.deliveryBoyName || "the delivery boy"}. He has been notified.`); }, onError: error => toast.error(error.message) });
  const unassign = trpc.admin.delivery.unassign.useMutation({ onSuccess: () => { void refreshAll(); toast.success("Order taken back from the delivery boy."); }, onError: error => toast.error(error.message) });

  const members = team.data || [];
  const activeMembers = members.filter(member => member.accountStatus === "active");
  const openOrders = board.data?.open || [];
  const deliveredOrders = board.data?.delivered || [];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate({ fullName, phone, notes: notes || undefined });
  };

  const changeStatus = (userId: number, name: string, status: "active" | "suspended" | "deactivated") => {
    if (status !== "active") {
      const reason = window.prompt(`${status === "suspended" ? "Suspend" : "Deactivate"} ${name}? He will be logged out at once. Reason (optional):`, "");
      if (reason === null) return;
      setStatus.mutate({ userId, status, reason: reason || undefined });
      return;
    }
    setStatus.mutate({ userId, status });
  };

  return <section className="mt-6 space-y-6">
    <div className="rounded-[1.5rem] border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Delivery team</p><h2 className="mt-1 font-editorial text-2xl font-semibold">Delivery boys</h2><p className="mt-1 text-sm text-muted-foreground">Only you can add delivery boys. A new account cannot log in until you press Activate.</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-primary"><ShieldCheck className="h-4 w-4" />{activeMembers.length} active · {members.length} total</span>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-2xl bg-muted/50 p-4 md:grid-cols-[1fr_1fr_1.3fr_auto]">
        <Input value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Full name" aria-label="Delivery boy name" required minLength={2} />
        <Input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Mobile number" aria-label="Delivery boy mobile number" inputMode="tel" required />
        <Input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Details (vehicle, ID proof, shift…)" aria-label="Delivery boy details" maxLength={500} />
        <Button type="submit" className="rounded-full" disabled={add.isPending}><UserPlus className="mr-1.5 h-4 w-4" />{add.isPending ? "Adding…" : "Add delivery boy"}</Button>
      </form>

      <div className="mt-5 space-y-3">
        {members.map(member => <div key={member.userId} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold"><Bike className="h-4 w-4 text-primary" />{member.name}<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusStyle[member.accountStatus as AccountStatus]}`}>{ACCOUNT_STATUS_LABEL[member.accountStatus as AccountStatus]}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">{member.phone || "No phone saved"}{member.notes ? ` · ${member.notes}` : ""}</p>
            <p className="mt-1 text-xs text-muted-foreground">{member.activeOrders} open · {member.deliveredOrders} delivered · last login {time(member.lastSignedIn)}{member.statusReason ? ` · Reason: ${member.statusReason}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {member.accountStatus !== "active" && <Button size="sm" className="rounded-full" disabled={setStatus.isPending} onClick={() => changeStatus(member.userId, member.name, "active")}><PlayCircle className="mr-1 h-4 w-4" />Activate</Button>}
            {member.accountStatus === "active" && <Button size="sm" variant="outline" className="rounded-full" disabled={setStatus.isPending} onClick={() => changeStatus(member.userId, member.name, "suspended")}><PauseCircle className="mr-1 h-4 w-4" />Suspend</Button>}
            {member.accountStatus !== "deactivated" && <Button size="sm" variant="outline" className="rounded-full text-rose-700" disabled={setStatus.isPending} onClick={() => changeStatus(member.userId, member.name, "deactivated")}><XCircle className="mr-1 h-4 w-4" />Deactivate</Button>}
          </div>
        </div>)}
        {!members.length && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No delivery boys yet. Add one above.</p>}
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="rounded-[1.5rem] border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Assignment</p>
        <h2 className="mt-1 font-editorial text-2xl font-semibold">Give orders to a delivery boy</h2>
        <p className="mt-1 text-sm text-muted-foreground">Only active delivery boys are listed. You can move an order to someone else until it is out for delivery.</p>
        <div className="mt-4 space-y-3">
          {openOrders.map(order => {
            const canMove = canReassignDelivery(order.deliveryStatus as DeliveryStatus | null, order.status);
            return <div key={order.id} className="rounded-xl bg-muted/60 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{order.orderNumber} <span className="font-normal text-muted-foreground">· Flat {order.apartmentUnit} · ₹{Number(order.total).toFixed(2)} · {ORDER_STATUS_LABEL[order.status as OrderStatus]}</span></p>
                <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-bold">{order.deliveryStatus ? `${DELIVERY_STATUS_LABEL[order.deliveryStatus as DeliveryStatus]} · ${order.deliveryBoyName || "—"}` : "Not assigned"}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select aria-label={`Delivery boy for ${order.orderNumber}`} disabled={!canMove || assign.isPending || !activeMembers.length} value="" onChange={event => { const id = Number(event.target.value); if (id) assign.mutate({ orderId: order.id, deliveryUserId: id }); }} className="rounded-lg border bg-card px-2 py-1.5 text-xs">
                  <option value="">{!activeMembers.length ? "No active delivery boys" : order.deliveryUserId ? "Reassign to…" : "Assign to…"}</option>
                  {activeMembers.filter(member => member.userId !== order.deliveryUserId).map(member => <option key={member.userId} value={member.userId}>{member.name} ({member.activeOrders} open)</option>)}
                </select>
                {order.deliveryUserId && canMove && <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" disabled={unassign.isPending} onClick={() => unassign.mutate({ orderId: order.id })}>Take back</Button>}
                <Button size="sm" variant="ghost" className="h-7 rounded-full text-xs" onClick={() => setHistoryFor(historyFor === order.id ? null : order.id)}><History className="mr-1 h-3.5 w-3.5" />History</Button>
              </div>
              {historyFor === order.id && <ul className="mt-2 space-y-1 border-t pt-2 text-xs text-muted-foreground">{(history.data || []).map(row => <li key={row.id}>{time(row.createdAt)} · {row.action === "unassigned" ? `Taken back from ${row.previousDeliveryBoy || "—"}` : row.action === "reassigned" ? `Moved from ${row.previousDeliveryBoy || "—"} to ${row.deliveryBoy || "—"}` : `Assigned to ${row.deliveryBoy || "—"}`} by {row.assignedBy || "owner"}{row.reason ? ` (${row.reason})` : ""}</li>)}{!history.data?.length && <li>No assignment history yet.</li>}</ul>}
            </div>;
          })}
          {!openOrders.length && <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No open orders right now.</p>}
        </div>
        <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />Recently delivered</h3>
        <ul className="mt-2 space-y-1.5 text-sm">{deliveredOrders.map(order => <li key={order.id} className="flex flex-wrap justify-between gap-2 rounded-lg border px-3 py-2"><span className="font-medium">{order.orderNumber} · Flat {order.apartmentUnit}</span><span className="text-xs text-muted-foreground">{order.deliveryBoyName || "Owner"} · {time(order.deliveredAt)}</span></li>)}{!deliveredOrders.length && <li className="text-xs text-muted-foreground">Nothing delivered yet.</li>}</ul>
      </div>

      <div className="rounded-[1.5rem] border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-primary">Security record</p>
        <h2 className="mt-1 flex items-center gap-2 font-editorial text-2xl font-semibold"><ClipboardList className="h-5 w-5" />Activity log</h2>
        <p className="mt-1 text-sm text-muted-foreground">Logins, blocked logins, status changes, assignments and delivery steps.</p>
        <ul className="mt-4 max-h-[520px] space-y-2 overflow-y-auto pr-1 text-xs">{(audit.data || []).map(row => <li key={row.id} className="rounded-lg bg-muted/55 px-3 py-2"><p className="font-semibold">{auditLabel[row.action] || row.action}{row.orderId ? ` · order #${row.orderId}` : ""}</p><p className="mt-0.5 text-muted-foreground">{time(row.createdAt)} · {row.actorName || row.actorRole || "Unknown"}{row.targetName && row.targetName !== row.actorName ? ` → ${row.targetName}` : ""}{auditSummary(row.details) ? ` · ${auditSummary(row.details)}` : ""}</p></li>)}{!audit.data?.length && <li className="text-muted-foreground">No activity yet.</li>}</ul>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Phone className="h-3.5 w-3.5" />Customer phone numbers are shown to a delivery boy only while he has that order.</p>
      </div>
    </div>
  </section>;
}