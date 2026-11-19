const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const fmt = (d) => d ? new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")) : "ยังไม่มีข้อมูล";
const addMonth = (date) => { const [y,m,d] = date.split("-").map(Number); const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); return `${y + (m === 12 ? 1 : 0)}-${String(m === 12 ? 1 : m + 1).padStart(2,"0")}-${String(Math.min(d,last)).padStart(2,"0")}`; };
const validDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T12:00:00Z").getTime()) && new Date(s + "T12:00:00Z").toISOString().startsWith(s);
const cut = (v, n = 200) => String(v ?? "").trim().slice(0,n);
const status = (row, now) => {
  if (row.expiry_date < now) return ["expired","หมดอายุ"];
  if (row.result === "failed") return ["failed","พบปัญหา"];
  if (!row.inspected_on) return ["new","ยังไม่ตรวจ"];
  const due = addMonth(row.inspected_on);
  if (due < now) return ["overdue","เลยกำหนด"];
  const near = new Date(now + "T12:00:00Z"); near.setUTCDate(near.getUTCDate() + 7);
  if (due <= near.toISOString().slice(0,10)) return ["due","ใกล้ครบกำหนด"];
  return ["ok","ปกติ"];
};
const badge = (row, now) => { const [cls,label] = status(row,now); return `<span class="badge ${cls}">${label}</span>`; };
// Neon Postgres ผ่าน HTTP endpoint ของ Neon serverless driver (ไม่ต้องใช้ dependency)
// รับ SQL ที่ใช้ ? เป็น placeholder แล้วแปลงเป็น $1, $2, ... ก่อนส่ง
const neonDatabase = (connectionString) => {
  const host = new URL(connectionString).hostname;
  const query = async (sql, params) => {
    let n = 0;
    const res = await fetch(`https://${host}/sql`, {
      method: "POST",
      headers: { "content-type": "application/json", "neon-connection-string": connectionString },
      body: JSON.stringify({ query: sql.replace(/\?/g, () => "$" + (++n)), params }),
    });
    if (!res.ok) throw new Error(`Neon query failed (${res.status}): ${await res.text()}`);
    return res.json();
  };
  return {
    prepare(sql) {
      let args = [];
      const statement = {
        bind(...values) { args = values; return statement; },
        async first() { return (await query(sql, args)).rows[0] ?? null; },
        async all() { return { results: (await query(sql, args)).rows }; },
        async run() { const out = await query(sql, args); return { success: true, meta: { changes: out.rowCount } }; },
      };
      return statement;
    },
  };
};
export { neonDatabase };
const stylesheet = `
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f4f6f7;color:#24343d;font:14px/1.5 Arial,"Noto Sans Thai",sans-serif}a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}button{cursor:pointer}.shell{min-height:100vh;display:grid;grid-template-columns:232px minmax(0,1fr)}aside{background:#192a34;color:#c0ced3;padding:27px 18px;display:flex;flex-direction:column}.brand{display:flex;gap:10px;align-items:center;color:white;font-weight:800;font-size:17px;padding:0 8px}.mark{background:#da583a;border-radius:10px;width:37px;height:37px;display:grid;place-items:center;font-size:21px}.brand small{display:block;color:#8299a3;font-size:10px;font-weight:400;letter-spacing:1px}.navtitle{font-size:10px;letter-spacing:2px;color:#78929d;margin:43px 13px 12px}.nav{padding:11px 13px;border-radius:9px;background:#2b3e48;color:white;font-weight:700}.asidefoot{margin-top:auto;border-top:1px solid #344a55;padding:19px 10px;color:#859aa4;font-size:12px}header{height:70px;background:white;border-bottom:1px solid #e4e9ec;padding:0 35px;display:flex;align-items:center;justify-content:space-between;color:#71818a;font-size:12px}.chip{border-radius:50px;background:#f1f5f5;padding:8px 12px}.content{max-width:1250px;margin:auto;padding:33px 35px 70px}.eyebrow{color:#d05738;font-size:11px;letter-spacing:1.6px;font-weight:800;margin:0 0 7px}.heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:25px}h1{font-size:32px;letter-spacing:-.6px;line-height:1.25;margin:0}h2{font-size:18px;margin:0}.muted{color:#82919a;margin:8px 0 0}.button{display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;padding:11px 16px;background:#da583a;color:white;font-weight:700;white-space:nowrap}.button:hover{background:#c74c31}.button.secondary{background:white;border:1px solid #d8e0e3;color:#455760}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}.stat,.panel{background:white;border:1px solid #e3e9eb;border-radius:12px}.stat{padding:19px 20px}.stat small{color:#83929a}.stat strong{display:block;font-size:30px;margin-top:6px;color:#273840}.stat .orange{color:#d2623e}.stat .red{color:#c75148}.stat .green{color:#218368}.panel{margin-top:18px;overflow:hidden}.panelhead{padding:20px 22px;border-bottom:1px solid #eef1f2;display:flex;justify-content:space-between;align-items:center;gap:10px}.panelhead p{margin:3px 0 0;color:#8b99a0;font-size:12px}.panelbody{padding:22px}.tablewrap{overflow:auto}table{border-collapse:collapse;width:100%;text-align:left}th{font-size:11px;letter-spacing:.3px;color:#85939b;background:#fafbfb;padding:13px 19px;white-space:nowrap}td{border-top:1px solid #eff2f3;padding:16px 19px;white-space:nowrap}td small{display:block;color:#95a1a7;margin-top:4px}.code{font-weight:800}.link{color:#c95135;font-weight:800}.badge{border-radius:30px;padding:5px 10px;font-size:11px;font-weight:800;white-space:nowrap}.badge:before{content:"●";font-size:7px;margin-right:6px}.ok{background:#e9f7f0;color:#258267}.due{background:#fff3db;color:#b47a26}.expired,.failed,.overdue{background:#fceae7;color:#ba5145}.new{background:#edf1f3;color:#697b84}.empty{text-align:center;color:#94a2aa;padding:40px 18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.field{display:flex;flex-direction:column;gap:6px}.field label{font-size:12px;color:#51616a;font-weight:700}.field input,.field select,.field textarea{border:1px solid #dbe3e6;border-radius:8px;min-height:42px;padding:10px 11px;outline:0;width:100%;background:white;color:#263840}.field textarea{min-height:86px}.field input:focus,.field select:focus,.field textarea:focus{border-color:#da583a;box-shadow:0 0 0 3px #da583a19}.full{grid-column:1/-1}.actions{margin-top:20px;display:flex;justify-content:flex-end;gap:10px}.twocol{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(270px,.8fr);gap:18px;align-items:start}.kv{display:grid;grid-template-columns:1fr 1fr;gap:22px}.kv small{display:block;color:#92a0a6;margin-bottom:5px}.qr{text-align:center}.qr img{width:190px;height:190px;max-width:100%;margin:10px auto}.qr p{color:#85959d;font-size:12px;word-break:break-all}.checkgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.check{border:1px solid #e1e8ea;border-radius:8px;padding:11px;display:flex;justify-content:space-between;align-items:center;gap:10px}.check select{border:1px solid #dbe3e6;border-radius:7px;padding:6px;background:white}.history{border-left:3px solid #d6e0e3;background:#fafbfb;border-radius:0 8px 8px 0;padding:12px 15px;margin-bottom:10px}.history small{display:block;color:#7e8d96;margin-top:4px}.error{background:#fff4ef;border:1px solid #f4d4c8;border-radius:8px;padding:12px 15px;color:#b45239;margin:0 0 17px}.back{display:inline-block;color:#788891;font-size:12px;margin-bottom:15px}.hint{font-size:12px;color:#8998a0;margin:12px 0 0}@media(max-width:950px){.shell{grid-template-columns:1fr}aside{flex-direction:row;align-items:center;justify-content:space-between;padding:13px 18px}.navtitle,.asidefoot{display:none}.nav{font-size:12px}.twocol{grid-template-columns:1fr}.stats{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){header{height:54px;padding:0 17px}.chip{display:none}.content{padding:22px 15px 55px}.heading{align-items:start;flex-direction:column}h1{font-size:26px}.stats{gap:8px}.stat{padding:13px}.stat strong{font-size:24px}.grid,.checkgrid{grid-template-columns:1fr}.panelhead,.panelbody{padding:16px}.brand{font-size:14px}.mark{width:32px;height:32px}}@media print{aside,header,.no-print{display:none!important}.shell{display:block}.content{padding:0}.panel{border:none}.qr img{width:240px;height:240px}}
`;
const SESSION_COOKIE = "tif_session";
const encoder = new TextEncoder();
const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = (value) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const sessionSecret = (env) => env.SESSION_SECRET || env.ADMIN_PASSWORD_HASH || "tif-firesafe-local-dev";
const sign = async (env, payload) => {
  const key = await crypto.subtle.importKey("raw", encoder.encode(sessionSecret(env)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
};
const sessionValue = async (env) => {
  const payload = "admin." + (Math.floor(Date.now() / 1000) + 12 * 3600);
  return payload + "." + (await sign(env, payload));
};
const cookieValue = (request) => {
  const raw = request.headers.get("cookie") || "";
  const match = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(SESSION_COOKIE + "="));
  return match ? match.slice(SESSION_COOKIE.length + 1) : "";
};
const isAdmin = async (request, env) => {
  const parts = cookieValue(request).split(".");
  if (parts.length !== 3) return false;
  const [role, exp, signature] = parts;
  if (role !== "admin" || !/^\d+$/.test(exp) || Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = await sign(env, role + "." + exp);
  let diff = expected.length ^ signature.length;
  for (let i = 0; i < Math.min(expected.length, signature.length); i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
};
const cookieHeader = (request, value) => {
  const secure = new URL(request.url).protocol === "https:";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}; Max-Age=${value ? 43200 : 0}`;
};
const textEquals = (a, b) => {
  const x = encoder.encode(String(a ?? "")), y = encoder.encode(String(b ?? ""));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.min(x.length, y.length); i++) diff |= x[i] ^ y[i];
  return diff === 0;
};
const passwordMatches = async (env, password) => {
  const [scheme, iterations, salt, hash] = String(env.ADMIN_PASSWORD_HASH || "").split("$");
  if (scheme !== "pbkdf2" || !Number(iterations) || !salt || !hash) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64(salt), iterations: Number(iterations) }, key, 256));
  const expected = fromBase64(hash);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
};
const safeNext = (value) => {
  const next = cut(value, 300);
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
};
const layout = (title, content, user, admin = false, returnTo = "/") => {
  const auth = admin
    ? '<form method="post" action="/logout" style="display:inline;margin:0"><button class="chip" type="submit" style="border:0">ออกจากระบบ</button></form>'
    : '<a class="chip" href="/login?return_to=' + encodeURIComponent(returnTo) + '">เข้าสู่ระบบ</a>';
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | TIF FireSafe</title><style>${stylesheet}</style></head><body><div class="shell"><aside><a class="brand" href="/"><span class="mark">✳</span><span>TIF FireSafe<small>SAFETY MANAGEMENT</small></span></a><div class="navtitle">เมนูหลัก</div><a class="nav" href="/">▦ &nbsp; ภาพรวมและทะเบียนถัง</a><div class="asidefoot">ระบบตรวจสอบถังดับเพลิง<br>Thai Inter Flying</div></aside><main><header><span>ความปลอดภัย / <strong>${esc(title)}</strong></span><span style="display:flex;gap:8px;align-items:center"><span class="chip">${esc(user)}</span>${auth}</span></header><div class="content">${content}</div></main></div></body></html>`;
};
const response = (html, code = 200, headers = {}) => new Response(html, { status: code, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; img-src https://api.qrserver.com; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", ...headers } });
const go = (path, headers = {}) => new Response(null, { status: 303, headers: { location: path, ...headers } });
const field = (key, label, type = "text", required = true, extra = "") => `<div class="field"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" ${required ? "required" : ""} ${extra}></div>`;
const error = (message) => `<div class="error">${esc(message)}</div>`;
const summary = async (db) => db.prepare(`SELECT e.*, i.inspected_on, i.result FROM extinguishers e LEFT JOIN inspections i ON i.id=(SELECT id FROM inspections WHERE extinguisher_id=e.id ORDER BY inspected_on DESC, created_at DESC LIMIT 1) ORDER BY e.created_at DESC`).all();
const home = async (db, user, admin) => {
  const rows = (await summary(db)).results ?? [], now = today();
  const counts = { ok:0, due:0, overdue:0, failed:0, expired:0, new:0 };
  rows.forEach((r) => counts[status(r,now)[0]]++);
  const table = rows.length ? rows.map((r) => `<tr><td><span class="code">${esc(r.code)}</span><small>${esc(r.serial_number || "ไม่มี S/N")}</small></td><td>${esc(r.location)}<small>${esc(r.building)}</small></td><td>${esc(r.type)} · ${esc(r.capacity)}</td><td>${fmt(r.inspected_on)}</td><td>${r.inspected_on ? fmt(addMonth(r.inspected_on)) : "—"}</td><td>${badge(r,now)}</td><td><a class="link" href="/e/${encodeURIComponent(r.id)}">ดูข้อมูล →</a></td></tr>`).join("") : `<tr><td colspan="7" class="empty">ยังไม่มีถังในระบบ${admin ? " กด “เพิ่มถังดับเพลิง” เพื่อเริ่มใช้งาน" : ""}</td></tr>`;
  const action = admin ? '<a href="/new" class="button">＋ เพิ่มถังดับเพลิง</a>' : '<a href="/login?return_to=%2F" class="button secondary">เข้าสู่ระบบผู้ดูแล</a>';
  return layout("ภาพรวม", `<div class="heading"><div><p class="eyebrow">FIRE SAFETY / OVERVIEW</p><h1>ตรวจถังดับเพลิง</h1><p class="muted">ดูสถานะล่าสุดและติดตามกำหนดตรวจรายเดือนในที่เดียว</p></div>${action}</div><div class="stats"><div class="stat"><small>ถังทั้งหมด</small><strong>${rows.length}</strong></div><div class="stat"><small>สถานะปกติ</small><strong class="green">${counts.ok}</strong></div><div class="stat"><small>ใกล้ครบ / เลยกำหนด</small><strong class="orange">${counts.due + counts.overdue}</strong></div><div class="stat"><small>พบปัญหา / หมดอายุ</small><strong class="red">${counts.failed + counts.expired}</strong></div></div><section class="panel"><div class="panelhead"><div><h2>ทะเบียนถังดับเพลิง</h2><p>เลือกถังเพื่อดู QR และประวัติการตรวจ</p></div><span class="muted">${rows.length} รายการ</span></div><div class="tablewrap"><table><thead><tr><th>รหัสถัง</th><th>จุดติดตั้ง</th><th>ชนิด / ขนาด</th><th>ตรวจล่าสุด</th><th>ครบกำหนดครั้งถัดไป</th><th>สถานะ</th><th></th></tr></thead><tbody>${table}</tbody></table></div></section>`, user, admin);
};
const loginPage = (returnTo, message = "") => layout("เข้าสู่ระบบผู้ดูแล", `<a class="back" href="/">← กลับหน้าแรก</a><div class="heading"><div><p class="eyebrow">ADMIN / SIGN IN</p><h1>เข้าสู่ระบบผู้ดูแล</h1><p class="muted">ผู้เยี่ยมชมดูข้อมูลได้โดยไม่ต้องเข้าสู่ระบบ แต่การเพิ่ม แก้ไข และบันทึกผลตรวจต้องเป็นผู้ดูแล</p></div></div>${message ? error(message) : ""}<section class="panel"><div class="panelhead"><h2>บัญชีผู้ดูแล</h2></div><div class="panelbody"><form method="post" action="/login"><div class="grid"><div class="field"><label for="username">ชื่อผู้ใช้ *</label><input id="username" name="username" autocomplete="username" maxlength="60" required></div><div class="field"><label for="password">รหัสผ่าน *</label><input id="password" name="password" type="password" autocomplete="current-password" required></div></div><input type="hidden" name="return_to" value="${esc(returnTo)}"><div class="actions"><a class="button secondary" href="/">ยกเลิก</a><button class="button">เข้าสู่ระบบ</button></div></form></div></section>`, "ผู้เยี่ยมชม");
const newPage = (user, message = "") => layout("เพิ่มถังดับเพลิง", `<a class="back" href="/">← กลับไปหน้าแรก</a><div class="heading"><div><p class="eyebrow">REGISTER / NEW EXTINGUISHER</p><h1>เพิ่มถังดับเพลิง</h1><p class="muted">สร้างรหัสประจำถังเพื่อใช้ทำ QR ติดที่ตัวถัง</p></div></div>${message ? error(message) : ""}<section class="panel"><div class="panelhead"><h2>ข้อมูลประจำถัง</h2></div><div class="panelbody"><form action="/new" method="post"><div class="grid">${field("code","รหัสถัง *","text",true,'placeholder="เช่น FE-001" maxlength="40"')}${field("location","จุดติดตั้ง *","text",true,'placeholder="เช่น หน้าห้องประชุม" maxlength="160"')}${field("building","อาคาร / ชั้น","text",false,'placeholder="เช่น อาคารสำนักงาน ชั้น 2" maxlength="120"')}<div class="field"><label for="type">ชนิดถัง *</label><select id="type" name="type" required><option value="ผงเคมีแห้ง">ผงเคมีแห้ง</option><option value="CO₂">CO₂</option><option value="โฟม">โฟม</option><option value="น้ำ">น้ำ</option><option value="อื่น ๆ">อื่น ๆ</option></select></div>${field("capacity","ขนาด *","text",true,'placeholder="เช่น 10 ปอนด์" maxlength="60"')}${field("serial","หมายเลข S/N","text",false,'maxlength="80"')}${field("expiry","วันหมดอายุ / กำหนดบำรุงรักษา *","date")}${field("installed","วันที่ติดตั้ง","date",false)}</div><div class="actions"><a class="button secondary" href="/">ยกเลิก</a><button class="button">บันทึกและสร้าง QR</button></div></form></div></section>`, user, true);
const editPage = (e, user, message = "") => {
  const typeOptions = ["ผงเคมีแห้ง","CO₂","โฟม","น้ำ","อื่น ๆ"].map((t) => `<option value="${esc(t)}" ${e.type === t ? "selected" : ""}>${esc(t)}</option>`).join("");
  return layout("แก้ไขถัง " + e.code, `<a class="back" href="/e/${encodeURIComponent(e.id)}">← กลับไปหน้าถัง</a><div class="heading"><div><p class="eyebrow">ADMIN / EDIT EXTINGUISHER</p><h1>แก้ไขถัง ${esc(e.code)}</h1><p class="muted">แก้ไขข้อมูลประจำถังหรือกำหนดการบำรุงรักษา</p></div></div>${message ? error(message) : ""}<section class="panel"><div class="panelhead"><h2>ข้อมูลประจำถัง</h2></div><div class="panelbody"><form action="/e/${encodeURIComponent(e.id)}/edit" method="post"><div class="grid">${field("code","รหัสถัง *","text",true,`value="${esc(e.code)}" maxlength="40"`)}${field("location","จุดติดตั้ง *","text",true,`value="${esc(e.location)}" maxlength="160"`)}${field("building","อาคาร / ชั้น","text",false,`value="${esc(e.building)}" maxlength="120"`)}<div class="field"><label for="type">ชนิดถัง *</label><select id="type" name="type" required>${typeOptions}</select></div>${field("capacity","ขนาด *","text",true,`value="${esc(e.capacity)}" maxlength="60"`)}${field("serial","หมายเลข S/N","text",false,`value="${esc(e.serial_number)}" maxlength="80"`)}${field("expiry","วันหมดอายุ / กำหนดบำรุงรักษา *","date",true,`value="${esc(e.expiry_date)}"`)}${field("installed","วันที่ติดตั้ง","date",false,`value="${esc(e.installed_date)}"`)}</div><div class="actions"><a class="button secondary" href="/e/${encodeURIComponent(e.id)}">ยกเลิก</a><button class="button">บันทึกการแก้ไข</button></div></form></div></section>`, user, true, "/e/" + encodeURIComponent(e.id));
};
const checks = [["pressure","เกจแรงดัน / น้ำหนัก"],["pin","สลักและซีล"],["hose","สายและหัวฉีด"],["body","ตัวถังและสนิม"],["access","การเข้าถึง / สิ่งกีดขวาง"],["label","ฉลากและป้ายวิธีใช้"]];
const detail = async (db, id, user, admin, origin, msg = "") => {
  const e = await db.prepare("SELECT * FROM extinguishers WHERE id=?").bind(id).first();
  if (!e) return response(layout("ไม่พบถัง", `<h1>ไม่พบถังดับเพลิง</h1><p class="muted">ตรวจสอบรหัส QR หรือกลับไปหน้าทะเบียน</p><a class="button" href="/">กลับหน้าแรก</a>`, user, admin),404);
  const history = (await db.prepare("SELECT * FROM inspections WHERE extinguisher_id=? ORDER BY inspected_on DESC, created_at DESC LIMIT 50").bind(id).all()).results ?? [];
  const last = history[0], now = today(), row = { ...e, inspected_on: last?.inspected_on, result: last?.result };
  const link = origin + "/e/" + encodeURIComponent(id);
  const qr = "https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=" + encodeURIComponent(link);
  const historyHtml = history.length ? history.map((h) => `<div class="history"><strong>${fmt(h.inspected_on)} · ${h.result === "passed" ? "ผ่านการตรวจ" : "พบปัญหา"}</strong><small>ผู้ตรวจ: ${esc(h.inspector)} · บันทึกเมื่อ ${esc(h.created_at.slice(0,16).replace("T"," "))} UTC</small>${h.notes ? `<small>หมายเหตุ: ${esc(h.notes)}</small>` : ""}<small>${checks.filter(([k]) => h[k] === "fail").map(([,v]) => esc(v)).join(", ") || "ทุกหัวข้อผ่าน"}</small></div>`).join("") : '<div class="empty">ยังไม่มีประวัติการตรวจ</div>';
  const checkHtml = checks.map(([key,label]) => `<label class="check"><span>${label}</span><select name="${key}" aria-label="${label}" required><option value="pass">✓ ปกติ</option><option value="fail">✕ ผิดปกติ</option></select></label>`).join("");
  const inspectPanel = `<section class="panel"><div class="panelhead"><div><h2>บันทึกผลตรวจครั้งใหม่</h2><p>ตรวจสภาพจริงที่จุดติดตั้งก่อนบันทึก</p></div></div><div class="panelbody"><form method="post" action="/e/${encodeURIComponent(id)}/inspect"><div class="grid" style="margin-bottom:18px"><div class="field"><label for="inspected_on">วันที่ตรวจ *</label><input id="inspected_on" name="inspected_on" type="date" max="${now}" value="${now}" required></div><div class="field"><label for="inspector">ชื่อผู้ตรวจ *</label><input id="inspector" name="inspector" maxlength="100" placeholder="ชื่อ-นามสกุล" value="${esc(user)}" required></div></div><div class="checkgrid">${checkHtml}</div><div class="field" style="margin-top:17px"><label for="notes">หมายเหตุ / รายละเอียดที่ต้องแก้ไข</label><textarea id="notes" name="notes" maxlength="1000" placeholder="ระบุสิ่งที่พบหรือการดำเนินการ"></textarea></div><div class="actions"><button class="button">บันทึกผลตรวจ</button></div></form></div></section>`;
  const readOnlyPanel = `<section class="panel"><div class="panelhead"><div><h2>โหมดอ่านอย่างเดียว</h2><p>ผู้เยี่ยมชมดูข้อมูลได้ แต่ไม่สามารถบันทึกผลตรวจหรือแก้ไขข้อมูลถัง</p></div></div><div class="panelbody"><p class="muted" style="margin:0 0 15px">เข้าสู่ระบบด้วยบัญชีผู้ดูแลเพื่อบันทึกผลตรวจหรือแก้ไขข้อมูลถัง</p><a class="button" href="/login?return_to=${encodeURIComponent("/e/" + id)}">เข้าสู่ระบบผู้ดูแล</a></div></section>`;
  const editButton = admin ? `<a class="button secondary" href="/e/${encodeURIComponent(id)}/edit" style="margin-left:8px">แก้ไขข้อมูล</a>` : "";
  return response(layout("ถัง " + e.code, `<a class="back" href="/">← กลับไปทะเบียนถัง</a><div class="heading"><div><p class="eyebrow">EXTINGUISHER / ${esc(e.code)}</p><h1>ถังดับเพลิง ${esc(e.code)}</h1><p class="muted">${esc(e.location)} ${e.building ? "· " + esc(e.building) : ""}</p></div><div>${badge(row,now)}${editButton}</div></div>${msg ? error(msg) : ""}<div class="twocol"><div><section class="panel" style="margin-top:0"><div class="panelhead"><h2>ข้อมูลและกำหนดตรวจ</h2></div><div class="panelbody"><div class="kv"><div><small>ประเภท / ขนาด</small><strong>${esc(e.type)} · ${esc(e.capacity)}</strong></div><div><small>หมายเลข S/N</small><strong>${esc(e.serial_number || "—")}</strong></div><div><small>วันที่ตรวจล่าสุด</small><strong>${fmt(last?.inspected_on)}</strong></div><div><small>ตรวจครั้งถัดไป (รายเดือน)</small><strong>${last ? fmt(addMonth(last.inspected_on)) : "รอการตรวจครั้งแรก"}</strong></div><div><small>วันหมดอายุ / บำรุงรักษา</small><strong>${fmt(e.expiry_date)}</strong></div><div><small>วันที่ติดตั้ง</small><strong>${fmt(e.installed_date)}</strong></div></div></div></section>${admin ? inspectPanel : readOnlyPanel}<section class="panel"><div class="panelhead"><h2>ประวัติการตรวจ</h2><span class="muted">${history.length} รายการล่าสุด</span></div><div class="panelbody">${historyHtml}</div></section></div><div><section class="panel qr" style="margin-top:0"><div class="panelhead"><h2>QR ประจำถัง</h2></div><div class="panelbody"><img src="${esc(qr)}" alt="QR เปิดข้อมูลถัง ${esc(e.code)}" loading="lazy"><div class="code">${esc(e.code)}</div><p>สแกนด้วยกล้องโทรศัพท์เพื่อเปิดข้อมูลและบันทึกผลตรวจ</p><button onclick="window.print()" class="button secondary no-print" type="button">พิมพ์ QR</button><p class="hint no-print">ผู้ใช้งานต้องมีสิทธิ์เข้าถึงเว็บไซต์นี้ก่อน</p></div></section></div></div>`, user, admin, "/e/" + encodeURIComponent(id)));
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname;
    const db = env.DATABASE_URL ? neonDatabase(env.DATABASE_URL) : env.DB;
    const admin = await isAdmin(request, env);
    const user = admin ? (env.ADMIN_DISPLAY_NAME || "ผู้ดูแลระบบ") : "ผู้เยี่ยมชม";
    if (!db) return response(layout("ระบบไม่พร้อม", error("ฐานข้อมูลยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ"), user, admin),503);
    try {
      if (request.method === "POST") {
        if (request.headers.get("origin") !== url.origin) return response("Invalid origin",403);
        if (path === "/login") {
          const data = await request.formData();
          const next = safeNext(data.get("return_to"));
          if (!env.ADMIN_PASSWORD_HASH) return response(loginPage(next, "ระบบยังไม่ได้ตั้งค่ารหัสผ่านผู้ดูแล (ADMIN_PASSWORD_HASH)"),503);
          const username = cut(data.get("username"),60), password = String(data.get("password") ?? "");
          if (!textEquals(username, env.ADMIN_USERNAME || "admin") || !(await passwordMatches(env, password))) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            return response(loginPage(next, "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"),401);
          }
          return go(next, { "set-cookie": cookieHeader(request, await sessionValue(env)) });
        }
        if (path === "/logout") return go("/", { "set-cookie": cookieHeader(request, "") });
        const inspectMatch = path.match(/^\/e\/([0-9a-f-]+)\/inspect$/);
        const editMatch = path.match(/^\/e\/([0-9a-f-]+)\/edit$/);
        if (!(path === "/new" || inspectMatch || editMatch)) return response("Not found",404);
        if (!admin) return go("/login?return_to=" + encodeURIComponent(path));
        const data = await request.formData();
        if (path === "/new") {
          const code = cut(data.get("code"),40).toUpperCase(), location = cut(data.get("location"),160), building = cut(data.get("building"),120), type = cut(data.get("type"),60), capacity = cut(data.get("capacity"),60), serial = cut(data.get("serial"),80), expiry = cut(data.get("expiry"),10), installed = cut(data.get("installed"),10);
          if (!code || !location || !type || !capacity || !validDate(expiry) || (installed && !validDate(installed))) return response(newPage(user,"กรุณากรอกข้อมูลและวันที่ให้ครบถ้วน"),400);
          const existing = await db.prepare("SELECT id FROM extinguishers WHERE code=?").bind(code).first();
          if (existing) return response(newPage(user,"รหัสถังนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น"),409);
          const id = crypto.randomUUID();
          await db.prepare("INSERT INTO extinguishers (id,code,location,building,type,capacity,serial_number,expiry_date,installed_date,created_at,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(id,code,location,building,type,capacity,serial,expiry,installed,new Date().toISOString(),env.ADMIN_USERNAME || "admin").run();
          return go("/e/" + id);
        }
        if (editMatch) {
          const id = editMatch[1];
          const code = cut(data.get("code"),40).toUpperCase(), location = cut(data.get("location"),160), building = cut(data.get("building"),120), type = cut(data.get("type"),60), capacity = cut(data.get("capacity"),60), serial = cut(data.get("serial"),80), expiry = cut(data.get("expiry"),10), installed = cut(data.get("installed"),10);
          const values = { id, code, location, building, type, capacity, serial_number: serial, expiry_date: expiry, installed_date: installed };
          if (!code || !location || !type || !capacity || !validDate(expiry) || (installed && !validDate(installed))) return response(editPage(values,user,"กรุณากรอกข้อมูลและวันที่ให้ครบถ้วน"),400);
          const existing = await db.prepare("SELECT id FROM extinguishers WHERE id=?").bind(id).first();
          if (!existing) return response("Not found",404);
          const clash = await db.prepare("SELECT id FROM extinguishers WHERE code=? AND id<>?").bind(code,id).first();
          if (clash) return response(editPage(values,user,"รหัสถังนี้มีอยู่แล้ว กรุณาใช้รหัสอื่น"),409);
          await db.prepare("UPDATE extinguishers SET code=?,location=?,building=?,type=?,capacity=?,serial_number=?,expiry_date=?,installed_date=? WHERE id=?").bind(code,location,building,type,capacity,serial,expiry,installed,id).run();
          return go("/e/" + id);
        }
        const id = inspectMatch[1];
        const e = await db.prepare("SELECT id FROM extinguishers WHERE id=?").bind(id).first();
        if (!e) return response("Not found",404);
        const date = cut(data.get("inspected_on"),10), inspector = cut(data.get("inspector"),100), notes = cut(data.get("notes"),1000);
        const values = checks.map(([key]) => cut(data.get(key),8));
        if (!validDate(date) || date > today() || !inspector || values.some((v) => !["pass","fail"].includes(v))) return detail(db,id,user,admin,url.origin,"กรุณาตรวจสอบวันที่ ชื่อผู้ตรวจ และผลทุกหัวข้อ");
        const result = values.includes("fail") ? "failed" : "passed";
        await db.prepare("INSERT INTO inspections (id,extinguisher_id,inspected_on,inspector,inspector_user_id,pressure,pin,hose,body,access,label,notes,result,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),id,date,inspector,env.ADMIN_USERNAME || "admin",...values,notes,result,new Date().toISOString()).run();
        return go("/e/" + id);
      }
      if (request.method !== "GET") return response("Method not allowed",405);
      if (path === "/login") {
        const next = safeNext(url.searchParams.get("return_to"));
        return admin ? go("/") : response(loginPage(next));
      }
      if (path === "/") return response(await home(db,user,admin));
      if (path === "/new") return admin ? response(newPage(user)) : go("/login?return_to=%2Fnew");
      const editMatch = path.match(/^\/e\/([0-9a-f-]+)\/edit$/);
      if (editMatch) {
        if (!admin) return go("/login?return_to=" + encodeURIComponent(path));
        const e = await db.prepare("SELECT * FROM extinguishers WHERE id=?").bind(editMatch[1]).first();
        if (!e) return response(layout("ไม่พบถัง", `<h1>ไม่พบถังดับเพลิง</h1><p class="muted">ตรวจสอบรหัส QR หรือกลับไปหน้าทะเบียน</p><a class="button" href="/">กลับหน้าแรก</a>`, user, admin),404);
        return response(editPage(e,user));
      }
      const m = path.match(/^\/e\/([0-9a-f-]+)$/);
      if (m) return detail(db,m[1],user,admin,url.origin);
      return response("Not found",404);
    } catch (err) {
      console.error("Fire inspection request failed",err);
      return response(layout("เกิดข้อผิดพลาด", `<h1>ไม่สามารถโหลดข้อมูลได้</h1><p class="muted">กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้ผู้ดูแลระบบตรวจสอบฐานข้อมูล</p><a href="/" class="button">กลับหน้าแรก</a>`,user,admin),500);
    }
  }
};
