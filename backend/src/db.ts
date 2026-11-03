import { eq, sql } from "drizzle-orm";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { getDatabaseConnection } from "./_core/dbConnection";
import { InsertUser, residentProfiles, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: MySql2Database & { $client: unknown } | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({
        ...getDatabaseConnection(process.env.DATABASE_URL),
        connectionLimit: Number(process.env.DATABASE_POOL_SIZE ?? 10),
        waitForConnections: true,
        enableKeepAlive: true,
        idleTimeout: 60_000,
      });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getResidentProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(residentProfiles).where(eq(residentProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getVerifiedResidentProfile(userId: number) {
  const profile = await getResidentProfileByUserId(userId);
  return profile?.verificationStatus === "verified" ? profile : null;
}

/** Quick connectivity check used by the /api/health endpoint. */
export async function pingDb(): Promise<"up" | "down" | "not_configured"> {
  if (!process.env.DATABASE_URL) return "not_configured";
  const db = await getDb();
  if (!db) return "down";
  try {
    await db.execute(sql`select 1`);
    return "up";
  } catch (error) {
    console.error("[Database] Health check failed:", String(error));
    return "down";
  }
}

/** Close the connection pool on shutdown so in-flight queries finish cleanly. */
export async function closeDb() {
  const client = (_db as unknown as { $client?: { end?: (callback?: (error?: unknown) => void) => unknown } } | null)?.$client;
  _db = null;
  if (!client?.end) return;
  // mysql2 pools may be callback- or promise-based; support both.
  await new Promise<void>(resolve => {
    try {
      const result = client.end!(() => resolve());
      if (result && typeof (result as Promise<void>).then === "function") (result as Promise<void>).then(() => resolve(), () => resolve());
    } catch {
      resolve();
    }
    setTimeout(resolve, 3000).unref();
  });
}
