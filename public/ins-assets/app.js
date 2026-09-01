(() => {
  'use strict';

  const resolveAssetBase = () => {
    const configured = typeof window !== 'undefined' ? window.SIRIPUN_INS_ASSET_BASE : '';
    if (configured) return String(configured).replace(/\/$/, '');

    const originalScript = [...document.scripts].find((script) =>
      /\/ins-assets\/app\.js(?:\?|$)/i.test(script.src || '')
    );
    if (originalScript?.src) {
      return new URL('.', originalScript.src).href.replace(/\/$/, '');
    }

    return `${window.location.origin}/ins-assets`;
  };

  const ASSET_BASE = resolveAssetBase();

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const normalizeToken = (token) => token
    .trim()
    .replace(/^INS\s*/i, '')
    .replace(/\s+/g, '')
    .trim();

  const lookupKey = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()\[\]]/g, '');

  function parseQuery(raw) {
    const matches = String(raw || '').match(/(?:INS\s*)?\d{2,4}(?:\s*\([ivx]+\)|[a-z])?/gi) || [];
    const seen = new Set();
    const tokens = [];
    for (const match of matches) {
      const token = normalizeToken(match);
      const key = lookupKey(token);
      if (!token || !key || seen.has(key)) continue;
      seen.add(key);
      tokens.push(token);
    }
    return tokens;
  }

  function renderRecord(record) {
    const functionsTh = (record.functional_classes_th || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    const functionsEn = (record.functional_classes || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
    const synonyms = (record.synonyms || []).length
      ? `<div class="siripun-ins-row"><strong>ชื่ออื่น</strong><span>${record.synonyms.map(escapeHtml).join(', ')}</span></div>`
      : '';
    const jecfa = record.jecfa ? `
      <div class="siripun-ins-jecfa">
        <div class="siripun-ins-row"><strong>JECFA evaluation</strong><span>${escapeHtml(record.jecfa.evaluation_year ?? '')}</span></div>
        <div class="siripun-ins-row"><strong>ADI</strong><span>${escapeHtml(record.jecfa.adi ?? '')}</span></div>
        <div class="siripun-ins-row"><strong>CAS</strong><span>${escapeHtml(record.jecfa.cas ?? '')}</span></div>
      </div>` : '';
    const sourceWarning = record.source_warning
      ? `<div class="siripun-ins-source-warning"><strong>⚠ หมายเหตุจากการตรวจข้อมูล</strong><span>${escapeHtml(record.source_warning)}</span></div>`
      : '';

    const thaiFunctions = functionsTh
      ? `<div><strong>หน้าที่</strong><ul>${functionsTh}</ul></div>`
      : `<div><strong>หน้าที่</strong><p class="siripun-ins-unavailable">ยังไม่มีข้อมูลภาษาไทยจากฐานปัจจุบัน</p></div>`;

    return `
      <article class="siripun-ins-card" id="ins-${escapeHtml(record.ins)}">
        <div class="siripun-ins-card-head">
          <span class="siripun-ins-number">INS ${escapeHtml(record.ins)}</span>
          <span class="siripun-ins-status">${record.source_warning ? 'ข้อมูลในฐาน • มีจุดต้องตรวจ' : 'ข้อมูลในฐาน'}</span>
        </div>
        <h3>${escapeHtml(record.name_en)}</h3>
        <div class="siripun-ins-thai-name">${escapeHtml(record.name_th || 'ยังไม่มีข้อมูลชื่อภาษาไทยจากฐานปัจจุบัน')}</div>
        ${synonyms}
        <div class="siripun-ins-columns">
          ${thaiFunctions}
          <div><strong>Functional class</strong><ul>${functionsEn}</ul></div>
        </div>
        ${jecfa}
        ${sourceWarning}
      </article>`;
  }

  function renderMissing(ins) {
    return `<article class="siripun-ins-card siripun-ins-missing"><span class="siripun-ins-number">INS ${escapeHtml(ins)}</span><p>ยังไม่มีข้อมูลรายการนี้ในฐานข้อมูลที่เผยแพร่</p></article>`;
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      const old = button.textContent;
      button.textContent = 'คัดลอกแล้ว';
      setTimeout(() => { button.textContent = old; }, 1500);
    } catch {
      window.prompt('คัดลอก Lightning Address', text);
    }
  }

  async function mount(root) {
    root.classList.add('siripun-ins-app');
    root.innerHTML = '<div class="siripun-ins-loading">กำลังโหลดฐานข้อมูล…</div>';

    try {
      const [dbRes, configRes] = await Promise.all([
        fetch(`${ASSET_BASE}/data/ins.json`, { cache: 'no-store' }),
        fetch(`${ASSET_BASE}/config.json`, { cache: 'no-store' })
      ]);
      if (!dbRes.ok || !configRes.ok) throw new Error('data-load-failed');

      const db = await dbRes.json();
      const config = await configRes.json();
      const recordMap = new Map(db.records.map((r) => [lookupKey(r.ins), r]));

      const credit = config.data_credit ? `
        <aside class="siripun-ins-credit">
          <strong>${escapeHtml(config.data_credit.label)}</strong>
          <span>ฐานข้อมูล ${escapeHtml(config.data_credit.database_version || '')}</span>
          <small>${escapeHtml(config.data_credit.note || '')}</small>
        </aside>` : '';

      root.innerHTML = `
        <section class="siripun-ins-shell">
          <header class="siripun-ins-header">
            <h2>${escapeHtml(config.title)}</h2>
            <p>${escapeHtml(config.subtitle)}</p>
          </header>
          <form class="siripun-ins-form" autocomplete="off">
            <label for="siripun-ins-input-${root.dataset.instance || '1'}">เลข INS</label>
            <div class="siripun-ins-search-row">
              <textarea id="siripun-ins-input-${root.dataset.instance || '1'}" rows="2" inputmode="text" placeholder="${escapeHtml(config.placeholder)}"></textarea>
              <button type="submit">ค้นหา</button>
            </div>
            <small>กรอกได้หลายหมายเลข คั่นด้วย , เว้นวรรค ; หรือขึ้นบรรทัดใหม่</small>
          </form>
          <div class="siripun-ins-summary" hidden></div>
          <div class="siripun-ins-results" aria-live="polite"></div>
          ${credit}
          ${config.donation?.enabled ? `
          <footer class="siripun-ins-footer">
            <span>${escapeHtml(config.donation.label)}</span>
            <div class="siripun-ins-donate-actions">
              <button type="button" class="siripun-ins-wallet">⚡ เปิด Lightning wallet</button>
              <button type="button" class="siripun-ins-copy">คัดลอก address</button>
            </div>
          </footer>` : ''}
        </section>`;

      const form = root.querySelector('.siripun-ins-form');
      const input = form.querySelector('textarea');
      const results = root.querySelector('.siripun-ins-results');
      const summary = root.querySelector('.siripun-ins-summary');
      const walletButton = root.querySelector('.siripun-ins-wallet');
      const copyButton = root.querySelector('.siripun-ins-copy');

      const doSearch = (raw, updateUrl = true) => {
        const tokens = parseQuery(raw);
        if (!tokens.length) {
          results.innerHTML = '';
          summary.hidden = true;
          return;
        }
        results.innerHTML = tokens.map((token) => {
          const record = recordMap.get(lookupKey(token));
          return record ? renderRecord(record) : renderMissing(token);
        }).join('');
        const found = tokens.filter((token) => recordMap.has(lookupKey(token))).length;
        summary.textContent = `ค้นหา ${tokens.length} รายการ • พบข้อมูล ${found} รายการ • ฐานข้อมูล ${db.database_version}`;
        summary.hidden = false;
        if (updateUrl) {
          const url = new URL(window.location.href);
          url.searchParams.set('q', tokens.join(','));
          history.replaceState(null, '', url);
        }
      };

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        doSearch(input.value);
      });

      if (config.donation?.enabled && copyButton && walletButton) {
        copyButton.addEventListener('click', () => copyText(config.donation.lightning_address, copyButton));
        walletButton.addEventListener('click', () => {
          window.location.href = config.donation.lightning_uri;
        });
      }

      const initial = new URL(window.location.href).searchParams.get('q');
      if (initial) {
        input.value = initial;
        doSearch(initial, false);
      }
    } catch (error) {
      console.error('[Siripun INS]', error);
      root.innerHTML = '<div class="siripun-ins-error">โหลดฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
    }
  }

  document.querySelectorAll('[data-siripun-ins-root]').forEach((root, index) => {
    root.dataset.instance = String(index + 1);
    mount(root);
  });
})();
