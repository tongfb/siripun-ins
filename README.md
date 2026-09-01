# Siripun INS Lookup

เว็บแอพค้นหา International Numbering System (INS) สำหรับวัตถุเจือปนอาหาร ออกแบบให้ GitHub เป็น source of truth, Cloudflare Workers + Static Assets เป็นชั้นให้บริการ และ WordPress แสดงผลผ่าน shortcode `[siripun_ins]`.

## หลักข้อมูล

- ข้อมูลสารต้องมาจากแหล่งต้นฉบับที่บันทึกไว้ใน `data/sources.json`
- ห้ามเติมคำอธิบายสารจาก AI หรือการคาดเดา
- แต่ละ record มี `field_sources` เพื่อให้ตรวจย้อนหลังได้ว่า field นั้นมาจากไหน
- ถ้าไม่มีข้อมูลจาก source ให้แสดงว่าไม่มีข้อมูล แทนการแต่งเติม
- Source ต้องมีสถานะปัจจุบัน ห้าม current record อ้าง source ที่ `revoked` หรือ `superseded`

## Source policy — Version 0.2

แหล่งข้อมูลหลักฝั่งไทยคือ **สำนักงานคณะกรรมการอาหารและยา (อย.) — Thai FDA Food Additive Database** ที่ Alimentum ปัจจุบันระบุฐาน `P468 V.02`.

- Thai FDA Food Additive Database = primary backend data source
- กฎหมายวัตถุเจือปนอาหารของ อย. = legal verification source
- Codex/FAO = supplemental international reference เมื่อจำเป็น
- WHO JECFA = supplemental safety/evaluation source เมื่อจำเป็น
- URL และรายละเอียด source เก็บใน backend/source registry เพื่อการตรวจสอบและ updater
- หน้าเว็บไม่แสดง outbound source link ในแต่ละ INS card
- หน้าเว็บแสดงเครดิตรวมของฐานข้อมูล อย. เพียงจุดเดียว

Thai FDA ระบุว่าฐาน Alimentum เป็นเครื่องมือสืบค้นเบื้องต้นและไม่ใช้แทนการอ้างอิงกฎหมาย ดังนั้นเงื่อนไขการใช้ที่มีผลทางกฎหมายต้องทวนกับประกาศกระทรวงสาธารณสุขที่มีผลใช้บังคับ

Starter data ของ INS 300, 406 และ 491 ถูกสร้างก่อนนโยบาย v0.2 และอยู่ระหว่าง migration ไปยัง Thai FDA primary source; ระบบเก็บ provenance เดิมไว้จนกว่าจะ refresh จากฐานหลักสำเร็จ เพื่อไม่เปลี่ยนแหล่งอ้างอิงย้อนหลังอย่างไม่ถูกต้อง

## โครงสร้าง

- `data/ins.json` ฐานข้อมูล master
- `data/sources.json` source registry หลังบ้าน ไม่ถูกส่งให้หน้าเว็บ
- `data/research.json` bibliographic/evidence data สำหรับอนาคต
- `public/ins-assets/` ไฟล์ที่ Cloudflare ให้บริการ
- `src/worker.js` Worker สำหรับ static assets และ endpoint สั่ง GitHub workflow
- `wordpress-plugin/siripun-ins/` plugin WordPress
- `.github/workflows/` test, source check และ deploy

## การติดตั้งแบบย่อ

1. สร้าง GitHub repository แล้ว push โครงการนี้ขึ้น `main`.
2. เชื่อม repository กับ Cloudflare Workers Builds.
3. Build command: `npm test && npm run data:validate && npm run data:sync`
4. Deploy command: `npx wrangler deploy`
5. Worker route ถูกเตรียมไว้ที่ `siripun.com/ins-assets/*`.
6. ตั้ง Cloudflare Worker secrets สำหรับระบบ update เมื่อพร้อม: `GITHUB_TOKEN` และ `UPDATE_TRIGGER_SECRET`.
7. ติดตั้งโฟลเดอร์ `wordpress-plugin/siripun-ins` เป็น WordPress plugin.
8. เพิ่ม `define('SIRIPUN_INS_UPDATE_SECRET', 'ค่าเดียวกับ UPDATE_TRIGGER_SECRET');` ใน `wp-config.php`.
9. สร้างหน้า WordPress slug `ins` แล้วใส่ shortcode `[siripun_ins]`.

## การอัปเดต

เมนู WordPress: Settings → Siripun INS

- `ตรวจหาข้อมูลใหม่` สั่งระบบ source checker ให้ตรวจ source registry และสร้าง report
- `เตรียมอัปเดตฐานข้อมูล` เตรียม review branch/PR ก่อนนำข้อมูลใหม่ขึ้น production
- updater ต้องตรวจสถานะ source, database version และ diff ก่อน publish
- ห้าม blind update ข้อมูล factual โดยไม่มี review เมื่อโครงสร้างเว็บต้นทางเปลี่ยน

เป้าหมายถัดไปของ v0.2 คือสร้าง adapter สำหรับ Thai FDA Food Additive Database เพื่อดึง structured factual data เข้าฐาน master และแสดง diff ก่อนยืนยัน update.

## Lightning donation

Footer ของ app แสดงข้อความ:

> สนับสนุนผู้จัดทำได้ด้วย bitcoin lightning ที่ donate@zapm.uk

ส่วน donation เป็น optional UI เท่านั้น ไม่ใช่ dependency ของระบบ INS และปิด/เปลี่ยนได้จาก config จุดเดียว มีปุ่มเปิด Lightning URI และปุ่ม copy address เป็น fallback.

## Fork

ผู้ fork ควรแก้ `config/project.json`, `wrangler.jsonc` และ URL ใน WordPress settings. Branding, domain, donation address และ secret ต้องแยกจาก core code เพื่อให้เปลี่ยนค่าได้ง่าย. Secret ทั้งหมดต้องเก็บใน GitHub/Cloudflare/`wp-config.php` และห้าม commit ลง repository.

## งานวิจัยใหม่ในอนาคต

`data/research.json` ถูกแยกออกจาก INS core ตั้งแต่ต้น เพื่อให้เพิ่ม bibliographic facts จากงานวิจัยหรือการประเมินใหม่ได้โดยไม่แก้ชื่อ/เลข INS เดิม ข้อมูลวิจัยต้องมีแหล่งอ้างอิง และระบบไม่สร้างคำสรุปสุขภาพด้วย AI จากข้อมูลที่ไม่มีต้นฉบับรองรับ.
