# TIF FireSafe

ระบบทะเบียนและตรวจถังดับเพลิงออนไลน์สำหรับ Thai Inter Flying

## การทำงาน

- เพิ่มถังด้วยรหัสประจำถัง จุดติดตั้ง ประเภท ขนาด วันหมดอายุ และข้อมูล S/N
- หน้าแต่ละถังมี QR สำหรับพิมพ์ติดที่ตัวถัง สแกนแล้วเปิดข้อมูลถัง
- บันทึกผลตรวจ 6 หัวข้อ ชื่อผู้ตรวจ วันที่ตรวจ และหมายเหตุ
- แสดงประวัติการตรวจ วันที่ตรวจล่าสุด และกำหนดครั้งถัดไปหนึ่งเดือนหลังการตรวจล่าสุด
- สถานะปกติ ใกล้ครบกำหนด (ภายใน 7 วัน) เลยกำหนด พบปัญหา หมดอายุ หรือยังไม่ตรวจ
- ผู้เยี่ยมชมดูข้อมูลได้อย่างเดียว ส่วนผู้ดูแลเข้าสู่ระบบเพื่อเพิ่ม/แก้ไขถังและบันทึกผลตรวจ

## รันในเครื่อง

ต้องใช้ Node.js 22.5 ขึ้นไป (สคริปต์พรีวิวใช้ `node:sqlite` ไม่ต้องติดตั้งแพ็กเกจเพิ่ม)

```bash
npm run dev
```

เปิด http://localhost:8787 — ถ้าไม่มี `DATABASE_URL` ระบบจะใช้ SQLite ในหน่วยความจำ (ข้อมูลหายเมื่อปิด) และถ้าตั้ง `ADMIN_PASSWORD_HASH` ใน `.env` จะเข้าสู่ระบบผู้ดูแลได้ที่ `/login` กำหนดพอร์ตอื่นได้ผ่านตัวแปรสภาพแวดล้อม `PORT`

- `npm run smoke` ทดสอบสิทธิ์ผู้เยี่ยมชม/ผู้ดูแล การเข้าสู่ระบบ การลงทะเบียน การบันทึกผล และการแก้ไข
- `npm run build` สร้างแพ็กเกจใน `dist/` และ `npm run validate` ตรวจว่า Worker เป็น ESM ที่ถูกต้อง

## ใช้ Neon PostgreSQL แทน D1

โค้ดรองรับทั้ง D1 (ค่าเริ่มต้นของ Sites) และ Neon Postgres ผ่าน HTTP endpoint โดยไม่ต้องติดตั้งแพ็กเกจเพิ่ม

1. สร้างไฟล์ `.env` ที่ root โปรเจกต์ (ถูก ignore ไว้แล้ว) แล้วใส่ `DATABASE_URL` จาก Neon Console
2. สร้างตารางในฐานข้อมูล: `npm run migrate:neon`
3. `npm run dev` — ถ้าพบ `DATABASE_URL` ระบบจะใช้ Neon แทน SQLite ในหน่วยความจำ
4. บน production ให้ตั้ง `DATABASE_URL` เป็น secret ของ Worker ห้ามฝังในโค้ด หากไม่มี ระบบจะใช้ D1 binding `DB` ตามเดิม

ข้อควรระวัง: connection string ที่ให้สิทธิ์ owner ควรเปลี่ยนเป็น role เฉพาะที่อ่าน/เขียนได้เฉพาะสองตารางนี้ และ rotate รหัสผ่านทันทีหากเคยหลุด

## สิทธิ์ผู้ใช้และบัญชีผู้ดูแล

- **ผู้เยี่ยมชม** ไม่ต้องเข้าสู่ระบบ ดูภาพรวม ข้อมูลถัง QR และประวัติการตรวจได้ แต่ไม่มีปุ่ม/ฟอร์มแก้ไข และ POST ทุกเส้นทางจะถูกพาไปหน้า login
- **ผู้ดูแล** เข้าสู่ระบบที่ `/login` เพื่อเพิ่มถัง แก้ไขข้อมูลถัง และบันทึกผลตรวจ (session cookie อายุ 12 ชั่วโมง)
- ตั้งค่าใน `.env` หรือ environment ของ production: `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (สร้างด้วย `node scripts/hash-password.mjs "รหัสผ่าน"`) และ `SESSION_SECRET`

## การเผยแพร่

แอปเป็น Cloudflare Worker ES module พร้อม D1 database migration ใน `drizzle/0000_fire_inspection.sql` และ Site manifest ใน `.openai/hosting.json` ต้อง push source ขึ้น Site repository และ deploy เวอร์ชันจึงจะมี URL ที่ใช้งานได้จริง

เว็บไซต์เริ่มต้นเป็นส่วนตัวของเจ้าของ Site การให้พนักงานเข้าใช้ต้องกำหนดสิทธิ์ Site เพิ่มก่อน โดยการลงชื่อเข้าใช้เป็นบัญชี ChatGPT ไม่ใช่ Microsoft 365

QR แสดงผ่านบริการ `api.qrserver.com` ซึ่งจะได้รับ URL ของถังตอนเปิดหน้ารายละเอียด หากต้องการเก็บ URL ภายในบริษัททั้งหมด ควรเปลี่ยนเป็นตัวสร้าง QR ในระบบก่อนใช้งานจริง

### Deploy บน Vercel

โปรเจกต์มี adapter `api/index.js` และ `vercel.json` สำหรับรัน Worker เดียวกันบน Vercel

1. Import repo เข้า Vercel (Framework Preset: Other) — build command และ output directory ถูกกำหนดใน `vercel.json` แล้ว
2. ตั้ง Environment Variables ใน Project Settings: `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`
3. Deploy แล้วทดสอบที่ `/login` — ทุกเส้นทางจะถูก rewrite ไปที่ `api/` ซึ่งเรียก Worker ตัวเดียวกับ Cloudflare

แนะนำเลือก region สิงคโปร์ (`sin1`) ให้ใกล้ Neon `ap-southeast-1` หากแผนรองรับ

## ตรวจโค้ด

`node scripts/smoke.mjs` ทดสอบการลงทะเบียน การเปิดหน้าถัง การบันทึกผล และประวัติด้วยฐานข้อมูลจำลอง

`node scripts/build.mjs` สร้างไฟล์ Worker และ migration สำหรับแพ็กเกจเผยแพร่
