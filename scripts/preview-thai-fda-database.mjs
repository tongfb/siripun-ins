import fs from 'node:fs/promises';

const endpoint = 'https://alimentum.fda.moph.go.th/FDA_FOOD_MVC/Additive/AdditiveGet';
const sourceId = 'thai-fda-p468-db';
const databaseVersion = 'P468 V.02';
const outDir = new URL('../reports/thai-fda-preview/', import.meta.url);
await fs.mkdir(outDir, { recursive: true });

function normalizePayload(value) {
  let current = value;
  for (let i = 0; i < 3; i++) {
    if (typeof current !== 'string') break;
    const text = current.trim();
    if (!text) break;
    try { current = JSON.parse(text); } catch { break; }
  }
  return current;
}

async function callThaiFda(action) {
  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'th-TH,th;q=0.9,en;q=0.7',
      'origin': 'https://alimentum.fda.moph.go.th',
      'referer': 'https://alimentum.fda.moph.go.th/FDA_FOOD_MVC/Additive/Welcome',
      'user-agent': 'SiripunINS/0.2 Thai-FDA-preview (+https://siripun.com/ins)'
    },
    body: JSON.stringify({ Action: action })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${action}: HTTP ${response.status}`);
  let parsed;
  try { parsed = normalizePayload(JSON.parse(text)); }
  catch { throw new Error(`${action}: non-JSON response`); }
  if (!Array.isArray(parsed)) throw new Error(`${action}: expected array payload`);
  return parsed;
}

function clean(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function unique(values) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function splitMainName(value) {
  const text = clean(value);
  const match = text.match(/^(.*)\s+\(([^()]*)\)\s*$/);
  if (match && /[\u0E00-\u0E7F]/.test(match[2])) {
    return { name_en: clean(match[1]), name_th: clean(match[2]) };
  }
  return { name_en: text, name_th: null };
}

function splitFunction(value) {
  const text = clean(value);
  const match = text.match(/^(.*)\s+\(([^()]*)\)\s*$/);
  if (!match) return { th: text || null, en: null };
  return { th: clean(match[1]) || null, en: clean(match[2]) || null };
}

function insSort(a, b) {
  return String(a.ins).localeCompare(String(b.ins), undefined, { numeric: true, sensitivity: 'base' });
}

const [nameRows, functionRows] = await Promise.all([
  callThaiFda('getListName'),
  callThaiFda('getFaWithFunction')
]);

const primaryNames = nameRows.filter((row) => clean(row.TYPE).toLowerCase() === 'name' && clean(row.INS));
const duplicateNameIns = [...new Set(primaryNames.map((row) => clean(row.INS)).filter((ins, index, all) => all.indexOf(ins) !== index))];
const records = [];

for (const nameRow of primaryNames) {
  const ins = clean(nameRow.INS);
  const namesForIns = nameRows.filter((row) => clean(row.INS) === ins);
  const functionsForIns = functionRows.filter((row) => clean(row.INS) === ins);
  const main = splitMainName(nameRow.MAIN_NAME || nameRow.NAME);
  const synonyms = unique(namesForIns
    .filter((row) => clean(row.TYPE).toLowerCase() === 'synonym')
    .map((row) => row.NAME));

  const functionPairs = functionsForIns
    .map((row) => splitFunction(row.FULLNAME))
    .filter((item) => item.en || item.th);

  records.push({
    ins,
    name_en: main.name_en,
    name_th: main.name_th,
    synonyms,
    functional_classes: unique(functionPairs.map((item) => item.en)),
    functional_classes_th: unique(functionPairs.map((item) => item.th)),
    jecfa: null,
    source_ids: [sourceId],
    field_sources: {
      name_en: [sourceId],
      name_th: [sourceId],
      synonyms: [sourceId],
      functional_classes: [sourceId],
      functional_classes_th: [sourceId]
    },
    source_record: {
      database_version: databaseVersion,
      backend_action_names: ['getListName', 'getFaWithFunction']
    },
    status: 'thai-fda-primary-preview'
  });
}

records.sort(insSort);

const sampleIns = ['300', '406', '491'];
const samples = Object.fromEntries(sampleIns.map((ins) => [ins, records.find((record) => record.ins === ins) ?? null]));
const missingThai = records.filter((record) => !record.name_th).map((record) => record.ins);
const missingFunctions = records.filter((record) => !record.functional_classes.length).map((record) => record.ins);
const duplicateRecordIns = [...new Set(records.map((record) => record.ins).filter((ins, index, all) => all.indexOf(ins) !== index))];

const preview = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  source_id: sourceId,
  source_database_version: databaseVersion,
  endpoint,
  stats: {
    raw_name_rows: nameRows.length,
    raw_function_rows: functionRows.length,
    primary_name_rows: primaryNames.length,
    records: records.length,
    records_with_thai_name: records.length - missingThai.length,
    records_without_thai_name: missingThai.length,
    records_without_function: missingFunctions.length,
    duplicate_primary_name_ins: duplicateNameIns.length,
    duplicate_record_ins: duplicateRecordIns.length
  },
  checks: {
    duplicate_primary_name_ins: duplicateNameIns,
    duplicate_record_ins: duplicateRecordIns,
    missing_thai_name_ins: missingThai,
    missing_function_ins: missingFunctions
  },
  samples,
  records
};

await fs.writeFile(new URL('thai-fda-preview.json', outDir), `${JSON.stringify(preview, null, 2)}\n`);
await fs.writeFile(new URL('summary.json', outDir), `${JSON.stringify({
  generated_at: preview.generated_at,
  source_database_version: databaseVersion,
  stats: preview.stats,
  checks: preview.checks,
  samples
}, null, 2)}\n`);

console.log(`Thai FDA preview built ${records.length} records from ${nameRows.length} name rows and ${functionRows.length} function rows.`);
console.log(`Thai names missing: ${missingThai.length}; functions missing: ${missingFunctions.length}; duplicate record INS: ${duplicateRecordIns.length}.`);
for (const ins of sampleIns) console.log(`Sample INS ${ins}: ${samples[ins] ? 'FOUND' : 'MISSING'}`);

if (!records.length || duplicateRecordIns.length) process.exitCode = 2;
