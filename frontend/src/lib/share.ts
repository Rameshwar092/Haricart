export const shareAppTitle = "HariCart";
export const shareAppText = "Shop fresh groceries and essentials from HariCart, your private apartment community market.";

export function getSharePayload(url: string) {
  return {
    title: shareAppTitle,
    text: shareAppText,
    url,
  };
}

export function isNativeShareAvailable(navigatorLike: Pick<Navigator, "share"> | undefined) {
  return typeof navigatorLike?.share === "function";
}
