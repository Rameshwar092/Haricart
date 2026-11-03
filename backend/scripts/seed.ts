/**
 * First-time data for a new database: one active shop and two categories.
 * Safe to run more than once. Add your real products from the Owner workspace.
 *   pnpm db:seed
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { getDatabaseConnection } from "../src/_core/dbConnection";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Put it in backend/.env first.");
  process.exit(1);
}

const connection = await mysql.createConnection(getDatabaseConnection(process.env.DATABASE_URL));
try {
  const categories: Array<[string, string, string, number]> = [
    ["Fresh vegetables", "fresh-vegetables", "Handpicked produce for the GreenGate community.", 1],
    ["Daily essentials", "daily-essentials", "Everyday fruit and grocery essentials for your apartment.", 2],
  ];
  for (const [name, slug, description, displayOrder] of categories) {
    await connection.execute(
      "INSERT INTO categories (name, slug, description, displayOrder, isActive) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), displayOrder = VALUES(displayOrder)",
      [name, slug, description, displayOrder, true]
    );
  }
  const [shops] = await connection.execute("SELECT id FROM shops WHERE name = ? LIMIT 1", ["GreenGate Grocer"]);
  if (!(shops as Array<{ id: number }>)[0]) {
    await connection.execute("INSERT INTO shops (name, description, status, commissionRate) VALUES (?, ?, ?, ?)", [
      "GreenGate Grocer",
      "A resident-first neighbourhood grocery counter for GreenGate Residences.",
      "active",
      "0.00",
    ]);
  }
  console.log("✓ Shop and categories are ready. Add products from the Owner workspace.");
} finally {
  await connection.end();
}
