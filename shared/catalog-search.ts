const SEARCH_ALIASES: Record<string, string[]> = {
  tomato: ["tamatar", "टमाटर"],
  potato: ["aloo", "aaloo", "आलू"],
  onion: ["pyaz", "pyaaz", "प्याज", "प्याज़"],
  brinjal: ["baingan", "बैंगन"],
  okra: ["bhindi", "भिंडी"],
  spinach: ["palak", "पालक"],
  cauliflower: ["gobi", "गोभी"],
  cabbage: ["patta gobi", "पत्तागोभी"],
  carrot: ["gajar", "गाजर"],
  cucumber: ["kheera", "खीरा"],
  banana: ["kela", "केला"],
  apple: ["seb", "सेब"],
  mango: ["aam", "आम"],
};

export function normalizeSearchText(value: string | null | undefined): string {
  return (value || "").trim().toLocaleLowerCase("en-IN").replace(/\s+/g, " ");
}

function expandSearchNeedle(query: string): string[] {
  const needle = normalizeSearchText(query);
  if (!needle) return [];
  const terms = [needle];
  for (const [canonical, aliases] of Object.entries(SEARCH_ALIASES)) {
    if (canonical === needle || aliases.some(alias => normalizeSearchText(alias) === needle)) {
      terms.push(canonical, ...aliases);
    }
  }
  return Array.from(new Set(terms.map(normalizeSearchText)));
}

export function matchesCatalogSearch({ query, title, description, tags }: { query: string; title: string; description?: string | null; tags: string[] }): boolean {
  const terms = expandSearchNeedle(query);
  if (!terms.length) return true;
  const haystack = normalizeSearchText(`${title} ${description || ""} ${tags.join(" ")}`);
  return terms.some(term => haystack.includes(term));
}
