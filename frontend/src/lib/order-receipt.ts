import { jsPDF } from "jspdf";

export type ReceiptOrder = {
  orderNumber: string;
  apartmentUnit: string;
  total: string;
  subtotal?: string;
  deliveryFee?: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  placedAt?: string | Date;
  items?: Array<{ title: string; variantTitle?: string | null; quantity: number; unitPrice: string; lineTotal: string }>;
};

export const getReceiptFilename = (orderNumber: string) => `haricart-receipt-${orderNumber.replace(/[^a-z0-9-_]/gi, "-")}.pdf`;

const money = (value: string | number | undefined) => `INR ${Number(value || 0).toFixed(2)}`;
const paymentLabel = (method: string) => method === "upi_qr" ? "UPI payment" : method === "cash_on_delivery" ? "Cash on Delivery" : method === "pay_after_delivery" ? "Pay after delivery" : "Online checkout";

export function downloadOrderReceipt(order: ReceiptOrder) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  let y = 20;
  pdf.setTextColor(30, 92, 55);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("HariCart", left, y);
  y += 8;
  pdf.setTextColor(55, 55, 55);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Resident grocery order receipt", left, y);
  y += 12;
  pdf.setDrawColor(210, 220, 211);
  pdf.line(left, y, 192, y);
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Order ${order.orderNumber}`, left, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Placed: ${order.placedAt ? new Date(order.placedAt).toLocaleString() : "—"}`, left, y + 6);
  pdf.text(`Apartment: ${order.apartmentUnit}`, left, y + 12);
  pdf.text(`Payment: ${paymentLabel(order.paymentMethod)} · ${order.paymentStatus}`, left, y + 18);
  y += 30;
  pdf.setFont("helvetica", "bold");
  pdf.text("Items", left, y);
  y += 7;
  pdf.setFontSize(9);
  for (const item of order.items || []) {
    const title = item.variantTitle ? `${item.title} (${item.variantTitle})` : item.title;
    const lines = pdf.splitTextToSize(`${item.quantity} × ${title}`, 116) as string[];
    pdf.setFont("helvetica", "normal");
    pdf.text(lines, left, y);
    pdf.text(money(item.lineTotal), 154, y);
    y += Math.max(6, lines.length * 4);
    if (y > 270) { pdf.addPage(); y = 20; }
  }
  y += 3;
  pdf.setDrawColor(210, 220, 211);
  pdf.line(left, y, 192, y);
  y += 8;
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Subtotal", left, y);
  pdf.text(money(order.subtotal), 154, y);
  y += 6;
  pdf.text("Delivery fee", left, y);
  pdf.text(money(order.deliveryFee), 154, y);
  y += 8;
  pdf.setTextColor(30, 92, 55);
  pdf.setFont("helvetica", "bold");
  pdf.text("Total", left, y);
  pdf.text(money(order.total), 154, y);
  y += 12;
  pdf.setTextColor(75, 75, 75);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Order status: ${order.status.replaceAll("_", " ")}`, left, y);
  pdf.text("Thank you for shopping with HariCart.", left, y + 7);
  pdf.save(getReceiptFilename(order.orderNumber));
}
