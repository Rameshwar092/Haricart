/**
 * HariCart order steps — one place for the rules the server, owner screens and
 * customer screens all follow.
 *
 *   Placed → Confirmed → Packed → Out for delivery → Delivered
 *                 ↘ Cancelled (any time before it leaves the shop)
 *
 * Who does what:
 *   owner (admin) ........ every step, cancel, mark items out of stock
 *   shop owner ........... Confirm, Pack, cancel, mark items out of stock
 *   delivery staff ....... Out for delivery, Delivered
 *   customer ............. cancel while the order is Placed or Confirmed
 */

// New values are added at the END so the database change is a simple, safe one.
export const ORDER_STATUSES = ["placed", "confirmed", "out_for_delivery", "delivered", "packed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_ITEM_STATUSES = ["ok", "out_of_stock"] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export type StaffRole = "admin" | "shop_owner" | "delivery_boy";

/** The steps in the order a customer sees them (Cancelled is shown separately). */
export const ORDER_PROGRESS: OrderStatus[] = ["placed", "confirmed", "packed", "out_for_delivery", "delivered"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  placed: "confirmed",
  confirmed: "packed",
  packed: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: null,
  cancelled: null,
};

/** Button text for moving an order to its next step. */
export const NEXT_ACTION_LABEL: Record<OrderStatus, string | null> = {
  placed: "Confirm order",
  confirmed: "Mark packed",
  packed: "Send out",
  out_for_delivery: "Mark delivered",
  delivered: null,
  cancelled: null,
};

export function nextOrderStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[status] ?? null;
}

/** Orders move one step at a time; no skipping and no going back. */
export function isAllowedOrderTransition(from: OrderStatus, to: OrderStatus): boolean {
  return NEXT_STATUS[from] === to;
}

const STEPS_BY_ROLE: Record<StaffRole, OrderStatus[]> = {
  admin: ["confirmed", "packed", "out_for_delivery", "delivered"],
  shop_owner: ["confirmed", "packed"],
  delivery_boy: ["out_for_delivery", "delivered"],
};

export function canRoleAdvanceOrder(role: StaffRole, to: OrderStatus): boolean {
  return STEPS_BY_ROLE[role].includes(to);
}

export function isOrderClosed(status: OrderStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

/** Customers may cancel until the shop starts packing. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return status === "placed" || status === "confirmed";
}

/** The owner and shop may cancel until the order leaves the shop. */
export function canStaffCancel(role: StaffRole, status: OrderStatus): boolean {
  if (role === "delivery_boy") return false;
  return status === "placed" || status === "confirmed" || status === "packed";
}

/** Items can be marked out of stock while the order is being prepared. */
export function canMarkItemsOutOfStock(role: StaffRole, status: OrderStatus): boolean {
  if (role === "delivery_boy") return false;
  return status === "placed" || status === "confirmed";
}

/** New totals after some items were removed. Prices stay as they were when ordered. */
export function recalculateOrderTotals(items: ReadonlyArray<{ lineTotal: string | number; itemStatus?: OrderItemStatus | null }>, deliveryFee: string | number) {
  const remaining = items.filter(item => (item.itemStatus ?? "ok") === "ok");
  const subtotalPaise = remaining.reduce((sum, item) => sum + Math.round(Number(item.lineTotal) * 100), 0);
  const hasItemsLeft = remaining.length > 0;
  const totalPaise = subtotalPaise + (hasItemsLeft ? Math.round(Number(deliveryFee) * 100) : 0);
  return {
    subtotal: (subtotalPaise / 100).toFixed(2),
    total: (totalPaise / 100).toFixed(2),
    hasItemsLeft,
  };
}