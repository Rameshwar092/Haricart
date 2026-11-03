import { Bike, CarFront, Phone, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { getVehicleServiceLabel, getVehicleServices, VEHICLE_SERVICE_CONTACT, type VehicleServiceKind } from "@shared/vehicle-services";

const vehicleStyles = {
  car: { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-700", strong: "bg-orange-600", panel: "border-orange-900/10", button: "bg-orange-700 hover:bg-orange-800", close: "border-orange-900/15 text-orange-900 hover:bg-orange-100" },
  bike: { border: "border-violet-200", bg: "bg-violet-50", text: "text-violet-700", strong: "bg-violet-600", panel: "border-violet-900/10", button: "bg-violet-700 hover:bg-violet-800", close: "border-violet-900/15 text-violet-900 hover:bg-violet-100" },
} as const;

export function VehicleServiceContact({ kind, embedded = false, circle = false, open: controlledOpen, onOpenChange }: { kind: VehicleServiceKind; embedded?: boolean; circle?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [submittedRequestId, setSubmittedRequestId] = useState<number | null>(null);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setInternalOpen(next); onOpenChange?.(next); };
  const label = getVehicleServiceLabel(kind);
  const services = getVehicleServices(kind);
  const styles = vehicleStyles[kind];
  const Icon = kind === "car" ? CarFront : Bike;
  const filteredServices = useMemo(() => services.filter(service => service.toLowerCase().includes(serviceQuery.trim().toLowerCase())), [services, serviceQuery]);
  const submitRequest = trpc.community.resident.submitVehicleServiceRequest.useMutation({
    onSuccess: result => {
      setSubmittedRequestId(result.requestId);
      toast.success(`${label} request submitted. You can call ${VEHICLE_SERVICE_CONTACT} now.`);
    },
    onError: error => toast.error(error.message),
  });
  const toggleService = (service: string) => setSelected(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service]);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitRequest.mutate({ serviceKind: kind, selectedServices: selected, issueDescription: issueDescription.trim(), phone: phone.trim(), blockNumber: blockNumber.trim(), flatNumber: flatNumber.trim() });
  };

  return <div className={embedded ? "relative" : "fixed right-4 top-[calc(50%-16rem)] z-30 -translate-y-1/2"}>
    {open && <><button type="button" aria-label={`Close ${label} panel`} onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35" /><div className={`fixed left-1/2 top-28 z-50 max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border bg-card p-4 shadow-2xl shadow-[#214d35]/15 ${styles.panel} sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:max-h-[calc(100vh-7rem)] sm:translate-x-0`}>
      <div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles.bg} ${styles.text}`}><Icon className="h-5 w-5" /></span><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-muted-foreground">Select the service you need</p></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Tell the service provider what is needed before you call. Your saved GreenGate resident address is attached securely to the request.</p>
      <label className="mt-3 flex items-center gap-2 rounded-xl border bg-white px-3 py-2"><Search className={`h-3.5 w-3.5 shrink-0 ${styles.text}`} /><input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" aria-label={`Search ${label} options`} /></label>
      <fieldset className="mt-3 max-h-48 space-y-1 overflow-y-auto pr-1" aria-label={`${label} options`}>{filteredServices.map(service => <label key={service} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-muted"><input type="checkbox" checked={selected.includes(service)} onChange={() => toggleService(service)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" /><span>{service}</span></label>)}</fieldset>
      {filteredServices.length === 0 && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">No {label.toLowerCase()} option matches this search.</p>}
      {selected.length > 0 && <form onSubmit={handleSubmit} className="mt-3 space-y-2 rounded-xl border border-border/70 bg-muted/35 p-3"><div className="grid grid-cols-2 gap-2"><label className="col-span-2 text-[11px] font-medium">Mobile number<input value={phone} onChange={event => setPhone(event.target.value)} required minLength={8} maxLength={32} inputMode="tel" placeholder="Your mobile number" className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="text-[11px] font-medium">Block number<input value={blockNumber} onChange={event => setBlockNumber(event.target.value)} required maxLength={32} placeholder="Block" className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="text-[11px] font-medium">Flat number<input value={flatNumber} onChange={event => setFlatNumber(event.target.value)} required maxLength={32} placeholder="Flat" className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label></div><label className="block text-xs font-semibold text-foreground" htmlFor={`${kind}-issue`}>Describe the issue <span className="font-normal text-muted-foreground">(required)</span></label><textarea id={`${kind}-issue`} value={issueDescription} onChange={event => setIssueDescription(event.target.value)} minLength={5} maxLength={500} required rows={3} placeholder="Example: Car is not starting in basement parking..." className="w-full resize-none rounded-lg border bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /><div className="flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">{issueDescription.length}/500</span><button type="submit" disabled={submitRequest.isPending || selected.length === 0 || issueDescription.trim().length < 5 || phone.trim().length < 8 || !blockNumber.trim() || !flatNumber.trim()} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.button}`}><Send className="h-3.5 w-3.5" />{submitRequest.isPending ? "Submitting..." : submittedRequestId ? "Submit another" : "Submit request"}</button></div></form>}
      {submittedRequestId !== null && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">Request #{submittedRequestId} saved. Call the provider with your issue details ready.</p>}
      {selected.length > 0 && <p className={`mt-2 text-[11px] ${styles.text}`}>Selected: {selected.join(", ")}</p>}
      <a href={`tel:+${VEHICLE_SERVICE_CONTACT}`} className={`mt-3 flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition ${styles.button}`}><Phone className="h-4 w-4" />Call {VEHICLE_SERVICE_CONTACT}</a>
      <button type="button" onClick={() => setOpen(false)} className={`mt-2 h-9 w-full rounded-full border bg-white text-xs font-semibold transition ${styles.close}`}>Close</button>
    </div></>}
    <button type="button" title={label} aria-label={`Open ${label} contact`} aria-expanded={open} onClick={() => setOpen(!open)} className={circle ? "flex min-w-14 flex-col items-center gap-1 text-[9px] font-semibold text-foreground transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" : "flex h-11 w-36 items-center gap-2 rounded-xl border bg-card px-3 text-left text-xs font-bold shadow-sm"}>
      <span className={`grid h-9 w-9 place-items-center rounded-full border-2 shadow-sm ${styles.border} ${styles.bg} ${styles.text}`}><span className={`grid h-6 w-6 place-items-center rounded-full text-white ${styles.strong}`}><Icon className="h-3 w-3" /></span></span>{circle && <span className="whitespace-nowrap">{label}</span>}
    </button>
  </div>;
}
