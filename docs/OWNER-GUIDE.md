# คู่มือเจ้าของระบบ — Siripun INS Lookup

เอกสารนี้เขียนสำหรับเจ้าของเว็บที่ไม่จำเป็นต้องมีพื้นฐานเขียนโปรแกรม ใช้สำหรับดูแล Siripun INS Lookup หลังระบบขึ้นใช้งานจริงแล้ว

## 1. ระบบนี้ประกอบด้วยอะไร

Siripun INS Lookup แบ่งเป็น 4 ส่วนหลัก

1. **GitHub** — เก็บ source code และฐานข้อมูลหลัก เป็นจุดย้อนกลับเมื่อระบบมีปัญหา
2. **Cloudflare Worker + Static Assets** — ให้บริการไฟล์แอพและฐานข้อมูลที่ `siripun.com/ins-assets/*`
3. **WordPress Plugin** — ทำให้ WordPress ใช้ shortcode `[siripun_ins]`
4. **หน้า WordPress** — หน้าใช้งานจริงคือ `https://siripun.com/inscheck/`

ข้อมูลหลักฝั่งไทยมาจาก **สำนักงานคณะกรรมการอาหารและยา (อย.) — Thai FDA Food Additive Database / Alimentum** โดยระบบเก็บข้อมูลแบบ source-based และไม่แต่งคำอธิบายสารขึ้นเอง

## 2. สถานะ production ปัจจุบัน

- GitHub repository: `tongfb/siripun-ins`
- Cloudflare Worker: `siripun-ins`
- Worker route: `siripun.com/ins-assets/*`
- WordPress shortcode: `[siripun_ins]`
- หน้าใช้งาน: `siripun.com/inscheck/`
- ฐานเผยแพร่: version `0.3.0`
- ฐาน Thai FDA ที่นำเข้า: `P468 V.02`
- จำนวน INS ที่ประกอบได้ตอน publish รุ่นนี้: 392 รายการ
- รองรับรูปแบบเลข เช่น `100(i)` และการค้นหลายเลขคั่นด้วย comma

> หมายเหตุ: จำนวนรายการอาจเปลี่ยนในอนาคตเมื่อ Thai FDA อัปเดตฐาน ระบบจึงมีขั้น Preview/ตรวจสอบก่อน Publish เสมอ

## 3. วิธีเช็กว่าเว็บยังทำงานปกติ

เปิด `https://siripun.com/inscheck/`

ทดสอบด้วย

`100(i), 202, 250, 330, 471`

ผลปกติควรขึ้นว่า “ค้นหา 5 รายการ • พบข้อมูล 5 รายการ” และแสดงข้อมูลของทั้ง 5 INS

ถ้าเลขหนึ่งไม่ขึ้น อย่าเพิ่งแก้ฐานด้วยมือ ให้ตรวจว่ารายการนั้นมีอยู่ใน Thai FDA และดูผลจาก workflow Preview ก่อน

## 4. การอัปเดตข้อมูล Thai FDA ในอนาคต

แนวทางหลักคือ **Preview ก่อน แล้วค่อย Publish**

### ขั้น A — สร้าง Preview

1. เข้า GitHub repository `tongfb/siripun-ins`
2. กดแท็บ `Actions`
3. เลือก `Thai FDA Import Check`
4. กด `Run workflow`
5. ตรวจว่า `Branch: main`
6. กดปุ่มเขียว `Run workflow`
7. รอให้จบและดูว่าขึ้นเขียว

สิ่งที่ต้องตรวจจาก Preview

- จำนวน INS ทั้งหมด
- มีเลข INS ซ้ำหรือไม่
- มีรายการที่ชื่อไทยหายหรือไม่
- มีรายการที่ function หายหรือไม่
- ตัวอย่าง INS สำคัญยังอ่านถูกหรือไม่
- จำนวนรายการเพิ่ม/ลดผิดปกติจากฐานก่อนหน้าหรือไม่

ถ้า workflow แดงหรือจำนวนข้อมูลเปลี่ยนผิดปกติ **หยุดก่อน ห้าม Publish** เพราะเว็บต้นทางอาจเปลี่ยนโครงสร้าง หรือ importer อาจอ่านผิด

### ขั้น B — Publish ฐานใหม่

ทำเมื่อ Preview ผ่านและตรวจข้อมูลแล้วเท่านั้น

1. GitHub → `Actions`
2. เลือก `Publish Thai FDA Database`
3. กด `Run workflow`
4. ตรวจ `Branch: main`
5. ช่องยืนยันให้พิมพ์ตัวใหญ่ตรง ๆ ว่า `PUBLISH`
6. กดปุ่มเขียว `Run workflow`
7. รอจนสถานะเป็น `Success`

