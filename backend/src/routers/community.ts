import { TRPCError } from "@trpc/server";
import { createHash } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { appSettings, carts, catalogProducts, communityInvites, exchangeRequests, notifications, orderItems, orders, payments, residentProfiles, shops, users, vehicleServiceRequests } from "../../drizzle/schema";
import { hashOwnerId, verifyOwnerSecretId } from "@shared/owner-auth";
import { getDb, getResidentProfileByUserId, getUserByOpenId, getVerifiedResidentProfile, upsertUser } from "../db";
import { getCustomerCart, isMarketOpen } from "./commerce";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { sendOwnerOrderSms } from "../_core/owner-order-sms";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { storagePut } from "../storage";
import { isOwnerPhone } from "../_core/env";
import { legacyPhoneVariants, normalizePhone } from "@shared/phone";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, canCustomerCancel, canMarkItemsOutOfStock, canRoleAdvanceOrder, canStaffCancel, isAllowedOrderTransition, isOrderClosed, recalculateOrderTotals, type OrderStatus } from "@shared/order-flow";
import { hashResidentPassword } from "../password";
import { isFirebaseConfigured, verifyFirebasePhoneToken } from "../_core/firebaseAuth";


const SIMULATION_OTP = "1234";

/** mysql2 returns a ResultSetHeader for UPDATE; tests/mocks may return other shapes. */
function getAffectedRows(result: unknown) {
  const header = (Array.isArray(result) ? result[0] : result) as { affectedRows?: number } | undefined;
  return typeof header?.affectedRows === "number" ? header.affectedRows : 1;
}
/** Accepts any common way of typing a number and turns it into one format: +919876543210. */
const phoneSchema = z.string().trim().min(8).max(32).regex(/^\+?[0-9 ()-]{8,32}$/, "Enter a valid mobile number.").transform(normalizePhone).refine(phone => /^\+[1-9]\d{7,14}$/.test(phone), "Enter a valid 10-digit mobile number.");

/**
 * The fixed "1234" test code is only for local development and tests. In production
 * (NODE_ENV=production) it is switched off unless OTP_SIMULATION=true is set on purpose.
 */
export function isOtpSimulationAllowed() {
  if (process.env.OTP_SIMULATION === "true") return true;
  if (process.env.OTP_SIMULATION === "false") return false;
  return process.env.NODE_ENV !== "production";
}

function isTwilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SERVICE_SID);
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) return null;
  return { serviceSid, authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}` };
}

/** Twilio and Firebase use E.164 (+91XXXXXXXXXX); so does HariCart everywhere. */
export const toE164 = normalizePhone;

const orderStatusSchema = z.enum(ORDER_STATUSES);
export { canRoleAdvanceOrder, isAllowedOrderTransition };

export const canRoleManageInventory = (role: "admin" | "shop_owner" | "delivery_boy" | "customer" | "user") =>
  role === "admin" || role === "shop_owner";

const exchangeStatusSchema = z.enum(["requested", "approved", "rejected", "completed"]);
export const isValidProductImageUrl = (value: string) => value.startsWith("/api/media/") || /^https:\/\//.test(value);
export const isSupportedProductImage = (mimeType: string, sizeInBytes: number) => ["image/jpeg", "image/png", "image/webp"].includes(mimeType) && sizeInBytes > 0 && sizeInBytes <= 5 * 1024 * 1024;
export const isPhoneVerificationComplete = (profile: { phone?: string | null; phoneVerifiedAt?: Date | null } | null | undefined, phone: string) => Boolean(profile?.phoneVerifiedAt && profile.phone && normalizePhone(profile.phone) === normalizePhone(phone));
export const getOfflinePaymentProvider = (paymentMethod: "upi_qr" | "cash_on_delivery" | "pay_after_delivery") => paymentMethod === "upi_qr" ? "upi_qr" : paymentMethod === "cash_on_delivery" ? "cash_on_delivery" : "pay_after_delivery";
export const normalizeResidentAddress = (input: { blockNumber: string; flatNumber: string }) => {
  const blockNumber = input.blockNumber.trim().toUpperCase();
  const flatNumber = input.flatNumber.trim().toUpperCase();
  return { blockNumber, flatNumber, apartmentUnit: `${blockNumber}-${flatNumber}` };
};
export const canEditOwnResidentAddress = (role: "admin" | "shop_owner" | "delivery_boy" | "customer" | "user", verificationStatus: string | null | undefined) =>
  (role === "customer" || role === "user") && verificationStatus === "verified";
export const canManageServiceRequests = (role: "admin" | "shop_owner" | "delivery_boy" | "customer" | "user") => role === "admin" || role === "shop_owner";
export const parseServiceRequestOptions = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
};
export const normalizeVehicleServiceRequest = (input: { serviceKind: "electrician" | "plumber" | "tuition" | "fitness" | "car" | "bike"; selectedServices: string[]; issueDescription: string; phone: string; blockNumber: string; flatNumber: string }) => ({
  serviceKind: input.serviceKind,
  selectedServices: Array.from(new Set(input.selectedServices.map(service => service.trim()).filter(Boolean))),
  issueDescription: input.issueDescription.trim(),
  phone: input.phone.trim(),
  blockNumber: input.blockNumber.trim().toUpperCase(),
  flatNumber: input.flatNumber.trim().toUpperCase(),
});
const productImageUrlSchema = z.string().trim().max(2000).refine(isValidProductImageUrl, "Image URL must be a storage path or HTTPS URL.");
export const isAllowedExchangeTransition = (from: z.infer<typeof exchangeStatusSchema>, to: z.infer<typeof exchangeStatusSchema>) =>
  (from === "requested" && ["approved", "rejected"].includes(to)) || (from === "approved" && to === "completed");

type AlertOrder = { id: number; orderNumber: string; apartmentUnit: string; total: string; status: OrderStatus; placedAt: Date };

const hashPhoneOpenId = (value: string) => `phone_${createHash("sha256").update(value).digest("hex").slice(0, 58)}`;

/** One account per phone number, however the number was typed. */
export function getResidentPhoneOpenId(phone: string) {
  return hashPhoneOpenId(normalizePhone(phone));
}

/** Account ids that older versions created for the same number typed differently. */
export function getLegacyResidentPhoneOpenIds(phone: string) {
  const current = getResidentPhoneOpenId(phone);
  return Array.from(new Set(legacyPhoneVariants(phone).map(variant => hashPhoneOpenId(variant.trim().replace(/\s+/g, " "))))).filter(openId => openId !== current);
}

/**
 * If this number already has an account saved under an old format, move that
 * account to the normalized id so the person keeps their profile and orders.
 * When several old accounts exist, the one with saved flat details wins, then the most recently used.
 */
async function adoptLegacyPhoneAccount(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, phone: string) {
  const openId = getResidentPhoneOpenId(phone);
  if (await getUserByOpenId(openId)) return;
  const legacyIds = getLegacyResidentPhoneOpenIds(phone);
  if (!legacyIds.length) return;
  const legacyUsers = await db.select().from(users).where(inArray(users.openId, legacyIds));
  if (!legacyUsers.length) return;
  const profiles = await db.select({ userId: residentProfiles.userId, verificationStatus: residentProfiles.verificationStatus }).from(residentProfiles).where(inArray(residentProfiles.userId, legacyUsers.map(user => user.id)));
  const verified = new Set(profiles.filter(profile => profile.verificationStatus === "verified").map(profile => profile.userId));
  const [keep] = [...legacyUsers].sort((a, b) => Number(verified.has(b.id)) - Number(verified.has(a.id)) || new Date(b.lastSignedIn).getTime() - new Date(a.lastSignedIn).getTime());
  await db.update(users).set({ openId }).where(eq(users.id, keep.id));
}

/** Invites may have been typed in any format, so look for every way of writing the number. */
async function findInviteForPhone(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, phone: string) {
  return db.select().from(communityInvites).where(inArray(communityInvites.phone, legacyPhoneVariants(phone))).limit(1);
}

async function assertResidentInviteAllowed(db: Awaited<ReturnType<typeof getDb>>, phone: string) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  // The owner's own numbers never need an invitation.
  if (isOwnerPhone(phone)) return undefined;
  const [invite] = await findInviteForPhone(db, phone);
  const inviteCount = await db.select({ count: communityInvites.id }).from(communityInvites).limit(1);
  if (inviteCount.length > 0 && (!invite || invite.status === "revoked")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This phone number has not been invited to HariCart yet. Please contact the administrator for an invitation." });
  }
  return invite;
}

async function issueResidentPhoneSession(req: Parameters<typeof getSessionCookieOptions>[0], res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void }, phone: string) {
  const db = await getDb();
  if (db) await adoptLegacyPhoneAccount(db, phone);
  const openId = getResidentPhoneOpenId(phone);
  // Numbers listed in OWNER_PHONES become the owner/admin every time they log in.
  await upsertUser({ openId, loginMethod: "phone", lastSignedIn: new Date(), ...(isOwnerPhone(phone) ? { role: "admin" as const } : {}) });
  const user = await getUserByOpenId(openId);
  if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create the resident session." });
  const sessionToken = await sdk.createSessionToken(openId, { name: user.name || "HariCart Resident", expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
  return user;
}

/** After any successful OTP check: start the customer's session (if needed) and save the verified number. */
async function recordVerifiedPhone(ctx: { user: { id: number } | null; req: Parameters<typeof getSessionCookieOptions>[0]; res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void } }, phone: string, verificationNote: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const phoneVerifiedAt = new Date();
  const userId = ctx.user?.id ?? (await assertResidentInviteAllowed(db, phone), (await issueResidentPhoneSession(ctx.req, ctx.res, phone)).id);
  if (ctx.user && isOwnerPhone(phone) && ctx.user.id === userId) await db.update(users).set({ role: "admin" }).where(eq(users.id, userId));
  const [profile] = await db.select().from(residentProfiles).where(eq(residentProfiles.userId, userId)).limit(1);
  if (profile) {
    await db.update(residentProfiles).set({ phone, phoneVerifiedAt, verificationNote }).where(eq(residentProfiles.userId, userId));
  } else {
    await db.insert(residentProfiles).values({ userId, phone, apartmentUnit: "PENDING", verificationStatus: "pending", phoneVerifiedAt, verificationNote: `${verificationNote} Apartment unit pending.` });
  }
  return { success: true, phoneVerifiedAt, sessionIssued: !ctx.user };
}

/** Owner can manage every order; a shop owner only their own shop's; delivery staff only orders given to them. */
async function assertCanManageOrder(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, user: { id: number; role: string }, order: typeof orders.$inferSelect) {
  if (user.role === "admin") return;
  if (user.role === "delivery_boy") {
    if (order.deliveryUserId !== user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This order is not assigned to you" });
    return;
  }
  if (user.role === "shop_owner") {
    const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
    if (shop?.ownerUserId !== user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This order belongs to another shop" });
    return;
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "You cannot manage this order." });
}

/** In-app message to the customer, the shop owner, the delivery person and every admin (each person once). */
async function notifyOrderParties(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, order: typeof orders.$inferSelect, title: string, body: string) {
  const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
  const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  const seen = new Set<number>();
  const recipients = [
    { userId: order.customerUserId, role: "customer" as const },
    { userId: shop?.ownerUserId, role: "shop_owner" as const },
    { userId: order.deliveryUserId, role: "delivery_boy" as const },
    ...adminUsers.map(admin => ({ userId: admin.id, role: "admin" as const })),
  ].filter((recipient): recipient is { userId: number; role: "customer" | "shop_owner" | "delivery_boy" | "admin" } => {
    if (!recipient.userId || seen.has(recipient.userId)) return false;
    seen.add(recipient.userId);
    return true;
  });
  if (recipients.length) await db.insert(notifications).values(recipients.map(recipient => ({ userId: recipient.userId, orderId: order.id, audienceRole: recipient.role, title, body, actionUrl: "/orders" })));
}

function getStatusCopy(status: z.infer<typeof orderStatusSchema>, orderNumber: string) {
  const statusLabel = ORDER_STATUS_LABEL[status];
  return { title: `Order ${statusLabel}`, body: `Order ${orderNumber} is now ${statusLabel.toLowerCase()}.` };
}

export const communityRouter = router({
  resident: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getResidentProfileByUserId(ctx.user.id);
      if (!profile) return null;
      const { passwordHash: _passwordHash, ...safeProfile } = profile;
      return safeProfile;
    }),
    otpAvailability: publicProcedure.query(() => ({ provider: isFirebaseConfigured() ? "firebase" as const : isTwilioConfigured() ? "twilio" as const : "simulation" as const, configured: isFirebaseConfigured() || isTwilioConfigured(), simulation: isOtpSimulationAllowed() })),
    requestOtp: publicProcedure.input(z.object({ phone: phoneSchema })).mutation(async ({ input }) => {
      const twilio = getTwilioConfig();
      if (!twilio) {
        if (isOtpSimulationAllowed()) return { success: true, simulated: true };
        console.error("[OTP] Twilio Verify is not configured; refusing to send OTP in production.");
        throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "OTP service is not available right now. Please try again later." });
      }
      const body = new URLSearchParams({ To: toE164(input.phone), Channel: "sms" });
      try {
        const response = await fetch(`https://verify.twilio.com/v2/Services/${twilio.serviceSid}/Verifications`, { method: "POST", headers: { Authorization: twilio.authorization, "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(10_000) });
        if (response.ok) return { success: true, simulated: false };
        console.warn(`[OTP] Twilio returned ${response.status}.`);
      } catch (err) {
        console.warn("[OTP] Twilio request failed.", err);
      }
      if (isOtpSimulationAllowed()) return { success: true, simulated: true };
      throw new TRPCError({ code: "BAD_GATEWAY", message: "We could not send the OTP right now. Please check the number and try again in a minute." });
    }),
    confirmOtp: publicProcedure.input(z.object({ phone: phoneSchema, code: z.string().trim().min(4).max(10) })).mutation(async ({ ctx, input }) => {
      const twilio = getTwilioConfig();
      const simulation = isOtpSimulationAllowed();
      const acceptSimulationCode = () => {
        if (simulation && input.code === SIMULATION_OTP) return;
        throw new TRPCError({ code: "BAD_REQUEST", message: simulation ? "That verification code is not valid. In Simulation Mode, use 1234." : "That verification code is not valid." });
      };
      if (twilio) {
        let approved = false;
        let reachable = true;
        try {
          const body = new URLSearchParams({ To: toE164(input.phone), Code: input.code });
          const response = await fetch(`https://verify.twilio.com/v2/Services/${twilio.serviceSid}/VerificationCheck`, { method: "POST", headers: { Authorization: twilio.authorization, "Content-Type": "application/x-www-form-urlencoded" }, body, signal: AbortSignal.timeout(10_000) });
          const result = await response.json().catch(() => ({})) as { status?: string };
          approved = response.ok && result.status === "approved";
        } catch (err) {
          reachable = false;
          console.warn("[OTP] Twilio verification check failed.", err);
        }
        if (!approved) {
          if (!reachable && !simulation) throw new TRPCError({ code: "BAD_GATEWAY", message: "Unable to verify the code right now. Please try again." });
          acceptSimulationCode();
        }
      } else {
        if (!simulation) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "OTP service is not available right now. Please try again later." });
        acceptSimulationCode();
      }

      return recordVerifiedPhone(ctx, input.phone, twilio ? "Phone verified through SMS OTP." : "Phone verified (simulation).");
    }),
    /** Firebase phone OTP: the browser verifies the code with Firebase and sends us the ID token. */
    firebaseVerify: publicProcedure.input(z.object({ phone: phoneSchema, idToken: z.string().min(100).max(5000) })).mutation(async ({ ctx, input }) => {
      if (!isFirebaseConfigured()) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "OTP service is not available right now. Please try again later." });
      let claims;
      try {
        claims = await verifyFirebasePhoneToken(input.idToken);
      } catch (error) {
        console.warn("[OTP] Firebase token rejected:", error instanceof Error ? error.message : error);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "We could not confirm your OTP. Please request a new one and try again." });
      }
      if (claims.phoneNumber !== toE164(input.phone)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "The verified number does not match the number you entered." });
      }
      return recordVerifiedPhone(ctx, input.phone, "Phone verified through Firebase SMS OTP.");
    }),
    updateAddress: protectedProcedure
      .input(z.object({
        blockNumber: z.string().trim().min(1, "Block number is required.").max(16),
        flatNumber: z.string().trim().min(1, "Flat number is required.").max(16),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [profile] = await db.select().from(residentProfiles).where(eq(residentProfiles.userId, ctx.user.id)).limit(1);
        if (!canEditOwnResidentAddress(ctx.user.role, profile?.verificationStatus)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only a verified customer can edit their own apartment address." });
        }
        const address = normalizeResidentAddress(input);
        await db.update(residentProfiles).set(address).where(eq(residentProfiles.userId, ctx.user.id));
        return { success: true, ...address };
      }),
    requestVerification: protectedProcedure
      .input(z.object({
        phone: phoneSchema,
        password: z.string().min(6).max(128),
        fullName: z.string().trim().min(2).max(120),
        blockNumber: z.string().trim().min(1).max(16),
        flatNumber: z.string().trim().min(1).max(16),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [invite] = await findInviteForPhone(db, input.phone);
        const inviteCount = await db.select({ count: communityInvites.id }).from(communityInvites).limit(1);
        const isInviteOnlyEnforced = inviteCount.length > 0;
        if (isInviteOnlyEnforced && ctx.user.role !== "admin" && (!invite || invite.status === "revoked")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "This phone number has not been invited to HariCart yet. Please contact the administrator for an invitation." });
        }
        const [profile] = await db.select().from(residentProfiles).where(eq(residentProfiles.userId, ctx.user.id)).limit(1);
        if (ctx.user.role !== "admin" && !isPhoneVerificationComplete(profile, input.phone)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please verify your mobile number with OTP before completing resident registration." });
        }
        if (invite) {
          await db.update(communityInvites).set({ status: "joined" }).where(eq(communityInvites.id, invite.id));
        }
        const fullName = input.fullName.trim();
        const blockNumber = input.blockNumber.trim().toUpperCase();
        const flatNumber = input.flatNumber.trim().toUpperCase();
        const apartmentUnit = `${blockNumber}-${flatNumber}`;
        const passwordHash = hashResidentPassword(input.password);
        await db.update(users).set({ name: fullName }).where(eq(users.id, ctx.user.id));
        await db.insert(residentProfiles).values({
          userId: ctx.user.id,
          phone: input.phone,
          fullName,
          passwordHash,
          blockNumber,
          flatNumber,
          apartmentUnit,
          verificationStatus: "verified",
          verifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          verificationNote: "Verified via SMS OTP with saved resident details.",
        }).onDuplicateKeyUpdate({ set: {
          phone: input.phone,
          fullName,
          passwordHash,
          blockNumber,
          flatNumber,
          apartmentUnit,
          verificationStatus: "verified",
          verifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          verificationNote: "Verified via SMS OTP with saved resident details.",
        } });
        return { success: true, message: "Details saved successfully.", fullName, blockNumber, flatNumber, apartmentUnit };
      }),
    completeRegistration: protectedProcedure
      .input(z.object({
        phone: phoneSchema,
        blockNumber: z.string().trim().min(1).max(16),
        flatNumber: z.string().trim().min(1).max(16),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [profile] = await db.select().from(residentProfiles).where(eq(residentProfiles.userId, ctx.user.id)).limit(1);
        if (ctx.user.role !== "admin" && !isPhoneVerificationComplete(profile, input.phone)) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Please verify your mobile number with OTP before saving your apartment details." });
        }
        const invite = await assertResidentInviteAllowed(db, input.phone);
        if (invite) await db.update(communityInvites).set({ status: "joined" }).where(eq(communityInvites.id, invite.id));
        const blockNumber = input.blockNumber.trim().toUpperCase();
        const flatNumber = input.flatNumber.trim().toUpperCase();
        const apartmentUnit = `${blockNumber}-${flatNumber}`;
        const phoneVerifiedAt = profile?.phoneVerifiedAt ?? new Date();
        const verifiedAt = new Date();
        await db.insert(residentProfiles).values({
          userId: ctx.user.id,
          phone: input.phone,
          blockNumber,
          flatNumber,
          apartmentUnit,
          verificationStatus: "verified",
          verifiedAt,
          phoneVerifiedAt,
          verificationNote: "Verified via SMS OTP with saved apartment details.",
        }).onDuplicateKeyUpdate({ set: {
          phone: input.phone,
          blockNumber,
          flatNumber,
          apartmentUnit,
          verificationStatus: "verified",
          verifiedAt,
          phoneVerifiedAt,
          verificationNote: "Verified via SMS OTP with saved apartment details.",
        } });
        return { success: true, message: "Details saved successfully.", blockNumber, flatNumber, apartmentUnit };
      }),
    verifiedGate: protectedProcedure.query(async ({ ctx }) => Boolean(await getVerifiedResidentProfile(ctx.user.id))),
    submitVehicleServiceRequest: protectedProcedure
      .input(z.object({
        serviceKind: z.enum(["electrician", "plumber", "tuition", "fitness", "car", "bike"]),
        selectedServices: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
        issueDescription: z.string().trim().min(5, "Please add a few details about the service you need.").max(500),
        phone: z.string().trim().min(8).max(32),
        blockNumber: z.string().trim().min(1).max(32),
        flatNumber: z.string().trim().min(1).max(32),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const profile = await getVerifiedResidentProfile(ctx.user.id);
        if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "Please complete resident verification before submitting a service request." });
        const request = normalizeVehicleServiceRequest(input);
        const [created] = await db.insert(vehicleServiceRequests).values({
          residentUserId: ctx.user.id,
          serviceKind: request.serviceKind,
          phone: request.phone,
          blockNumber: request.blockNumber,
          flatNumber: request.flatNumber,
          selectedServices: JSON.stringify(request.selectedServices),
          issueDescription: request.issueDescription,
        }).$returningId();
        return { success: true, requestId: created?.id ?? null, serviceKind: request.serviceKind, apartmentUnit: profile.apartmentUnit };
      }),
    ownerIdStatus: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "shop_owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can access owner settings." });
      }
      const db = await getDb();
      if (!db) return { hasCustomOwnerId: false };
      const [setting] = await db.select().from(appSettings).where(eq(appSettings.settingKey, "haricart_custom_owner_id_hash")).limit(1);
      return { hasCustomOwnerId: Boolean(setting?.settingValue) };
    }),
    setupOwnerId: protectedProcedure.input(z.object({ ownerId: z.string().trim().min(4).max(128) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "shop_owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can set a custom Owner ID." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const [existing] = await db.select().from(appSettings).where(eq(appSettings.settingKey, "haricart_custom_owner_id_hash")).limit(1);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Custom Owner ID is already configured. Use verify instead." });
      }
      const idHash = hashOwnerId(input.ownerId);
      await db.insert(appSettings).values({ settingKey: "haricart_custom_owner_id_hash", settingValue: idHash, updatedByUserId: ctx.user.id });
      return { success: true, message: "Custom Owner ID created and saved successfully ✅" };
    }),
    verifyOwnerId: protectedProcedure.input(z.object({ ownerId: z.string().trim().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "shop_owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can verify Owner ID." });
      }
      const db = await getDb();
      let storedHash: string | null = null;
      if (db) {
        const [setting] = await db.select().from(appSettings).where(eq(appSettings.settingKey, "haricart_custom_owner_id_hash")).limit(1);
        storedHash = setting?.settingValue || null;
      }
      if (!verifyOwnerSecretId(input.ownerId, storedHash)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid Owner ID. Please enter your correct private Owner ID." });
      }
      return { success: true, message: "Owner ID verified successfully ✅" };
    }),
    resetOwnerId: protectedProcedure.input(z.object({ newOwnerId: z.string().trim().min(4).max(128) })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "shop_owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can reset Owner ID." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable." });
      const idHash = hashOwnerId(input.newOwnerId);
      await db.delete(appSettings).where(eq(appSettings.settingKey, "haricart_custom_owner_id_hash"));
      await db.insert(appSettings).values({ settingKey: "haricart_custom_owner_id_hash", settingValue: idHash, updatedByUserId: ctx.user.id });
      return { success: true, message: "Owner ID reset successfully ✅" };
    }),
    customerDirectory: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "shop_owner") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can view customer details." });
      }
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        userId: users.id,
        userName: users.name,
        profileName: residentProfiles.fullName,
        phone: residentProfiles.phone,
        blockNumber: residentProfiles.blockNumber,
        flatNumber: residentProfiles.flatNumber,
        verificationStatus: residentProfiles.verificationStatus,
      }).from(residentProfiles)
        .innerJoin(users, eq(residentProfiles.userId, users.id))
        .where(inArray(users.role, ["customer", "user"]))
        .orderBy(desc(residentProfiles.createdAt));
      return rows.map(({ userName, profileName, ...row }) => ({
        ...row,
        name: profileName || userName || "Resident",
      }));
    }),
    ownerServiceRequests: protectedProcedure.query(async ({ ctx }) => {
      if (!canManageServiceRequests(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can view service history." });
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: vehicleServiceRequests.id,
        residentUserId: vehicleServiceRequests.residentUserId,
        serviceKind: vehicleServiceRequests.serviceKind,
        phone: vehicleServiceRequests.phone,
        blockNumber: vehicleServiceRequests.blockNumber,
        flatNumber: vehicleServiceRequests.flatNumber,
        selectedServices: vehicleServiceRequests.selectedServices,
        issueDescription: vehicleServiceRequests.issueDescription,
        status: vehicleServiceRequests.status,
        createdAt: vehicleServiceRequests.createdAt,
        updatedAt: vehicleServiceRequests.updatedAt,
        userName: users.name,
        profileName: residentProfiles.fullName,
        building: residentProfiles.building,
      }).from(vehicleServiceRequests)
        .innerJoin(users, eq(vehicleServiceRequests.residentUserId, users.id))
        .innerJoin(residentProfiles, eq(vehicleServiceRequests.residentUserId, residentProfiles.userId))
        .orderBy(desc(vehicleServiceRequests.createdAt));
      return rows.map(({ userName, profileName, selectedServices, ...row }) => ({
        ...row,
        name: profileName || userName || "Resident",
        selectedServices: parseServiceRequestOptions(selectedServices),
      }));
    }),
    updateServiceRequestStatus: protectedProcedure
      .input(z.object({ requestId: z.number().int().positive(), status: z.enum(["submitted", "contacted", "closed"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!canManageServiceRequests(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN", message: "Only HariCart owners can update service requests." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        const [existing] = await db.select({ id: vehicleServiceRequests.id }).from(vehicleServiceRequests).where(eq(vehicleServiceRequests.id, input.requestId)).limit(1);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Service request not found." });
        await db.update(vehicleServiceRequests).set({ status: input.status }).where(eq(vehicleServiceRequests.id, input.requestId));
        return { success: true, requestId: input.requestId, status: input.status };
      }),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy(desc(notifications.createdAt)).limit(50);
    }),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, input.notificationId), eq(notifications.userId, ctx.user.id)));
      return { success: true };
    }),
    /** Bell → "Mark all read": clears the unread count for this person only. */
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.userId, ctx.user.id), eq(notifications.isRead, false)));
      return { success: true };
    }),
  }),
  orders: router({
    /**
     * Small, fast check used by the order alarm (polled every few seconds).
     * Owner/admin + shop owner: orders still waiting to be confirmed.
     * Delivery staff: orders assigned to them that are packed and ready to pick up.
     */
    alerts: protectedProcedure.query(async ({ ctx }) => {
      const empty = { role: ctx.user.role, waiting: 0, orders: [] as AlertOrder[] };
      const db = await getDb();
      if (!db) return empty;
      const columns = { id: orders.id, orderNumber: orders.orderNumber, apartmentUnit: orders.apartmentUnit, total: orders.total, status: orders.status, placedAt: orders.placedAt };
      let rows: AlertOrder[] = [];
      if (ctx.user.role === "admin") {
        rows = await db.select(columns).from(orders).where(eq(orders.status, "placed")).orderBy(desc(orders.placedAt)).limit(50);
      } else if (ctx.user.role === "shop_owner") {
        const ownedShops = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerUserId, ctx.user.id));
        if (!ownedShops.length) return empty;
        rows = await db.select(columns).from(orders).where(and(eq(orders.status, "placed"), inArray(orders.shopId, ownedShops.map(shop => shop.id)))).orderBy(desc(orders.placedAt)).limit(50);
      } else if (ctx.user.role === "delivery_boy") {
        rows = await db.select(columns).from(orders).where(and(eq(orders.status, "packed"), eq(orders.deliveryUserId, ctx.user.id))).orderBy(desc(orders.placedAt)).limit(50);
      } else {
        return empty;
      }
      return { role: ctx.user.role, waiting: rows.length, orders: rows };
    }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      let rows: Array<typeof orders.$inferSelect>;
      if (ctx.user.role === "delivery_boy") rows = await db.select().from(orders).where(eq(orders.deliveryUserId, ctx.user.id)).orderBy(desc(orders.createdAt)).limit(200);
      else if (ctx.user.role === "shop_owner") {
        const ownedShops = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerUserId, ctx.user.id));
        if (!ownedShops.length) return [];
        rows = await db.select().from(orders).where(inArray(orders.shopId, ownedShops.map(shop => shop.id))).orderBy(desc(orders.createdAt)).limit(200);
      } else if (ctx.user.role === "admin") rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(200);
      else rows = await db.select().from(orders).where(eq(orders.customerUserId, ctx.user.id)).orderBy(desc(orders.createdAt));
      if (!rows.length) return rows.map(order => ({ ...order, items: [] }));
      const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map(order => order.id)));
      const itemsByOrder = new Map<number, typeof items>();
      for (const item of items) itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) || []), item]);
      return rows.map(order => ({ ...order, items: itemsByOrder.get(order.id) || [] }));
    }),
    placeOffline: protectedProcedure.input(z.object({ cartId: z.string().min(1), paymentMethod: z.enum(["upi_qr", "cash_on_delivery", "pay_after_delivery"]) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (ctx.user.role !== "customer" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Only customers can place resident orders." });
      if (!(await isMarketOpen())) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "HariCart is temporarily closed. Please check back soon." });
      const resident = await getVerifiedResidentProfile(ctx.user.id);
      if (!resident) throw new TRPCError({ code: "FORBIDDEN", message: "Checkout is available only to verified residents." });
      const cart = await getCustomerCart(input.cartId, ctx.user.id);
      if (!cart?.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Your basket is empty." });
      const productHandles = Array.from(new Set(cart.items.map(item => item.productHandle)));
      const localProducts = await db.select().from(catalogProducts).where(inArray(catalogProducts.handle, productHandles));
      const shopIds = Array.from(new Set(localProducts.map(product => product.shopId)));
      if (shopIds.length > 1) throw new TRPCError({ code: "BAD_REQUEST", message: "Please place separate orders for items from different shops." });
      const [shop] = await db.select().from(shops).where(eq(shops.status, "active")).limit(1);
      const shopId = shopIds[0] || shop?.id;
      if (!shopId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No active shop is ready to accept orders." });
      const orderNumber = `SM-${Date.now().toString(36).toUpperCase()}-${ctx.user.id}`;
      const subtotal = cart.subtotal.amount;
      const total = cart.total.amount;
      const paymentProvider = getOfflinePaymentProvider(input.paymentMethod);
      const localCartNumericId = input.cartId.startsWith("local:cart:") ? Number(input.cartId.slice("local:cart:".length)) : null;
      const order = await db.transaction(async tx => {
        if (localCartNumericId) {
          // Lock the basket: a double-tap or a second tab cannot turn the same basket into two orders.
          const [cartUpdate] = await tx.update(carts).set({ status: "converted" }).where(and(eq(carts.id, localCartNumericId), eq(carts.customerUserId, ctx.user.id), eq(carts.status, "active")));
          if (getAffectedRows(cartUpdate) !== 1) throw new TRPCError({ code: "CONFLICT", message: "This basket has already been ordered. Please refresh the page." });
          // Take the items out of stock. The "stock >= quantity" condition makes this safe when two customers buy the last item at the same time.
          for (const item of cart.items) {
            const product = localProducts.find(candidate => candidate.handle === item.productHandle);
            if (!product) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${item.productTitle} is no longer available.` });
            const [stockUpdate] = await tx.update(catalogProducts).set({ stockQuantity: sql`${catalogProducts.stockQuantity} - ${item.quantity}` }).where(and(eq(catalogProducts.id, product.id), gte(catalogProducts.stockQuantity, item.quantity)));
            if (getAffectedRows(stockUpdate) !== 1) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Sorry, ${item.productTitle} just sold out or has less stock left. Please update your basket.` });
          }
        }
        const [created] = await tx.insert(orders).values({ orderNumber, customerUserId: ctx.user.id, shopId, apartmentUnit: resident.apartmentUnit, status: "placed", paymentStatus: "pending", paymentMethod: input.paymentMethod, paymentProvider, subtotal, total }).$returningId();
        if (!created?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create the order." });
        await tx.insert(orderItems).values(cart.items.map(item => ({ orderId: created.id, catalogProductId: localProducts.find(product => product.handle === item.productHandle)?.id ?? null, title: item.productTitle, variantTitle: item.variantTitle, quantity: item.quantity, unitPrice: item.unitPrice.amount, lineTotal: item.lineTotal.amount })));
        await tx.insert(payments).values({ orderId: created.id, provider: paymentProvider, amount: total, currency: "INR", status: "pending" });
        return created;
      });
      const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      const recipients = [{ userId: ctx.user.id, audienceRole: "customer" as const }, ...(shop?.ownerUserId ? [{ userId: shop.ownerUserId, audienceRole: "shop_owner" as const }] : []), ...adminUsers.map(admin => ({ userId: admin.id, audienceRole: "admin" as const }))];
      const paymentLabel = input.paymentMethod === "upi_qr" ? "UPI QR" : input.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "payment after delivery";
      const notificationBody = `Order ${orderNumber} placed for Unit ${resident.apartmentUnit} · ₹${Number(total).toFixed(2)} · ${paymentLabel}.`;
      await db.insert(notifications).values(recipients.map(recipient => ({ userId: recipient.userId, orderId: order.id, audienceRole: recipient.audienceRole, title: "Order placed", body: notificationBody, actionUrl: "/orders" })));
      await sendOwnerOrderSms({ orderNumber, amount: total, apartmentUnit: resident.apartmentUnit });
      return { success: true, orderId: order.id, orderNumber, paymentMethod: input.paymentMethod, paymentStatus: "pending" as const };
    }),
    recordPayment: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: z.enum(["paid", "failed"]), providerReference: z.string().trim().max(255).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (ctx.user.role === "delivery_boy" && order.deliveryUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This order is not assigned to you." });
      if (ctx.user.role === "shop_owner") {
        const [owned] = await db.select({ id: shops.id }).from(shops).where(and(eq(shops.id, order.shopId), eq(shops.ownerUserId, ctx.user.id))).limit(1);
        if (!owned) throw new TRPCError({ code: "FORBIDDEN", message: "This order belongs to another shop." });
      }
      if (ctx.user.role !== "admin" && ctx.user.role !== "delivery_boy" && ctx.user.role !== "shop_owner") throw new TRPCError({ code: "FORBIDDEN", message: "Only operations staff can record collected payment." });
      if (order.paymentMethod === "online_checkout") throw new TRPCError({ code: "BAD_REQUEST", message: "Online checkout payments are reconciled by the payment provider." });
      if (order.status !== "out_for_delivery" && order.status !== "delivered") throw new TRPCError({ code: "BAD_REQUEST", message: "Payment can be collected after the order is out for delivery." });
      await db.update(payments).set({ status: input.status, providerReference: input.providerReference || null, paidAt: input.status === "paid" ? new Date() : null }).where(eq(payments.orderId, order.id));
      await db.update(orders).set({ paymentStatus: input.status }).where(eq(orders.id, order.id));
      await db.insert(notifications).values({ userId: order.customerUserId, orderId: order.id, audienceRole: "customer", title: input.status === "paid" ? "Payment received" : "Payment needs attention", body: input.status === "paid" ? `Payment received for order ${order.orderNumber}.` : `Payment for order ${order.orderNumber} still needs attention.`, actionUrl: "/orders" });
      return { success: true, status: input.status };
    }),
    advance: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), status: orderStatusSchema })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (ctx.user.role === "customer" || ctx.user.role === "user") throw new TRPCError({ code: "FORBIDDEN", message: "Customers cannot update fulfilment status" });
      if (ctx.user.role === "delivery_boy" && order.deliveryUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This order is not assigned to you" });
      if (ctx.user.role === "shop_owner") {
        const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
        if (shop?.ownerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This order belongs to another shop" });
      }
      if (order.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "This order was cancelled." });
      if (!isAllowedOrderTransition(order.status, input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "The order must follow Placed → Confirmed → Packed → Out for delivery → Delivered." });
      if (input.status === "delivered" && order.paymentMethod === "cash_on_delivery" && order.paymentStatus !== "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "Cash on Delivery must be collected before completing delivery." });
      if ((ctx.user.role === "shop_owner" || ctx.user.role === "delivery_boy" || ctx.user.role === "admin") && !canRoleAdvanceOrder(ctx.user.role, input.status)) throw new TRPCError({ code: "FORBIDDEN", message: "This role cannot apply that order status" });

      const now = new Date();
      await db.update(orders).set({ status: input.status, ...(input.status === "confirmed" ? { confirmedAt: now } : {}), ...(input.status === "packed" ? { packedAt: now } : {}), ...(input.status === "out_for_delivery" ? { outForDeliveryAt: now } : {}), ...(input.status === "delivered" ? { deliveredAt: now } : {}) }).where(eq(orders.id, order.id));
      const copy = getStatusCopy(input.status, order.orderNumber);
      const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
      const adminUsers = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      const recipients = [
        { userId: order.customerUserId, role: "customer" as const },
        { userId: shop?.ownerUserId, role: "shop_owner" as const },
        { userId: order.deliveryUserId, role: "delivery_boy" as const },
        ...adminUsers.map(admin => ({ userId: admin.id, role: "admin" as const })),
      ].filter((recipient): recipient is { userId: number; role: "customer" | "shop_owner" | "delivery_boy" } => Boolean(recipient.userId));
      if (recipients.length) await db.insert(notifications).values(recipients.map(recipient => ({ userId: recipient.userId, orderId: order.id, audienceRole: recipient.role, title: copy.title, body: copy.body, actionUrl: "/orders" })));
      return { success: true, status: input.status };
    }),
    /**
     * Cancel an order. Customers: while Placed or Confirmed. Owner / shop: until it leaves the shop.
     * Stock for the items goes back on the shelf. A paid order is marked "refunded" so the owner remembers to return the money.
     */
    cancel: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), reason: z.string().trim().min(2).max(200) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      const isCustomer = ctx.user.role === "customer" || ctx.user.role === "user";
      if (isCustomer) {
        if (order.customerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This is not your order." });
        if (!canCustomerCancel(order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: order.status === "cancelled" ? "This order is already cancelled." : "This order is already packed or on its way, so it can no longer be cancelled. Please call the shop." });
      } else {
        const role = ctx.user.role as "admin" | "shop_owner" | "delivery_boy";
        await assertCanManageOrder(db, ctx.user, order);
        if (!canStaffCancel(role, order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: order.status === "cancelled" ? "This order is already cancelled." : role === "delivery_boy" ? "Delivery staff cannot cancel orders." : "Orders that have left the shop cannot be cancelled." });
      }
      const refund = order.paymentStatus === "paid";
      await db.transaction(async tx => {
        // Only the first cancel wins, even if two people press it at the same time.
        const result = await tx.update(orders).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: input.reason, cancelledByRole: isCustomer ? "customer" : ctx.user.role, ...(refund ? { paymentStatus: "refunded" as const } : {}) }).where(and(eq(orders.id, order.id), eq(orders.status, order.status)));
        if (getAffectedRows(result) === 0) throw new TRPCError({ code: "CONFLICT", message: "The order changed just now. Please refresh and try again." });
        if (refund) await tx.update(payments).set({ status: "refunded" }).where(eq(payments.orderId, order.id));
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        for (const item of items) {
          if (item.catalogProductId && item.itemStatus === "ok") {
            await tx.update(catalogProducts).set({ stockQuantity: sql`${catalogProducts.stockQuantity} + ${item.quantity}` }).where(eq(catalogProducts.id, item.catalogProductId));
          }
        }
      });
      const who = isCustomer ? "by the customer" : "by the shop";
      await notifyOrderParties(db, order, "Order cancelled", `Order ${order.orderNumber} for Flat ${order.apartmentUnit} was cancelled ${who}: ${input.reason}${refund ? ` · Refund ₹${Number(order.total).toFixed(2)} to the customer.` : ""}`);
      return { success: true, status: "cancelled" as const, refundDue: refund ? order.total : null };
    }),
    /**
     * The shop does not have an item: remove it from the order, set the product's stock to 0 so nobody else
     * can order it, and tell the customer the new total. If nothing is left, the order is cancelled.
     */
    markItemOutOfStock: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), orderItemId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (ctx.user.role === "customer" || ctx.user.role === "user") throw new TRPCError({ code: "FORBIDDEN", message: "Only the shop can change order items." });
      const role = ctx.user.role as "admin" | "shop_owner" | "delivery_boy";
      const [order] = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      await assertCanManageOrder(db, ctx.user, order);
      if (!canMarkItemsOutOfStock(role, order.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Items can only be changed before the order is packed." });
      const [item] = await db.select().from(orderItems).where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.orderId, order.id))).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found in this order." });
      if (item.itemStatus === "out_of_stock") return { success: true, alreadyMarked: true, total: order.total, cancelled: false };

      const outcome = await db.transaction(async tx => {
        await tx.update(orderItems).set({ itemStatus: "out_of_stock" }).where(eq(orderItems.id, item.id));
        if (item.catalogProductId) await tx.update(catalogProducts).set({ stockQuantity: 0 }).where(eq(catalogProducts.id, item.catalogProductId));
        const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const totals = recalculateOrderTotals(items, order.deliveryFee);
        const paid = order.paymentStatus === "paid";
        if (!totals.hasItemsLeft) {
          await tx.update(orders).set({ subtotal: totals.subtotal, total: totals.total, status: "cancelled", cancelledAt: new Date(), cancelReason: "All items were out of stock", cancelledByRole: role, ...(paid ? { paymentStatus: "refunded" as const } : {}) }).where(eq(orders.id, order.id));
          await tx.update(payments).set({ amount: totals.total, ...(paid ? { status: "refunded" as const } : {}) }).where(eq(payments.orderId, order.id));
        } else {
          await tx.update(orders).set({ subtotal: totals.subtotal, total: totals.total }).where(eq(orders.id, order.id));
          await tx.update(payments).set({ amount: totals.total }).where(eq(payments.orderId, order.id));
        }
        return totals;
      });
      const paidNote = order.paymentStatus === "paid" ? ` · Refund ₹${(Number(order.total) - Number(outcome.total)).toFixed(2)} to the customer.` : "";
      if (!outcome.hasItemsLeft) {
        await notifyOrderParties(db, order, "Order cancelled", `Sorry, everything in order ${order.orderNumber} is out of stock, so it was cancelled.${paidNote}`);
      } else {
        await notifyOrderParties(db, order, "Item out of stock", `${item.title} is out of stock and was removed from order ${order.orderNumber}. New total: ₹${Number(outcome.total).toFixed(2)}.${paidNote}`);
      }
      return { success: true, alreadyMarked: false, total: outcome.total, cancelled: !outcome.hasItemsLeft };
    }),
  }),
  shop: router({
    inventory: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        if (!canRoleManageInventory(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        if (ctx.user.role === "admin") return db.select().from(catalogProducts).orderBy(desc(catalogProducts.updatedAt));
        const ownedShops = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerUserId, ctx.user.id));
        if (!ownedShops.length) return [];
        return db.select().from(catalogProducts).where(inArray(catalogProducts.shopId, ownedShops.map(shop => shop.id))).orderBy(desc(catalogProducts.updatedAt));
      }),
      uploadImage: protectedProcedure.input(z.object({ fileName: z.string().trim().min(1).max(120), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), dataBase64: z.string().min(16).max(7000000) })).mutation(async ({ ctx, input }) => {
        if (!canRoleManageInventory(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        const bytes = Buffer.from(input.dataBase64, "base64");
        if (!isSupportedProductImage(input.mimeType, bytes.length)) throw new TRPCError({ code: "BAD_REQUEST", message: "Product photos must be JPG, PNG, or WEBP and no larger than 5 MB." });
        const safeName = input.fileName.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-100) || "product-image";
        const uploaded = await storagePut(`catalog-products/${ctx.user.id}/${Date.now()}-${safeName}`, bytes, input.mimeType, ctx.user.id);
        return { success: true, ...uploaded };
      }),
      update: protectedProcedure.input(z.object({ id: z.number().int().positive(), name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional(), price: z.string().regex(/^\d+(\.\d{1,2})?$/), compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(), countryOfOrigin: z.string().trim().min(2).max(80).default("India"), stockQuantity: z.number().int().min(0), unitLabel: z.string().trim().min(1).max(40), imageUrl: productImageUrlSchema.nullable().optional(), isAvailable: z.boolean() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        if (!canRoleManageInventory(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        const [product] = await db.select().from(catalogProducts).where(eq(catalogProducts.id, input.id)).limit(1);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        if (ctx.user.role === "shop_owner") {
          const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, product.shopId)).limit(1);
          if (shop?.ownerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This product belongs to another shop" });
        }
        await db.update(catalogProducts).set({ name: input.name, description: input.description || null, price: input.price, compareAtPrice: input.compareAtPrice === undefined ? product.compareAtPrice : input.compareAtPrice || null, countryOfOrigin: input.countryOfOrigin, stockQuantity: input.stockQuantity, unitLabel: input.unitLabel, imageUrl: input.imageUrl === undefined ? product.imageUrl : input.imageUrl, isAvailable: input.isAvailable }).where(eq(catalogProducts.id, input.id));
        return { success: true };
      }),
      remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        if (!canRoleManageInventory(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        const [product] = await db.select().from(catalogProducts).where(eq(catalogProducts.id, input.id)).limit(1);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        if (ctx.user.role === "shop_owner") {
          const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, product.shopId)).limit(1);
          if (shop?.ownerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This product belongs to another shop" });
        }
        await db.delete(catalogProducts).where(eq(catalogProducts.id, input.id));
        return { success: true };
      }),
      create: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000).optional(), categoryId: z.number().int().positive().optional(), shopId: z.number().int().positive().optional(), price: z.string().regex(/^\d+(\.\d{1,2})?$/), compareAtPrice: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), countryOfOrigin: z.string().trim().min(2).max(80).default("India"), stockQuantity: z.number().int().min(0), unitLabel: z.string().trim().min(1).max(40).default("each"), imageUrl: productImageUrlSchema.optional(), isAvailable: z.boolean().default(true) })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
        if (!canRoleManageInventory(ctx.user.role)) throw new TRPCError({ code: "FORBIDDEN" });
        const selectedShopId = input.shopId ?? (await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerUserId, ctx.user.id)).limit(1))[0]?.id;
        if (!selectedShopId) throw new TRPCError({ code: "BAD_REQUEST", message: "A shop must be selected before adding a product" });
        if (ctx.user.role === "shop_owner") {
          const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, selectedShopId)).limit(1);
          if (shop?.ownerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only add products to your own shop" });
        }
        const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120) || "product";
        const handle = `${slug}-${Date.now()}`;
        await db.insert(catalogProducts).values({ shopId: selectedShopId, categoryId: input.categoryId ?? null, handle, name: input.name, description: input.description || null, imageUrl: input.imageUrl || null, countryOfOrigin: input.countryOfOrigin, price: input.price, compareAtPrice: input.compareAtPrice || null, stockQuantity: input.stockQuantity, unitLabel: input.unitLabel, isAvailable: input.isAvailable });
        return { success: true, handle, message: "Product added to the HariCart resident storefront when available with stock above zero. Connect a Shopify variant separately before accepting online checkout orders." };
      }),
    }),
  }),
  exchanges: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.role === "admin") return db.select({ request: exchangeRequests, order: orders }).from(exchangeRequests).innerJoin(orders, eq(exchangeRequests.orderId, orders.id)).orderBy(desc(exchangeRequests.createdAt));
      if (ctx.user.role === "shop_owner") {
        const ownedShops = await db.select({ id: shops.id }).from(shops).where(eq(shops.ownerUserId, ctx.user.id));
        if (!ownedShops.length) return [];
        return db.select({ request: exchangeRequests, order: orders }).from(exchangeRequests).innerJoin(orders, eq(exchangeRequests.orderId, orders.id)).where(inArray(orders.shopId, ownedShops.map(shop => shop.id))).orderBy(desc(exchangeRequests.createdAt));
      }
      return db.select({ request: exchangeRequests, order: orders }).from(exchangeRequests).innerJoin(orders, eq(exchangeRequests.orderId, orders.id)).where(eq(exchangeRequests.customerUserId, ctx.user.id)).orderBy(desc(exchangeRequests.createdAt));
    }),
    request: protectedProcedure.input(z.object({ orderId: z.number().int().positive(), reason: z.string().trim().min(5).max(500) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (ctx.user.role !== "customer" && ctx.user.role !== "user") throw new TRPCError({ code: "FORBIDDEN", message: "Only customers may request exchanges" });
      const [order] = await db.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.customerUserId, ctx.user.id))).limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      if (order.status !== "delivered") throw new TRPCError({ code: "BAD_REQUEST", message: "An exchange can be requested after delivery is complete" });
      const existing = await db.select({ id: exchangeRequests.id }).from(exchangeRequests).where(and(eq(exchangeRequests.orderId, order.id), inArray(exchangeRequests.status, ["requested", "approved"]))).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "An active exchange request already exists for this order" });
      await db.insert(exchangeRequests).values({ orderId: order.id, customerUserId: ctx.user.id, reason: input.reason });
      const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, order.shopId)).limit(1);
      const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
      const recipients = [{ userId: shop?.ownerUserId, role: "shop_owner" as const }, ...admins.map(admin => ({ userId: admin.id, role: "admin" as const }))].filter((recipient): recipient is { userId: number; role: "shop_owner" | "admin" } => Boolean(recipient.userId));
      if (recipients.length) await db.insert(notifications).values(recipients.map(recipient => ({ userId: recipient.userId, orderId: order.id, audienceRole: recipient.role, title: "Exchange requested", body: `Order ${order.orderNumber} has a new exchange request.`, type: "exchange_request", actionUrl: "/shop" })));
      return { success: true };
    }),
    review: protectedProcedure.input(z.object({ exchangeId: z.number().int().positive(), status: z.enum(["approved", "rejected", "completed"]), resolutionNote: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      if (ctx.user.role !== "shop_owner" && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const [record] = await db.select({ request: exchangeRequests, order: orders }).from(exchangeRequests).innerJoin(orders, eq(exchangeRequests.orderId, orders.id)).where(eq(exchangeRequests.id, input.exchangeId)).limit(1);
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Exchange request not found" });
      if (ctx.user.role === "shop_owner") {
        const [shop] = await db.select({ ownerUserId: shops.ownerUserId }).from(shops).where(eq(shops.id, record.order.shopId)).limit(1);
        if (shop?.ownerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "This exchange belongs to another shop" });
      }
      if (!isAllowedExchangeTransition(record.request.status, input.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid exchange transition" });
      await db.update(exchangeRequests).set({ status: input.status, resolutionNote: input.resolutionNote || null, reviewedByUserId: ctx.user.id }).where(eq(exchangeRequests.id, record.request.id));
      await db.insert(notifications).values({ userId: record.request.customerUserId, orderId: record.order.id, audienceRole: "customer", title: `Exchange ${input.status}`, body: `Your exchange request for order ${record.order.orderNumber} is ${input.status}.`, type: "exchange_update", actionUrl: "/orders" });
      return { success: true };
    }),
  }),
});