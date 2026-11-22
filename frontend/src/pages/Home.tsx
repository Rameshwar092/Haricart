import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { DeliveryCountdown } from "@/components/DeliveryCountdown";
import { NotificationBell } from "@/components/NotificationBell";
import { ShareMenu } from "@/components/ShareMenu";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getPublicShareUrl, startLogin } from "@/const";
import { CheckoutPaymentMethod, useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { formatMoney } from "@/lib/format";
import { buildAddressUpdateConfirmation, buildOwnCustomerProfile, canViewCustomerProfile, shouldShowCustomerProfile } from "@/lib/customer-profile";
import { shouldShowResidentServiceRow } from "@/lib/service-row";
import { RESIDENT_ONBOARDING_STEPS, shouldShowResidentLaunchGate } from "@/lib/resident-launch";
import { shouldRequireOwnerVerification, shouldShowOwnerLaunchGate } from "@/lib/owner-launch-gate";
import { OwnerAuthModal } from "@/components/OwnerAuthModal";
import { OwnerDailyDiscountPanel } from "@/pages/OwnerDailyDiscountPanel";
import { PlumberContact } from "@/components/PlumberContact";
import { ElectricianContact } from "@/components/ElectricianContact";
import { CarServiceContact } from "@/components/CarServiceContact";
import { BikeServiceContact } from "@/components/BikeServiceContact";
import { ResidentServiceDetailsForm } from "@/components/ResidentServiceDetailsForm";
import { UpiQrPayment } from "@/components/UpiQrPayment";


import { isLocalCatalogVariantId, localCatalogAddErrorMessage } from "@shared/local-cart";
import { FITNESS_OPTIONS } from "@/lib/fitness";
import { getSharePayload, isNativeShareAvailable } from "@/lib/share";
import { canResendOtp, formatOtpCountdown, OTP_RESEND_COOLDOWN_SECONDS } from "@/lib/otp-resend";
import { usePhoneOtp } from "@/lib/use-phone-otp";
import { DELIVERY_AVAILABILITY_NOTE, DELIVERY_PROMISE_LABEL } from "@shared/delivery";
import { MARKET_PROMO } from "@shared/market-branding";
import { getDailyDiscountBanner } from "@shared/daily-discount";
import { matchesCatalogCategory } from "@shared/catalog-filter";
import { matchesCatalogSearch } from "@shared/catalog-search";
import { AVAILABILITY_CATEGORIES, AVAILABILITY_SETTING_KEY, DEFAULT_CATEGORY_AVAILABILITY, categoryHoursLabel, categoryUnavailableMessage, getProductAvailabilityCategory, isCategoryAvailable, parseCategoryAvailability, type CategoryAvailabilitySettings } from "@shared/category-availability";
import type { Product } from "@shared/commerce/types";
import { formatDiscountBadge } from "@shared/catalog-pricing";
import { shouldOpenUpiPaymentDialog } from "@shared/payment-flow";
import { getOrderCompletionNote } from "@shared/order-completion";
import { buildProductCardPlusAction, canQueueProductCardPlus } from "@shared/product-card";
import { ArrowRight, BadgeCheck, Bell, Building2, Check, ChevronDown, CircleCheck, Clock3, Dumbbell, Edit3, Flower2, GraduationCap, Home as HomeIcon, Leaf, LayoutGrid, LockKeyhole, MapPin, Minus, PackageCheck, Phone, Plus, Search, Share2, ShoppingBag, Sparkles, Truck, UserCircle, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

// Optional photo overrides by product handle (files in frontend/public).
const fallbackImages: Record<string, string> = {};

type ResidentProfileSummary = {
  fullName?: string | null;
  phone?: string | null;
  blockNumber?: string | null;
  flatNumber?: string | null;
};

function CustomerProfileMenu({ profile }: { profile: ResidentProfileSummary | null | undefined }) {
  const name = profile?.fullName?.trim() || "Complete profile";
  const apartment = profile?.blockNumber && profile?.flatNumber
    ? `Block ${profile.blockNumber} · Flat ${profile.flatNumber}`
    : "Apartment details pending";
  const [editOpen, setEditOpen] = useState(false);
  const [blockNumber, setBlockNumber] = useState(profile?.blockNumber || "");
  const [flatNumber, setFlatNumber] = useState(profile?.flatNumber || "");
  const utils = trpc.useUtils();
  const updateAddress = trpc.community.resident.updateAddress.useMutation({
    onSuccess: async address => {
      await utils.community.resident.me.invalidate();
      setEditOpen(false);
      toast.success(buildAddressUpdateConfirmation(address));
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (!editOpen) return;
    setBlockNumber(profile?.blockNumber || "");
    setFlatNumber(profile?.flatNumber || "");
  }, [editOpen, profile?.blockNumber, profile?.flatNumber]);

  const submitAddress = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAddress.mutate({ blockNumber, flatNumber });
  };

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-9 rounded-full border-primary/25 px-3 text-xs font-bold sm:h-10 sm:px-4" aria-label="Open my customer profile"><UserCircle className="mr-1.5 h-4 w-4 text-primary" /><span className="hidden sm:inline">Profile</span></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <DropdownMenuLabel className="px-3 py-2"><span className="block text-xs font-bold uppercase tracking-[.14em] text-primary">My HariCart profile</span><span className="mt-1 block truncate text-base font-semibold text-foreground">{name}</span></DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="space-y-2 px-3 py-2 text-sm">
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"><Phone className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Mobile</p><p className="truncate font-medium">{profile?.phone || "Not saved yet"}</p></div></div>
          <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"><MapPin className="h-4 w-4 shrink-0 text-primary" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Delivery address</p><p className="truncate font-medium">{apartment}</p></div></div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={event => { event.preventDefault(); setEditOpen(true); }} className="cursor-pointer rounded-xl px-3 py-2 font-semibold"><Edit3 className="mr-2 h-4 w-4 text-primary" />Edit Details</DropdownMenuItem>
        <p className="px-3 py-2 text-[11px] leading-4 text-muted-foreground">Only your saved details are shown here. Other residents' information is never loaded into this profile.</p>
      </DropdownMenuContent>
    </DropdownMenu>
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="max-w-sm rounded-[1.5rem]">
        <DialogHeader>
          <DialogTitle className="font-editorial text-2xl">Edit Details</DialogTitle>
          <DialogDescription>Update your delivery block and flat. Your mobile number stays unchanged.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submitAddress} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-semibold"><span>Block number</span><Input value={blockNumber} onChange={event => setBlockNumber(event.target.value)} placeholder="Example: A" maxLength={16} required /></label>
          <label className="block space-y-1.5 text-sm font-semibold"><span>Flat number</span><Input value={flatNumber} onChange={event => setFlatNumber(event.target.value)} placeholder="Example: 204" maxLength={16} required /></label>
          <DialogFooter className="gap-2 sm:gap-2"><Button type="button" variant="outline" className="rounded-full" onClick={() => setEditOpen(false)}>Cancel</Button><Button type="submit" className="rounded-full" disabled={updateAddress.isPending || !blockNumber.trim() || !flatNumber.trim()}>{updateAddress.isPending ? "Saving…" : "Save Details"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

function ProductCard({ product, isAuthenticated, isVerifiedResident, availabilitySettings }: { product: Product; isAuthenticated: boolean; isVerifiedResident: boolean; availabilitySettings: CategoryAvailabilitySettings }) {
  const { addItem, cart, updateQuantity } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const pendingAddsRef = useRef(0);
  const plusQueueRef = useRef(Promise.resolve());
  const cartLineRef = useRef(cart?.items.find(item => item.variantId === product.variants[0]?.id));
  const variant = product.variants[0];
  const image = fallbackImages[product.handle] || product.images[0]?.url;
  const price = formatMoney(variant?.price || product.priceRange.min, "INR");
  const isLocalCatalogItem = Boolean(product.isLocalCatalogItem || variant?.id.startsWith("local:"));
  const canAddToCart = Boolean(variant?.availableForSale);
  const availabilityCategory = getProductAvailabilityCategory(product.title, product.description, product.tags);
  const productInAvailabilityWindow = isCategoryAvailable(availabilitySettings, availabilityCategory);
  const productCanBeAdded = canAddToCart && productInAvailabilityWindow;
  const existingLine = cart?.items.find(item => item.variantId === variant?.id);

  useEffect(() => {
    if (!isAdding) cartLineRef.current = existingLine;
  }, [existingLine, isAdding]);

  const handlePlus = () => {
    const targetVariantId = variant?.id || `local:${product.id}`;
    if (!targetVariantId || !canQueueProductCardPlus(productCanBeAdded)) return;
    if (!productInAvailabilityWindow) {
      toast.error(categoryUnavailableMessage(availabilityCategory, availabilitySettings));
      return;
    }
    if (isLocalCatalogVariantId(targetVariantId)) {
      const gateMessage = localCatalogAddErrorMessage(isAuthenticated, isVerifiedResident);
      if (gateMessage) {
        if (!isAuthenticated) startLogin();
        toast.error(gateMessage);
        return;
      }
    }

    pendingAddsRef.current += 1;
    setIsAdding(true);
    plusQueueRef.current = plusQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        try {
          const action = buildProductCardPlusAction(targetVariantId, cartLineRef.current);
          const nextCart = action.kind === "add"
            ? await addItem(action.variantId, action.quantity)
            : await updateQuantity(action.lineId, action.quantity);
          if (nextCart) {
            cartLineRef.current = nextCart.items.find(item => item.variantId === targetVariantId);
          }
        } catch (err) {
          console.error("Failed to update cart quantity:", err);
          toast.error("Unable to add this item right now.");
        } finally {
          pendingAddsRef.current -= 1;
          if (pendingAddsRef.current === 0) setIsAdding(false);
        }
      });
  };

  const listPriceFormatted = variant?.compareAtPrice ? formatMoney(variant.compareAtPrice, "INR") : null;
  const discountBadge = formatDiscountBadge(variant?.compareAtPrice?.amount, variant?.price?.amount);
  const unitLabelStr = product.unitLabel || variant?.title || "1 kg";

  return <article className="group relative rounded-[1.6rem] border border-border/70 bg-card p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
    <Link href={`/product/${product.handle}`} className="relative block overflow-hidden rounded-[1.2rem] bg-[#f4ecd8]">
      {discountBadge && <div className="absolute left-2.5 top-2.5 z-10 rounded-md bg-[#1d5c36] px-2 py-0.5 text-[11px] font-bold text-white shadow-md">{discountBadge}</div>}
      {image ? <img src={image} alt={product.title} className={`aspect-square w-full object-cover transition duration-500 group-hover:scale-105 ${!productInAvailabilityWindow ? "opacity-60 grayscale-[.25]" : ""}`} /> : <div className="grid aspect-square w-full place-items-center text-primary"><Leaf className="h-12 w-12" /></div>}
      {!productInAvailabilityWindow && <div className="absolute inset-x-2 bottom-2 rounded-lg bg-white/95 px-2 py-1.5 text-center text-[10px] font-bold leading-4 text-rose-800 shadow-sm backdrop-blur-sm">Not available right now<br /><span className="font-medium">{categoryHoursLabel(availabilityCategory, availabilitySettings)}</span></div>}
      <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-foreground shadow-sm backdrop-blur-sm">
        <span>4.3</span>
        <span className="text-emerald-600">★</span>
      </div>
    </Link>
    <div className="px-1 pb-1 pt-3">
      <div className="mb-1 inline-block rounded-md bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        {unitLabelStr}
      </div>
      <Link href={`/product/${product.handle}`} className="block truncate text-[15px] font-semibold tracking-tight text-foreground hover:text-primary">
        {product.title}
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-1.5">
          {listPriceFormatted && <span className="text-xs font-medium text-muted-foreground line-through">{listPriceFormatted}</span>}
          <span className="text-base font-bold text-foreground sm:text-lg">{price}</span>
        </div>
        {productCanBeAdded ? <span className="relative inline-flex"><button type="button" aria-label={`Add ${product.title} to bag`} disabled={!canQueueProductCardPlus(productCanBeAdded)} onClick={handlePlus} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#9b2d55]/30 bg-white text-[#9b2d55] shadow-sm transition hover:bg-[#9b2d55]/10 focus:outline-none focus:ring-2 focus:ring-[#9b2d55]/30 disabled:cursor-not-allowed disabled:opacity-60"><Plus className="h-5 w-5 stroke-[2.5]" /></button>{existingLine && <span aria-label={`${existingLine.quantity} in bag`} className="pointer-events-none absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#1d5c36] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">{existingLine.quantity}</span>}</span> : <Button size="sm" disabled className="h-9 rounded-full px-3 text-xs">Unavailable</Button>}
      </div>
    </div>
  </article>;
}

function CartPanel() {
  const { cart, isOpen, closeCart, itemCount, loading, updateQuantity, removeItem, proceedToCheckout } = useCart();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const resident = trpc.community.resident.me.useQuery(undefined, { enabled: isAuthenticated });
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("online_checkout");
  const [checkoutStep, setCheckoutStep] = useState<"pay_now" | "choose_method">("pay_now");
  const [upiPopupOpen, setUpiPopupOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{ paymentMethod: CheckoutPaymentMethod; orderNumber?: string; placedAt?: number } | null>(null);
  const supportsOnlineCheckout = Boolean(cart?.checkoutUrl);
  useEffect(() => {
    if (!supportsOnlineCheckout && paymentMethod === "online_checkout") setPaymentMethod("cash_on_delivery");
  }, [paymentMethod, supportsOnlineCheckout]);
  useEffect(() => {
    if (!itemCount) {
      setCheckoutStep("pay_now");
      setUpiPopupOpen(false);
    }
  }, [itemCount]);
  if (completedOrder) return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#071c10]/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="order-completed-title"><section className="w-full max-w-sm rounded-[2rem] bg-card p-7 text-center shadow-2xl"><span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50"><Check className="h-10 w-10 stroke-[3]" aria-hidden="true" /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">HariCart confirmation</p><h2 id="order-completed-title" className="mt-2 font-editorial text-3xl font-semibold text-emerald-950">Your order has been placed</h2>{completedOrder.orderNumber && <p className="mt-3 text-sm font-semibold text-foreground">Order {completedOrder.orderNumber}</p>}<p className="mt-3 text-sm leading-6 text-muted-foreground">{getOrderCompletionNote(completedOrder.paymentMethod)}</p><DeliveryCountdown placedAt={completedOrder.placedAt ?? Date.now()} /><div className="mt-6 grid gap-2 sm:grid-cols-2"><Button type="button" className="h-11 w-full rounded-full" onClick={() => { setCompletedOrder(null); setLocation("/orders"); }}><PackageCheck className="mr-2 h-4 w-4" />View Order Details</Button><Button type="button" variant="outline" className="h-11 w-full rounded-full" onClick={() => { setCompletedOrder(null); closeCart(); }}>Continue shopping</Button></div></section></div>;
  if (!isOpen) return null;
  const verified = resident.data?.verificationStatus === "verified";
  const submitCheckout = async () => {
    setSubmitting(true);
    try {
      const result = await proceedToCheckout(paymentMethod);
      if (result) {
        // The 10-minute delivery countdown starts now, when the order is placed.
        setCompletedOrder({ ...result, placedAt: Date.now() });
        if (result.orderNumber) toast.success(`Order ${result.orderNumber} placed. Payment is pending.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to place this order right now.");
    } finally {
      setSubmitting(false);
    }
  };
  return <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"><aside className="ml-auto flex h-full w-full max-w-md flex-col bg-card p-6 paper-shadow"><div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Your basket</p><h2 className="font-editorial text-2xl font-semibold">Ready when you are</h2></div><Button variant="ghost" size="icon" onClick={closeCart}><X className="h-5 w-5" /></Button></div><div className="flex-1 space-y-4 overflow-y-auto">{!cart?.items.length ? <Empty text="Your basket is waiting for something fresh." /> : cart.items.map(item => <div key={item.lineId} className="flex gap-3 rounded-2xl bg-muted/55 p-3"><div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-[#ede6d2]">{item.image ? <img className="h-full w-full object-cover" src={item.image.url} alt="" /> : <Leaf className="h-5 w-5 text-primary" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.productTitle}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatMoney(item.lineTotal, "INR")}</p><div className="mt-2 flex items-center gap-2"><button disabled={loading} onClick={() => item.quantity <= 1 ? removeItem(item.lineId) : updateQuantity(item.lineId, item.quantity - 1)} className="grid h-6 w-6 place-items-center rounded-full border bg-card"><Minus className="h-3 w-3" /></button><span className="w-4 text-center text-xs font-semibold">{item.quantity}</span><button disabled={loading} onClick={() => updateQuantity(item.lineId, item.quantity + 1)} className="grid h-6 w-6 place-items-center rounded-full border bg-card"><Plus className="h-3 w-3" /></button></div></div></div>)}</div><div className="mt-4 border-t pt-5"><div className="mb-4 flex justify-between font-editorial text-lg"><span>Subtotal</span><span>{cart?.subtotal ? formatMoney(cart.subtotal, "INR") : "₹0"}</span></div>{!isAuthenticated ? <GateMessage text="Sign in, verify your apartment unit, then complete checkout securely." /> : !verified ? <GateMessage text="Checkout is reserved for verified GreenGate residents. Submit your apartment unit to unlock delivery." /> : <><p className="mb-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">Your verified apartment address will be used at checkout.</p><p className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900"><span aria-hidden="true">⚡</span> Delivered in about 10 minutes after you place the order</p>{checkoutStep === "pay_now" ? <Button disabled={!itemCount || !verified || loading} onClick={() => setCheckoutStep("choose_method")} className="h-12 w-full rounded-full">Pay Now <span className="ml-1 opacity-90">{cart?.total ? formatMoney(cart.total, "INR") : "₹0"}</span><ArrowRight className="ml-2 h-4 w-4" /></Button> : <><div className="mb-4 space-y-2"><p className="text-xs font-bold uppercase tracking-[.12em] text-primary">Choose payment method</p>{!supportsOnlineCheckout && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Online Payment is unavailable for these local-catalog items until a hosted payment gateway is connected. Choose UPI or Cash on Delivery.</p>}{([{ value: "upi_qr", label: "UPI payment", detail: "Place the order, then pay with HariCart UPI QR" }, { value: "online_checkout", label: "Online payment", detail: "Secure checkout · UPI, cards, and enabled store methods" }, { value: "cash_on_delivery", label: "Cash on delivery", detail: "Pay the delivery partner at your door" }, { value: "pay_after_delivery", label: "Pay after delivery", detail: "Order is delivered first; pay by UPI or cash" }] as const).filter(option => supportsOnlineCheckout || option.value !== "online_checkout").map(option => <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${paymentMethod === option.value ? "border-primary bg-primary/5" : "border-border bg-card"}`}><input type="radio" name="payment-method" value={option.value} checked={paymentMethod === option.value} onChange={() => { setPaymentMethod(option.value); if (shouldOpenUpiPaymentDialog(option.value)) setUpiPopupOpen(true); }} className="mt-1 accent-[#214d35]" /><span><span className="block text-sm font-semibold">{option.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{option.detail}</span></span></label>)}</div><div className="flex gap-2"><Button variant="outline" onClick={() => setCheckoutStep("pay_now")} className="h-12 flex-1 rounded-full">Back</Button><Button disabled={!itemCount || !verified || loading || submitting} onClick={submitCheckout} className="h-12 flex-[1.6] rounded-full">{submitting ? "Placing order…" : paymentMethod === "online_checkout" ? "Continue to secure payment" : paymentMethod === "upi_qr" ? "Place & pay by UPI" : "Place order"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div></>}</>}</div><UpiQrPayment amount={Number(cart?.total.amount ?? 0)} open={upiPopupOpen} onOpenChange={setUpiPopupOpen} showTrigger={false} /></aside></div>;
}

function OwnerAvailabilityPanel({ onClose }: { onClose: () => void }) {
  const settingsQuery = trpc.admin.brand.settings.useQuery();
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<CategoryAvailabilitySettings>(DEFAULT_CATEGORY_AVAILABILITY);
  const saveSettings = trpc.admin.brand.saveSetting.useMutation({
    onSuccess: () => { toast.success("Availability timings saved."); void utils.commerce.availability.invalidate(); },
    onError: error => toast.error(error.message),
  });
  useEffect(() => {
    const stored = settingsQuery.data?.find(setting => setting.settingKey === AVAILABILITY_SETTING_KEY);
    if (stored) setDraft(parseCategoryAvailability(stored.settingValue));
  }, [settingsQuery.data]);
  const updateCategory = (key: keyof CategoryAvailabilitySettings, patch: Partial<CategoryAvailabilitySettings[keyof CategoryAvailabilitySettings]>) => {
    setDraft(current => ({ ...current, [key]: { ...current[key], ...patch } }));
  };
  return <div className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Market Timing"><section className="relative mx-auto max-h-[calc(100vh-1.5rem)] max-w-6xl overflow-y-auto rounded-3xl bg-emerald-50 shadow-2xl sm:max-h-[calc(100vh-3rem)]"><button type="button" onClick={onClose} aria-label="Close Market Timing" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-emerald-950 shadow-sm hover:bg-white"><X className="h-4 w-4" /></button><div className="container py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-primary">Owner controls · below your Bag</p><h2 className="mt-1 font-editorial text-xl font-semibold">Availability &amp; Timing</h2><p className="mt-1 text-xs text-muted-foreground">Set when each category can be ordered. Customers will still see products while a category is closed.</p></div><Button type="button" size="sm" disabled={saveSettings.isPending} onClick={() => saveSettings.mutate({ key: AVAILABILITY_SETTING_KEY, value: JSON.stringify(draft) })} className="rounded-full">{saveSettings.isPending ? "Saving…" : "Save timings"}</Button></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{AVAILABILITY_CATEGORIES.map(({ key, label, icon }) => { const rule = draft[key]; return <div key={key} className="rounded-2xl border border-emerald-900/10 bg-white/85 p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{icon} {label}</p><label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><input type="checkbox" checked={rule.enabled} onChange={event => updateCategory(key, { enabled: event.target.checked })} className="accent-[#214d35]" /> On</label></div><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[11px] font-semibold text-muted-foreground">From<input type="time" value={rule.start} onChange={event => updateCategory(key, { start: event.target.value })} className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm text-foreground" /></label><label className="text-[11px] font-semibold text-muted-foreground">Until<input type="time" value={rule.end} onChange={event => updateCategory(key, { end: event.target.value })} className="mt-1 h-9 w-full rounded-lg border bg-background px-2 text-sm text-foreground" /></label></div><label className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><input type="checkbox" checked={rule.openMarket} onChange={event => updateCategory(key, { openMarket: event.target.checked })} className="accent-[#214d35]" /> Show “Open market coming soon”</label></div>; })}</div></div></section></div>;
}

function GateMessage({ text }: { text: string }) { return <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">{text}</p>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{text}</div>; }

function WelcomeCelebration({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [onClose]);
  return <div className="fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-[#071c10]/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <div className="pointer-events-none absolute inset-0 text-emerald-200/80">
      <Flower2 className="absolute left-[10%] top-[16%] h-10 w-10 animate-bounce" style={{ animationDelay: "120ms" }} />
      <Flower2 className="absolute right-[12%] top-[22%] h-8 w-8 animate-pulse" style={{ animationDelay: "300ms" }} />
      <Flower2 className="absolute bottom-[18%] left-[14%] h-8 w-8 animate-pulse" style={{ animationDelay: "480ms" }} />
      <Flower2 className="absolute bottom-[15%] right-[10%] h-11 w-11 animate-bounce" style={{ animationDelay: "650ms" }} />
    </div>
    <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-emerald-100/25 bg-[radial-gradient(circle_at_50%_0%,rgba(111,226,117,.55),transparent_42%),linear-gradient(145deg,#123b24,#23703a_58%,#55c45c)] p-8 text-center text-white shadow-2xl shadow-emerald-950/40 sm:p-12">
      <button type="button" onClick={onClose} aria-label="Close welcome message" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-black/15 text-white/80 transition hover:bg-black/25 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"><X className="h-4 w-4" /></button>
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/30 bg-white/15 shadow-lg shadow-black/10"><Flower2 className="h-11 w-11 animate-pulse text-emerald-100" /></div>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.22em] text-emerald-100">Registration complete</p>
      <h2 id="welcome-title" className="mt-3 text-4xl font-black leading-[.98] tracking-tight sm:text-6xl">Welcome to<br /><span className="text-emerald-100">HariCart</span></h2>
      <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-emerald-50/90">आपका GreenGate resident account तैयार है। अब ताज़ी सब्ज़ियाँ आपके verified apartment तक।</p>
      <Button type="button" onClick={onClose} className="mt-7 h-11 rounded-full bg-white px-6 font-bold text-[#18552d] hover:bg-emerald-50">Shop fresh today <ArrowRight className="ml-2 h-4 w-4" /></Button>
      <div className="mt-5 flex items-center justify-center gap-2 text-emerald-100/80"><Flower2 className="h-4 w-4" /><span className="text-xs">Fresh • Local • HariCart</span><Flower2 className="h-4 w-4" /></div>
    </div>
  </div>;
}


function TuitionContact({ embedded = false, circle = false, open: controlledOpen, onOpenChange }: { embedded?: boolean; circle?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setInternalOpen(next); onOpenChange?.(next); };
  const [serviceQuery, setServiceQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const tuitionOptions = ["All boards", "Experienced teachers", "All subjects · Classes 1–10"];
  const filteredTuitionOptions = tuitionOptions.filter(option => option.toLowerCase().includes(serviceQuery.trim().toLowerCase()));
  return <div className={embedded && circle ? "relative flex flex-col items-center" : embedded ? "relative" : "fixed right-4 top-1/2 z-30 -translate-y-1/2 sm:right-6"}>
    {open && <><button type="button" aria-label="Close Home Tuition panel" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35" /><div className="fixed left-1/2 top-28 z-50 max-h-[calc(100vh-9rem)] w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:max-h-[calc(100vh-7rem)] sm:translate-x-0 border border-primary/15 bg-card p-4 shadow-2xl shadow-[#214d35]/15">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><GraduationCap className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Home Tuition</p><p className="text-xs text-muted-foreground">Classes 1 to 10 available</p></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Personal home tuition for Classes 1–10 with experienced teachers across all boards and subjects.</p>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-primary/10 bg-white px-3 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-primary" /><input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder="Search tuition option..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" aria-label="Search Home Tuition options" /></label><fieldset className="mt-3 space-y-2" aria-label="Home Tuition options">{filteredTuitionOptions.map(option => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-primary/5"><input type="checkbox" checked={selected.includes(option)} onChange={() => setSelected(current => current.includes(option) ? current.filter(item => item !== option) : [...current, option])} className="h-4 w-4 accent-primary" />{option}</label>)}</fieldset>{filteredTuitionOptions.length === 0 && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-primary">No tuition option matches this search.</p>}{selected.length > 0 && <p className="mt-2 text-[11px] text-primary">Selected: {selected.join(", ")}</p>}{selected.length > 0 && <ResidentServiceDetailsForm kind="tuition" selectedServices={selected} />}
      <a href="tel:+9170367884" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"><Phone className="h-4 w-4" />9170367884</a><button type="button" onClick={() => setOpen(false)} className="mt-2 h-9 w-full rounded-full border border-primary/15 bg-white text-xs font-semibold text-primary transition hover:bg-emerald-50">Close</button>
    </div></>}
    <button type="button" title="Home Tuition" aria-label="Open Home Tuition contact" aria-expanded={open} onClick={() => setOpen(!open)} className={circle ? "grid h-9 w-9 place-items-center rounded-full border-2 border-emerald-200 bg-emerald-50 text-primary shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" : "flex h-11 w-36 items-center gap-2 rounded-xl border border-primary/15 bg-emerald-50 px-3 text-left text-xs font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"}><span className={circle ? "grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground" : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"}><GraduationCap className="h-3.5 w-3.5" /></span>{!circle && <><span className="truncate">Home Tuition</span><span className="ml-auto text-primary">›</span></>}</button>{circle && <span className="whitespace-nowrap text-[9px] font-semibold text-foreground">Home Tuition</span>}
  </div>;
}

function FitnessContact({ embedded = false, circle = false, open: controlledOpen, onOpenChange }: { embedded?: boolean; circle?: boolean; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => { if (controlledOpen === undefined) setInternalOpen(next); onOpenChange?.(next); };
  const [selected, setSelected] = useState<string[]>([]);
  const [serviceQuery, setServiceQuery] = useState("");
  const filteredOptions = FITNESS_OPTIONS.filter(option => option.toLowerCase().includes(serviceQuery.trim().toLowerCase()));

  const toggleOption = (option: string) => {
    setSelected(current => current.includes(option) ? current.filter(item => item !== option) : [...current, option]);
  };

  return <div className={embedded && circle ? "relative flex flex-col items-center" : embedded ? "relative" : "fixed right-4 top-[calc(50%+5rem)] z-30 -translate-y-1/2 sm:right-6"}>
    {open && <><button type="button" aria-label="Close Fitness Provider panel" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-slate-950/35" /><div className="fixed left-1/2 top-28 z-50 max-h-[calc(100vh-9rem)] w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:max-h-[calc(100vh-7rem)] sm:translate-x-0 border border-primary/15 bg-card p-4 shadow-2xl shadow-[#214d35]/15">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Dumbbell className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Fitness Provider</p><p className="text-xs text-muted-foreground">Personal fitness support available</p></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">Select your basic fitness needs, then contact the provider for availability.</p>
      <label className="mt-3 flex items-center gap-2 rounded-xl border border-primary/10 bg-white px-3 py-2"><Search className="h-3.5 w-3.5 shrink-0 text-primary" /><input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder="Search fitness option..." className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" aria-label="Search Fitness Provider options" /></label><fieldset className="mt-3 space-y-2" aria-label="Basic fitness needs">
        {filteredOptions.map(option => <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition hover:bg-primary/5"><input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} className="h-4 w-4 accent-primary" />{option}</label>)}
      </fieldset>{filteredOptions.length === 0 && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-primary">No fitness option matches this search.</p>}
      {selected.length > 0 && <p className="mt-2 text-[11px] text-primary">Selected: {selected.join(", ")}</p>}
      {selected.length > 0 && <ResidentServiceDetailsForm kind="fitness" selectedServices={selected} />}
      <a href="tel:+9170367884" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"><Phone className="h-4 w-4" />9170367884</a><button type="button" onClick={() => setOpen(false)} className="mt-2 h-9 w-full rounded-full border border-primary/15 bg-white text-xs font-semibold text-primary transition hover:bg-emerald-50">Close</button>
    </div></>}
    <button type="button" title="Fitness Provider" aria-label="Open Fitness Provider contact" aria-expanded={open} onClick={() => setOpen(!open)} className={circle ? "grid h-9 w-9 place-items-center rounded-full border-2 border-emerald-200 bg-emerald-50 text-primary shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" : "flex h-11 w-36 items-center gap-2 rounded-xl border border-primary/15 bg-emerald-50 px-3 text-left text-xs font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"}><span className={circle ? "grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground" : "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"}><Dumbbell className="h-3.5 w-3.5" /></span>{!circle && <><span className="truncate">Fitness Provider</span><span className="ml-auto text-primary">›</span></>}</button>{circle && <span className="whitespace-nowrap text-[9px] font-semibold text-foreground">Fitness Provider</span>}
  </div>;
}

function ResidentLaunchGate({ authLoading, authenticated, verificationProps }: { authLoading: boolean; authenticated: boolean; verificationProps: Parameters<typeof ResidentVerification>[0] }) {
  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-[#eef4e5] px-5"><div className="text-center"><BrandMark /><p className="mt-5 text-sm text-muted-foreground">Opening HariCart securely…</p></div></div>;
  }
  return <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(74,163,76,.18),transparent_34%),linear-gradient(180deg,#eef4e5_0%,#fbfaf5_56%,#f1eadb_100%)] px-4 py-5 sm:px-6 sm:py-8"><header className="mx-auto flex w-full max-w-3xl items-center justify-between rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl sm:px-6"><BrandMark /><span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f3dc] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#246b14]"><LockKeyhole className="h-3 w-3" />Resident access</span></header><main className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-8 sm:py-12"><section className="rounded-[2rem] bg-[#122319] p-6 text-white shadow-2xl shadow-[#214d35]/20 sm:p-10"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-xl font-black text-emerald-950">H</span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">GreenGate Residences</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Welcome to HariCart</h1><p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75 sm:text-base">Complete your resident details before entering the private grocery storefront.</p></div></div><div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">{RESIDENT_ONBOARDING_STEPS.map((step, index) => <div key={step} className={`rounded-xl border px-2 py-3 text-center ${authenticated && index === 0 ? "border-emerald-300/60 bg-emerald-300/15 text-emerald-100" : "border-white/10 bg-white/5 text-white/65"}`}><span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-200/70">0{index + 1}</span><span className="mt-1 block text-xs font-semibold sm:text-sm">{step}</span></div>)}</div></section><section className="rounded-[2rem] border border-border/70 bg-card p-3 shadow-xl sm:p-5"><ResidentVerification {...verificationProps} /></section><p className="text-center text-xs leading-5 text-muted-foreground">Your profile details are used only for GreenGate apartment delivery. HariCart will open after all steps are saved.</p></main></div>;
}

function OwnerLaunchGate({ onUnlock }: { onUnlock: () => void }) {
  const [modalOpen, setModalOpen] = useState(true);
  return <div className="grid min-h-screen place-items-center bg-[#122319] px-5 text-white"><div className="w-full max-w-md text-center"><div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-300 text-emerald-950 font-black text-2xl">H</div><h1 className="font-editorial text-3xl font-semibold">HariCart Owner Security</h1><p className="mt-2 text-sm text-emerald-200/75">Please enter your private Owner ID to unlock the app on this device.</p><Button onClick={() => setModalOpen(true)} className="mt-6 h-12 w-full rounded-full bg-emerald-300 font-bold text-emerald-950 hover:bg-emerald-200">Open Owner Security Check</Button></div><OwnerAuthModal open={modalOpen} onOpenChange={setModalOpen} onSuccess={onUnlock} /></div>;
}

export default function Home() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const { itemCount, openCart, isOpen: cartOpen } = useCart();
  const [phone, setPhone] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [flatNumber, setFlatNumber] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [activeService, setActiveService] = useState<"electrician" | "plumber" | "tuition" | "fitness" | "car" | "bike" | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpResendSeconds, setOtpResendSeconds] = useState(0);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [discountBannerOpen, setDiscountBannerOpen] = useState(false);
  const { data: products = [], isLoading } = trpc.commerce.products.list.useQuery({ first: 12 });
  const { data: availabilityData } = trpc.commerce.availability.useQuery();
  const { data: dailyDiscountBanner } = trpc.commerce.dailyDiscountBanner.useQuery();
  const availabilitySettings = availabilityData?.settings || DEFAULT_CATEGORY_AVAILABILITY;
  const resident = trpc.community.resident.me.useQuery(undefined, { enabled: isAuthenticated });
  useEffect(() => {
    const profile = resident.data;
    if (!profile) return;
    if (profile.blockNumber && !blockNumber) setBlockNumber(profile.blockNumber);
    if (profile.flatNumber && !flatNumber) setFlatNumber(profile.flatNumber);
  }, [resident.data, blockNumber, flatNumber]);
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);
  useEffect(() => {
    if (otpResendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setOtpResendSeconds(seconds => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpResendSeconds]);
  const verification = trpc.community.resident.completeRegistration.useMutation({ onSuccess: () => { resident.refetch(); setShowWelcome(true); toast.success("Details Saved Successfully ✅"); } });
  const { request: requestOtp, confirm: confirmOtp, simulated: otpSimulated } = usePhoneOtp({
    onSent: simulated => { setOtpRequested(true); setOtpResendSeconds(OTP_RESEND_COOLDOWN_SECONDS); toast.success(simulated ? "Simulation OTP ready: enter 1234." : "OTP sent to your mobile number."); },
    onVerified: () => { setOtpVerified(true); toast.success("OTP Verified Successfully! Now enter Block and Flat Number."); },
  });
  const { data: orders = [] } = trpc.community.orders.mine.useQuery(undefined, { enabled: isAuthenticated });
  const categories = useMemo(() => {
    const defaultCats = ["All", "Clothes", "Grocery", "Fresh Vegetable", "Fresh Fruit", "Electronics"];
    const productCats = products.map(product => {
      const tag = product.tags[0];
      if (!tag) return "Fresh Vegetable";
      const lower = tag.toLowerCase();
      if (lower.includes("fruit") || lower.includes("phal")) return "Fresh Fruit";
      if (lower.includes("veg") || lower.includes("sabzi")) return "Fresh Vegetable";
      if (lower.includes("electronic") || lower.includes("gadget") || lower.includes("audio") || lower.includes("headphone") || lower.includes("earbud") || lower.includes("charger") || lower.includes("mobile")) return "Electronics";
      if (lower === "fresh") return "";
      return tag;
    }).filter((t): t is string => Boolean(t) && t !== "");
    return Array.from(new Set([...defaultCats, ...productCats]));
  }, [products]);

  const shownProducts = products.filter(product => matchesCatalogSearch({ query, title: product.title, description: product.description, tags: product.tags }) && matchesCatalogCategory({ category, title: product.title, description: product.description, tags: product.tags }));
  const residentState = resident.data?.verificationStatus;
  const isVerifiedResident = isAuthenticated && residentState === "verified";
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [ownerSessionUnlocked, setOwnerSessionUnlocked] = useState(false);
  const hasStoredOwnerPassword = Boolean(localStorage.getItem("haricart_owner_configured") === "true");
  const [pendingOwnerAction, setPendingOwnerAction] = useState<"directory" | "workspace" | null>(null);
  const canOpenOwnerPortal = isAuthenticated && shouldRequireOwnerVerification(user?.role);
  const verificationProps: Parameters<typeof ResidentVerification>[0] = {
    authenticated: isAuthenticated,
    residentState,
    phoneVerified: Boolean(resident.data?.phoneVerifiedAt) || otpVerified,
    phone,
    blockNumber,
    flatNumber,
    otpRequested,
    otpCode,
    otpResendSeconds,
    setPhone: value => { setPhone(value); if (otpRequested) setOtpRequested(false); setOtpCode(""); setOtpResendSeconds(0); },
    setBlockNumber,
    setFlatNumber,
    setOtpCode,
    requestPending: requestOtp.isPending,
    confirmPending: confirmOtp.isPending,
    verificationPending: verification.isPending,
    success: verification.isSuccess,
    errorMessage: requestOtp.error?.message || confirmOtp.error?.message || verification.error?.message,
    onRequestOtp: () => requestOtp.mutate(phone),
    onConfirmOtp: () => confirmOtp.mutate({ phone, code: otpCode }),
    otpSimulated,
    onCompleteRegistration: () => verification.mutate({ phone, blockNumber, flatNumber }),
  };
  if (shouldShowResidentLaunchGate({ authLoading, isAuthenticated, isVerifiedResident, isPrivileged: canOpenOwnerPortal })) {
    return <ResidentLaunchGate authLoading={authLoading} authenticated={isAuthenticated} verificationProps={verificationProps} />;
  }

  if (shouldShowOwnerLaunchGate({ authLoading, isAuthenticated, role: user?.role, hasStoredOwnerPassword, isUnlockedInSession: ownerSessionUnlocked })) {
    return <OwnerLaunchGate onUnlock={() => { setOwnerSessionUnlocked(true); localStorage.setItem("haricart_owner_configured", "true"); }} />;
  }
  const isCustomerScreen = shouldShowCustomerProfile(user?.role, isAuthenticated, isVerifiedResident);
  const showResidentServiceRow = shouldShowResidentServiceRow({ isCustomerSurface: !isAuthenticated || canViewCustomerProfile(user?.role), cartOpen, availabilityOpen, discountBannerOpen, welcomeOpen: showWelcome });
    const ownerHref = user?.role === "admin" ? "/admin" : "/shop";
    return <div id="top" className="min-h-screen overflow-x-hidden pb-20 md:pb-0"><CartPanel />{showWelcome && <WelcomeCelebration onClose={dismissWelcome} />}<OwnerAuthModal open={ownerModalOpen} onOpenChange={setOwnerModalOpen} onSuccess={() => { if (pendingOwnerAction === "directory") setLocation("/customers"); else if (pendingOwnerAction === "workspace") setLocation(ownerHref); setPendingOwnerAction(null); }} /><header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl"><div className="container flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-20 sm:py-0"><div className="flex min-w-0 items-center gap-2.5">{canOpenOwnerPortal ? <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="Open HariCart owner menu"><BrandMark compact /></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-64"><DropdownMenuLabel className="flex items-center justify-between font-mono text-xs"><span>OWNER ID: SHAILESH</span><span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-primary">SECURE</span></DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => { setPendingOwnerAction("directory"); setOwnerModalOpen(true); }} className="cursor-pointer font-medium"><Users className="mr-2 h-4 w-4 text-primary" />Customer directory</DropdownMenuItem><DropdownMenuItem onSelect={() => { setPendingOwnerAction("workspace"); setOwnerModalOpen(true); }} className="cursor-pointer font-medium"><LockKeyhole className="mr-2 h-4 w-4 text-primary" />Owner workspace</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/"><HomeIcon className="mr-2 h-4 w-4 text-primary" />Storefront</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu> : <BrandMark compact />}<div className="min-w-0"><div className="flex items-center gap-1.5"><span className="font-editorial text-lg font-semibold tracking-tight text-[#246b14] sm:text-xl">HariCart</span></div><button type="button" className="flex max-w-44 items-center gap-1 text-[10px] text-muted-foreground sm:max-w-none sm:text-xs"><MapPin className="h-3 w-3 shrink-0 text-primary" /><span className="truncate">GreenGate Residences</span><ChevronDown className="h-3 w-3 shrink-0" /></button><span className="hidden items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-primary sm:inline-flex" aria-label={DELIVERY_AVAILABILITY_NOTE} title={DELIVERY_AVAILABILITY_NOTE}><Clock3 className="h-3 w-3" />10 min delivery</span></div></div><nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"><a href="#shop" className="hover:text-foreground">Shop</a><a href="#tracking" className="hover:text-foreground">Orders</a><a href="#community" className="hover:text-foreground">Community</a></nav><div className="flex shrink-0 items-center gap-1.5 sm:gap-2"><ShareMenu />{isCustomerScreen && <CustomerProfileMenu profile={buildOwnCustomerProfile(resident.data)} />}<NotificationBell />{canOpenOwnerPortal ? <Button variant="outline" className="h-9 rounded-full border-primary/25 px-3 text-xs font-bold sm:h-10 sm:px-4" onClick={() => { setPendingOwnerAction("workspace"); setOwnerModalOpen(true); }}><LockKeyhole className="mr-1.5 h-3.5 w-3.5" />Owner</Button> : isCustomerScreen ? null : isAuthenticated ? <Link href="/shop"><Button variant="ghost" className="hidden sm:inline-flex">{user?.name || "My account"}</Button></Link> : <Button variant="ghost" className="hidden sm:inline-flex" onClick={startLogin}>Sign in</Button>}<Button onClick={openCart} className="h-9 rounded-full px-3 text-xs sm:h-10 sm:px-4 sm:text-sm" aria-label={`Open bag${itemCount ? ` with ${itemCount} items` : ""}`}><ShoppingBag className="mr-1.5 h-4 w-4" />Bag {itemCount ? `(${itemCount})` : ""}</Button></div></div><label className="hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-2 shadow-sm md:flex md:max-w-sm" aria-label="Search products from top bar"><Search className="h-4 w-4 shrink-0 text-primary" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search products..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></label></header>{showResidentServiceRow && <div className="relative z-30 mx-auto mt-3 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-2 shadow-sm"><span className="hidden text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground sm:inline">Services</span><div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"><ElectricianContact embedded circle open={activeService === "electrician"} onOpenChange={isOpen => setActiveService(isOpen ? "electrician" : null)} /><PlumberContact embedded circle open={activeService === "plumber"} onOpenChange={isOpen => setActiveService(isOpen ? "plumber" : null)} /><TuitionContact embedded circle open={activeService === "tuition"} onOpenChange={isOpen => setActiveService(isOpen ? "tuition" : null)} /><FitnessContact embedded circle open={activeService === "fitness"} onOpenChange={isOpen => setActiveService(isOpen ? "fitness" : null)} /><CarServiceContact embedded circle open={activeService === "car"} onOpenChange={isOpen => setActiveService(isOpen ? "car" : null)} /><BikeServiceContact embedded circle open={activeService === "bike"} onOpenChange={isOpen => setActiveService(isOpen ? "bike" : null)} /></div></div>}{canOpenOwnerPortal && ownerSessionUnlocked && <div className="mx-auto mt-3 flex w-[calc(100%-2rem)] max-w-6xl flex-col gap-2 sm:flex-row"><button type="button" onClick={() => setAvailabilityOpen(true)} className="flex h-11 flex-1 items-center justify-between rounded-xl border border-emerald-900/15 bg-emerald-50 px-4 text-left shadow-sm transition hover:bg-emerald-100"><span className="flex items-center gap-2 text-sm font-bold text-emerald-950"><Clock3 className="h-4 w-4" />Market Timing</span><span className="text-xs font-semibold text-emerald-800">Open controls ›</span></button><button type="button" onClick={() => setDiscountBannerOpen(true)} className="flex h-11 flex-1 items-center justify-between rounded-xl border border-amber-900/15 bg-amber-50 px-4 text-left shadow-sm transition hover:bg-amber-100"><span className="flex items-center gap-2 text-sm font-bold text-amber-950"><span aria-hidden="true">🏷️</span>Daily Discount</span><span className="text-xs font-semibold text-amber-800">Edit banner ›</span></button></div>}{availabilityOpen && <OwnerAvailabilityPanel onClose={() => setAvailabilityOpen(false)} />}{discountBannerOpen && <OwnerDailyDiscountPanel onClose={() => setDiscountBannerOpen(false)} />}<main><Hero query={query} onQueryChange={setQuery} categories={categories} category={category} onCategoryChange={setCategory} dailyDiscountBanner={getDailyDiscountBanner(dailyDiscountBanner?.banners, category)} onShop={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })} onCart={() => openCart()} /><ResidentVerification {...verificationProps} />{!isVerifiedResident && <div className="container py-6"><div className="rounded-3xl border-2 border-emerald-500/30 bg-[#122319] p-6 text-white shadow-2xl sm:p-8"><div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-emerald-400 text-emerald-950 font-bold text-xl">H</span><div><h3 className="text-xl font-bold">HariCart पर आपका स्वागत है • Welcome!</h3><p className="text-sm text-emerald-200/80">सुविधाजनक और ताज़ी डिलीवरी के लिए कृपया ऊपर अपना मोबाइल नंबर दर्ज करें, OTP सत्यापित करें और अपार्टमेंट यूनिट दर्ज करके रजिस्ट्रेशन पूरा करें।</p></div></div><div className="mt-5 rounded-2xl bg-white/10 p-4 backdrop-blur"><p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">🔒 Resident-Only Access</p><p className="mt-1 text-sm text-white/90">जैसे ही आपका मोबाइल और OTP वेरीफाई हो जाएगा, **"Registration Confirmed ✅"** मैसेज दिखेगा और तुरंत सभी ताज़े उत्पाद (All Products) आपके लिए खुल जाएंगे।</p></div></div></div>}<section id="shop" className={`container py-12 ${!isVerifiedResident ? "opacity-35 pointer-events-none select-none" : ""}`}><div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-primary">Local favourites</p><h2 className="mt-2 font-editorial text-4xl font-semibold tracking-tight">Fresh picks for today</h2></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-full border bg-card px-3 py-2 text-sm shadow-sm"><Search className="h-4 w-4 text-primary" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search sabzi or fruit..." className="w-32 bg-transparent outline-none sm:w-44" /></label></div></div><div className="mb-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{categories.map(item => <button type="button" key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition shadow-sm ${category === item ? "border-primary bg-primary text-primary-foreground shadow-md" : "border-border/80 bg-card text-foreground hover:bg-muted"}`}>{item === "All" ? "🌿 All Products" : item === "Fresh Vegetable" ? "🥦 Fresh Vegetables" : item === "Fresh Fruit" ? "🍎 Fresh Fruits" : item === "Electronics" ? "🎧 Electronics" : item}</button>)}</div>{isLoading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="aspect-[.78] animate-pulse rounded-[1.5rem] bg-muted" />)}</div> : shownProducts.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{shownProducts.map(product => <ProductCard product={product} isAuthenticated={isAuthenticated} isVerifiedResident={isVerifiedResident} availabilitySettings={availabilitySettings} key={product.id} />)}</div> : <Empty text="No fresh picks match this search. Try another product name or category." />}</section><Tracking orders={orders} authenticated={isAuthenticated} /></main><footer className="border-t bg-card"><div className="container flex flex-col gap-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><BrandMark compact /><p>HariCart delivery is available only inside GreenGate Residences for verified residents.</p></div></footer><MobileBottomNav openCart={openCart} itemCount={itemCount} onFresh={() => { setCategory("Fresh Vegetable"); document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" }); }} /></div>;
}

function LegacyHero({ onShop, onCart }: { onShop: () => void; onCart: () => void }) { return <section className="relative border-b border-border/70 bg-[#dfe9cf]"><div className="soft-grid absolute inset-0 opacity-45" /><div className="container relative grid items-center gap-10 py-14 lg:grid-cols-[1.1fr_.9fr] lg:py-20"><div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/65 px-3 py-1.5 text-xs font-semibold text-primary"><BadgeCheck className="h-4 w-4" />Residents of GreenGate only</div><h1 className="max-w-2xl font-editorial text-5xl font-semibold leading-[1.06] tracking-tight sm:text-6xl">HariCart</h1><p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">Your private neighbourhood market for fresh vegetables, everyday groceries, and home essentials—delivered straight to your verified apartment door.</p><div className="mt-8 flex flex-wrap gap-3"><Button size="lg" className="h-12 rounded-full px-6" onClick={onShop}>Shop today <ArrowRight className="ml-2 h-4 w-4" /></Button><Button size="lg" variant="outline" className="h-12 rounded-full px-6" onClick={onCart}>View your bag</Button></div><div className="mt-10 flex flex-wrap gap-6 text-sm"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-primary" />Same-community delivery</span><span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary" />Verified residents only</span></div></div><div className="relative mx-auto w-full max-w-md"><div className="absolute -inset-5 rounded-[2rem] bg-[#f4eddb]" /><div className="relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-card p-4 paper-shadow"><div className="rounded-2xl bg-[#325c47] p-5 text-primary-foreground"><div className="flex items-center justify-between"><span className="text-sm font-medium">Good morning, neighbour</span><Sparkles className="h-5 w-5 text-[#e7c06a]" /></div><div className="mt-10 flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.16em] text-primary-foreground/65">Delivered today</p><p className="mt-1 font-editorial text-3xl">Farm to foyer</p></div><div className="grid h-12 w-12 place-items-center rounded-full bg-[#e7c06a] text-[#325c47]"><Leaf className="h-5 w-5" /></div></div></div><div className="grid grid-cols-3 gap-3 pt-4 text-center">{[["10+", "Daily slots"], ["1", "Community"], ["0", "Outside users"]].map(([value, label]) => <div key={label} className="rounded-xl bg-muted p-3"><p className="font-editorial text-xl">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p></div>)}</div></div></div></div></section>; }

function Hero({ query, onQueryChange, categories, category, onCategoryChange, dailyDiscountBanner, onShop, onCart }: { query: string; onQueryChange: (value: string) => void; categories: string[]; category: string; onCategoryChange: (value: string) => void; dailyDiscountBanner: string; onShop: () => void; onCart: () => void }) { return <section className="relative overflow-hidden bg-[#122319] text-white"><div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(78,185,70,.5),transparent_34%),radial-gradient(circle_at_20%_100%,rgba(26,122,49,.8),transparent_45%)]" /><div className="container relative py-5 sm:py-12 lg:py-16"><div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-white/8 px-3 py-2 text-sm backdrop-blur sm:mb-7 sm:px-4 sm:py-3"><div className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400 text-emerald-950"><CircleCheck className="h-4 w-4" /></span><p className="truncate font-semibold text-emerald-100">Delivery available only inside <span className="text-white/60">•</span> <span className="text-white/75">GreenGate society</span></p></div><span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-xs font-semibold text-emerald-100"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.15)]" />Live</span></div><div className="grid items-end gap-6 lg:grid-cols-[1fr_.8fr]"><div><div className="mb-3 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-bold text-emerald-200"><Clock3 className="h-3.5 w-3.5" />{DELIVERY_PROMISE_LABEL}</span><span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-3 py-1.5 text-xs font-black text-amber-950 shadow-sm"><span aria-hidden="true">🏷️</span>{dailyDiscountBanner}</span></div><h1 className="max-w-2xl text-4xl font-black leading-[1.04] tracking-tight sm:text-6xl">{MARKET_PROMO.headline},<br /><span className="text-emerald-300">{MARKET_PROMO.accent}</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-emerald-50/75 sm:text-lg sm:leading-8">{MARKET_PROMO.description}</p><label className="mt-5 flex max-w-xl items-center gap-3 rounded-2xl border border-white/10 bg-black/45 px-4 py-3.5 shadow-2xl shadow-black/20 focus-within:border-emerald-300/70"><Search className="h-5 w-5 shrink-0 text-emerald-300" /><input value={query} onChange={event => onQueryChange(event.target.value)} placeholder="Search sabzi — पालक, टमाटर..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50 sm:text-base" /></label><div className="mt-4 -mx-1 overflow-x-auto pb-1 [scrollbar-width:none]"><div className="flex w-max gap-2 px-1">{categories.map(item => <button type="button" key={item} onClick={() => onCategoryChange(item)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${category === item ? "border-emerald-300 bg-emerald-300 text-emerald-950" : "border-white/15 bg-white/8 text-emerald-100 hover:bg-white/15"}`}>{item === "All" ? "सब • All" : item === "Clothes" ? "👚 Clothes" : item === "Grocery" ? "🛍️ Grocery" : item === "Fresh Vegetable" ? "🥦 Fresh Vegetables" : item === "Fresh Fruit" ? "🍓 Fresh Fruits" : item}</button>)}</div></div><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-emerald-400/15 px-3 py-2 text-emerald-100">Society delivery only</span><span className="rounded-full bg-emerald-400/15 px-3 py-2 text-emerald-100">100% Fresh</span><span className="rounded-full bg-emerald-400/15 px-3 py-2 text-emerald-100">10+ Sabzi</span></div><div className="mt-6 flex flex-wrap gap-3"><Button onClick={onShop} className="h-11 rounded-full bg-emerald-300 px-5 font-bold text-emerald-950 hover:bg-emerald-200">Shop fresh today <ArrowRight className="ml-2 h-4 w-4" /></Button><Button onClick={onCart} variant="outline" className="h-11 rounded-full border-white/25 bg-white/5 px-5 text-white hover:bg-white/10">View bag</Button></div></div><div className="hidden justify-self-end lg:block"><div className="relative h-72 w-72 overflow-hidden rounded-[3rem] border border-emerald-200/15 bg-emerald-500/10 p-7 shadow-2xl shadow-black/20"><Leaf className="absolute -right-8 -top-5 h-48 w-48 rotate-12 text-emerald-200/10" /><div className="relative flex h-full flex-col justify-between"><div className="flex items-center justify-between"><span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-emerald-200">Farm fresh</span><Leaf className="h-5 w-5 text-emerald-300" /></div><div><p className="text-xs uppercase tracking-[.18em] text-emerald-200/70">HariCart promise</p><p className="mt-2 text-3xl font-black leading-tight">Freshness<br /><span className="text-emerald-300">at your door.</span></p></div></div></div></div></div></div></section>; }

function MobileBottomNav({ openCart, itemCount, onFresh }: { openCart: () => void; itemCount: number; onFresh: () => void }) { return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_30px_rgba(18,35,25,.08)] backdrop-blur-xl md:hidden"><div className="grid grid-cols-4 gap-1"><a href="#top" className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold text-primary"><HomeIcon className="h-5 w-5" />Home</a><a href="#shop" className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold text-muted-foreground"><LayoutGrid className="h-5 w-5" />Categories</a><button type="button" onClick={() => document.getElementById("tracking")?.scrollIntoView({ behavior: "smooth" })} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold text-muted-foreground"><ShoppingBag className="h-5 w-5" />Buy Again</button><button type="button" onClick={onFresh} className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold text-muted-foreground"><Leaf className="h-5 w-5" />Fresh</button></div></nav>; }

function ResidentVerification({ authenticated, residentState, phoneVerified, phone, blockNumber, flatNumber, otpRequested, otpCode, otpResendSeconds, setPhone, setBlockNumber, setFlatNumber, setOtpCode, requestPending, confirmPending, verificationPending, success, errorMessage, onRequestOtp, onConfirmOtp, onCompleteRegistration, otpSimulated }: { authenticated: boolean; residentState?: string; phoneVerified: boolean; phone: string; blockNumber: string; flatNumber: string; otpRequested: boolean; otpCode: string; otpResendSeconds: number; setPhone: (value: string) => void; setBlockNumber: (value: string) => void; setFlatNumber: (value: string) => void; setOtpCode: (value: string) => void; requestPending: boolean; confirmPending: boolean; verificationPending: boolean; success: boolean; errorMessage?: string; onRequestOtp: () => void; onConfirmOtp: () => void; onCompleteRegistration: () => void; otpSimulated?: boolean }) {
  const [detailStep, setDetailStep] = useState<"block" | "flat">("block");
  const resendEnabled = canResendOtp({ phone, otpRequested, phoneVerified, secondsRemaining: otpResendSeconds, requestPending });
  useEffect(() => {
    if (!phoneVerified) setDetailStep("block");
  }, [phoneVerified]);
  const isComplete = residentState === "verified" || success;
  return <section id="community" className="container py-7"><div className="flex flex-col gap-4 rounded-[1.35rem] border border-border/80 bg-card px-5 py-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-primary"><Building2 className="h-5 w-5" /></span><div><p className="text-sm font-semibold">Private delivery for GreenGate Residences</p><p className="text-xs leading-5 text-muted-foreground">Verify your mobile number, then enter your Block and Flat Number to unlock delivery.</p></div></div>{isComplete ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><BadgeCheck className="h-4 w-4" />Verified resident</span> : authenticated ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700"><BadgeCheck className="h-4 w-4" />Complete your apartment details</span> : <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><LockKeyhole className="h-4 w-4" />Resident access</span>}</div>{!isComplete && <form onSubmit={event => { event.preventDefault(); if (!otpRequested) onRequestOtp(); else if (!phoneVerified) onConfirmOtp(); else if (detailStep === "block") setDetailStep("flat"); else onCompleteRegistration(); }} className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"><input required value={phone} onChange={event => setPhone(event.target.value)} placeholder="Mobile number" type="tel" autoComplete="tel" className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />{otpRequested && !phoneVerified && <div className="grid gap-2 sm:col-span-2 lg:col-span-2"><div className="flex gap-2"><input required value={otpCode} onChange={event => setOtpCode(event.target.value)} placeholder="Enter OTP" inputMode="numeric" maxLength={10} autoComplete="one-time-code" className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" /><Button type="button" variant="outline" onClick={onRequestOtp} disabled={!resendEnabled} className="h-10 shrink-0 rounded-xl px-3 text-xs font-semibold" aria-label={resendEnabled ? "Resend OTP" : `Resend OTP in ${otpResendSeconds} seconds`}>{resendEnabled ? "Resend OTP" : `Resend in ${formatOtpCountdown(otpResendSeconds)}`}</Button></div></div>}{phoneVerified && detailStep === "block" && <input required value={blockNumber} onChange={event => setBlockNumber(event.target.value)} placeholder="Block Number (e.g. B)" autoComplete="address-line1" className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />}{phoneVerified && detailStep === "flat" && <input required value={flatNumber} onChange={event => setFlatNumber(event.target.value)} placeholder="Flat Number (e.g. 1204)" autoComplete="address-line2" className="h-10 rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />}<Button type="submit" disabled={requestPending || confirmPending || verificationPending || (otpRequested && !phoneVerified && !otpCode.trim()) || (phoneVerified && detailStep === "block" && !blockNumber.trim()) || (phoneVerified && detailStep === "flat" && !flatNumber.trim())} className="h-10 rounded-xl">{requestPending ? "Sending OTP…" : confirmPending ? "Checking OTP…" : verificationPending ? "Saving details…" : !otpRequested ? "Send OTP" : !phoneVerified ? "Verify OTP" : detailStep === "block" ? "Continue" : "Save Details"}</Button>{otpRequested && !phoneVerified && <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">{otpSimulated ? "Simulation Mode active: enter test OTP 1234 to verify and unlock Block and Flat Number entry." : "Enter the 6-digit OTP we sent by SMS."}</p>}{phoneVerified && <p className="text-xs text-primary sm:col-span-2 lg:col-span-4">OTP verified. {detailStep === "block" ? "Enter your Block Number." : "Enter your Flat Number, then save details to open HariCart."}</p>}{success && <p className="text-xs text-primary sm:col-span-2 lg:col-span-4">Details Saved Successfully ✅. Welcome to HariCart!</p>}{errorMessage && <p className="text-xs text-rose-700 sm:col-span-2 lg:col-span-4">{errorMessage}</p>}</form>}</div></section>;
}
function Tracking({ orders, authenticated }: { orders: Array<{ id: number; orderNumber: string; apartmentUnit: string; total: string; status: string }>; authenticated: boolean }) { const steps = [[PackageCheck, "Placed", "Your request is received"], [Check, "Confirmed", "Our shop begins preparing"], [Truck, "Out for Delivery", "Your rider is on the way"], [MapPin, "Delivered", "At your verified unit"]] as const; return <section id="tracking" className="bg-[#f0eadb]"><div className="container grid gap-8 py-14 lg:grid-cols-[.85fr_1.15fr]"><div><p className="text-xs font-bold uppercase tracking-[.17em] text-primary">Stay in the loop</p><h2 className="mt-2 font-editorial text-4xl font-semibold leading-tight">Every hand-off, made clear.</h2><p className="mt-4 max-w-md leading-7 text-muted-foreground">Order tracking follows one simple, dependable sequence from our shop to your apartment.</p><div className="mt-7 space-y-3">{steps.map(([Icon, title, copy], index) => <div key={title} className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-card text-primary"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-semibold"><span className="mr-2 text-xs text-primary">0{index + 1}</span>{title}</p><p className="text-xs text-muted-foreground">{copy}</p></div></div>)}</div></div><div className="rounded-[1.5rem] bg-card p-6 paper-shadow"><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Your recent activity</p><h3 className="mt-1 font-editorial text-2xl font-semibold">Order tracking</h3>{authenticated && orders.length ? <div className="mt-6 space-y-3">{orders.slice(0, 3).map(order => <div key={order.id} className="flex items-center justify-between rounded-xl bg-muted/65 p-4"><div><p className="text-sm font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-muted-foreground">Unit {order.apartmentUnit} · ${Number(order.total).toFixed(2)}</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{order.status.replaceAll("_", " ")}</span></div>)}</div> : <div className="mt-6"><Empty text="Your next order will appear here. You will receive an in-app update whenever the order status progresses." /></div>}</div></div></section>; }