import fs from 'node:fs/promises';

const db = JSON.parse(await fs.readFile(new URL('../data/ins.json', import.meta.url), 'utf8'));
const sourceData = JSON.parse(await fs.readFile(new URL('../data/sources.json', import.meta.url), 'utf8'));
const sourceMap = new Map(sourceData.sources.map((s) => [s.id, s]));
const errors = [];
const seen = new Set();
const disallowedCurrentStatuses = new Set(['revoked', 'superseded']);

for (const record of db.records) {
  if (!record.ins || seen.has(record.ins)) errors.push(`invalid/duplicate INS: ${record.ins}`);
  seen.add(record.ins);
  if (!record.name_en) errors.push(`INS ${record.ins}: missing name_en`);
  if (!Array.isArray(record.source_ids) || record.source_ids.length === 0) errors.push(`INS ${record.ins}: missing source_ids`);

  for (const id of record.source_ids || []) {
    const source = sourceMap.get(id);
    if (!source) {
      errors.push(`INS ${record.ins}: unknown source ${id}`);
      continue;
    }
    if (disallowedCurrentStatuses.has(source.status)) {
      errors.push(`INS ${record.ins}: current record references ${source.status} source ${id}`);
    }
  }

  for (const [field, ids] of Object.entries(record.field_sources || {})) {
    if (!(field in record)) errors.push(`INS ${record.ins}: field_sources references missing field ${field}`);
    for (const id of ids) {
      const source = sourceMap.get(id);
      if (!source) {
        errors.push(`INS ${record.ins}: field ${field} references unknown source ${id}`);
        continue;
      }
      if (disallowedCurrentStatuses.has(source.status)) {
        errors.push(`INS ${record.ins}: field ${field} references ${source.status} source ${id}`);
      }
      if (Array.isArray(source.fields) && !source.fields.includes(field) && !source.fields.includes('search_aid')) {
        errors.push(`INS ${record.ins}: source ${id} is not declared for field ${field}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${db.records.length} INS records and ${sourceMap.size} sources with source-status checks.`);
