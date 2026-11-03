export type OrderCompletionPaymentMethod = "online_checkout" | "upi_qr" | "cash_on_delivery" | "pay_after_delivery";

export const getOrderCompletionNote = (paymentMethod: OrderCompletionPaymentMethod) => paymentMethod === "cash_on_delivery"
  ? "Cash on Delivery selected. Your delivery partner will collect payment at hand-off."
  : paymentMethod === "upi_qr"
    ? "UPI order created. Complete payment with the HariCart QR from your Orders page."
    : paymentMethod === "online_checkout"
      ? "Secure online checkout opened in a new window."
      : "Your order was placed. Payment can be completed after delivery.";
