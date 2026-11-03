import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { DAILY_DISCOUNT_BANNERS_SETTING_KEY, DEFAULT_DAILY_DISCOUNT_BANNERS, DISCOUNT_BANNER_CATEGORIES, type DailyDiscountBanners } from "@shared/daily-discount";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

export function OwnerDailyDiscountPanel({ onClose }: { onClose: () => void }) {
  const settingsQuery = trpc.admin.brand.settings.useQuery();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<DailyDiscountBanners>(DEFAULT_DAILY_DISCOUNT_BANNERS);
  const saveSetting = trpc.admin.brand.saveSetting.useMutation({
    onSuccess: () => {
      toast.success("Category discount banners saved.");
      void utils.commerce.dailyDiscountBanner.invalidate();
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    const stored = settingsQuery.data?.find(setting => setting.settingKey === DAILY_DISCOUNT_BANNERS_SETTING_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored.settingValue) as Record<string, unknown>;
      setDraft(current => Object.fromEntries(DISCOUNT_BANNER_CATEGORIES.map(({ key }) => [key, typeof parsed[key] === "string" && parsed[key].trim() ? parsed[key].trim() : current[key]])) as DailyDiscountBanners);
    } catch {
      // Keep the safe defaults when an older or malformed setting is present.
    }
  }, [settingsQuery.data]);

  const updateBanner = (key: keyof DailyDiscountBanners, value: string) => setDraft(current => ({ ...current, [key]: value }));
  const save = () => {
    const cleaned = Object.fromEntries(DISCOUNT_BANNER_CATEGORIES.map(({ key }) => [key, draft[key].trim() || DEFAULT_DAILY_DISCOUNT_BANNERS[key]])) as DailyDiscountBanners;
    saveSetting.mutate({ key: DAILY_DISCOUNT_BANNERS_SETTING_KEY, value: JSON.stringify(cleaned) });
  };

  return <div className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Category Discount Banners">
    <section className="relative mx-auto max-h-[calc(100vh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-3xl bg-amber-50 p-5 shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:p-7">
      <button type="button" onClick={onClose} aria-label="Close Category Discount Banners" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-amber-950 shadow-sm hover:bg-white"><X className="h-4 w-4" /></button>
      <p className="text-xs font-bold uppercase tracking-[.14em] text-amber-700">Owner controls</p>
      <h2 className="mt-1 font-editorial text-2xl font-semibold text-amber-950">Category Discount Banners</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-900/75">Set a different offer for each category. Customers see the matching banner when they switch filters; blank fields use the default offer.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">{DISCOUNT_BANNER_CATEGORIES.map(({ key, label, icon }) => <label key={key} className="rounded-2xl border border-amber-900/10 bg-white/85 p-3 text-xs font-bold uppercase tracking-wide text-amber-900"><span className="flex items-center gap-2">{icon} {label}</span><input value={draft[key]} maxLength={120} onChange={event => updateBanner(key, event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-amber-900/15 bg-white px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none ring-amber-400 focus:ring-2" /></label>)}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose} className="rounded-full border-amber-900/20 bg-white">Cancel</Button><Button type="button" onClick={save} disabled={saveSetting.isPending} className="rounded-full bg-amber-700 text-white hover:bg-amber-800">{saveSetting.isPending ? "Saving…" : "Save all banners"}</Button></div>
    </section>
  </div>;
}
