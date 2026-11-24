import { trpc } from "@/lib/trpc";
import { MAX_PRODUCT_IMAGES, MAX_PRODUCT_IMAGE_BYTES, PRODUCT_IMAGE_TYPES, makeCoverImage } from "@shared/product-images";
import { Camera, ChevronLeft, ImagePlus, Loader2, Star, X } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  /** "dark" for the Add item form, "light" for the edit form on product cards. */
  tone?: "dark" | "light";
  onUploadingChange?: (uploading: boolean) => void;
};

function readAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(new Error("Unable to read photo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Pick up to 5 product photos. You can select several at once. The first photo is the cover
 * shown on product cards; tap ★ to make another photo the cover, or ✕ to remove one.
 */
export function ProductPhotoPicker({ images, onChange, tone = "dark", onUploadingChange }: Props) {
  const upload = trpc.community.shop.inventory.uploadImage.useMutation();
  const [uploading, setUploading] = useState(0);
  const remaining = MAX_PRODUCT_IMAGES - images.length;
  const dark = tone === "dark";

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (remaining <= 0) { toast.error(`You can add up to ${MAX_PRODUCT_IMAGES} photos. Remove one first.`); return; }
    const valid = files.filter(file => (PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type) && file.size > 0 && file.size <= MAX_PRODUCT_IMAGE_BYTES);
    if (valid.length < files.length) toast.error("Some photos were skipped. Use JPG, PNG or WEBP, up to 5 MB each.");
    const chosen = valid.slice(0, remaining);
    if (valid.length > remaining) toast.error(`Only ${remaining} more photo${remaining === 1 ? "" : "s"} can be added (maximum ${MAX_PRODUCT_IMAGES}).`);
    if (!chosen.length) return;

    setUploading(chosen.length);
    onUploadingChange?.(true);
    let next = [...images];
    for (const file of chosen) {
      try {
        const uploaded = await upload.mutateAsync({ fileName: file.name, mimeType: file.type as (typeof PRODUCT_IMAGE_TYPES)[number], dataBase64: await readAsBase64(file) });
        next = [...next, uploaded.url];
        onChange(next);
      } catch (error) {
        toast.error(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
      }
      setUploading(count => Math.max(0, count - 1));
    }
    onUploadingChange?.(false);
    const added = next.length - images.length;
    if (added > 0) toast.success(`${added} photo${added === 1 ? "" : "s"} uploaded`);
  };

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index));
  const moveLeft = (index: number) => {
    if (index <= 0) return;
    const next = [...images];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const input = <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFiles} disabled={remaining <= 0 || uploading > 0} className="sr-only" aria-label="Add product photos" />;

  if (!images.length && !uploading) {
    return <label className={dark ? "group relative grid min-h-52 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-slate-700 bg-[#1b2a33] text-center transition hover:border-emerald-400 sm:min-h-64" : "grid min-h-32 cursor-pointer place-items-center rounded-xl border border-dashed bg-muted/40 text-center text-sm hover:border-primary"}>
      <span className={`grid justify-items-center gap-2 ${dark ? "text-slate-200" : "text-muted-foreground"}`}><Camera className={dark ? "h-10 w-10" : "h-7 w-7"} /><span className={dark ? "text-lg font-semibold" : "font-semibold"}>Add photos (up to {MAX_PRODUCT_IMAGES})</span><span className={`text-xs ${dark ? "text-slate-400" : ""}`}>JPG, PNG or WEBP · up to 5 MB each · select several at once</span></span>
      {input}
    </label>;
  }

  const tileBase = "relative aspect-square overflow-hidden rounded-xl";
  return <div className={dark ? "rounded-2xl border border-slate-700 bg-[#1b2a33] p-3" : "rounded-xl border bg-muted/30 p-2"}>
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {images.map((url, index) => <div key={url} className={`${tileBase} ${index === 0 ? "ring-2 ring-emerald-400" : ""}`}>
        <img src={url} alt={`Product photo ${index + 1}`} className="h-full w-full object-cover" />
        {index === 0 && <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">Cover</span>}
        <button type="button" onClick={() => remove(index)} aria-label={`Remove photo ${index + 1}`} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-slate-950/75 text-white hover:bg-rose-600"><X className="h-3.5 w-3.5" /></button>
        {index > 0 && <div className="absolute inset-x-1 bottom-1 flex justify-between">
          <button type="button" onClick={() => moveLeft(index)} aria-label={`Move photo ${index + 1} left`} className="grid h-6 w-6 place-items-center rounded-full bg-slate-950/75 text-white hover:bg-slate-700"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onChange(makeCoverImage(images, index))} aria-label={`Make photo ${index + 1} the cover`} className="grid h-6 w-6 place-items-center rounded-full bg-slate-950/75 text-amber-300 hover:bg-slate-700"><Star className="h-3.5 w-3.5" /></button>
        </div>}
      </div>)}
      {Array.from({ length: uploading }).map((_, index) => <div key={`uploading-${index}`} className={`${tileBase} grid place-items-center ${dark ? "bg-white/5 text-emerald-300" : "bg-muted text-primary"}`}><Loader2 className="h-5 w-5 animate-spin" /></div>)}
      {remaining - uploading > 0 && <label className={`${tileBase} grid cursor-pointer place-items-center border border-dashed text-center text-[11px] font-semibold ${dark ? "border-slate-500 text-slate-300 hover:border-emerald-400" : "border-muted-foreground/40 text-muted-foreground hover:border-primary"}`}>
        <span className="grid justify-items-center gap-1"><ImagePlus className="h-5 w-5" />Add</span>
        {input}
      </label>}
    </div>
    <p className={`mt-2 text-xs ${dark ? "text-slate-400" : "text-muted-foreground"}`}>{images.length}/{MAX_PRODUCT_IMAGES} photos · the first photo is the cover · ★ makes a photo the cover</p>
  </div>;
}