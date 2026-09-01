import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const sourceFile = new URL('../data/sources.json', import.meta.url);
const sourceData = JSON.parse(await fs.readFile(sourceFile, 'utf8'));
const sources = sourceData.sources;
const output = {
  checked_at: new Date().toISOString(),
  primary_source_id: sourceData.primary_source_id,
  legal_verification_source_id: sourceData.legal_verification_source_id,
  results: []
};

for (const source of sources) {
  const result = { id: source.id, role: source.role || null, status_declared: source.status, url: source.url, ok: false };
  try {
    const response = await fetch(source.url, {
      headers: { 'user-agent': 'SiripunINS/0.2 source-change-checker' },
      redirect: 'follow'
    });
    result.status = response.status;
    result.content_type = response.headers.get('content-type');
    result.etag = response.headers.get('etag');
    result.last_modified = response.headers.get('last-modified');
    if (source.check_mode === 'fingerprint' && response.ok) {
      const text = await response.text();
      result.sha256 = crypto.createHash('sha256').update(text).digest('hex');
      result.bytes = Buffer.byteLength(text);
    }
    result.ok = response.ok;
  } catch (error) {
    result.error = String(error?.message || error);
  }
  output.results.push(result);
}

await fs.mkdir(new URL('../reports/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('../reports/source-check.json', import.meta.url), JSON.stringify(output, null, 2));
const failed = output.results.filter((x) => !x.ok);
console.log(`Checked ${output.results.length} sources; primary=${sourceData.primary_source_id}; ${failed.length} failed.`);
if (failed.length) process.exitCode = 2;
