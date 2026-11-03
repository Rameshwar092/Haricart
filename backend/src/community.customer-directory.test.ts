import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({ getDb: getDbMock }));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUser(role: AuthenticatedUser["role"], id: number): AuthenticatedUser {
  const now = new Date("2026-08-20T00:00:00Z");
  return {
    id,
    openId: `customer-directory-${id}`,
    name: role === "customer" ? "Asha Resident" : "Shailesh Kumar",
    email: `${role}@example.com`,
    loginMethod: "otp",
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

function makeDirectoryDb() {
  const rows = [{
    userId: 21,
    userName: "Asha Resident",
    profileName: "Asha Resident",
    phone: "+919170367884",
    blockNumber: "A",
    flatNumber: "204",
    verificationStatus: "verified",
  }];
  const builder = {
    innerJoin: () => builder,
    where: () => builder,
    orderBy: async () => rows,
  };
  return { select: () => ({ from: () => builder }) };
}

describe("community resident customer directory", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    getDbMock.mockResolvedValue(makeDirectoryDb());
  });

  it("rejects ordinary residents before reading customer records", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("customer", 7)));

    await expect(caller.community.resident.customerDirectory()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("allows the admin owner to read only the projected customer fields", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("admin", 1)));
    const rows = await caller.community.resident.customerDirectory();

    expect(rows).toEqual([{
      userId: 21,
      phone: "+919170367884",
      blockNumber: "A",
      flatNumber: "204",
      verificationStatus: "verified",
      name: "Asha Resident",
    }]);
    expect(rows[0]).not.toHaveProperty("passwordHash");
  });

  it("also permits the shop owner role without exposing account secrets", async () => {
    const caller = appRouter.createCaller(makeCtx(makeUser("shop_owner", 8)));
    const rows = await caller.community.resident.customerDirectory();

    expect(rows[0]).toMatchObject({ name: "Asha Resident", phone: "+919170367884", blockNumber: "A", flatNumber: "204" });
    expect(rows[0]).not.toHaveProperty("passwordHash");
  });
});
