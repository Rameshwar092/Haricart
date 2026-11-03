import { useState } from "react";
import { Phone, Search, Wrench } from "lucide-react";
import { PLUMBING_SERVICES } from "@shared/plumbing";
import { ResidentServiceDetailsForm } from "@/components/ResidentServiceDetailsForm";

export function PlumberContact({ embedded = false, circle = false, open: controlledOpen, onOpenChange }: { embedded?: boolean; circle?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setInternalOpen(next); onOpenChange?.(next); };
  const [selected, setSelected] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const filteredServices = PLUMBING_SERVICES.filter(service => service.toLowerCase().includes(serviceQuery.trim().toLowerCase()));

  const toggleService = (service: string) => {
    setSelected(current => current.includes(service) ? current.filter(item => item !== service) : [...current, service]);
  };

  return <div className={embedded && circle ? "relative flex flex-col items-center" : embedded ? "relative" : "fixed right-4 top-[calc(50%-16rem)] z-30 -translate-y-1/2 sm:right-6"}>
    {open && <><button type="button" aria-label="Close Plumber Services panel" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35" /><div className="fixed left-1/2 top-28 z-50 max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:max-h-[calc(100vh-7rem)] sm:translate-x-0 border border-sky-900/10 bg-card p-4 shadow-2xl shadow-[#214d35]/15">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-700"><Wrench className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Plumber Services</p><p className="text-xs text-muted-foreground">Select the service you need</p></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Reliable plumbing support for GreenGate residents. Choose one or more services, then call for availability.</p>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-sky-900/10 bg-white px-3 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-sky-700" /><input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder="Search plumber service..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" aria-label="Search plumber services" /></label><fieldset className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1" aria-label="Plumber services">{filteredServices.map(service => <label key={service} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-sky-500/5"><input type="checkbox" checked={selected.includes(service)} onChange={() => toggleService(service)} className="mt-0.5 h-4 w-4 shrink-0 accent-sky-700" /><span>{service}</span></label>)}</fieldset>
      {filteredServices.length === 0 && <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">No plumber service matches this search.</p>}{selected.length > 0 && <p className="mt-2 text-[11px] text-sky-700">Selected: {selected.join(", ")}</p>}<ResidentServiceDetailsForm kind="plumber" selectedServices={selected} accentClass="border-sky-900/10" />
      <a href="tel:+9170367884" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800"><Phone className="h-4 w-4" />9170367884</a><button type="button" onClick={() => setOpen(false)} className="mt-2 h-9 w-full rounded-full border border-sky-900/15 bg-white text-xs font-semibold text-sky-900 transition hover:bg-sky-100">Close</button>
    </div></>}
    <button type="button" title="Plumber Services" aria-label="Open Plumber Services contact" aria-expanded={open} onClick={() => setOpen(!open)} className={circle ? "grid h-9 w-9 place-items-center rounded-full border-2 border-sky-200 bg-sky-50 text-sky-800 shadow-sm transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2" : "flex h-11 w-36 items-center gap-2 rounded-xl border border-sky-900/15 bg-sky-50 px-3 text-left text-xs font-bold text-sky-950 shadow-sm transition hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2"}><span className={circle ? "grid h-6 w-6 place-items-center rounded-full bg-sky-700 text-white" : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-sky-700 text-white"}><Wrench className="h-3.5 w-3.5" /></span>{!circle && <><span className="truncate">Plumber</span><span className="ml-auto text-sky-800">›</span></>}</button>{circle && <span className="whitespace-nowrap text-[9px] font-semibold text-foreground">Plumber</span>}
  </div>;
}
