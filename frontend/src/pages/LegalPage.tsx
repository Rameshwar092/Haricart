import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { LEGAL_INFO, PRIVACY_POLICY, TERMS_AND_CONDITIONS, legalContactLines, type LegalDocument } from "@shared/legal";
import { ArrowLeft, FileText, Mail, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

/** "Delete your account" box. Works for logged-in users; others are told how to ask. */
function DeleteAccountCard() {
  const { isAuthenticated } = useAuth();
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  const request = trpc.community.resident.requestAccountDeletion.useMutation({
    onSuccess: data => { setSent(true); toast.success(data.alreadyRequested ? "Your request is already with us." : "Request sent. We will complete it within 30 days."); },
    onError: error => toast.error(error.message),
  });
  const email = LEGAL_INFO.supportEmail;
  return <section id="delete-account" className="scroll-mt-24 rounded-[1.5rem] border border-rose-200 bg-rose-50/60 p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-lg font-semibold text-rose-900"><Trash2 className="h-5 w-5" />Delete your account</h2>
    <p className="mt-2 text-sm leading-6 text-rose-950/80">You can ask us to delete your {LEGAL_INFO.appName} account and personal information. We will finish within 30 days. Order and payment records that tax law requires us to keep are stored without your name and phone number where possible.</p>
    {sent ? <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-medium text-emerald-800">Your deletion request has been received. You will see a confirmation in your notifications.</p>
      : isAuthenticated ? <div className="mt-4 space-y-2">
        <textarea value={reason} onChange={event => setReason(event.target.value.slice(0, 500))} placeholder="Reason (optional)" aria-label="Reason for deleting your account" className="min-h-20 w-full rounded-xl border bg-white px-3 py-2 text-sm" />
        <Button variant="destructive" className="rounded-full" disabled={request.isPending} onClick={() => { if (window.confirm("Send a request to delete your account and personal data?")) request.mutate({ reason: reason || undefined }); }}>{request.isPending ? "Sending…" : "Request account deletion"}</Button>
      </div>
      : <p className="mt-4 text-sm leading-6 text-rose-950/80">Log in to {LEGAL_INFO.appName} and open this page again to send the request from your account{email ? <>, or email <a className="font-semibold underline" href={`mailto:${email}?subject=${encodeURIComponent("Delete my HariCart account")}&body=${encodeURIComponent("Please delete my account. My registered mobile number is: ")}`}>{email}</a> from your registered details</> : ""}.</p>}
  </section>;
}

function ContactCard() {
  const lines = legalContactLines();
  return <section id="contact" className="scroll-mt-24 rounded-[1.5rem] border bg-card p-5 sm:p-6">
    <h2 className="flex items-center gap-2 text-lg font-semibold"><Mail className="h-5 w-5 text-primary" />Contact us</h2>
    <p className="mt-2 text-sm text-muted-foreground">For questions, corrections, deletion requests or complaints:</p>
    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">{lines.map(line => <div key={line.label} className="contents"><dt className="font-semibold text-muted-foreground">{line.label}</dt><dd>{line.href ? <a href={line.href} className="text-primary underline-offset-2 hover:underline">{line.value}</a> : line.value}</dd></div>)}</dl>
  </section>;
}

function Document({ doc }: { doc: LegalDocument }) {
  return <article>
    <h1 className="font-editorial text-4xl font-semibold tracking-tight sm:text-5xl">{doc.title}</h1>
    <p className="mt-2 text-sm text-muted-foreground">Effective date: {LEGAL_INFO.effectiveDate}</p>
    <p className="mt-5 leading-7">{doc.intro}</p>
    <nav aria-label="Contents" className="mt-6 rounded-2xl bg-muted/50 p-4 print:hidden"><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Contents</p><ol className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{doc.sections.map(section => <li key={section.id}><a href={`#${section.id}`} className="hover:text-primary hover:underline">{section.title}</a></li>)}{doc.kind === "privacy" && <li><a href="#delete-account" className="hover:text-primary hover:underline">Delete your account</a></li>}<li><a href="#contact" className="hover:text-primary hover:underline">Contact us</a></li></ol></nav>
    <div className="mt-8 space-y-8">{doc.sections.map(section => <section key={section.id} id={section.id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold">{section.title}</h2>
      {section.paragraphs?.map(text => <p key={text} className="mt-3 leading-7 text-foreground/85">{text}</p>)}
      {section.bullets && <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-foreground/85">{section.bullets.map(text => <li key={text}>{text}</li>)}</ul>}
      {section.notes?.map(text => <p key={text} className="mt-3 leading-7 text-foreground/85">{text}</p>)}
    </section>)}</div>
  </article>;
}

/** Public page for /privacy and /terms. Anyone can read it without logging in. */
export default function LegalPage() {
  const [location] = useLocation();
  const isTerms = location.startsWith("/terms");
  const doc = isTerms ? TERMS_AND_CONDITIONS : PRIVACY_POLICY;
  useEffect(() => {
    const previous = document.title;
    document.title = `${doc.title} · ${LEGAL_INFO.appName}`;
    // /delete-account opens the Privacy Policy at the deletion box.
    const target = location.startsWith("/delete-account") ? "delete-account" : window.location.hash.slice(1);
    if (target) window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }), 150);
    else window.scrollTo(0, 0);
    return () => { document.title = previous; };
  }, [doc.title, location]);

  return <div className="min-h-screen bg-[#f7f4eb]">
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur print:static"><div className="container flex h-16 items-center justify-between gap-2"><Link href="/"><BrandMark compact /></Link><div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="rounded-full print:hidden" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Print</Button><Link href="/"><Button variant="outline" size="sm" className="rounded-full print:hidden"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button></Link></div></div></header>
    <main className="container max-w-3xl py-8 sm:py-12">
      <div className="mb-6 inline-flex rounded-full border bg-card p-1 text-sm print:hidden">
        <Link href="/privacy" className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold ${!isTerms ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><ShieldCheck className="h-4 w-4" />Privacy Policy</Link>
        <Link href="/terms" className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-semibold ${isTerms ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><FileText className="h-4 w-4" />Terms & Conditions</Link>
      </div>
      <div className="rounded-[1.75rem] border bg-card p-5 sm:p-9"><Document doc={doc} /></div>
      <div className="mt-6 space-y-6">
        {!isTerms && <DeleteAccountCard />}
        <ContactCard />
      </div>
    </main>
  </div>;
}

/** Small "Privacy Policy · Terms" links for footers and login screens. */
export function LegalLinks({ className = "" }: { className?: string }) {
  return <span className={className}><Link href="/privacy" className="underline-offset-2 hover:text-primary hover:underline">Privacy Policy</Link><span aria-hidden="true"> · </span><Link href="/terms" className="underline-offset-2 hover:text-primary hover:underline">Terms & Conditions</Link></span>;
}