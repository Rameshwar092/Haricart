import "dotenv/config";
import compression from "compression";
import express, { type NextFunction, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerMediaRoutes } from "../storage";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveFrontend } from "./static";
import { validateConfig } from "./config";
import { closeDb, pingDb } from "../db";

const isProduction = process.env.NODE_ENV === "production";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/** Limit how often one IP address can call the listed tRPC procedures. */
function limitProcedures(procedures: string[], windowMs: number, limit: number, message: string) {
  const limiter = rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json([{ error: { json: { message, code: -32029, data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 } } } }]);
    },
  });
  return (req: Request, res: Response, next: NextFunction) => {
    // tRPC puts the procedure names in the path, e.g. /community.resident.requestOtp?batch=1
    const called = req.path.slice(1).split(",");
    if (called.some(name => procedures.includes(name))) return limiter(req, res, next);
    next();
  };
}

async function startServer() {
  validateConfig();

  const app = express();
  const server = createServer(app);

  // Behind a hosting proxy / load balancer (Render, Railway, Nginx...):
  // trust the first proxy so client IPs and https detection are correct.
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 1));
  app.disable("x-powered-by");

  app.use(
    helmet({
      // The site loads Google Fonts, analytics and storage images from other
      // domains; a strict CSP would block them, so it is left off for now.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );
  app.use(compression());

  // Product photos are sent as base64 (max 5 MB → ~7 MB of text), so 10 MB is enough.
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Health check for uptime monitors and hosting platforms.
  app.get("/api/health", async (_req, res) => {
    const db = await pingDb();
    const ok = db !== "down";
    res.status(ok ? 200 : 503).json({ ok, db, uptime: Math.round(process.uptime()) });
  });

  // Product photos saved in the database.
  registerMediaRoutes(app);
  // Old login links shared from the previous hosting: just open the shop.
  app.get(["/api/oauth/callback", "/manus-oauth/callback"], (_req, res) => res.redirect(302, "/"));

  // Abuse protection: OTP SMS costs money and codes can be guessed, so these are strict.
  app.use(
    "/api/trpc",
    limitProcedures(["community.resident.requestOtp"], 15 * 60 * 1000, 5, "Too many OTP requests. Please wait 15 minutes and try again."),
    limitProcedures(["community.resident.confirmOtp", "community.resident.firebaseVerify"], 15 * 60 * 1000, 10, "Too many wrong attempts. Please wait 15 minutes and try again."),
    rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 300), standardHeaders: "draft-7", legacyHeaders: false })
  );

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[API] ${path ?? "unknown"} failed:`, error.cause ?? error);
        }
      },
    })
  );

  // The website lives in ../frontend. In development run it with its own Vite
  // dev server (it forwards /api calls here). In production this server can also
  // serve the built website (frontend/dist) so you only need to deploy one app.
  if (process.env.NODE_ENV !== "development") {
    serveFrontend(app);
  }

  // Unknown API routes → JSON 404 (instead of the website's HTML)
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Last-resort error handler: never show stack traces to visitors.
  app.use((err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error("[Server] Unhandled error:", err);
    if (res.headersSent) return;
    res.status(status).json({ error: status === 413 ? "Upload is too large." : status >= 500 ? "Something went wrong." : err.message });
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  // In production the host tells us the port; never silently move to another one.
  const port = isProduction ? preferredPort : await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.keepAliveTimeout = 65_000; // longer than most load balancers' idle timeout
  server.headersTimeout = 66_000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/ (${process.env.NODE_ENV ?? "development"})`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received: finishing open requests and shutting down...`);
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

process.on("unhandledRejection", reason => {
  console.error("[Server] Unhandled promise rejection:", reason);
});

startServer().catch(error => {
  console.error("[Server] Failed to start:", error instanceof Error ? error.message : error);
  process.exit(1);
});
