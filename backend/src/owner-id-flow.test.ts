import { beforeEach, describe, expect, it, vi } from "vitest";
import { appSettings } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { hashOwnerId } from "@shared/owner-auth";

const { getDbMock } = vi.hoisted(() => ({ getDbMock: vi.fn() }));

vi.mock("./db", () => ({
  getDb: getDbMock,
  getResidentProfileByUserId: vi.fn(),
  getVerifiedResidentProfile: vi.fn(),
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: AuthenticatedUser["role"] = "admin"): TrpcContext {
  const now = new Date("2026-08-21T00:00:00Z");
  return {
    user: {
      id: 1,
      openId: "owner-id-flow-test",
      name: "Shailesh Kumar",
      email: "owner@example.com",
      loginMethod: "email",
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeSettingsDb() {
  let setting: Record<string, unknown> | null = null;
  const db = {
    select: () => ({
      from: (table: unknown) => {
        const builder = {
          where: () => builder,
          limit: async () => table === appSettings && setting ? [setting] : [],
        };
        return builder;
      },
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        if (table === appSettings) setting = { id: 1, ...values };
        return {
          onDuplicateKeyUpdate: async ({ set }: { set: Record<string, unknown> }) => {
            if (table === appSettings) setting = { ...(setting ?? {}), ...set };
          },
        };
      },
    }),
    delete: (table: unknown) => ({
      where: async () => {
        if (table === appSettings) setting = null;
      },
    }),
    readSetting: () => setting,
  };
  return db;
}

describe("HariCart Owner ID setup and recovery flow", () => {
  let fakeDb: ReturnType<typeof makeSettingsDb>;

  beforeEach(() => {
    fakeDb = makeSettingsDb();
    getDbMock.mockReset();
    getDbMock.mockResolvedValue(fakeDb);
  });

  it("creates a hashed Owner ID and accepts it on subsequent verification", async () => {
    const caller = appRouter.createCaller(makeCtx());

    expect(await caller.community.resident.ownerIdStatus()).toEqual({ hasCustomOwnerId: false });
    await caller.community.resident.setupOwnerId({ ownerId: "my-private-owner-password" });

    expect(await caller.community.resident.ownerIdStatus()).toEqual({ hasCustomOwnerId: true });
    expect(fakeDb.readSetting()).toMatchObject({ settingKey: "haricart_custom_owner_id_hash", settingValue: hashOwnerId("my-private-owner-password") });
    expect(fakeDb.readSetting()?.settingValue).not.toBe("my-private-owner-password");
    await expect(caller.community.resident.verifyOwnerId({ ownerId: "my-private-owner-password" })).resolves.toMatchObject({ success: true });
  });

  it("rejects an incorrect Owner ID and allows recovery through reset", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await caller.community.resident.setupOwnerId({ ownerId: "old-owner-password" });

    await expect(caller.community.resident.verifyOwnerId({ ownerId: "wrong-owner-password" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Invalid Owner ID. Please enter your correct private Owner ID.",
    });

    await caller.community.resident.resetOwnerId({ newOwnerId: "new-owner-password" });
    await expect(caller.community.resident.verifyOwnerId({ ownerId: "old-owner-password" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.community.resident.verifyOwnerId({ ownerId: "new-owner-password" })).resolves.toMatchObject({ success: true });
  });

  it("does not allow residents to inspect or modify Owner ID settings", async () => {
    const caller = appRouter.createCaller(makeCtx("customer"));

    await expect(caller.community.resident.ownerIdStatus()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.community.resident.setupOwnerId({ ownerId: "resident-cannot-own" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.community.resident.resetOwnerId({ newOwnerId: "resident-cannot-reset" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
