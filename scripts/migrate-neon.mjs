// Creates the TIF FireSafe tables in a Neon Postgres database.
// Usage: ตั้ง DATABASE_URL ใน .env แล้วรัน `npm run migrate:neon`
import { readdir, readFile } from "node:fs/promises";
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

const db = neonDatabase(connectionString);
const files = (await readdir(new URL("../drizzle", import.meta.url)))
  .filter((name) => name.endsWith(".postgres.sql"))
  .sort();
for (const file of files) {
  const schema = await readFile(new URL("../drizzle/" + file, import.meta.url), "utf8");
  const statements = schema
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await db.prepare(statement).run();
  }
}

const tables = await db
  .prepare("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() ORDER BY table_name")
  .all();
console.log("Neon schema ready:", tables.results.map((row) => row.table_name).join(", "));
