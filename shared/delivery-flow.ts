/**
 * HariCart delivery team rules — one place for the server, the owner's Admin Panel
 * and the delivery boy's dashboard.
 *
 * Account status (only the owner/admin can change it):
 *   pending ...... created by the owner, waiting for the owner to activate it (cannot log in)
 *   active ....... can log in and receive orders
 *   suspended .... temporarily blocked (cannot log in, gets no new orders)
 *   deactivated .. removed from the team (cannot log in, history is kept)
 *
 * Delivery steps for an assigned order (only the assigned delivery boy can move them):
 *   Assigned → Accepted → Picked Up → Out for Delivery → Delivered
 */

// New values are added at the END so the database change stays a simple, safe one.
export const ACCOUNT_STATUSES = ["active", "pending", "suspended", "deactivated"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Active",
  pending: "Waiting for activation",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

/** Statuses the owner can set from the Admin Panel. */
export const ADMIN_SETTABLE_ACCOUNT_STATUSES = ["active", "suspended", "deactivated"] as const;
export type AdminSettableAccountStatus = (typeof ADMIN_SETTABLE_ACCOUNT_STATUSES)[number];

/** Only active accounts may log in or use the app. A missing value (very old rows) counts as active. */
export function canAccountSignIn(status: string | null | undefined): boolean {
  return (status ?? "active") === "active";
}

/** Message shown when a non-active account tries to log in or make a request. */
export function blockedAccountMessage(status: string | null | undefined): string {
  if (status === "pending") return "Your delivery account is waiting for the owner to activate it. Please contact the HariCart owner.";
  if (status === "suspended") return "Your account is suspended. Please contact the HariCart owner.";
  if (status === "deactivated") return "This account has been deactivated. Please contact the HariCart owner.";
  return "This account cannot be used right now. Please contact the HariCart owner.";
}

export const DELIVERY_STATUSES = ["assigned", "accepted", "picked_up", "out_for_delivery", "delivered"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

const NEXT_DELIVERY_STATUS: Record<DeliveryStatus, DeliveryStatus | null> = {
  assigned: "accepted",
  accepted: "picked_up",
  picked_up: "out_for_delivery",
  out_for_delivery: "delivered",
  delivered: null,
};

/** Button text on the delivery dashboard for the next step. */
export const NEXT_DELIVERY_ACTION_LABEL: Record<DeliveryStatus, string | null> = {
  assigned: "Accept order",
  accepted: "Picked up from shop",
  picked_up: "Out for delivery",
  out_for_delivery: "Mark delivered",
  delivered: null,
};

export function nextDeliveryStatus(status: DeliveryStatus | null | undefined): DeliveryStatus | null {
  if (!status) return null;
  return NEXT_DELIVERY_STATUS[status] ?? null;
}

/** One step at a time: no skipping and no going back. */
export function isAllowedDeliveryTransition(from: DeliveryStatus | null | undefined, to: DeliveryStatus): boolean {
  return Boolean(from) && NEXT_DELIVERY_STATUS[from as DeliveryStatus] === to;
}

/** The owner may move an order to another delivery boy until it has left with the first one. */
export function canReassignDelivery(deliveryStatus: DeliveryStatus | null | undefined, orderStatus: string): boolean {
  if (orderStatus === "delivered" || orderStatus === "cancelled" || orderStatus === "out_for_delivery") return false;
  return deliveryStatus !== "out_for_delivery" && deliveryStatus !== "delivered";
}

/**
 * The customer's phone number is shown to the delivery boy only while the order is with him.
 * After delivery or cancellation it is hidden again.
 */
export function canSeeCustomerPhone(orderStatus: string): boolean {
  return orderStatus !== "delivered" && orderStatus !== "cancelled";
}

/** "+919876543210" → "+91 ••••••3210" */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  const countryCode = digits.length > 10 ? digits.slice(0, digits.length - 10) : "";
  return `${countryCode ? `+${countryCode} ` : ""}••••••${digits.slice(-4)}`;
}