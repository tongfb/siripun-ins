import fs from 'node:fs/promises';
import { parseThaiFdaDetail } from './lib/thai-fda-parser.mjs';

const apply = process.argv.includes('--apply');
const manifest = JSON.parse(await fs.readFile(new URL('../data/thai-fda-import.json', import.meta.url), 'utf8'));
const dbUrl = new URL('../data/ins.json', import.meta.url);
const db = JSON.parse(await fs.readFile(dbUrl, 'utf8'));
const records = new Map(db.records.map((record) => [String(record.ins), record]));
const report = {
  checked_at: new Date().toISOString(),
  source_id: manifest.source_id,
  source_database_version: manifest.database_version,
  mode: apply ? 'apply' : 'check',
  results: []
};

const coreFields = ['name_en', 'name_th', 'synonyms', 'functional_classes', 'functional_classes_th'];

function comparable(record = {}) {
  return Object.fromEntries(coreFields.map((field) => [field, record[field] ?? (field.endsWith('s') ? [] : null)]));
}

function same(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function nextPatch(version) {
  const match = String(version || '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return version;
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

for (const item of manifest.records) {
  const result = { ins: String(item.ins), url: item.detail_url, ok: false, changed: false };
  try {
    const response = await fetch(item.detail_url, {
      headers: {
        'user-agent': 'SiripunINS/0.2 Thai-FDA-importer (+https://siripun.com/ins)'
      },
      redirect: 'follow'
    });
    result.http_status = response.status;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    result.bytes = Buffer.byteLength(html);
    const parsed = parseThaiFdaDetail(html, { expectedIns: String(item.ins) });
    result.remote = parsed;
    const current = records.get(String(item.ins));
    result.current = current ? comparable(current) : null;
    result.changed = !same(result.current, comparable(parsed));
    result.ok = true;

    if (apply && result.changed) {
      const merged = {
        ...(current || {}),
        ...parsed,
        source_ids: [manifest.source_id],
        field_sources: Object.fromEntries(coreFields.map((field) => [field, [manifest.source_id]])),
        status: 'thai-fda-primary-imported',
        thai_fda: {
          database_version: manifest.database_version,
          imported_at: report.checked_at,
          detail_url: item.detail_url
        }
      };
      records.set(String(item.ins), merged);
    }
  } catch (error) {
    result.error = String(error?.message || error);
  }
  report.results.push(result);
}

await fs.mkdir(new URL('../reports/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('../reports/thai-fda-import.json', import.meta.url), JSON.stringify(report, null, 2));

const failed = report.results.filter((result) => !result.ok);
const changed = report.results.filter((result) => result.changed);
console.log(`Thai FDA importer checked ${report.results.length} records; ${changed.length} changed; ${failed.length} failed.`);

if (apply && !failed.length && changed.length) {
  db.records = [...records.values()].sort((a, b) => String(a.ins).localeCompare(String(b.ins), undefined, { numeric: true }));
  db.database_version = nextPatch(db.database_version);
  db.reviewed_at = report.checked_at.slice(0, 10);
  db.migration_status = 'thai-fda-importer-active';
  await fs.writeFile(dbUrl, `${JSON.stringify(db, null, 2)}\n`);
  console.log(`Applied ${changed.length} change(s). Database is now ${db.database_version}.`);
}

if (failed.length) process.exitCode = 2;
