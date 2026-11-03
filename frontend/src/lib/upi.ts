export const HARI_CART_UPI_ID = "shaileshgbx@okicici";
export const HARI_CART_PAYEE_NAME = "HariCart";

export type UpiPaymentPayload = {
  amount: number;
  orderNumber?: string;
  note?: string;
};

export function buildHariCartUpiUri({ amount, orderNumber, note }: UpiPaymentPayload) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A positive payment amount is required to generate a UPI QR code.");
  }

  const params = new URLSearchParams({
    pa: HARI_CART_UPI_ID,
    pn: HARI_CART_PAYEE_NAME,
    am: amount.toFixed(2),
    cu: "INR",
  });

  const transactionNote = note?.trim() || (orderNumber ? `HariCart order ${orderNumber}` : "HariCart order");
  params.set("tn", transactionNote.slice(0, 80));
  if (orderNumber) params.set("tr", orderNumber.slice(0, 35));
  return `upi://pay?${params.toString()}`;
}

export function getHariCartUpiDisplay() {
  return `${HARI_CART_PAYEE_NAME} · ${HARI_CART_UPI_ID}`;
}
