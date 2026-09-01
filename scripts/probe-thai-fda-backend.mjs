import fs from 'node:fs/promises';

const endpoint = 'https://alimentum.fda.moph.go.th/FDA_FOOD_MVC/Additive/AdditiveGet';
const actions = ['getListName', 'getFaWithFunction', 'getUrlSpec'];
const outDir = new URL('../reports/thai-fda-backend/', import.meta.url);
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

function collectArrays(value, path = '$', depth = 0, out = []) {
  if (depth > 4 || value == null) return out;
  if (Array.isArray(value)) {
    out.push({ path, rows: value });
    return out;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectArrays(child, `${path}.${key}`, depth + 1, out);
    }
  }
  return out;
}

function looksLike406(row) {
  if (!row || typeof row !== 'object') return false;
  const values = Object.values(row).map((value) => String(value ?? '').toLowerCase());
  return values.some((value) => value === '406' || value.includes('agar') || value.includes('อะการ์'));
}

const report = {
  checked_at: new Date().toISOString(),
  endpoint,
  target_ins: '406',
  actions: []
};
let failed = false;

for (const action of actions) {
  const item = { action, ok: false };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'th-TH,th;q=0.9,en;q=0.7',
        'origin': 'https://alimentum.fda.moph.go.th',
        'referer': 'https://alimentum.fda.moph.go.th/FDA_FOOD_MVC/Additive/FoodAdditiveDetail?SearchKey=AGAR%20(%E0%B8%AD%E0%B8%B0%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%8C)&SearchType=FaDetail&SearchINS=406',
        'user-agent': 'SiripunINS/0.2 Thai-FDA-backend-probe (+https://siripun.com/ins)'
      },
      body: JSON.stringify({ Action: action })
    });

    const text = await response.text();
    item.http_status = response.status;
    item.content_type = response.headers.get('content-type');
    item.bytes = Buffer.byteLength(text);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    let parsed;
    try { parsed = normalizePayload(JSON.parse(text)); }
    catch { throw new Error(`Non-JSON response: ${text.slice(0, 160).replace(/\s+/g, ' ')}`); }

    const arrays = collectArrays(parsed);
    item.payload_type = Array.isArray(parsed) ? 'array' : typeof parsed;
    item.array_paths = arrays.map(({ path, rows }) => ({
      path,
      count: rows.length,
      first_keys: rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]).slice(0, 30) : []
    }));

    const matches = [];
    for (const { path, rows } of arrays) {
      for (const row of rows) {
        if (looksLike406(row)) matches.push({ path, row });
        if (matches.length >= 50) break;
      }
      if (matches.length >= 50) break;
    }
    item.matches_406 = matches;
    item.ok = true;

    await fs.writeFile(new URL(`${action}.sample.json`, outDir), `${JSON.stringify({
      action,
      http_status: item.http_status,
      content_type: item.content_type,
      bytes: item.bytes,
      array_paths: item.array_paths,
      matches_406: matches
    }, null, 2)}\n`);
  } catch (error) {
    failed = true;
    item.error = String(error?.message || error);
  }
  report.actions.push(item);
}

await fs.writeFile(new URL('summary.json', outDir), `${JSON.stringify(report, null, 2)}\n`);

for (const item of report.actions) {
  console.log(`${item.action}: ${item.ok ? 'OK' : 'FAIL'} status=${item.http_status ?? '-'} bytes=${item.bytes ?? '-'} matches406=${item.matches_406?.length ?? 0}`);
  if (item.error) console.error(item.error);
}

if (failed) process.exitCode = 2;
