/**
 * HariCart's own login sessions — no outside login service.
 *
 * Everyone (customers, delivery staff and the owner) signs in with a phone OTP.
 * After a successful OTP the server signs a session token with JWT_SECRET and
 * stores it in an http-only cookie. Each request is matched to a user by that token.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { canAccountSignIn } from "@shared/delivery-flow";
import { ENV } from "./env";

/** Written into every session so tokens from other apps are never accepted. */
export const SESSION_ISSUER = "haricart";

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
};

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

class SessionService {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    if (!secret && ENV.isProduction) {
      throw new Error("JWT_SECRET is not set; refusing to sign or verify sessions.");
    }
    return new TextEncoder().encode(secret || "haricart-local-development-only-secret");
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  /** Create a session token for a user (identified by their openId). */
  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}): Promise<string> {
    return this.signSession({ openId, appId: SESSION_ISSUER, name: options.name || "HariCart user" }, options);
  }

  async signSession(payload: SessionPayload, options: { expiresInMs?: number } = {}): Promise<string> {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    return new SignJWT({ openId: payload.openId, appId: payload.appId, name: payload.name })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  async verifySession(cookieValue: string | undefined | null): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSessionSecret(), { algorithms: ["HS256"] });
      const { openId, appId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) return null;
      return { openId, appId, name };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);

    // Phone apps (WebView) sometimes block cookies; they can send the same token as a Bearer header.
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) sessionToken = authHeader.slice(7);
    }

    const session = await this.verifySession(sessionToken);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");
    // Checked on EVERY request: a suspended or deactivated account loses access at once,
    // even if its browser still has a valid session cookie.
    if (!canAccountSignIn(user.accountStatus)) throw ForbiddenError("Account is not active");

    // Record activity at most every 15 minutes instead of on every request.
    const now = new Date();
    const lastSeen = user.lastSignedIn ? new Date(user.lastSignedIn).getTime() : 0;
    if (now.getTime() - lastSeen > 15 * 60 * 1000) {
      await db.upsertUser({ openId: user.openId, lastSignedIn: now });
    }
    return user;
  }
}

export const sdk = new SessionService();