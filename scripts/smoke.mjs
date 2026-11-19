import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const extinguishers = [], inspections = [];
const db = {
  prepare(sql) {
    let args = [];
    return {
      bind(...values) { args = values; return this; },
      async first() {
        if (sql.includes('WHERE code=?')) return extinguishers.find(x => x.code === args[0]) ?? null;
        if (sql.includes('FROM extinguishers WHERE id=?')) return extinguishers.find(x => x.id === args[0]) ?? null;
        return null;
      },
      async all() {
        if (sql.includes('LEFT JOIN inspections')) return { results: extinguishers.map(e => {
          const last = inspections.filter(i => i.extinguisher_id === e.id).sort((a,b) => b.inspected_on.localeCompare(a.inspected_on))[0];
          return {...e, inspected_on: last?.inspected_on, result: last?.result};
        })};
        return { results: inspections.filter(i => i.extinguisher_id === args[0]) };
      },
      async run() {
        if (sql.includes('INSERT INTO extinguishers')) {
          const keys = ['id','code','location','building','type','capacity','serial_number','expiry_date','installed_date','created_at','created_by'];
          extinguishers.push(Object.fromEntries(keys.map((k,i) => [k,args[i]])));
        } else {
          const keys = ['id','extinguisher_id','inspected_on','inspector','inspector_user_id','pressure','pin','hose','body','access','label','notes','result','created_at'];
          inspections.push(Object.fromEntries(keys.map((k,i) => [k,args[i]])));
        }
      }
    };
  }
};
const origin = 'https://example.test';
const headers = { 'oai-authenticated-user-id':'tester', 'oai-authenticated-user-email':'tester@example.test', origin };
const send = (path, opts = {}) => worker.fetch(new Request(origin + path, { headers, ...opts }), { DB:db });
assert.equal((await worker.fetch(new Request(origin + '/'),{DB:db})).status,401);
assert.match(await (await send('/')).text(),/ยังไม่มีถังในระบบ/);
let r = await send('/new',{method:'POST',body:new URLSearchParams({code:'FE-001',location:'หน้าห้องประชุม',building:'อาคาร A',type:'CO₂',capacity:'10 ปอนด์',expiry:'2030-11-18'})});
assert.equal(r.status,303);
const path = r.headers.get('location');
assert.match(path,/^\/e\/[0-9a-f-]+$/);
assert.match(await (await send(path)).text(),/FE-001/);
r = await send(path + '/inspect',{method:'POST',body:new URLSearchParams({inspected_on:'2026-11-18',inspector:'Save',pressure:'pass',pin:'pass',hose:'fail',body:'pass',access:'pass',label:'pass',notes:'เปลี่ยนสายฉีด'})});
assert.equal(r.status,303);
const detail = await (await send(path)).text();
assert.match(detail,/พบปัญหา/);
assert.match(detail,/เปลี่ยนสายฉีด/);
assert.equal(inspections.length,1);
console.log('Smoke test passed: auth, register, QR detail, inspection and history');
