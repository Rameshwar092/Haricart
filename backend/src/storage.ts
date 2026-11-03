/**
 * Product photo storage — kept in HariCart's own database (table `mediaFiles`).
 * No outside storage service or account is needed.
 *
 *   storagePut(...)  → saves the file and returns { key, url: "/api/media/<key>" }
 *   GET /api/media/<key> → sends the file back (see registerMediaRoutes)
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { mediaFiles } from "../drizzle/schema";
import { getDb } from "./db";

export const MEDIA_URL_PREFIX = "/api/media/";

/** Biggest photo the database will accept (TiDB allows about 6 MB per row). */
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

function normalizeKey(relKey: string): string {
  return relKey
    .replace(/^\/+/, "")
    .replace(/[^A-Za-z0-9/._-]+/g, "-")
    .slice(-150);
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1 || lastDot < relKey.lastIndexOf("/")) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  uploadedByUserId?: number,
): Promise<{ key: string; url: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable: photos are stored in the database, so set DATABASE_URL.");

  const bytes = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  if (bytes.length > MAX_MEDIA_BYTES) throw new Error(`File is too large (max ${MAX_MEDIA_BYTES / 1024 / 1024} MB).`);

  const key = appendHashSuffix(normalizeKey(relKey));
  await db.insert(mediaFiles).values({ storageKey: key, mimeType: contentType, sizeBytes: bytes.length, data: bytes, uploadedByUserId: uploadedByUserId ?? null });
  return { key, url: `${MEDIA_URL_PREFIX}${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${MEDIA_URL_PREFIX}${key}` };
}

/** Serves stored photos at /api/media/<key>. Keys are unique, so browsers may cache them for a year. */
export function registerMediaRoutes(app: Express) {
  app.get(/^\/api\/media\/(.+)$/, async (req, res) => {
    const key = normalizeKey(decodeURIComponent((req.params as Record<string, string>)[0] ?? ""));
    if (!key) {
      res.status(400).send("Missing file name");
      return;
    }
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).send("Database unavailable");
        return;
      }
      const [file] = await db.select().from(mediaFiles).where(eq(mediaFiles.storageKey, key)).limit(1);
      if (!file) {
        res.status(404).send("Not found");
        return;
      }
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", String(file.sizeBytes));
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(file.data);
    } catch (error) {
      console.error("[Media] Failed to load file:", error);
      res.status(500).send("Could not load file");
    }
  });
}
