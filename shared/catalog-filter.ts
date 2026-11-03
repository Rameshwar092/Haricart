export function matchesCatalogCategory({
  category,
  title,
  description,
  tags,
}: {
  category: string;
  title: string;
  description?: string | null;
  tags: string[];
}): boolean {
  if (category === "All") return true;
  const tagText = tags.join(" ").toLowerCase();
  const searchableText = `${title} ${description || ""} ${tagText}`.toLowerCase();
  if (category === "Clothes") return /cloth|fashion|apparel|wear|garment/.test(searchableText);
  if (category === "Grocery") return /grocery|daily|essential|kirana|household|snack|beverage/.test(searchableText);
  if (category === "Fresh Vegetable") {
    return /veg|sabzi/.test(searchableText) || (!/fruit|phal|cloth|fashion|grocery|daily|essential|kirana|electronic|gadget|audio|headphone|earbud|mobile|charger|cable|appliance/.test(searchableText));
  }
  if (category === "Fresh Fruit") return /fruit|phal/.test(searchableText);
  if (category === "Electronics") return /electronic|gadget|audio|headphone|earbud|mobile|charger|cable|appliance|computer|laptop|speaker|television|tv/.test(searchableText);
  return tags.some(tag => tag.toLowerCase() === category.toLowerCase()) || searchableText.includes(category.toLowerCase());
}