workflow นี้จะสร้างฐาน production, validate, sync ไฟล์ public และ commit กลับเข้า GitHub

หลัง Publish ให้รอ Cloudflare deploy แล้วทดสอบหน้า `siripun.com/inscheck/` อีกครั้ง

## 5. การ Deploy Cloudflare

ปกติ source code อยู่ใน GitHub และ Cloudflare เชื่อมกับ repository นี้อยู่แล้ว

ค่าหลักของโปรเจกต์อยู่ใน `wrangler.jsonc`

- Worker name: `siripun-ins`
- route: `siripun.com/ins-assets/*`
- static directory: `public`

ถ้าต้อง deploy ด้วย workflow ให้เข้า GitHub → `Actions` → `Deploy Cloudflare Worker`

ก่อน deploy ควรให้ `Test` ผ่านเขียวก่อน

หลักการคือ

`GitHub → Test → Deploy → Verify`

อย่าแก้ Worker production ด้วยมือถ้าสามารถแก้ใน GitHub แล้ว deploy ใหม่ได้

## 6. WordPress Plugin

plugin อยู่ที่

`wordpress-plugin/siripun-ins/siripun-ins.php`

shortcode คือ

`[siripun_ins]`

หน้า WordPress ปัจจุบันใช้ shortcode นี้ที่ slug `inscheck`

เมื่อ plugin มีเวอร์ชันใหม่ ให้สร้าง ZIP ที่มีโครงสร้าง

`siripun-ins/siripun-ins.php`

จากนั้น WordPress → Plugins → Add Plugin → Upload Plugin → เลือก ZIP → Replace current with uploaded

หลังเปลี่ยน plugin ให้ล้าง cache ของ WordPress

## 7. การล้าง Cache

เว็บใช้ WP Fastest Cache

เมื่อแก้ plugin หรือ JavaScript แล้วหน้า live ยังแสดงของเก่า

1. WordPress Admin → `WP Fastest Cache`
2. ล้าง cache ทั้งหน้าเว็บและ minified CSS/JS
3. เปิดหน้า `siripun.com/inscheck/`
4. กด `Ctrl + F5`

ถ้า Preview ใน WordPress ใช้งานได้ แต่หน้า live พัง ให้สงสัย cache/optimizer ก่อนเป็นอันดับแรก

## 8. วิธีแยกปัญหา WordPress / Host / Cloudflare

### กรณี A — ทั้งเว็บเปิดไม่ได้

ถ้า `siripun.com/inscheck/` เปิดไม่ได้ทั้งหน้า หรือขึ้น Cloudflare error เช่น 521/522/524 ให้ตรวจ Host/Origin และเส้นทาง Cloudflare → Host

- 521: origin ปฏิเสธ connection
- 522: Cloudflare ติดต่อ origin ไม่สำเร็จ
- 524: ติดต่อ origin ได้ แต่ origin ตอบช้าเกินกำหนด

กรณีนี้ปกติไม่เกี่ยวกับฐาน INS

### กรณี B — หน้า WordPress เปิดได้ แต่กล่อง INS ขึ้น “โหลดฐานข้อมูลไม่สำเร็จ”

ให้ตรวจ

1. `https://siripun.com/ins-assets/data/ins.json`
2. `https://siripun.com/ins-assets/config.json`
3. `https://siripun.com/ins-assets/app.js`
4. WordPress cache / JavaScript optimizer
5. Cloudflare deploy ล่าสุด

ถ้า `/ins-assets/` เปิดได้ปกติ แต่หน้า WordPress ยังพัง ให้ตรวจ plugin/cache ก่อน

### กรณี C — แอพขึ้น แต่เลขบางตัวหาไม่เจอ

ตรวจว่ารูปแบบเลขมี suffix เช่น `100(i)` หรือไม่ และดูข้อมูลใน master database อย่าเติม record ด้วยการเดา

## 9. ไฟล์สำคัญที่ควรรู้จัก

- `data/ins.json` — ฐาน master
- `data/sources.json` — รายการ source หลังบ้าน
- `data/research.json` — พื้นที่ข้อมูลวิจัยในอนาคต
- `public/ins-assets/data/ins.json` — ฐานที่หน้าเว็บโหลด
- `public/ins-assets/app.js` — logic หน้าเว็บ
- `public/ins-assets/app.css` — รูปแบบหน้าเว็บ
- `public/ins-assets/config.json` — title, credit, donation และ config หน้าเว็บ
- `src/worker.js` — Cloudflare Worker
- `wrangler.jsonc` — config Cloudflare
- `wordpress-plugin/siripun-ins/siripun-ins.php` — WordPress plugin
- `.github/workflows/` — automation ของ GitHub

