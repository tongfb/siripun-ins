# Siripun INS Lookup

เว็บแอพค้นหา International Numbering System (INS) สำหรับวัตถุเจือปนอาหาร ออกแบบให้ GitHub เป็น source of truth, Cloudflare Workers + Static Assets เป็นชั้นให้บริการ และ WordPress แสดงผลผ่าน shortcode `[siripun_ins]`.

หน้าใช้งานจริง: `https://siripun.com/inscheck/`

คู่มือเจ้าของระบบ: [`docs/OWNER-GUIDE.md`](docs/OWNER-GUIDE.md)

## สถานะปัจจุบัน

- ฐานเผยแพร่: version `0.3.0`
- แหล่งหลักฝั่งไทย: **สำนักงานคณะกรรมการอาหารและยา (อย.) — Thai FDA Food Additive Database / Alimentum**
- ฐาน Thai FDA ที่นำเข้า: `P468 V.02`
- จำนวน INS ใน production รุ่นปัจจุบัน: 392 รายการ
- รองรับการค้นหลายเลขพร้อมกันและเลขแบบ suffix เช่น `100(i)`
- WordPress shortcode: `[siripun_ins]`
- Cloudflare Worker: `siripun-ins`
- Worker route: `siripun.com/ins-assets/*`

จำนวนรายการอาจเปลี่ยนเมื่อ Thai FDA อัปเดตฐาน จึงต้อง Preview และตรวจ diff ก่อน Publish ทุกครั้ง

## หลักข้อมูล

- ข้อมูลสารต้องมาจากแหล่งต้นฉบับที่บันทึกไว้ใน `data/sources.json`
- ห้ามเติมคำอธิบายสารจาก AI หรือการคาดเดา
- แต่ละ record มี provenance/field source สำหรับตรวจย้อนหลัง
- ถ้า source ไม่มีข้อมูล ให้แสดงว่าไม่มีข้อมูลแทนการแต่งเติม
- source ปัจจุบันต้องไม่เป็นเอกสารที่ `revoked` หรือ `superseded`

## Source policy

แหล่งข้อมูลหลักฝั่งไทยคือ **Thai FDA Food Additive Database**

- Thai FDA Food Additive Database = primary backend data source
- กฎหมายวัตถุเจือปนอาหารของ อย. = legal verification source
- Codex/FAO = supplemental international reference เมื่อจำเป็น
- WHO JECFA = supplemental safety/evaluation source เมื่อจำเป็น
- URL และรายละเอียด source เก็บใน backend/source registry
- หน้าเว็บแสดงเครดิตรวม Thai FDA เพียงจุดเดียว

Thai FDA ระบุว่าฐาน Alimentum เป็นเครื่องมือสืบค้นเบื้องต้นและไม่ใช้แทนการอ้างอิงกฎหมาย ดังนั้นคำถามเรื่องข้อกำหนดทางกฎหมายต้องย้อนตรวจประกาศกระทรวงสาธารณสุขที่มีผลใช้บังคับ

## โครงสร้าง

- `data/ins.json` — ฐานข้อมูล master
- `data/sources.json` — source registry หลังบ้าน
- `data/research.json` — bibliographic/evidence data สำหรับอนาคต
- `public/ins-assets/` — ไฟล์ที่ Cloudflare ให้บริการ
- `src/worker.js` — Worker สำหรับ static assets และ update endpoint
- `wordpress-plugin/siripun-ins/` — plugin WordPress
- `.github/workflows/` — test, preview, publish และ deploy
- `docs/OWNER-GUIDE.md` — คู่มือดูแล production

## การติดตั้งแบบย่อ

1. push โครงการขึ้น GitHub branch `main`
2. เชื่อม repository กับ Cloudflare Workers Builds
3. Build command: `npm test && npm run data:validate && npm run data:sync`
4. Deploy command: `npx wrangler deploy`
5. Worker route: `siripun.com/ins-assets/*`
6. ติดตั้ง plugin จาก `wordpress-plugin/siripun-ins`
7. สร้างหน้า WordPress slug `inscheck`
8. ใส่ shortcode `[siripun_ins]`

## การอัปเดต Thai FDA

### Preview

GitHub → Actions → `Thai FDA Import Check` → `Run workflow`

ตรวจจำนวนรายการ, ชื่อไทย, duplicate, function ที่หาย และความผิดปกติของ diff ก่อน Publish

### Publish

GitHub → Actions → `Publish Thai FDA Database` → `Run workflow`

พิมพ์ `PUBLISH` เพื่อยืนยัน จากนั้น workflow จะสร้างฐาน production, validate, sync public data และ commit กลับเข้า GitHub

หาก Preview ผิดปกติ ห้าม Publish

รายละเอียดทั้งหมดอยู่ใน [`docs/OWNER-GUIDE.md`](docs/OWNER-GUIDE.md)

## WordPress และ Cache

หน้า live ใช้ shortcode `[siripun_ins]` และโหลด asset จาก `siripun.com/ins-assets/`

ถ้า Preview ทำงานแต่หน้า live แปลก ให้ตรวจ WP Fastest Cache / JavaScript optimizer และล้าง cache รวม minified CSS/JS ก่อน

## Lightning donation

Footer ของ app แสดงข้อความ:

> สนับสนุนผู้จัดทำได้ด้วย bitcoin lightning ที่ donate@zapm.uk

ส่วน donation เป็น optional UI และไม่ใช่ dependency ของระบบ INS

## Fork

ผู้ fork ควรแก้ `config/project.json`, `wrangler.jsonc`, domain, WordPress asset URL, branding และ donation address ของตนเอง Secret ต้องเก็บใน GitHub/Cloudflare/`wp-config.php` และห้าม commit ลง repository

## งานวิจัยใหม่ในอนาคต

`data/research.json` แยกจาก INS core เพื่อรองรับ bibliographic facts หรือการประเมินใหม่ในอนาคต โดยไม่แก้ชื่อ/เลข INS เดิม ข้อมูลวิจัยต้องมีแหล่งอ้างอิง และระบบไม่สร้างคำสรุปสุขภาพจากข้อมูลที่ไม่มีต้นฉบับรองรับ
