// Local preview server: serves worker/index.js over HTTP with an in-memory
// SQLite database, so the app can be opened in a browser without Cloudflare.
// Requires Node.js 22.5+ for node:sqlite. Not part of the deployable artifact.
import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import worker from "../worker/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.env.PORT ?? 8787);

// Minimal D1 shim over node:sqlite: only the prepare/bind/first/all/run subset
// that worker/index.js actually uses.
const createD1 = (db) => ({
  prepare(sql) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() { return db.prepare(sql).get(...args) ?? null; },
      async all() { return { results: db.prepare(sql).all(...args) }; },
      async run() { return db.prepare(sql).run(...args); },
    };
    return statement;
  },
});

const applyMigration = async (db) => {
  const migration = await readFile(resolve(root, "drizzle/0000_fire_inspection.sql"), "utf8");
  for (const statement of migration.split("--> statement-breakpoint")) {
    const sql = statement.trim().replace(/;+$/, "");
    if (sql) db.exec(sql);
  }
};

export async function createApp({ databaseUrl = process.env.DATABASE_URL } = {}) {
  const db = databaseUrl ? null : new DatabaseSync(":memory:");
  if (db) await applyMigration(db);
  const env = {
    ...(databaseUrl ? { DATABASE_URL: databaseUrl } : { DB: createD1(db) }),
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    ADMIN_DISPLAY_NAME: process.env.ADMIN_DISPLAY_NAME,
    ADMIN_LOGIN_PATH: process.env.ADMIN_LOGIN_PATH,
    SESSION_SECRET: process.env.SESSION_SECRET,
  };

  return {
    close() { db?.close(); },
    async fetch(request) {
      const url = new URL(request.url);
      const headers = new Headers(request.headers);
      // Browsers send Origin on same-origin form posts; the worker rejects mismatches.
      if (request.method === "POST") headers.set("origin", url.origin);
      return worker.fetch(
        new Request(url, { method: request.method, headers, body: request.body, duplex: "half" }),
        env,
      );
    },
  };
}

const hopByHop = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade"]);

const httpHandler = (app) => async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const origin = `http://${req.headers.host ?? `localhost:${port}`}`;
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || hopByHop.has(key)) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const response = await app.fetch(new Request(new URL(req.url, origin), {
      method: req.method,
      headers,
      body,
      duplex: "half",
    }));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error("Local preview request failed", err);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("Local preview failed: " + (err?.message ?? err));
  }
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.loadEnvFile(".env");
  } catch {
    // ไม่มี .env ก็ใช้ environment variable ปกติ
  }
  const app = await createApp();
  createHttpServer(httpHandler(app)).listen(port, () => {
    const store = process.env.DATABASE_URL
      ? `Neon Postgres (${process.env.DATABASE_URL.replace(/:\/\/([^:/@]+):[^@]+@/, "://$1:***@")})`
      : "SQLite ในหน่วยความจำ (ข้อมูลหายเมื่อปิด)";
    console.log(`TIF FireSafe local preview: http://localhost:${port}`);
    console.log(`ฐานข้อมูล: ${store}`);
    console.log(process.env.ADMIN_PASSWORD_HASH ? "โหมดผู้ดูแล: เปิดใช้งาน (ADMIN_PASSWORD_HASH พร้อม)" : "โหมดผู้ดูแล: ปิด (ยังไม่มี ADMIN_PASSWORD_HASH ใน .env)");
    console.log("กด Ctrl+C เพื่อปิด");
  });
}
