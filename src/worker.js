function timingSafeEqual(a, b) {
  const left = new TextEncoder().encode(String(a || ''));
  const right = new TextEncoder().encode(String(b || ''));
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

async function dispatchUpdate(env, mode) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    return json({ ok: false, error: 'github-not-configured' }, 503);
  }
  const workflow = env.GITHUB_WORKFLOW || 'update-data.yml';
  const endpoint = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/actions/workflows/${workflow}/dispatches`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'content-type': 'application/json',
      'user-agent': 'siripun-ins-worker',
      'x-github-api-version': '2022-11-28'
    },
    body: JSON.stringify({ ref: env.GITHUB_REF || 'main', inputs: { mode } })
  });
  if (response.status !== 204) {
    return json({ ok: false, error: 'github-dispatch-failed', status: response.status }, 502);
  }
  return json({ ok: true, mode, message: 'workflow-dispatched' }, 202);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/ins-assets/api/update') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method-not-allowed' }, 405);
      const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
      if (!env.UPDATE_TRIGGER_SECRET || !timingSafeEqual(token, env.UPDATE_TRIGGER_SECRET)) {
        return json({ ok: false, error: 'unauthorized' }, 401);
      }
      let body = {};
      try { body = await request.json(); } catch {}
      const mode = body.mode === 'apply' ? 'apply' : 'check';
      return dispatchUpdate(env, mode);
    }

    if (url.pathname === '/ins-assets/api/health') {
      return json({ ok: true, service: 'siripun-ins', time: new Date().toISOString() });
    }

    return env.ASSETS.fetch(request);
  }
};
