export type ProductCardCartLine = {
  lineId: string;
  variantId: string;
  quantity: number;
};

export type ProductCardPlusAction =
  | { kind: "add"; variantId: string; quantity: 1 }
  | { kind: "update"; lineId: string; quantity: number };

export function canStartProductCardPlus(canAddToCart: boolean, isAdding: boolean): boolean {
  return canAddToCart && !isAdding;
}

export function canQueueProductCardPlus(canAddToCart: boolean): boolean {
  return canAddToCart;
}

export function buildProductCardPlusAction(
  variantId: string,
  existingLine?: ProductCardCartLine,
): ProductCardPlusAction {
  if (existingLine) {
    return {
      kind: "update",
      lineId: existingLine.lineId,
      quantity: existingLine.quantity + 1,
    };
  }
  return { kind: "add", variantId, quantity: 1 };
}
