import type { ConnectionOptions, SslOptions } from "mysql2";

/**
 * Turns DATABASE_URL into mysql2 connection options.
 *
 * TiDB Cloud (and most hosted MySQL) only accepts encrypted connections.
 * SSL is switched on automatically for *.tidbcloud.com hosts, or whenever
 * DATABASE_SSL=true — so a plain URL like
 *   mysql://USER:PASSWORD@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/haricart
 * just works. Set DATABASE_SSL=false to force it off (e.g. a local MySQL).
 */
export function getDatabaseConnection(url = process.env.DATABASE_URL ?? ""): ConnectionOptions & { host: string; port: number; user: string; password: string; database: string } {
  const parsed = new URL(url);
  const host = parsed.hostname;
  const flag = process.env.DATABASE_SSL?.trim().toLowerCase();
  const urlSsl = parsed.searchParams.get("ssl");
  const wantSsl = flag === "true" || (flag !== "false" && (/\.tidbcloud\.com$/i.test(host) || Boolean(urlSsl)));

  let ssl: SslOptions | undefined;
  if (wantSsl) {
    ssl = { minVersion: "TLSv1.2", rejectUnauthorized: true };
    if (urlSsl) {
      try {
        ssl = { ...ssl, ...(JSON.parse(urlSsl) as SslOptions) };
      } catch {
        /* ignore malformed ssl=... and keep the safe default */
      }
    }
  }

  return {
    host,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    ssl,
  };
}
