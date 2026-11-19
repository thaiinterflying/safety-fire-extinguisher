// สร้างค่า ADMIN_PASSWORD_HASH สำหรับใส่ใน .env
// ใช้งาน: node scripts/hash-password.mjs "รหัสผ่านที่ต้องการ"
import { pbkdf2Sync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('ใช้งาน: node scripts/hash-password.mjs "รหัสผ่าน"');
  process.exit(1);
}

const iterations = 100000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
console.log(`pbkdf2$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`);
