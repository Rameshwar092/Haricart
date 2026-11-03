import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { formatMoney } from "@/lib/format";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Leaf, Plus, ShieldCheck } from "lucide-react";
import { Link, useRoute } from "wouter";

const fallbackImages: Record<string, string> = {};

export default function ProductDetail() {
  const [, params] = useRoute("/product/:handle");
  const { data: product, isLoading } = trpc.commerce.products.byHandle.useQuery({ handle: params?.handle || "" }, { enabled: Boolean(params?.handle) });
  const { addItem, loading } = useCart();
  if (isLoading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading fresh details…</div>;
  if (!product) return <div className="grid min-h-screen place-items-center"><Link href="/"><Button>Return to market</Button></Link></div>;
  const variant = product.variants[0];
  const isLocalCatalogItem = variant?.id.startsWith("local:") ?? false;
  const canAddToCart = Boolean(variant?.availableForSale);
  const image = fallbackImages[product.handle] || product.images[0]?.url;
  return <div className="min-h-screen bg-background"><header className="border-b bg-card"><div className="container flex h-20 items-center justify-between"><Link href="/"><BrandMark /></Link><Link href="/"><Button variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to market</Button></Link></div></header><main className="container grid gap-10 py-10 lg:grid-cols-2 lg:py-16"><div className="overflow-hidden rounded-[2rem] bg-[#eee6d4]">{image ? <img src={image} alt={product.title} className="aspect-square w-full object-cover" /> : <div className="grid aspect-square place-items-center"><Leaf className="h-16 w-16 text-primary" /></div>}</div><div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">{product.tags[0] || "Fresh essentials"}</p><h1 className="mt-3 font-editorial text-5xl font-semibold tracking-tight">{product.title}</h1><p className="mt-5 max-w-lg leading-7 text-muted-foreground">{product.description || "Locally selected for the GreenGate community and prepared with care by our neighbourhood shop."}</p><div className="mt-8 flex items-end gap-4"><span className="font-editorial text-4xl font-semibold">{formatMoney(variant?.price || product.priceRange.min, "INR")}</span><span className="mb-1 text-sm text-muted-foreground">per item</span></div><Button disabled={!canAddToCart || loading} onClick={() => variant && canAddToCart && addItem(variant.id)} className="mt-8 h-13 w-fit rounded-full px-6">{canAddToCart ? "Add to bag" : "Unavailable"} {canAddToCart && <Plus className="ml-2 h-4 w-4" />}</Button><div className="mt-10 flex gap-3 rounded-2xl border bg-card p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><p className="text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Apartment-only delivery.</strong> Checkout is enabled after your GreenGate apartment unit has been verified.</p></div></div></main></div>;
}
