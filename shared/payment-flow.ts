export const shouldOpenUpiPaymentDialog = (paymentMethod: string) => paymentMethod === "upi_qr";

export const paymentMethodLabels = {
  upi_qr: "UPI payment",
  online_checkout: "Online payment",
  cash_on_delivery: "Cash on delivery",
  pay_after_delivery: "Pay after delivery",
} as const;