## 10. Workflow ที่เห็นใน GitHub Actions

- `Test` — ทดสอบโค้ดและ validate ฐาน
- `Thai FDA Import Check` — ดึงข้อมูล Thai FDA แล้วสร้าง Preview เพื่อตรวจ
- `Publish Thai FDA Database` — publish ฐานจริงหลังยืนยัน `PUBLISH`
- `Deploy Cloudflare Worker` — deploy Worker/Assets
- `Check INS data sources` — ตรวจ source ตามระบบเดิม/registry

ชื่อ workflow อาจมีการปรับในอนาคต ให้ดูไฟล์ใน `.github/workflows/` เป็นหลัก

## 11. สิ่งที่ห้ามทำ

- ห้ามแก้ข้อมูล factual ใน `data/ins.json` โดยเดาจากความรู้ทั่วไป
- ห้ามเติมชื่อ/หน้าที่/ความปลอดภัยด้วย AI โดยไม่มีต้นฉบับ
- ห้าม Publish เมื่อ Preview ผิดปกติ
- ห้าม commit token, password หรือ secret ลง GitHub
- ห้ามใช้เอกสารกฎหมายที่ถูกยกเลิกเป็นสถานะ current
- ห้ามถือ Alimentum เป็นตัวแทนข้อความกฎหมาย เมื่อคำถามเป็นเรื่องข้อกำหนดทางกฎหมาย ต้องย้อนตรวจประกาศที่มีผลใช้บังคับ

## 12. Secret และความปลอดภัย

Secret ต้องอยู่ใน Cloudflare/GitHub/`wp-config.php` เท่านั้น ห้ามบันทึกค่า secret จริงในเอกสารนี้

ระบบมีโครงสำหรับให้ WordPress trigger การอัปเดตผ่าน Worker ได้ โดยต้องตั้ง `GITHUB_TOKEN`, `UPDATE_TRIGGER_SECRET` และ `SIRIPUN_INS_UPDATE_SECRET` ให้ครบก่อนใช้งานปุ่มหลังบ้านนั้น

ถ้ายังไม่ได้ตั้ง secret ชุดนี้ ให้ใช้วิธี GitHub Actions แบบ manual ตามข้อ 4 ซึ่งเป็นวิธี production ที่ตรวจสอบง่ายที่สุดในตอนนี้

## 13. การย้อนกลับเมื่ออัปเดตผิด

GitHub เป็น source of truth ดังนั้นทุกการ publish มี commit ย้อนหลัง

ถ้าฐานใหม่มีปัญหา

1. หยุด Publish เพิ่ม
2. หา commit ก่อนฐานที่มีปัญหา
3. revert commit ใน GitHub
4. ให้ Test ผ่าน
5. deploy Cloudflare ใหม่
6. ล้าง WordPress cache
7. ทดสอบหน้า `siripun.com/inscheck/`

อย่าแก้ข้อมูล production แบบกระจัดกระจายหลายจุด เพราะจะทำให้ย้อนกลับยาก

## 14. Checklist หลังอัปเดตทุกครั้ง

- [ ] Preview ผ่าน
- [ ] จำนวน record สมเหตุสมผล
- [ ] ไม่มี INS ซ้ำ
- [ ] ชื่อไทยไม่หายผิดปกติ
- [ ] รายการ function ที่หายได้รับการตรวจ
- [ ] Publish workflow ผ่านเขียว
- [ ] Test ผ่านเขียว
- [ ] Cloudflare deploy สำเร็จ
- [ ] หน้า `inscheck` โหลดได้
- [ ] ทดสอบ `100(i), 202, 250, 330, 471`
- [ ] เครดิต Thai FDA แสดงถูกต้อง
- [ ] Lightning donation ยังทำงาน ถ้ายังเปิดใช้อยู่

## 15. หลักจำง่ายที่สุด

ถ้าเกี่ยวกับข้อมูล ให้คิดลำดับนี้เสมอ

**Thai FDA → Preview → ตรวจ → Publish → Test → Deploy → Verify**

ถ้าเกี่ยวกับโค้ด ให้คิด

**GitHub → Test → Deploy → Verify**

ถ้าหน้า live แปลก แต่ Preview ปกติ ให้คิดถึง **Cache/Optimizer** ก่อน
