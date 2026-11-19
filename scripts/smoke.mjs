import assert from "node:assert/strict";
import { pbkdf2Sync } from "node:crypto";
import worker from "../worker/index.js";

const extinguishers = [], inspections = [];
const db = {
  prepare(sql) {
    let args = [];
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() {
        if (sql.includes("WHERE code=? AND id<>?")) return extinguishers.find((x) => x.code === args[0] && x.id !== args[1]) ?? null;
        if (sql.includes("WHERE code=?")) return extinguishers.find((x) => x.code === args[0]) ?? null;
        if (sql.includes("FROM extinguishers WHERE id=?")) return extinguishers.find((x) => x.id === args[0]) ?? null;
        return null;
      },
      async all() {
        if (sql.includes("LEFT JOIN inspections")) return { results: extinguishers.map((e) => {
          const last = inspections.filter((i) => i.extinguisher_id === e.id).sort((a, b) => b.inspected_on.localeCompare(a.inspected_on))[0];
          return { ...e, inspected_on: last?.inspected_on, result: last?.result };
        }) };
        return { results: inspections.filter((i) => i.extinguisher_id === args[0]) };
      },
      async run() {
        if (sql.includes("INSERT INTO extinguishers")) {
          const keys = ["id", "code", "location", "building", "type", "capacity", "serial_number", "expiry_date", "installed_date", "created_at", "created_by"];
          extinguishers.push(Object.fromEntries(keys.map((k, i) => [k, args[i]])));
        } else if (sql.includes("UPDATE extinguishers SET")) {
          const keys = ["code", "location", "building", "type", "capacity", "serial_number", "expiry_date", "installed_date"];
          const target = extinguishers.find((e) => e.id === args[8]);
          if (target) keys.forEach((k, i) => { target[k] = args[i]; });
        } else {
          const keys = ["id", "extinguisher_id", "inspected_on", "inspector", "inspector_user_id", "pressure", "pin", "hose", "body", "access", "label", "notes", "result", "created_at"];
          inspections.push(Object.fromEntries(keys.map((k, i) => [k, args[i]])));
        }
        return { success: true };
      },
    };
    return statement;
  },
};

const password = "smoke-password";
const salt = Buffer.from("smoke-test-salt");
const hash = pbkdf2Sync(password, salt, 1000, 32, "sha256").toString("base64");
const env = {
  DB: db,
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD_HASH: `pbkdf2$1000$${salt.toString("base64")}$${hash}`,
  SESSION_SECRET: "smoke-session-secret",
  ADMIN_LOGIN_PATH: "/staff-access",
};

const origin = "https://example.test";
const baseHeaders = { origin };
const send = (path, { method = "GET", body, cookie } = {}) => {
  const headers = { ...baseHeaders };
  if (cookie) headers.cookie = cookie;
  if (body) headers["content-type"] = "application/x-www-form-urlencoded";
  return worker.fetch(new Request(origin + path, { method, headers, body }), env);
};
const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];

// ผู้เยี่ยมชมดูข้อมูลได้ แต่เพิ่ม/แก้ไขไม่ได้
assert.equal((await send("/")).status, 200);
const homeHtml = await (await send("/")).text();
assert.doesNotMatch(homeHtml, /เข้าสู่ระบบ/);
assert.equal((await send("/login")).status, 404);
let r = await send("/new");
assert.equal(r.status, 303);
assert.equal(r.headers.get("location"), "/staff-access?return_to=%2Fnew");
r = await send("/new", { method: "POST", body: new URLSearchParams({ code: "FE-999", location: "x", building: "", type: "โฟม", capacity: "6 ปอนด์", expiry: "2030-01-01" }) });
assert.equal(r.status, 303);
assert.equal(extinguishers.length, 0);

// เข้าสู่ระบบผิด/ถูกที่ path ลับ
r = await send("/staff-access", { method: "POST", body: new URLSearchParams({ username: "admin", password: "wrong", return_to: "/" }) });
assert.equal(r.status, 401);
r = await send("/staff-access", { method: "POST", body: new URLSearchParams({ username: "admin", password, return_to: "/new" }) });
assert.equal(r.status, 303);
assert.equal(r.headers.get("location"), "/new");
const adminCookie = cookieOf(r);
assert.match(adminCookie, /^tif_session=/);

// admin เพิ่มถังได้
r = await send("/new", { method: "POST", cookie: adminCookie, body: new URLSearchParams({ code: "FE-001", location: "หน้าห้องประชุม", building: "อาคาร A", type: "CO₂", capacity: "10 ปอนด์", expiry: "2030-11-18" }) });
assert.equal(r.status, 303);
const path = r.headers.get("location");
assert.match(path, /^\/e\/[0-9a-f-]+$/);

// ผู้เยี่ยมชมดูรายละเอียดได้ แต่ไม่เห็นฟอร์มบันทึกผล
let detail = await (await send(path)).text();
assert.match(detail, /FE-001/);
assert.doesNotMatch(detail, /\/inspect/);
assert.doesNotMatch(detail, /เข้าสู่ระบบ/);
assert.doesNotMatch(detail, /ประวัติการตรวจ/);
r = await send(path + "/inspect", { method: "POST", body: new URLSearchParams({ inspected_on: "2026-11-18", inspector: "x" }) });
assert.equal(r.status, 303);
assert.equal(inspections.length, 0);

// admin บันทึกผลตรวจได้
r = await send(path + "/inspect", { method: "POST", cookie: adminCookie, body: new URLSearchParams({ inspected_on: "2026-11-18", inspector: "Save", pressure: "pass", pin: "pass", hose: "fail", body: "pass", access: "pass", label: "pass", notes: "เปลี่ยนสายฉีด" }) });
assert.equal(r.status, 303);
assert.equal(inspections.length, 1);
detail = await (await send(path, { cookie: adminCookie })).text();
assert.match(detail, /พบปัญหา/);
assert.match(detail, /เปลี่ยนสายฉีด/);
assert.match(detail, /แก้ไขข้อมูล/);
const viewerDetail = await (await send(path)).text();
assert.doesNotMatch(viewerDetail, /เปลี่ยนสายฉีด/);

// หน้าแก้ไข: ผู้เยี่ยมชมเข้าไม่ได้, admin เข้าได้และบันทึกได้
r = await send(path + "/edit");
assert.equal(r.status, 303);
r = await send(path + "/edit", { cookie: adminCookie });
assert.equal(r.status, 200);
assert.match(await r.text(), /FE-001/);
r = await send(path + "/edit", { method: "POST", cookie: adminCookie, body: new URLSearchParams({ code: "FE-001", location: "หน้าลิฟต์", building: "อาคาร A", type: "CO₂", capacity: "10 ปอนด์", expiry: "2030-11-18" }) });
assert.equal(r.status, 303);
assert.match(await (await send(path)).text(), /หน้าลิฟต์/);

// ออกจากระบบแล้วแก้ไขไม่ได้
r = await send("/logout", { method: "POST", cookie: adminCookie });
assert.equal(r.status, 303);
assert.match(r.headers.get("set-cookie"), /Max-Age=0/);

console.log("Smoke test passed: viewer read-only, admin login, register, inspect, edit and history");
