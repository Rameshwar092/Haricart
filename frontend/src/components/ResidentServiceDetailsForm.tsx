import { Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export type ResidentServiceKind = "electrician" | "plumber" | "tuition" | "fitness" | "car" | "bike";

export function ResidentServiceDetailsForm({ kind, selectedServices, accentClass = "border-primary/20" }: { kind: ResidentServiceKind; selectedServices: string[]; accentClass?: string }) {
  const resident = trpc.community.resident.me.useQuery();
  const [phone, setPhone] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const submitRequest = trpc.community.resident.submitVehicleServiceRequest.useMutation({
    onSuccess: () => { setSubmitted(true); toast.success("Service request submitted with your contact details."); },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    const profile = resident.data;
    if (!profile) return;
    setPhone(current => current || profile.phone || "");
    setBlockNumber(current => current || profile.blockNumber || "");
    setFlatNumber(current => current || profile.flatNumber || "");
  }, [resident.data]);
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitRequest.mutate({ serviceKind: kind, selectedServices, issueDescription: issueDescription.trim(), phone: phone.trim(), blockNumber: blockNumber.trim(), flatNumber: flatNumber.trim() });
  };
  return <form onSubmit={handleSubmit} className={`mt-3 space-y-2 rounded-xl border bg-muted/35 p-3 ${accentClass}`}><p className="text-xs font-semibold text-foreground">Your contact details</p><p className="text-[11px] leading-4 text-muted-foreground">Enter your mobile number and apartment details so the provider can identify your request.</p><div className="grid grid-cols-2 gap-2"><label className="col-span-2 text-[11px] font-medium">Mobile number<input value={phone} onChange={event => setPhone(event.target.value)} required minLength={8} maxLength={32} inputMode="tel" placeholder="Your mobile number" className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="text-[11px] font-medium">Block number<input value={blockNumber} onChange={event => setBlockNumber(event.target.value)} required maxLength={32} placeholder="Block" className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><label className="text-[11px] font-medium">Flat number<input value={flatNumber} onChange={event => setFlatNumber(event.target.value)} required maxLength={32} placeholder="Flat" className="mt-1 h-9 w-full rounded-lg border bg-white px-2.5 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label></div><label className="block text-[11px] font-medium">Issue or request details<textarea value={issueDescription} onChange={event => setIssueDescription(event.target.value)} required minLength={5} maxLength={500} rows={2} placeholder="Briefly describe what you need..." className="mt-1 w-full resize-none rounded-lg border bg-white px-2.5 py-2 text-xs leading-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label><button type="submit" disabled={submitRequest.isPending || selectedServices.length === 0} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-3.5 w-3.5" />{submitRequest.isPending ? "Submitting..." : submitted ? "Submit another request" : "Submit service request"}</button>{submitted && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800">Your selected service and apartment contact details were saved.</p>}</form>;
}
