// Creates the TIF FireSafe tables in a Neon Postgres database.
// Usage: ตั้ง DATABASE_URL ใน .env แล้วรัน `npm run migrate:neon`
import { readFile } from "node:fs/promises";
import { neonDatabase } from "../worker/index.js";

try {
  process.loadEnvFile(".env");
} catch {
  // ไม่มีไฟล์ .env ก็ใช้ค่าจาก environment variable แทน
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ไม่พบ DATABASE_URL — ใส่ connection string ของ Neon ใน .env ก่อน");
  process.exit(1);
}

const schema = await readFile(
  new URL("../drizzle/0000_fire_inspection.postgres.sql", import.meta.url),
  "utf8",
);
const statements = schema
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const db = neonDatabase(connectionString);
for (const statement of statements) {
  await db.prepare(statement).run();
}

const tables = await db
  .prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name")
  .all();
console.log("Neon schema ready:", tables.results.map((row) => row.table_name).join(", "));
