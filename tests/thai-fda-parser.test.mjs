import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThaiFdaDetail } from '../scripts/lib/thai-fda-parser.mjs';

test('parses Thai FDA additive detail page', () => {
  const html = `
    <h1>รายละเอียดวัตถุเจือปนอาหาร (Food Additives)</h1>
    <div>AGAR (อะการ์) (INS 406)</div>
    <h3>ชื่ออื่น (synonym) :</h3>
    <div>- Agar-agar</div>
    <div>- Bengal Isinglass</div>
    <div>- Ceylon Isinglass</div>
    <div>- Chinese Isinglass</div>
    <div>- Gelose</div>
    <div>- Japan agar</div>
    <div>- Japanese Isinglass</div>
    <div>- Layor Carang</div>
    <h3>หน้าที่ (function of food additive) :</h3>
    <div>- สารช่วยทำละลาย หรือช่วยพา (Carrier)</div>
    <div>- สารทำให้คงตัว (Stabilizer)</div>
    <div>- อิมัลซิไฟเออร์ (Emulsifier)</div>
    <div>- สารเพิ่มปริมาณ (Bulking agent)</div>
    <div>- สารให้ความข้นเหนียว (Thickener)</div>
    <div>- สารเคลือบผิว (Glazing agent)</div>
    <div>- สารทำให้เกิดเจล (Gelling agent)</div>
    <div>- สารทำให้เกิดความชุ่มชื้น (Humectant)</div>
    <h3>ข้อกำหนดคุณภาพหรือมาตรฐาน (Specification)</h3>
  `;

  const parsed = parseThaiFdaDetail(html, { expectedIns: '406' });
  assert.equal(parsed.ins, '406');
  assert.equal(parsed.name_en, 'AGAR');
  assert.equal(parsed.name_th, 'อะการ์');
  assert.equal(parsed.synonyms.length, 8);
  assert.deepEqual(parsed.functional_classes, [
    'Carrier', 'Stabilizer', 'Emulsifier', 'Bulking agent',
    'Thickener', 'Glazing agent', 'Gelling agent', 'Humectant'
  ]);
  assert.deepEqual(parsed.functional_classes_th, [
    'สารช่วยทำละลาย หรือช่วยพา', 'สารทำให้คงตัว', 'อิมัลซิไฟเออร์', 'สารเพิ่มปริมาณ',
    'สารให้ความข้นเหนียว', 'สารเคลือบผิว', 'สารทำให้เกิดเจล', 'สารทำให้เกิดความชุ่มชื้น'
  ]);
});

test('rejects unrendered Thai FDA app templates', () => {
  assert.throws(
    () => parseThaiFdaDetail('<div>{{ls.NAME}}</div>', { expectedIns: '406' }),
    /unrendered application template/
  );
});
