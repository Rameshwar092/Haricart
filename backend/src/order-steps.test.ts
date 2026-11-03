import { describe, expect, it } from "vitest";
import { NEXT_ACTION_LABEL, ORDER_STATUSES, canCustomerCancel, canMarkItemsOutOfStock, canRoleAdvanceOrder, canStaffCancel, isAllowedOrderTransition, nextOrderStatus, recalculateOrderTotals } from "@shared/order-flow";

describe("order steps: Placed → Confirmed → Packed → Out for delivery → Delivered", () => {
  it("moves one step at a time and never out of Cancelled or Delivered", () => {
    expect(nextOrderStatus("placed")).toBe("confirmed");
    expect(nextOrderStatus("confirmed")).toBe("packed");
    expect(nextOrderStatus("packed")).toBe("out_for_delivery");
    expect(nextOrderStatus("out_for_delivery")).toBe("delivered");
    expect(nextOrderStatus("delivered")).toBeNull();
    expect(nextOrderStatus("cancelled")).toBeNull();
    for (const to of ORDER_STATUSES) expect(isAllowedOrderTransition("cancelled", to)).toBe(false);
    expect(NEXT_ACTION_LABEL.confirmed).toBe("Mark packed");
  });

  it("gives each role only its own steps", () => {
    expect(canRoleAdvanceOrder("shop_owner", "packed")).toBe(true);
    expect(canRoleAdvanceOrder("shop_owner", "delivered")).toBe(false);
    expect(canRoleAdvanceOrder("delivery_boy", "packed")).toBe(false);
    expect(canRoleAdvanceOrder("delivery_boy", "out_for_delivery")).toBe(true);
    expect(canRoleAdvanceOrder("admin", "packed")).toBe(true);
  });

  it("lets customers cancel only before packing, and the shop until it leaves", () => {
    expect(canCustomerCancel("placed")).toBe(true);
    expect(canCustomerCancel("confirmed")).toBe(true);
    expect(canCustomerCancel("packed")).toBe(false);
    expect(canCustomerCancel("out_for_delivery")).toBe(false);
    expect(canStaffCancel("shop_owner", "packed")).toBe(true);
    expect(canStaffCancel("admin", "out_for_delivery")).toBe(false);
    expect(canStaffCancel("delivery_boy", "placed")).toBe(false);
    expect(canStaffCancel("admin", "cancelled")).toBe(false);
  });

  it("allows out-of-stock changes only while the order is being prepared", () => {
    expect(canMarkItemsOutOfStock("shop_owner", "confirmed")).toBe(true);
    expect(canMarkItemsOutOfStock("admin", "placed")).toBe(true);
    expect(canMarkItemsOutOfStock("admin", "packed")).toBe(false);
    expect(canMarkItemsOutOfStock("delivery_boy", "placed")).toBe(false);
  });

  it("recalculates the bill without the missing items, in exact paise", () => {
    const items = [
      { lineTotal: "40.10", itemStatus: "ok" as const },
      { lineTotal: "25.20", itemStatus: "out_of_stock" as const },
      { lineTotal: "10.20", itemStatus: "ok" as const },
    ];
    expect(recalculateOrderTotals(items, "10.00")).toEqual({ subtotal: "50.30", total: "60.30", hasItemsLeft: true });
    expect(recalculateOrderTotals(items.map(item => ({ ...item, itemStatus: "out_of_stock" as const })), "10.00")).toEqual({ subtotal: "0.00", total: "0.00", hasItemsLeft: false });
  });
});
