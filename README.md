# Siripun INS Lookup

เว็บแอพค้นหา International Numbering System (INS) สำหรับวัตถุเจือปนอาหาร ออกแบบให้ GitHub เป็น source of truth, Cloudflare Workers + Static Assets เป็นชั้นให้บริการ และ WordPress แสดงผลผ่าน shortcode `[siripun_ins]`.

## หลักข้อมูล

- ข้อมูลสารต้องมาจากต้นฉบับที่ระบุใน `data/sources.json`
- ห้ามเติมคำอธิบายสารจาก AI หรือการคาดเดา
- แต่ละ record มี `field_sources` เพื่อบอกว่าแต่ละ field มาจากแหล่งไหน
- ถ้าไม่มีข้อมูลจาก source ให้แสดงว่าไม่มีข้อมูล แทนการแต่งเติม

Starter data ใช้ INS 300, 406 และ 491 เพื่อทดสอบระบบก่อนขยายฐานข้อมูล

## โครงสร้าง

- `data/ins.json` ฐานข้อมูล master
- `data/sources.json` รายชื่อแหล่งต้นฉบับ
- `public/ins-assets/` ไฟล์ที่ Cloudflare ให้บริการ
- `src/worker.js` Worker สำหรับ static assets และ endpoint สั่ง GitHub workflow
- `wordpress-plugin/siripun-ins/` plugin WordPress
- `.github/workflows/` test, source check และ deploy

## การติดตั้งแบบย่อ

1. สร้าง GitHub repository แล้ว push โครงการนี้ขึ้น `main`.
2. ตั้ง GitHub Secrets `CLOUDFLARE_API_TOKEN` และ `CLOUDFLARE_ACCOUNT_ID`.
3. Deploy Worker; route ถูกเตรียมไว้ที่ `siripun.com/ins-assets/*`.
4. ตั้ง Cloudflare Worker secrets: `GITHUB_TOKEN` และ `UPDATE_TRIGGER_SECRET`.
5. ติดตั้งโฟลเดอร์ `wordpress-plugin/siripun-ins` เป็น WordPress plugin.
6. เพิ่ม `define('SIRIPUN_INS_UPDATE_SECRET', 'ค่าเดียวกับ UPDATE_TRIGGER_SECRET');` ใน `wp-config.php`.
7. สร้างหน้า WordPress slug `ins` แล้วใส่ shortcode `[siripun_ins]`.

## การอัปเดต

เมนู WordPress: Settings → Siripun INS

- `ตรวจหาข้อมูลใหม่` จะสั่ง GitHub Actions ให้เช็ก source ปัจจุบันและสร้าง report
- `เตรียมอัปเดตฐานข้อมูล` จะสร้าง review branch/PR ที่มีรายงาน source check
- Version 0.1 ยังไม่แก้ factual records อัตโนมัติเมื่อ parser พบการเปลี่ยนแปลง เพื่อป้องกันข้อมูลผิดจากการเปลี่ยน layout ของเว็บไซต์ต้นทาง

## Lightning donation

Footer ของ app แสดงข้อความ:

> สนับสนุนผู้จัดทำได้ด้วย bitcoin lightning ที่ donate@zapm.uk

ส่วน donation เป็น optional UI เท่านั้น ไม่ใช่ dependency ของระบบ INS และปิด/เปลี่ยนได้จาก config จุดเดียว มีปุ่มเปิด Lightning URI และปุ่ม copy address เป็น fallback.

## Fork

ผู้ fork ควรแก้ `config/project.json`, `wrangler.jsonc` และ URL ใน WordPress settings. Secret ทั้งหมดต้องเก็บใน GitHub/Cloudflare/`wp-config.php` และห้าม commit ลง repository.

## งานวิจัยใหม่ในอนาคต

`data/research.json` ถูกแยกออกจาก INS core ตั้งแต่ต้น เพื่อให้เพิ่ม bibliographic facts จากงานวิจัยหรือการประเมินใหม่ได้โดยไม่แก้ชื่อ/เลข INS เดิม ข้อมูลวิจัยต้องมีแหล่งอ้างอิง และรุ่นปัจจุบันยังไม่สร้างคำสรุปสุขภาพด้วย AI.
