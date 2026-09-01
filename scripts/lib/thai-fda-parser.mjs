const decodeEntities = (value = '') => String(value)
  .replaceAll('&nbsp;', ' ')
  .replaceAll('&amp;', '&')
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function htmlToLines(html) {
  return decodeEntities(String(html || ''))
    .replace(/<script\b[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '\n')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/td|\/section|\/article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function cleanBullet(value) {
  return value.replace(/^[-–—•]\s*/, '').trim();
}

function parseHeader(lines, expectedIns) {
  const insPattern = expectedIns
    ? new RegExp(`\\(\\s*INS\\s*${String(expectedIns).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`, 'i')
    : /\(\s*INS\s*([0-9]{2,4}(?:\s*\([ivx]+\)|[a-z])?)\s*\)/i;

  const index = lines.findIndex((line) => insPattern.test(line));
  if (index < 0) throw new Error(`Thai FDA detail page: INS ${expectedIns || ''} heading not found`.trim());

  const line = lines[index];
  const insMatch = line.match(/\(\s*INS\s*([0-9]{2,4}(?:\s*\([ivx]+\)|[a-z])?)\s*\)/i);
  const beforeIns = line.slice(0, insMatch.index).trim();
  const thaiMatch = beforeIns.match(/^(.*?)\s*\(([^()]+)\)\s*$/);

  return {
    headerIndex: index,
    ins: insMatch?.[1]?.trim() || String(expectedIns || ''),
    name_en: (thaiMatch ? thaiMatch[1] : beforeIns).trim(),
    name_th: thaiMatch ? thaiMatch[2].trim() : null
  };
}

function findSection(lines, patterns, from = 0) {
  return lines.findIndex((line, index) => index >= from && patterns.some((pattern) => pattern.test(line)));
}

export function parseThaiFdaDetail(html, { expectedIns } = {}) {
  const lines = htmlToLines(html);
  if (!lines.length) throw new Error('Thai FDA detail page: empty response');
  if (lines.some((line) => /\{\{\s*(ls\.|ModalTopic|a\b|digit\b)/i.test(line))) {
    throw new Error('Thai FDA detail page: received an unrendered application template instead of additive data');
  }

  const header = parseHeader(lines, expectedIns);
  const synonymIndex = findSection(lines, [/ชื่ออื่น/i, /synonym/i], header.headerIndex + 1);
  const functionIndex = findSection(lines, [/หน้าที่/i, /function\s+of\s+food\s+additive/i], header.headerIndex + 1);
  const specificationIndex = findSection(lines, [/ข้อกำหนดคุณภาพ/i, /specification/i], Math.max(functionIndex, 0) + 1);

  const synonyms = [];
  if (synonymIndex >= 0 && functionIndex > synonymIndex) {
    for (const line of lines.slice(synonymIndex + 1, functionIndex)) {
      const value = cleanBullet(line);
      if (value && !/^(ชื่ออื่น|synonym)\s*:?$/i.test(value)) synonyms.push(value);
    }
  }

  const functional_classes = [];
  const functional_classes_th = [];
  if (functionIndex >= 0) {
    const end = specificationIndex > functionIndex ? specificationIndex : lines.length;
    for (const line of lines.slice(functionIndex + 1, end)) {
      const value = cleanBullet(line);
      if (!value || /^(หน้าที่|function\s+of\s+food\s+additive)\s*:?$/i.test(value)) continue;
      const match = value.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
      if (match) {
        functional_classes_th.push(match[1].trim());
        functional_classes.push(match[2].trim());
      }
    }
  }

  if (!header.name_en) throw new Error(`Thai FDA detail page: INS ${header.ins} missing English name`);
  if (!functional_classes.length) throw new Error(`Thai FDA detail page: INS ${header.ins} has no parsed functional classes`);

  return {
    ins: header.ins,
    name_en: header.name_en,
    name_th: header.name_th,
    synonyms: [...new Set(synonyms)],
    functional_classes: [...new Set(functional_classes)],
    functional_classes_th: [...new Set(functional_classes_th)]
  };
}
