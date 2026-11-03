import { describe, expect, it } from "vitest";
import { alarmHeadline, alarmTitle, findNewOrderIds, isAlarmRole, shouldRing, workspacePathForRole } from "../src/lib/order-alarm";

describe("new-order alarm", () => {
  it("only rings for staff roles, never for customers", () => {
    expect(isAlarmRole("admin")).toBe(true);
    expect(isAlarmRole("shop_owner")).toBe(true);
    expect(isAlarmRole("delivery_boy")).toBe(true);
    expect(isAlarmRole("customer")).toBe(false);
    expect(isAlarmRole(undefined)).toBe(false);
  });

  it("does not call orders 'new' on the first check, then spots each new one", () => {
    expect(findNewOrderIds(null, [1, 2])).toEqual([]);
    expect(findNewOrderIds(new Set([1, 2]), [3, 1, 2])).toEqual([3]);
    expect(findNewOrderIds(new Set([1, 2]), [2])).toEqual([]);
  });

  it("keeps ringing until silenced, and rings again for a newer order", () => {
    expect(shouldRing({ enabled: true, waitingIds: [5], silencedIds: new Set() })).toBe(true);
    expect(shouldRing({ enabled: true, waitingIds: [5], silencedIds: new Set([5]) })).toBe(false);
    expect(shouldRing({ enabled: true, waitingIds: [6, 5], silencedIds: new Set([5]) })).toBe(true);
    expect(shouldRing({ enabled: true, waitingIds: [], silencedIds: new Set() })).toBe(false);
    expect(shouldRing({ enabled: false, waitingIds: [5], silencedIds: new Set() })).toBe(false);
  });

  it("shows the waiting count in the tab title without stacking counts", () => {
    expect(alarmTitle("HariCart", 2, "admin")).toBe("(2) new orders · HariCart");
    expect(alarmTitle("(2) new orders · HariCart", 1, "admin")).toBe("(1) new order · HariCart");
    expect(alarmTitle("HariCart", 0, "admin")).toBe("HariCart");
    expect(alarmHeadline(1, "delivery_boy")).toBe("1 order ready to deliver");
  });

  it("opens the right workspace for each role", () => {
    expect(workspacePathForRole("admin")).toBe("/admin");
    expect(workspacePathForRole("shop_owner")).toBe("/shop");
    expect(workspacePathForRole("delivery_boy")).toBe("/delivery");
  });
});
