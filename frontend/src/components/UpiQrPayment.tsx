import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buildHariCartUpiUri, getHariCartUpiDisplay } from "@/lib/upi";
import { generateBrandedHariCartQrDataUrl } from "@/lib/brandedQr";
import { ExternalLink, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function UpiQrPayment({
  amount,
  orderNumber,
  triggerLabel = "Pay via UPI QR",
  open: openProp,
  onOpenChange,
  showTrigger = true,
}: {
  amount: number;
  orderNumber?: string;
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const handleOpenChange = (nextOpen: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const upiUri = useMemo(() => {
    try {
      setError(null);
      return buildHariCartUpiUri({ amount, orderNumber });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to prepare the UPI payment.");
      return null;
    }
  }, [amount, orderNumber]);

  const openUpiApp = () => {
    if (!upiUri || typeof window === "undefined") return;
    window.location.assign(upiUri);
  };

  const copyUpiId = async () => {
    try {
      await navigator.clipboard.writeText(getHariCartUpiDisplay().split(" · ").at(-1) || "");
      setCopyStatus("UPI ID copied");
    } catch {
      setCopyStatus("Copy unavailable — use the QR code");
    }
    window.setTimeout(() => setCopyStatus(null), 2200);
  };

  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    if (!open || !upiUri) return () => { cancelled = true; };
    generateBrandedHariCartQrDataUrl(upiUri, 300).then(dataUrl => {
      if (!cancelled) setQrDataUrl(dataUrl);
    }).catch(() => {
      if (!cancelled) setError("Unable to generate the branded QR code on this device.");
    });
    return () => { cancelled = true; };
  }, [open, upiUri]);

  return <Dialog open={open} onOpenChange={handleOpenChange}>
    {showTrigger && <DialogTrigger asChild>
      <Button type="button" size="sm" variant="outline" className="rounded-full">
        <QrCode className="mr-2 h-4 w-4" />{triggerLabel}
      </Button>
    </DialogTrigger>}
    <DialogContent className="max-w-sm rounded-[1.5rem]">
      <DialogHeader>
        <DialogTitle className="font-editorial text-2xl">Pay HariCart via UPI</DialogTitle>
        <DialogDescription>Scan this QR with any UPI app. If the Open UPI app button does nothing, scan the QR from another phone or copy the UPI ID below. Payment stays pending until the delivery partner or admin verifies collection.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 text-center">
        <div className="mx-auto overflow-hidden rounded-2xl border bg-white p-2 shadow-sm">
          {qrDataUrl ? <img src={qrDataUrl} alt={`HariCart Branded UPI QR for ₹${amount.toFixed(2)}`} className="mx-auto aspect-square w-full max-w-[280px] rounded-xl" /> : <div className="grid aspect-square w-full max-w-[280px] place-items-center text-sm text-muted-foreground">{error || "Generating branded payment QR…"}</div>}
        </div>
        <div className="rounded-xl bg-primary/10 px-4 py-3 text-left text-sm">
          <p className="font-semibold text-primary">HariCart · ₹{amount.toFixed(2)}</p>
          <p className="mt-1 break-all text-muted-foreground">{getHariCartUpiDisplay()}</p>
          {orderNumber && <p className="mt-1 text-muted-foreground">Order {orderNumber}</p>}
        </div>
        {upiUri && <Button type="button" className="w-full rounded-full" onClick={openUpiApp}><ExternalLink className="mr-2 h-4 w-4" />Open UPI app</Button>}
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left">
          <div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">UPI ID</p><p className="truncate text-sm font-semibold text-foreground">{getHariCartUpiDisplay().split(" · ").at(-1)}</p></div>
          <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-full" onClick={copyUpiId}>{copyStatus || "Copy UPI ID"}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
