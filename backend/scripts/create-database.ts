/**
 * Creates the database named in DATABASE_URL if it does not exist yet.
 * Run once for a new TiDB / MySQL server:  pnpm db:setup
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { getDatabaseConnection } from "../src/_core/dbConnection";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is missing. Put it in backend/.env first.");
  process.exit(1);
}

const { database, ...server } = getDatabaseConnection(url);
if (!database || !/^[A-Za-z0-9_]+$/.test(database)) {
  console.error(`Put a simple database name at the end of DATABASE_URL (letters, numbers, _), e.g. .../haricart — got "${database}".`);
  process.exit(1);
}

try {
  const connection = await mysql.createConnection({ ...server, connectTimeout: 15_000 });
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await connection.end();
  console.log(`✓ Connected to ${server.host} and database "${database}" is ready.`);
} catch (error) {
  const e = error as { code?: string; message?: string };
  console.error(`✗ Could not connect to ${server.host}: ${e.code ?? ""} ${e.message ?? error}`);
  if (e.code === "ER_ACCESS_DENIED_ERROR") console.error("  → Check the user name and password in DATABASE_URL.");
  if (e.code === "ENOTFOUND") console.error("  → Check the host name in DATABASE_URL.");
  process.exit(1);
}
