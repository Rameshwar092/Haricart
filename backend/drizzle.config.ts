import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { getDatabaseConnection } from "./src/_core/dbConnection";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands (put it in backend/.env)");
}

const { host, port, user, password, database, ssl } = getDatabaseConnection(connectionString);

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { host, port, user, password, database, ssl: ssl as never },
});
