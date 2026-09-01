# Data policy

1. ตัวเลข INS, ชื่อสาร, synonym, functional class, ADI, CAS, ปีประเมิน, เงื่อนไขการใช้ และข้อมูลกฎหมาย ต้องมาจาก source ที่ระบุไว้เท่านั้น
2. ไม่มี field ประเภทคำอธิบายสุขภาพที่ AI แต่งขึ้น
3. `field_sources` เป็น provenance ระดับ field เพื่อย้อนกลับไปตรวจต้นฉบับได้
4. แหล่งข้อมูลเปลี่ยนรูปแบบหน้าเว็บได้ ระบบ update จึงต้อง fail closed: parser ที่ตรวจไม่ผ่านห้ามแก้ production data
5. งานวิจัยในอนาคตเก็บ bibliographic facts แยกจากข้อมูล INS core และแยก biomarker / mechanism / clinical outcome เมื่อต้องขยาย schema
6. การมี INS ไม่เท่ากับการได้รับอนุญาตให้ใช้ในทุกอาหารหรือทุกประเทศ จึงแยก provisions ตาม jurisdiction
