import fs from 'node:fs/promises';

const db = JSON.parse(await fs.readFile(new URL('../data/ins.json', import.meta.url), 'utf8'));
const sourceData = JSON.parse(await fs.readFile(new URL('../data/sources.json', import.meta.url), 'utf8'));
const sources = new Set(sourceData.sources.map((s) => s.id));
const errors = [];
const seen = new Set();

for (const record of db.records) {
  if (!record.ins || seen.has(record.ins)) errors.push(`invalid/duplicate INS: ${record.ins}`);
  seen.add(record.ins);
  if (!record.name_en) errors.push(`INS ${record.ins}: missing name_en`);
  if (!Array.isArray(record.source_ids) || record.source_ids.length === 0) errors.push(`INS ${record.ins}: missing source_ids`);
  for (const id of record.source_ids || []) if (!sources.has(id)) errors.push(`INS ${record.ins}: unknown source ${id}`);
  for (const [field, ids] of Object.entries(record.field_sources || {})) {
    if (!(field in record)) errors.push(`INS ${record.ins}: field_sources references missing field ${field}`);
    for (const id of ids) if (!sources.has(id)) errors.push(`INS ${record.ins}: field ${field} references unknown source ${id}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${db.records.length} INS records and ${sources.size} sources.`);
