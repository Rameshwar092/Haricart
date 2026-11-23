import { beforeAll, describe, expect, it, vi } from "vitest";

const getUserByOpenId = vi.fn();
vi.mock("./db", () => ({ getUserByOpenId, upsertUser: vi.fn() }));

describe("every request checks the account status", () => {
  beforeAll(() => { process.env.JWT_SECRET = "test-secret-for-session-status-check-1234567890"; });

  async function requestWithSession() {
    const { sdk } = await import("./_core/sdk");
    const token = await sdk.createSessionToken("phone_abc", { name: "Rider" });
    return { sdk, req: { headers: { cookie: `app_session_id=${token}` } } as never };
  }

  it("an active delivery boy gets through", async () => {
    getUserByOpenId.mockResolvedValue({ id: 5, openId: "phone_abc", role: "delivery_boy", accountStatus: "active", lastSignedIn: new Date() });
    const { sdk, req } = await requestWithSession();
    await expect(sdk.authenticateRequest(req)).resolves.toMatchObject({ id: 5 });
  });

  it("a suspended or deactivated account is refused even with a valid session cookie", async () => {
    for (const accountStatus of ["suspended", "deactivated", "pending"]) {
      getUserByOpenId.mockResolvedValue({ id: 5, openId: "phone_abc", role: "delivery_boy", accountStatus, lastSignedIn: new Date() });
      const { sdk, req } = await requestWithSession();
      await expect(sdk.authenticateRequest(req)).rejects.toThrow(/not active/);
    }
  });
});