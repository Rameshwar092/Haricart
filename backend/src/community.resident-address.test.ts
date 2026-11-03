import { beforeEach, describe, expect, it, vi } from "vitest";
import { communityInvites, residentProfiles, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";

const { getDbMock, getResidentProfileByUserIdMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  getResidentProfileByUserIdMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: getDbMock,
  getResidentProfileByUserId: getResidentProfileByUserIdMock,
  getVerifiedResidentProfile: vi.fn(),
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeUser(id: number, role: AuthenticatedUser["role"] = "admin"): AuthenticatedUser {
  const now = new Date("2026-08-21T00:00:00Z");
  return {
    id,
    openId: `resident-address-${id}`,
    name: role === "admin" ? "Shailesh Kumar" : `Resident ${id}`,
    email: `${role}-${id}@example.com`,
    loginMethod: "otp",
    role,
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  };
}

describe("resident address persistence and isolation", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    getResidentProfileByUserIdMock.mockReset();
  });

  it("normalizes and saves Block, Flat, and composed apartmentUnit during onboarding", async () => {
    const existingProfile = {
      userId: 1,
      phone: "+919170367884",
      phoneVerifiedAt: new Date("2026-08-20T00:00:00Z"),
      verificationStatus: "pending",
    };
    let savedProfile: Record<string, unknown> | undefined;
    const builderFor = (table: unknown) => {
      const rows = table === communityInvites ? [] : table === residentProfiles ? [existingProfile] : [];
      const builder = {
        where: () => builder,
        limit: async () => rows,
      };
      return builder;
    };
    const fakeDb = {
      select: () => ({ from: (table: unknown) => builderFor(table) }),
      update: () => ({ set: () => ({ where: async () => undefined }) }),
      insert: (table: unknown) => ({
        values: (values: Record<string, unknown>) => ({
          onDuplicateKeyUpdate: async ({ set }: { set: Record<string, unknown> }) => {
            if (table === residentProfiles) savedProfile = { ...values, ...set };
          },
        }),
      }),
    };
    getDbMock.mockResolvedValue(fakeDb);

    const caller = appRouter.createCaller(makeCtx(makeUser(1)));
    const result = await caller.community.resident.requestVerification({
      phone: "+919170367884",
      password: "resident-secret",
      fullName: "  Asha Resident ",
      blockNumber: " b ",
      flatNumber: " 204 ",
    });

    expect(result).toMatchObject({
      fullName: "Asha Resident",
      blockNumber: "B",
      flatNumber: "204",
      apartmentUnit: "B-204",
    });
    expect(savedProfile).toMatchObject({
      userId: 1,
      phone: "+919170367884",
      fullName: "Asha Resident",
      blockNumber: "B",
      flatNumber: "204",
      apartmentUnit: "B-204",
      verificationStatus: "verified",
    });
    expect(savedProfile?.passwordHash).not.toBe("resident-secret");
  });

  it("reads only the authenticated resident profile and strips the password hash", async () => {
    const profiles = new Map<number, Record<string, unknown>>([
      [7, {
        userId: 7,
        fullName: "Asha Resident",
        phone: "+919170367884",
        blockNumber: "A",
        flatNumber: "204",
        apartmentUnit: "A-204",
        passwordHash: "private-a",
      }],
      [8, {
        userId: 8,
        fullName: "Bharat Resident",
        phone: "+919170367885",
        blockNumber: "C",
        flatNumber: "305",
        apartmentUnit: "C-305",
        passwordHash: "private-b",
      }],
    ]);
    getResidentProfileByUserIdMock.mockImplementation(async (userId: number) => profiles.get(userId) ?? null);

    const firstResident = await appRouter.createCaller(makeCtx(makeUser(7, "customer"))).community.resident.me();
    const secondResident = await appRouter.createCaller(makeCtx(makeUser(8, "customer"))).community.resident.me();

    expect(getResidentProfileByUserIdMock).toHaveBeenNthCalledWith(1, 7);
    expect(getResidentProfileByUserIdMock).toHaveBeenNthCalledWith(2, 8);
    expect(firstResident).toMatchObject({ fullName: "Asha Resident", blockNumber: "A", flatNumber: "204", apartmentUnit: "A-204" });
    expect(firstResident).not.toHaveProperty("passwordHash");
    expect(firstResident).not.toMatchObject({ fullName: "Bharat Resident", blockNumber: "C", flatNumber: "305" });
    expect(secondResident).toMatchObject({ fullName: "Bharat Resident", blockNumber: "C", flatNumber: "305", apartmentUnit: "C-305" });
    expect(secondResident).not.toHaveProperty("passwordHash");
  });

  it("requires OTP verification before a non-admin can save resident details", async () => {
    const inviteBuilder = {
      where: () => inviteBuilder,
      limit: async () => [],
    };
    const profileBuilder = {
      where: () => profileBuilder,
      limit: async () => [{ phone: "+919170367884", phoneVerifiedAt: null, verificationStatus: "pending" }],
    };
    getDbMock.mockResolvedValue({
      select: () => ({ from: (table: unknown) => table === communityInvites ? inviteBuilder : profileBuilder }),
    });

    const caller = appRouter.createCaller(makeCtx(makeUser(7, "customer")));
    await expect(caller.community.resident.requestVerification({
      phone: "+919170367884",
      password: "resident-secret",
      fullName: "Asha Resident",
      blockNumber: "A",
      flatNumber: "204",
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
