export interface BrandedQrConfig {
  text: string;
  size: number;
  margin: number;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
  darkColor: string;
  lightColor: string;
  footerText: string;
  centerLogoPath: string;
}

export function getBrandedHariCartQrConfig(text: string, size = 300): BrandedQrConfig {
  return {
    text,
    size,
    margin: 2,
    errorCorrectionLevel: "H",
    darkColor: "#185c35",
    lightColor: "#ffffff",
    footerText: "HariCart Fresh Vegetable",
    centerLogoPath: "/favicon.ico",
  };
}
