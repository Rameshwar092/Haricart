import { useState } from "react";
import { Phone, Search, Zap } from "lucide-react";
import { ELECTRICAL_SERVICES } from "@shared/electrical";
import { ResidentServiceDetailsForm } from "@/components/ResidentServiceDetailsForm";

export function ElectricianContact({ embedded = false, circle = false, open: controlledOpen, onOpenChange }: { embedded?: boolean; circle?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setInternalOpen(next); onOpenChange?.(next); };
  const [selected, setSelected] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const filteredServices = ELECTRICAL_SERVICES.filter(service => service.toLowerCase().includes(serviceQuery.trim().toLowerCase()));

  const toggleService = (service: string) => {
    setSelected(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service]);
  };

  return <div className={embedded && circle ? "relative flex flex-col items-center" : embedded ? "relative" : "fixed right-4 top-[calc(50%-16rem)] z-30 -translate-y-1/2 sm:right-6"}>
    {open && <><button type="button" aria-label="Close Electrician Services panel" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35" /><div className="fixed left-1/2 top-28 z-50 max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:max-h-[calc(100vh-7rem)] sm:translate-x-0 border border-amber-900/10 bg-card p-4 shadow-2xl shadow-[#214d35]/15">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700"><Zap className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Electrician Services</p><p className="text-xs text-muted-foreground">Select the service you need</p></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Electrical support for GreenGate residents. Choose one or more services, then call for availability.</p>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-amber-900/10 bg-white px-3 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-amber-700" /><input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder="Search electrician service..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" aria-label="Search electrician services" /></label><fieldset className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1" aria-label="Electrician services">{filteredServices.map(service => <label key={service} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-amber-500/5"><input type="checkbox" checked={selected.includes(service)} onChange={() => toggleService(service)} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-700" /><span>{service}</span></label>)}</fieldset>
      {filteredServices.length === 0 && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No electrician service matches this search.</p>}{selected.length > 0 && <p className="mt-2 text-[11px] text-amber-700">Selected: {selected.join(", ")}</p>}<ResidentServiceDetailsForm kind="electrician" selectedServices={selected} accentClass="border-amber-900/10" />
      <a href="tel:+9170367884" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-amber-700 px-4 text-sm font-semibold text-white transition hover:bg-amber-800"><Phone className="h-4 w-4" />9170367884</a><button type="button" onClick={() => setOpen(false)} className="mt-2 h-9 w-full rounded-full border border-amber-900/15 bg-white text-xs font-semibold text-amber-900 transition hover:bg-amber-100">Close</button>
    </div></>}
    <button type="button" title="Electrician Services" aria-label="Open Electrician Services contact" aria-expanded={open} onClick={() => setOpen(!open)} className={circle ? "grid h-9 w-9 place-items-center rounded-full border-2 border-amber-200 bg-amber-50 text-amber-800 shadow-sm transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2" : "flex h-11 w-36 items-center gap-2 rounded-xl border border-amber-900/15 bg-amber-50 px-3 text-left text-xs font-bold text-amber-950 shadow-sm transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2"}><span className={circle ? "grid h-6 w-6 place-items-center rounded-full bg-amber-700 text-white" : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-700 text-white"}><Zap className="h-3.5 w-3.5" /></span>{!circle && <><span className="truncate">Electrician</span><span className="ml-auto text-amber-800">›</span></>}</button>{circle && <span className="whitespace-nowrap text-[9px] font-semibold text-foreground">Electrician</span>}
  </div>;
}
