const HARI_CART_LOGO = "/brand/icon-512.png";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2.5" aria-label="HariCart">
    <img src={HARI_CART_LOGO} alt="HariCart — Fresh vegetables, healthy life" className={compact ? "h-8 w-8 rounded-full object-cover object-center ring-1 ring-primary/15" : "h-10 w-10 rounded-full object-cover object-center ring-1 ring-primary/15"} />
    {!compact && <span className="font-editorial text-xl font-semibold tracking-tight text-[#246b14]">HariCart</span>}
  </div>;
}
