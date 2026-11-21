/**
 * Share button in the header. Opens a small menu so there is always something that works:
 *   • WhatsApp   — opens WhatsApp with the shop link ready to send
 *   • Copy link  — works in every browser (with a fallback for old ones)
 *   • More…      — the phone's own share sheet, when the browser has one
 * Older code called navigator.share directly; on some desktop browsers that fails silently,
 * so pressing the icon looked like it did nothing.
 */
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getPublicShareUrl } from "@/const";
import { getSharePayload, isNativeShareAvailable, shareAppText } from "@/lib/share";
import { Copy, MessageCircle, Share2, Smartphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the old way */
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(field);
    return copied;
  } catch {
    return false;
  }
}

export function ShareMenu({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const url = getPublicShareUrl();
  const canNativeShare = typeof navigator !== "undefined" && isNativeShareAvailable(navigator);

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareAppText} ${url}`)}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const copyLink = async () => {
    const copied = await copyText(url);
    setOpen(false);
    if (copied) toast.success("Link copied. Paste it in WhatsApp or anywhere.");
    else toast.message(`Copy this link: ${url}`, { duration: 10000 });
  };

  const nativeShare = async () => {
    setOpen(false);
    try {
      await navigator.share(getSharePayload(url));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  };

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-muted";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Share HariCart" title="Share HariCart" className={`grid h-9 w-9 place-items-center rounded-full text-foreground transition-colors hover:bg-muted ${className}`}>
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-60 rounded-2xl p-2">
        <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Share HariCart</p>
        <button type="button" onClick={shareOnWhatsApp} className={item}>
          <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
        </button>
        <button type="button" onClick={copyLink} className={item}>
          <Copy className="h-4 w-4 text-primary" /> Copy link
        </button>
        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={item}>
            <Smartphone className="h-4 w-4 text-primary" /> More…
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}