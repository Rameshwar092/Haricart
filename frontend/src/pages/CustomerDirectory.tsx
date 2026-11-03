import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Building2, Home, LockKeyhole, MapPin, Phone, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type CustomerRecord = {
  userId: number;
  name: string;
  phone: string | null;
  blockNumber: string | null;
  flatNumber: string | null;
  verificationStatus: "pending" | "verified" | "rejected";
};

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

export function matchesCustomerSearch(customer: CustomerRecord, query: string) {
  const needle = normalize(query);
  if (!needle) return true;
  return [customer.name, customer.phone, customer.blockNumber, customer.flatNumber]
    .some(value => normalize(value).includes(needle));
}

function AccessDenied() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f4eb] px-4 py-10">
    <div className="w-full max-w-md rounded-[1.75rem] border bg-card p-8 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary"><LockKeyhole className="h-6 w-6" /></span>
      <h1 className="mt-5 font-editorial text-3xl font-semibold tracking-tight">Owner access required</h1>
      <p className="mt-3 leading-7 text-muted-foreground">Customer contact details are available only to HariCart administrators and shop owners.</p>
      <Link href="/"><Button className="mt-6 rounded-full"><ArrowLeft className="mr-2 h-4 w-4" />Return to storefront</Button></Link>
    </div>
  </div>;
}

function CustomerRow({ customer }: { customer: CustomerRecord }) {
  const statusClass = customer.verificationStatus === "verified"
    ? "bg-emerald-100 text-emerald-800"
    : customer.verificationStatus === "rejected"
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";
  return <>
    <tr className="border-b last:border-0 hover:bg-muted/35">
      <td className="px-5 py-4"><p className="font-semibold text-foreground">{customer.name}</p><p className="mt-1 text-xs text-muted-foreground">Resident ID #{customer.userId}</p></td>
      <td className="px-5 py-4"><a href={customer.phone ? `tel:${customer.phone}` : undefined} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><Phone className="h-3.5 w-3.5" />{customer.phone || "Not provided"}</a></td>
      <td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-sm"><Building2 className="h-3.5 w-3.5 text-primary" />{customer.blockNumber || "—"}</span></td>
      <td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-sm"><Home className="h-3.5 w-3.5 text-primary" />{customer.flatNumber || "—"}</span></td>
      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass}`}>{customer.verificationStatus}</span></td>
    </tr>
  </>;
}

function CustomerCard({ customer }: { customer: CustomerRecord }) {
  const statusClass = customer.verificationStatus === "verified"
    ? "bg-emerald-100 text-emerald-800"
    : customer.verificationStatus === "rejected"
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";
  return <article className="rounded-2xl border bg-card p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><h3 className="truncate font-semibold">{customer.name}</h3><p className="mt-1 text-xs text-muted-foreground">Resident ID #{customer.userId}</p></div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${statusClass}`}>{customer.verificationStatus}</span>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-xl bg-muted/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mobile</p><a href={customer.phone ? `tel:${customer.phone}` : undefined} className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate font-medium text-primary hover:underline"><Phone className="h-3.5 w-3.5 shrink-0" />{customer.phone || "Not provided"}</a></div>
      <div className="rounded-xl bg-muted/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Apartment</p><p className="mt-1 inline-flex items-center gap-1.5 font-medium"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />{customer.blockNumber || "—"} · {customer.flatNumber || "—"}</p></div>
    </div>
  </article>;
}

export default function CustomerDirectory() {
  const { user, isAuthenticated } = useAuth();
  const isOwner = user?.role === "admin" || user?.role === "shop_owner";
  const [query, setQuery] = useState("");
  const customers = trpc.community.resident.customerDirectory.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && isOwner),
  });
  const rows = useMemo(() => (customers.data || []) as CustomerRecord[], [customers.data]);
  const filteredRows = useMemo(() => rows.filter(customer => matchesCustomerSearch(customer, query)), [rows, query]);

  if (!isAuthenticated || !isOwner) return <AccessDenied />;

  return <div className="min-h-screen bg-[#f7f4eb]">
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-xl">
      <div className="container flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-20 sm:py-0">
        <Link href="/" aria-label="Back to HariCart storefront"><BrandMark /></Link>
        <div className="flex items-center gap-2">
          <Link href={user.role === "admin" ? "/admin" : "/shop"}><Button variant="outline" size="sm" className="rounded-full"><ArrowLeft className="mr-1.5 h-4 w-4" />Owner workspace</Button></Link>
          <Link href="/"><Button size="sm" className="hidden rounded-full sm:inline-flex">Storefront</Button></Link>
        </div>
      </div>
    </header>
    <main className="container py-8 sm:py-12">
      <section className="rounded-[1.75rem] bg-[#315d47] p-6 text-primary-foreground shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="text-xs font-bold uppercase tracking-[.17em] text-emerald-100/75">Owner directory</p><h1 className="mt-2 font-editorial text-4xl font-semibold tracking-tight sm:text-5xl">Customers</h1><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/80 sm:text-base">A private GreenGate resident directory for fulfilment and community support.</p></div>
          <div className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm"><ShieldCheck className="h-5 w-5 text-emerald-200" /><span>Passwords stay hidden</span></div>
        </div>
      </section>
      <section className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Users className="h-5 w-5" /></span><div><p className="text-2xl font-semibold">{rows.length}</p><p className="text-xs text-muted-foreground">registered residents</p></div></div>
        <label className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20"><Search className="h-5 w-5 shrink-0 text-primary" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, mobile, block, or flat" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label="Search customers" /></label>
      </section>
      <section className="mt-6 overflow-hidden rounded-[1.5rem] border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b px-5 py-4"><div><h2 className="font-editorial text-2xl font-semibold">Resident contact details</h2><p className="mt-1 text-sm text-muted-foreground">Showing {filteredRows.length} of {rows.length} records</p></div>{customers.isFetching && <span className="text-xs font-semibold text-primary">Refreshing…</span>}</div>
        {customers.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div> : customers.error ? <div className="p-8 text-center"><p className="font-semibold text-red-700">Unable to load customer details</p><p className="mt-2 text-sm text-muted-foreground">{customers.error.message}</p></div> : !filteredRows.length ? <div className="p-10 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground/60" /><p className="mt-3 font-semibold">{rows.length ? "No customers match this search" : "No resident profiles yet"}</p><p className="mt-1 text-sm text-muted-foreground">Verified GreenGate registrations will appear here.</p></div> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">Name</th><th className="px-5 py-3 font-semibold">Mobile</th><th className="px-5 py-3 font-semibold">Block</th><th className="px-5 py-3 font-semibold">Flat</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead><tbody>{filteredRows.map(customer => <CustomerRow key={customer.userId} customer={customer} />)}</tbody></table></div>
          <div className="grid gap-3 p-4 md:hidden">{filteredRows.map(customer => <CustomerCard key={customer.userId} customer={customer} />)}</div>
        </>}
      </section>
    </main>
  </div>;
}
