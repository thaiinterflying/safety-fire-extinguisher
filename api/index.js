// Vercel Serverless Function adapter: แปลง Node request/response เป็น Web API
// แล้วเรียก worker ตัวเดียวกับที่ใช้บน Cloudflare/D1
import worker from "../worker/index.js";

const hopByHop = new Set(["connection", "keep-alive", "transfer-encoding", "upgrade"]);

const readBody = async (req) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string" || Buffer.isBuffer(req.body)) return req.body;
    const type = String(req.headers["content-type"] || "");
    return type.includes("application/x-www-form-urlencoded")
      ? new URLSearchParams(req.body).toString()
      : JSON.stringify(req.body);
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
};

export default async function handler(req, res) {
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim();
  const url = new URL(req.url || "/", `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || hopByHop.has(key)) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }

  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);
  if (body !== undefined) headers.delete("content-length");

  const response = await worker.fetch(
    new Request(url, { method: req.method, headers, body, duplex: "half" }),
    {
      DATABASE_URL: process.env.DATABASE_URL,
      ADMIN_USERNAME: process.env.ADMIN_USERNAME,
      ADMIN_DISPLAY_NAME: process.env.ADMIN_DISPLAY_NAME,
      ADMIN_LOGIN_PATH: process.env.ADMIN_LOGIN_PATH,
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
      SESSION_SECRET: process.env.SESSION_SECRET,
    },
  );

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}
