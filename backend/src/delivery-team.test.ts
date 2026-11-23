import { describe, expect, it } from "vitest";
import { canAccountSignIn, canReassignDelivery, canSeeCustomerPhone, isAllowedDeliveryTransition, maskPhone, nextDeliveryStatus } from "@shared/delivery-flow";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { checkLoginAllowed } from "./routers/community";
import { checkRoleChange } from "./routers/admin";
import { checkDeliveryStep } from "./routers/delivery";

type Role = "customer" | "admin" | "shop_owner" | "delivery_boy";
type Status = "active" | "pending" | "suspended" | "deactivated";

function ctxFor(role: Role, accountStatus: Status = "active"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 7, openId: "phone_test", name: "Test", email: null, loginMethod: "phone", role, accountStatus, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined, cookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("delivery steps", () => {
  it("go one step at a time: Assigned → Accepted → Picked Up → Out for Delivery → Delivered", () => {
    expect(isAllowedDeliveryTransition("assigned", "accepted")).toBe(true);
    expect(isAllowedDeliveryTransition("accepted", "picked_up")).toBe(true);
    expect(isAllowedDeliveryTransition("picked_up", "out_for_delivery")).toBe(true);
    expect(isAllowedDeliveryTransition("out_for_delivery", "delivered")).toBe(true);
    expect(nextDeliveryStatus("delivered")).toBeNull();
  });

  it("cannot skip steps, go back, or start without an assignment", () => {
    expect(isAllowedDeliveryTransition("assigned", "delivered")).toBe(false);
    expect(isAllowedDeliveryTransition("accepted", "out_for_delivery")).toBe(false);
    expect(isAllowedDeliveryTransition("delivered", "accepted")).toBe(false);
    expect(isAllowedDeliveryTransition(null, "accepted")).toBe(false);
  });

  it("checks the order itself before each step", () => {
    const base = { status: "confirmed", deliveryStatus: "accepted" as const, paymentMethod: "upi_qr", paymentStatus: "paid" };
    expect(checkDeliveryStep(base, "picked_up", false).ok).toBe(true);
    expect(checkDeliveryStep({ ...base, status: "placed" }, "picked_up", false).ok).toBe(false);
    expect(checkDeliveryStep({ ...base, status: "cancelled" }, "picked_up", false).ok).toBe(false);
    expect(checkDeliveryStep({ ...base, deliveryStatus: "picked_up", status: "confirmed" }, "out_for_delivery", false).ok).toBe(false);
    expect(checkDeliveryStep({ ...base, deliveryStatus: "picked_up", status: "packed" }, "out_for_delivery", false).ok).toBe(true);
  });

  it("Cash on Delivery cannot be marked delivered until the cash is collected", () => {
    const cod = { status: "out_for_delivery", deliveryStatus: "out_for_delivery" as const, paymentMethod: "cash_on_delivery", paymentStatus: "pending" };
    expect(checkDeliveryStep(cod, "delivered", false).ok).toBe(false);
    expect(checkDeliveryStep(cod, "delivered", true).ok).toBe(true);
  });

  it("an order can move to another delivery boy only before it is out for delivery", () => {
    expect(canReassignDelivery("assigned", "confirmed")).toBe(true);
    expect(canReassignDelivery("picked_up", "packed")).toBe(true);
    expect(canReassignDelivery("out_for_delivery", "out_for_delivery")).toBe(false);
    expect(canReassignDelivery("delivered", "delivered")).toBe(false);
    expect(canReassignDelivery(null, "cancelled")).toBe(false);
  });

  it("hides the customer's phone after the order is finished", () => {
    expect(canSeeCustomerPhone("out_for_delivery")).toBe(true);
    expect(canSeeCustomerPhone("delivered")).toBe(false);
    expect(canSeeCustomerPhone("cancelled")).toBe(false);
    expect(maskPhone("+919876543210")).toBe("+91 ••••••3210");
  });
});

describe("login rules (server side)", () => {
  it("only active accounts can sign in", () => {
    expect(canAccountSignIn("active")).toBe(true);
    expect(canAccountSignIn("pending")).toBe(false);
    expect(canAccountSignIn("suspended")).toBe(false);
    expect(canAccountSignIn("deactivated")).toBe(false);
  });

  it("the delivery login works only for numbers the owner added, and only when active", () => {
    expect(checkLoginAllowed({ role: "delivery_boy", accountStatus: "active" }, "delivery").allowed).toBe(true);
    expect(checkLoginAllowed({ role: "delivery_boy", accountStatus: "pending" }, "delivery").allowed).toBe(false);
    expect(checkLoginAllowed({ role: "delivery_boy", accountStatus: "suspended" }, "resident").allowed).toBe(false);
    expect(checkLoginAllowed({ role: "delivery_boy", accountStatus: "deactivated" }, "delivery").allowed).toBe(false);
    expect(checkLoginAllowed({ role: "customer", accountStatus: "active" }, "delivery").allowed).toBe(false);
    expect(checkLoginAllowed(undefined, "delivery").allowed).toBe(false);
    expect(checkLoginAllowed(undefined, "resident").allowed).toBe(true);
  });

  it("delivery boys cannot be made from the general role list", () => {
    expect(checkRoleChange({ id: 2, role: "customer" }, "delivery_boy", 1).ok).toBe(false);
    expect(checkRoleChange({ id: 2, role: "delivery_boy" }, "admin", 1).ok).toBe(false);
    expect(checkRoleChange({ id: 1, role: "admin" }, "customer", 1).ok).toBe(false);
    expect(checkRoleChange({ id: 2, role: "customer" }, "shop_owner", 1).ok).toBe(true);
  });
});

describe("role checks on the API", () => {
  it("customers, shop owners and the owner cannot use the delivery dashboard API", async () => {
    for (const role of ["customer", "shop_owner", "admin"] as const) {
      await expect(appRouter.createCaller(ctxFor(role)).delivery.orders()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(appRouter.createCaller(ctxFor(role)).delivery.updateStatus({ orderId: 1, status: "accepted" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("a suspended delivery boy is refused even if a request reaches the router", async () => {
    await expect(appRouter.createCaller(ctxFor("delivery_boy", "suspended")).delivery.orders()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("not logged in = no access", async () => {
    const ctx = { ...ctxFor("customer"), user: null };
    await expect(appRouter.createCaller(ctx).delivery.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("customers and delivery boys cannot add, activate or assign delivery boys", async () => {
    for (const role of ["customer", "delivery_boy", "shop_owner"] as const) {
      const caller = appRouter.createCaller(ctxFor(role));
      await expect(caller.admin.delivery.add({ fullName: "Fake", phone: "9000000099" })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.delivery.setStatus({ userId: 7, status: "active" })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.delivery.assign({ orderId: 1, deliveryUserId: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller.admin.users.updateRole({ userId: 7, role: "admin" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("delivery boys cannot use the old order-status path", async () => {
    await expect(appRouter.createCaller(ctxFor("delivery_boy")).community.orders.advance({ orderId: 1, status: "delivered" })).rejects.toBeTruthy();
  });
});

describe("account deletion request", () => {
  it("needs a logged-in account", async () => {
    const ctx = { ...ctxFor("customer"), user: null };
    await expect(appRouter.createCaller(ctx).community.resident.requestAccountDeletion({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});