import express, { type Express } from "express";
import fs from "fs";
import path from "path";

/**
 * Serve the built frontend (frontend/dist) from this server, if it exists.
 * Set FRONTEND_DIST to point somewhere else, or leave it missing to run the
 * backend as an API-only server (e.g. when the frontend is hosted separately).
 */
export function serveFrontend(app: Express) {
  // backend/dist/index.js (built) or backend/src/_core/static.ts (tsx) -> <root>/frontend/dist
  const candidates = process.env.FRONTEND_DIST
    ? [path.resolve(process.env.FRONTEND_DIST)]
    : [
        path.resolve(import.meta.dirname, "../../frontend/dist"),
        path.resolve(import.meta.dirname, "../../../frontend/dist"),
      ];
  const distPath =
    candidates.find(dir => fs.existsSync(path.join(dir, "index.html"))) ?? candidates[0];

  if (!fs.existsSync(path.join(distPath, "index.html"))) {
    console.warn(`Frontend build not found at ${distPath}; running as API-only server.`);
    return false;
  }

  const indexHtml = path.resolve(distPath, "index.html");

  // Files in /assets have a content hash in their name, so browsers may cache
  // them for a year. index.html must always be re-checked so new releases show up.
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), { immutable: true, maxAge: "1y", fallthrough: false })
  );
  app.use(
    express.static(distPath, {
      index: false,
      maxAge: "1h",
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html") || filePath.endsWith(".webmanifest")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  // Single-page app: unknown page routes fall back to index.html
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexHtml);
  });
  return true;
}
