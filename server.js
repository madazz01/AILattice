const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { URL } = require('url');

// Load .env
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach(line => {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k && !k.startsWith('#')) process.env[k] = v;
    }
  });
} catch(e) {}

const PORT = 3450;
const ROOT = __dirname;

const INDEXNOW_KEY = 'e7f3a2b9c1d4056f8a3e2b1d9c4f7062';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

// ── Validator ─────────────────────────────────────────────────────────────────

function remoteFetch(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(url); } catch(e) { return reject(new Error('Invalid URL')); }
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, { timeout: 8000 }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        return remoteFetch(next, redirectsLeft - 1).then(resolve).catch(reject);
      }
      let body = '';
      let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size < 512*1024) body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function hasFrontmatter(body, fields) {
  if (!body.trimStart().startsWith('---')) return { ok: false, missing: fields };
  const end = body.indexOf('---', 3);
  if (end === -1) return { ok: false, missing: fields };
  const fm = body.slice(3, end);
  const missing = fields.filter(f => !new RegExp('^' + f + ':', 'm').test(fm));
  return { ok: missing.length === 0, missing };
}

function hasLlmsFields(body, fields) {
  const missing = fields.filter(f => !new RegExp('^' + f + ':', 'm').test(body));
  return { ok: missing.length === 0, missing };
}

const PRIVATE_IP = /^(localhost$|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i;

async function validateSite(rawUrl) {
  if (!rawUrl.match(/^https?:\/\//i)) rawUrl = 'https://' + rawUrl;
  rawUrl = rawUrl.replace(/\/+$/, '');

  let parsed;
  try { parsed = new URL(rawUrl); } catch(e) { throw new Error('Invalid URL'); }
  if (PRIVATE_IP.test(parsed.hostname)) throw new Error('Private/local addresses not allowed');

  const base = parsed.origin;
  const checks = [];
  let score = 0;

  async function probe(urlPath) {
    try { return await remoteFetch(base + urlPath); }
    catch(e) { return { status: 0, body: '', error: e.message }; }
  }

  // 1 — /llms.txt exists (20 pts)
  const llms = await probe('/llms.txt');
  const llmsOk = llms.status === 200;
  if (llmsOk) score += 20;
  checks.push({ id: 'llms_exists', label: '/llms.txt found', ok: llmsOk, points: llmsOk ? 20 : 0, max: 20 });

  // 2 — llms.txt required fields (10 pts)
  const llmsFields = ['name', 'description', 'url', 'ai-entry'];
  const { ok: llmsFm, missing: llmsMissing } = llmsOk ? hasLlmsFields(llms.body, llmsFields) : { ok: false, missing: llmsFields };
  if (llmsFm) score += 10;
  checks.push({ id: 'llms_fields', label: 'llms.txt has required fields', ok: llmsFm, points: llmsFm ? 10 : 0, max: 10,
    detail: llmsFm ? null : (llmsOk ? `Missing: ${llmsMissing.join(', ')}` : 'llms.txt not found') });

  // 3 — /ai/index.md exists (20 pts)
  const aiIndex = await probe('/ai/index.md');
  const aiIndexOk = aiIndex.status === 200;
  if (aiIndexOk) score += 20;
  checks.push({ id: 'ai_index', label: '/ai/index.md found', ok: aiIndexOk, points: aiIndexOk ? 20 : 0, max: 20 });

  // 4 — /ai/index.md frontmatter (10 pts)
  const fmFields = ['title', 'description', 'last-updated'];
  const { ok: aiFm, missing: aiMissing } = aiIndexOk ? hasFrontmatter(aiIndex.body, fmFields) : { ok: false, missing: fmFields };
  if (aiFm) score += 10;
  checks.push({ id: 'ai_index_fm', label: '/ai/index.md has frontmatter', ok: aiFm, points: aiFm ? 10 : 0, max: 10,
    detail: aiFm ? null : (aiIndexOk ? `Missing: ${aiMissing.join(', ')}` : '/ai/index.md not found') });

  // 5 — /ai/sitemap.md exists (15 pts)
  const sitemap = await probe('/ai/sitemap.md');
  const sitemapOk = sitemap.status === 200;
  if (sitemapOk) score += 15;
  checks.push({ id: 'ai_sitemap', label: '/ai/sitemap.md found', ok: sitemapOk, points: sitemapOk ? 15 : 0, max: 15 });

  // 6 — /ai/sitemap.md frontmatter (10 pts)
  const { ok: smFm, missing: smMissing } = sitemapOk ? hasFrontmatter(sitemap.body, fmFields) : { ok: false, missing: fmFields };
  if (smFm) score += 10;
  checks.push({ id: 'ai_sitemap_fm', label: '/ai/sitemap.md has frontmatter', ok: smFm, points: smFm ? 10 : 0, max: 10,
    detail: smFm ? null : (sitemapOk ? `Missing: ${smMissing.join(', ')}` : '/ai/sitemap.md not found') });

  // 7 — Additional content pages (10 pts)
  let extraFound = 0;
  if (sitemapOk) {
    const links = [...sitemap.body.matchAll(/\]\((\/ai\/[^)]+\.md)\)/g)]
      .map(m => m[1])
      .filter(l => !l.endsWith('/index.md') && !l.endsWith('/sitemap.md'))
      .slice(0, 3);
    for (const link of links) {
      const r = await probe(link);
      if (r.status === 200) extraFound++;
    }
  }
  const extraOk = extraFound > 0;
  if (extraOk) score += 10;
  checks.push({ id: 'content_pages', label: 'Additional content pages', ok: extraOk, points: extraOk ? 10 : 0, max: 10,
    detail: extraOk ? `${extraFound} page${extraFound > 1 ? 's' : ''} found` : 'No additional pages found in sitemap' });

  // 8 — HTML discovery link (5 pts)
  const html = await probe('/');
  const htmlOk = html.status === 200 && /rel=["']alternate["']/.test(html.body) && /text\/markdown/.test(html.body);
  if (htmlOk) score += 5;
  checks.push({ id: 'html_link', label: 'HTML <link rel="alternate"> discovery tag', ok: htmlOk, points: htmlOk ? 5 : 0, max: 5 });

  // 9 — Schema.org JSON-LD (informational — Google AI Overviews)
  const schemaOk = html.status === 200 && /type=["']application\/ld\+json["']/.test(html.body);
  checks.push({ id: 'schema_org', label: 'Schema.org structured data (Google AI)', ok: schemaOk, points: 0, max: 0,
    detail: schemaOk ? 'Found — helps Google AI Overviews cite your site' : 'Missing — add the generated JSON-LD snippet to your <head> to improve Google AI Overviews visibility' });

  // Extract name + description from llms.txt for JSON-LD generation
  let siteName = '', siteDescription = '';
  if (llmsOk) {
    const nm = llms.body.match(/^name:\s*(.+)$/m);
    const dc = llms.body.match(/^description:\s*(.+)$/m);
    if (nm) siteName = nm[1].trim();
    if (dc) siteDescription = dc[1].trim();
  }

  return { url: base, score, certified: score >= 70, checks, meta: { name: siteName, description: siteDescription }, checkedAt: new Date().toISOString() };
}

// ── Registry ──────────────────────────────────────────────────────────────────

const REGISTRY_FILE = path.join(__dirname, 'registry.json');

const TOPIC_MAP = {
  'Technology':              ['software','tech','app','api','developer','platform','digital','saas','startup','cloud','ai ','machine learning','automation'],
  'Business & Finance':      ['business','finance','accounting','investment','bank','trading','commerce','entrepreneur','consulting','b2b','revenue','capital'],
  'Intelligence & Analytics':['intelligence','analytics','insights','market data','index','economic','indicators','geopolitical','monitor'],
  'Health & Wellness':       ['health','medical','fitness','wellness','mental','nutrition','doctor','clinic','therapy','wellbeing','pharmaceutical'],
  'Education':               ['education','learning','course','school','university','training','tutorial','academy','study','e-learning'],
  'News & Media':            ['news','media','journalism','blog','magazine','press','editorial','podcast','publishing','content creator'],
  'Government & Public':     ['government','public','civic','policy','official','municipal','council','parliament','ngo','nonprofit'],
  'Science & Research':      ['science','research','laboratory','academic','publication','journal','experiment','data science'],
  'Arts & Culture':          ['art','culture','music','design','creative','gallery','museum','photography','fashion','film'],
  'Travel & Local':          ['travel','tourism','hotel','local','destination','accommodation','transport','hospitality'],
  'Real Estate':             ['real estate','property','housing','mortgage','rental','commercial','residential','construction'],
  'Food & Lifestyle':        ['food','restaurant','recipe','lifestyle','cooking','dining','beverage','cafe'],
  'Sports & Recreation':     ['sport','fitness','recreation','outdoor','athletic','team','game','competition','esports'],
  'Retail & E-commerce':     ['shop','store','retail','ecommerce','product','marketplace','wholesale','brand'],
  'Environment':             ['environment','sustainability','green','climate','energy','renewable','conservation','eco'],
  'Legal & Professional':    ['legal','law','lawyer','compliance','regulation','audit','consulting','professional services'],
};

const LOCATION_TERMS = {
  'australia':'Australia','sydney':'Australia','melbourne':'Australia','brisbane':'Australia',
  'united kingdom':'UK','britain':'UK','england':'UK','london':'UK',
  'united states':'US','usa':'US','america':'US','new york':'US','california':'US',
  'canada':'Canada','toronto':'Canada','vancouver':'Canada',
  'new zealand':'New Zealand','auckland':'New Zealand',
  'germany':'Germany','berlin':'Germany','frankfurt':'Germany',
  'france':'France','paris':'France',
  'india':'India','bangalore':'India','mumbai':'India','delhi':'India',
  'singapore':'Singapore','hong kong':'Hong Kong',
  'japan':'Japan','tokyo':'Japan',
  'europe':'Europe','eu':'Europe','european':'Europe',
  'global':'Global','worldwide':'Global','international':'Global',
  'middle east':'Middle East','gulf':'Middle East',
  'africa':'Africa','latin america':'Latin America','asia':'Asia',
};

function extractLocation(text) {
  const lower = text.toLowerCase();
  for (const [term, loc] of Object.entries(LOCATION_TERMS)) {
    if (lower.includes(term)) return loc;
  }
  return '';
}

const STOP_WORDS = new Set(['the','and','for','are','was','with','that','this','from','have','will','what','about','which','can','how','all','your','our','their']);

function searchRegistry(q, limit = 10) {
  const lower    = q.toLowerCase().trim();
  const words    = lower.split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
  const topics   = classifyTopics(lower);
  const location = extractLocation(lower);

  const scored = [];

  for (const site of _registry.values()) {
    const nameL = (site.site_name  || '').toLowerCase();
    const descL = (site.description || '').toLowerCase();
    let rel = 0;

    // Topic match — strongest signal
    for (const t of topics) {
      if ((site.topics || []).includes(t)) rel += 5;
    }
    // Keyword in name — high weight
    for (const w of words) {
      if (nameL.includes(w)) rel += 3;
    }
    // Keyword in description
    for (const w of words) {
      if (descL.includes(w)) rel += 1;
    }
    // Location match
    if (location && (site.location || '').toLowerCase().includes(location.toLowerCase())) rel += 4;
    // Compliance quality — max +2
    rel += (site.score || 0) / 50;

    if (rel > 0) scored.push({ site, rel });
  }

  scored.sort((a, b) => b.rel - a.rel);
  const top = scored.slice(0, limit);

  return {
    query:         q,
    interpreted: {
      keywords: words,
      topics,
      location: location || null,
    },
    total_indexed: _registry.size,
    count:         top.length,
    results: top.map(({ site, rel }) => ({
      url:         site.site_url,
      name:        site.site_name,
      description: site.description,
      topics:      site.topics,
      location:    site.location || null,
      score:       site.score,
      relevance:   Math.round(rel * 10) / 10,
      ai_entry:    site.site_url.replace(/\/$/, '') + '/llms.txt',
      registered:  site.registered_at ? new Date(site.registered_at).toISOString().slice(0, 10) : null,
    })),
    powered_by: 'AILattice Registry — organic ranking · zero paid placement · ailattice.io',
  };
}

function classifyTopics(text) {
  const lower = (text || '').toLowerCase();
  const scores = {};
  for (const [topic, keywords] of Object.entries(TOPIC_MAP)) {
    scores[topic] = keywords.filter(kw => lower.includes(kw)).length;
  }
  return Object.entries(scores)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
}

function loadRegistry() {
  const m = new Map();
  try {
    for (const entry of JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'))) {
      m.set(entry.cert_id, entry);
    }
  } catch(e) {}
  return m;
}

function saveRegistry(m) {
  const sorted = [...m.values()].sort((a, b) => (b.registered_at || 0) - (a.registered_at || 0));
  try { fs.writeFileSync(REGISTRY_FILE, JSON.stringify(sorted, null, 2)); } catch(e) {}
}

const _registry = loadRegistry();

if (!_registry.has('AIL-20260619-NODE1')) {
  _registry.set('AIL-20260619-NODE1', {
    cert_id:       'AIL-20260619-NODE1',
    site_url:      'https://intellistasis.com',
    site_name:     'Intelli-Stasis',
    description:   'Global market intelligence infrastructure — AI-powered economic, trade, and geopolitical analytics for 24 markets.',
    topics:        ['Intelligence & Analytics', 'Business & Finance', 'Technology'],
    location:      'Global',
    score:         100,
    registered_at: 1750291200000,
  });
  saveRegistry(_registry);
}

function enrollInRegistry(cert, meta) {
  const topics = classifyTopics(meta.description);
  const entry = {
    cert_id:       cert.cert_id,
    site_url:      cert.site_url,
    site_name:     meta.name || cert.site_url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    description:   meta.description || '',
    topics:        topics.length ? topics : ['General'],
    location:      meta.location || '',
    score:         cert.score,
    email:         cert.email || meta.email || '',
    registered_at: Date.now(),
  };
  _registry.set(cert.cert_id, entry);
  saveRegistry(_registry);
  return entry;
}

// ── Schema helper ─────────────────────────────────────────────────────────────

function buildSchemaSnippet(url, name, description) {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': url + '/#website', 'url': url, 'name': name },
      { '@type': 'Organization', '@id': url + '/#organization', 'name': name, 'url': url, 'description': description }
    ]
  };
  return '<script type="application/ld+json">\n' + JSON.stringify(schema, null, 2) + '\n<\/script>';
}

// ── Certificates ─────────────────────────────────────────────────────────────

const CERTS_FILE = path.join(__dirname, 'certs.json');

function loadCerts() {
  const m = new Map();
  try {
    const raw = fs.readFileSync(CERTS_FILE, 'utf8');
    for (const cert of JSON.parse(raw)) {
      m.set(cert.cert_id, cert);
      if (cert.transaction_id) m.set(cert.transaction_id, cert);
    }
  } catch(e) {}
  return m;
}

function saveCerts(m) {
  const unique = new Map();
  for (const cert of m.values()) if (cert.cert_id) unique.set(cert.cert_id, cert);
  try { fs.writeFileSync(CERTS_FILE, JSON.stringify([...unique.values()], null, 2)); } catch(e) {}
}

const certs = loadCerts();

// Seed demo cert if not already present
const DEMO_CERT = {
  cert_id: 'AIL-20260619-NODE1',
  site_url: 'https://intellistasis.com',
  score: 100,
  email: '',
  issued_at: '2026-06-19T00:00:00.000Z',
};
if (!certs.has('AIL-20260619-NODE1')) { certs.set('AIL-20260619-NODE1', DEMO_CERT); saveCerts(certs); }
if (!certs.has('demo'))               { certs.set('demo', DEMO_CERT); }

function issueCert(site_url, score, email) {
  const rand = Math.random().toString(36).slice(2,6).toUpperCase() +
               Math.random().toString(36).slice(2,6).toUpperCase();
  const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const cert_id = 'AIL-' + date + '-' + rand;
  const cert = { cert_id, site_url, score, email: email || '', issued_at: new Date().toISOString() };
  certs.set(cert_id, cert);
  saveCerts(certs);
  return cert;
}

// ── IndexNow ──────────────────────────────────────────────────────────────────

function pingIndexNow(urlList) {
  const body = JSON.stringify({
    host:        'ailattice.io',
    key:         INDEXNOW_KEY,
    keyLocation: `https://ailattice.io/${INDEXNOW_KEY}.txt`,
    urlList,
  });
  const req = https.request({
    hostname: 'api.indexnow.org',
    path:     '/indexnow',
    method:   'POST',
    headers:  { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
    console.log(`[ailattice-indexnow] ${res.statusCode} for ${urlList.join(', ')}`);
    res.resume();
  });
  req.on('error', (e) => console.warn('[ailattice-indexnow] Error:', e.message));
  req.end(body);
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

const rateLimits = new Map(); // ip → { count, resetAt }

function checkRateLimit(ip) {
  const now  = Date.now();
  const prev = rateLimits.get(ip) || { count: 0, resetAt: now + 3_600_000 };
  if (now > prev.resetAt) { prev.count = 0; prev.resetAt = now + 3_600_000; }
  if (prev.count >= 3) return false;
  prev.count++;
  rateLimits.set(ip, prev);
  return true;
}

// ── Email verification ────────────────────────────────────────────────────────

const pendingVerify = new Map(); // token → { url, name, desc, email, score, expiresAt }

function generateToken() {
  return require('crypto').randomBytes(24).toString('hex');
}

function sendVerificationEmail(email, token, siteUrl) {
  const key  = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'AILattice <noreply@ailattice.io>';
  if (!key) return Promise.resolve(false);

  const verifyUrl = `https://ailattice.io/api/verify?token=${token}`;
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:40px auto;color:#0f172a;">
<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
  <div style="background:#0f172a;padding:24px 32px;">
    <span style="font-family:monospace;font-size:18px;font-weight:700;color:#fff;">AI<span style="color:#22c55e;">Lattice</span>™</span>
  </div>
  <div style="padding:32px;">
    <h2 style="margin:0 0 12px;font-size:20px;">Confirm your registry listing</h2>
    <p style="color:#475569;margin:0 0 8px;">You submitted <strong>${siteUrl}</strong> to the AILattice Registry.</p>
    <p style="color:#475569;margin:0 0 28px;">Click the button below to confirm your listing. This link expires in 24 hours.</p>
    <a href="${verifyUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:8px;text-decoration:none;">Confirm listing →</a>
    <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;">If you didn't submit this site, ignore this email.</p>
  </div>
</div>
</body></html>`;

  const payload = JSON.stringify({ from, to: [email], subject: 'Confirm your AILattice listing', html });
  return new Promise((resolve) => {
    const r = https.request({
      hostname: 'api.resend.com', path: '/emails', method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => { console.log(`[ailattice-email] ${res.statusCode} → ${email}`); resolve(res.statusCode < 300); res.resume(); });
    r.on('error', (e) => { console.warn('[ailattice-email]', e.message); resolve(false); });
    r.end(payload);
  });
}

// ── HTTP server ───────────────────────────────────────────────────────────────

http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const urlPath   = parsedUrl.pathname;

  // IndexNow key verification file
  if (urlPath === `/${INDEXNOW_KEY}.txt`) {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(INDEXNOW_KEY);
  }

  // API: Paddle webhook — transaction.completed → issue cert
  if (urlPath === '/api/paddle/webhook' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      const sigHeader = req.headers['paddle-signature'];
      const secret    = process.env.PADDLE_WEBHOOK_SECRET_AIL;

      if (secret && sigHeader) {
        const { createHmac, timingSafeEqual } = require('crypto');
        const parts = Object.fromEntries(sigHeader.split(';').map(p => p.split('=')));
        const signed   = `${parts.ts}:${rawBody}`;
        const expected = createHmac('sha256', secret).update(signed).digest('hex');
        const expBuf   = Buffer.from(expected);
        const givBuf   = Buffer.from(parts.h1 || '');
        const valid = givBuf.length === expBuf.length && timingSafeEqual(expBuf, givBuf);
        if (!valid) {
          console.warn('[ailattice-paddle] Invalid signature');
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Invalid signature' }));
        }
      }

      // Ack immediately — Paddle retries on timeout
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));

      let body;
      try { body = JSON.parse(rawBody); } catch(e) { return; }

      const event = body.event_type;
      const data  = body.data || {};

      if (event !== 'transaction.completed') return;

      const txId   = data.id;
      const siteUrl= data.custom_data?.site_url;
      const email  = data.customer?.email || '';

      if (!txId || !siteUrl) {
        console.warn('[ailattice-paddle] Missing txId or site_url in webhook data');
        return;
      }

      // Idempotency check — don't issue twice for same transaction
      if (certs.has(txId)) {
        console.log(`[ailattice-paddle] Cert already issued for tx ${txId}`);
        return;
      }

      console.log(`[ailattice-paddle] transaction.completed — ${siteUrl} (tx: ${txId})`);

      // Run validation to get actual score
      let score = 0;
      let siteMeta = { name: '', description: '' };
      try {
        const result = await validateSite(siteUrl);
        score    = result.score;
        siteMeta = result.meta || {};
      } catch(e) {
        console.warn(`[ailattice-paddle] validateSite failed for ${siteUrl}: ${e.message}`);
      }

      const cert       = issueCert(siteUrl, score, email);
      cert.transaction_id = txId;
      certs.set(txId, cert);
      saveCerts(certs);

      enrollInRegistry(cert, { ...siteMeta, location: '' });
      pingIndexNow([`https://ailattice.io/cert/${cert.cert_id}`, siteUrl]);
      console.log(`[ailattice-paddle] Cert issued: ${cert.cert_id} for ${siteUrl} (score: ${score})`);
    });
    return;
  }

  // API: poll for cert by Paddle transaction ID
  if (urlPath.startsWith('/api/cert/by-tx/')) {
    const txId = decodeURIComponent(urlPath.slice('/api/cert/by-tx/'.length));
    const cert = certs.get(txId);
    if (!cert) {
      res.writeHead(202, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ pending: true }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(cert));
  }

  // API: get cert
  if (urlPath.startsWith('/api/cert/')) {
    const id = decodeURIComponent(urlPath.slice('/api/cert/'.length));
    const cert = certs.get(id);
    if (!cert) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Certificate not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' });
    return res.end(JSON.stringify(cert));
  }

  // API: issue cert (called by payment webhook)
  if (urlPath === '/api/cert/issue' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { site_url, score, email } = JSON.parse(body);
        if (!site_url || score === undefined) throw new Error('site_url and score required');
        const cert = issueCert(site_url, score, email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(cert));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: email verification — confirm pending listing
  if (urlPath === '/api/verify' && req.method === 'GET') {
    const token   = parsedUrl.searchParams.get('token') || '';
    const pending = pendingVerify.get(token);
    if (!pending || Date.now() > pending.expiresAt) {
      res.writeHead(302, { Location: '/submit?error=expired' });
      return res.end();
    }
    const cert  = issueCert(pending.url, pending.score, pending.email);
    const entry = enrollInRegistry(cert, { name: pending.name, description: pending.desc, email: pending.email, location: '' });
    pingIndexNow([`https://ailattice.io/cert/${cert.cert_id}`, pending.url]);
    pendingVerify.delete(token);
    console.log(`[ailattice-verify] Listed: ${cert.cert_id} for ${pending.url}`);
    res.writeHead(302, { Location: `/cert/${cert.cert_id}?verified=1` });
    return res.end();
  }

  // API: free self-submit to registry
  if (urlPath === '/api/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const { url, name, description, email } = parsed;

        // Honeypot — bots fill hidden fields, humans don't
        if (parsed.website || parsed.phone) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, pending_verification: true }));
        }

        if (!url)   throw new Error('url required');
        if (!email) throw new Error('email required');

        // Rate limit by IP
        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
        if (!checkRateLimit(ip)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too many submissions — please try again in an hour.' }));
        }

        const result = await validateSite(url);
        if (result.score < 70) {
          res.writeHead(422, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: `Site scores ${result.score}/100 — 70+ required for registry listing`,
            score: result.score, checks: result.checks,
          }));
        }

        const normalUrl = result.url;

        // Duplicate check
        const existing = [..._registry.values()].find(e => e.site_url === normalUrl);
        if (existing) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'This site is already listed in the AILattice Registry.', cert_id: existing.cert_id }));
        }

        const siteName = (name || result.meta?.name || normalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')).trim();
        const siteDesc = (description || result.meta?.description || '').trim();

        // If Resend is configured — gate on email verification
        if (process.env.RESEND_API_KEY) {
          const token = generateToken();
          pendingVerify.set(token, {
            url: normalUrl, name: siteName, desc: siteDesc, email,
            score: result.score, expiresAt: Date.now() + 86_400_000,
          });
          await sendVerificationEmail(email, token, normalUrl);
          console.log(`[ailattice-submit] Pending verification for ${normalUrl} → ${email}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, pending_verification: true }));
        }

        // No email service — auto-approve
        const cert  = issueCert(normalUrl, result.score, email);
        const entry = enrollInRegistry(cert, { name: siteName, description: siteDesc, email, location: '' });
        const snippet = buildSchemaSnippet(normalUrl, siteName, siteDesc);
        pingIndexNow([`https://ailattice.io/cert/${cert.cert_id}`, normalUrl]);
        console.log(`[ailattice-submit] Listed: ${cert.cert_id} for ${normalUrl} (score: ${result.score})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, cert_id: cert.cert_id, entry, score: result.score, schema_snippet: snippet }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: validate
  if (urlPath === '/api/validate') {
    const siteUrl = parsedUrl.searchParams.get('url') || '';
    if (!siteUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'url parameter required' }));
    }
    try {
      const result = await validateSite(siteUrl);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(result));
    } catch(e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API: search — natural language query over the registry
  if (urlPath === '/api/search') {
    const q     = (parsedUrl.searchParams.get('q') || '').trim();
    const limit = Math.min(parseInt(parsedUrl.searchParams.get('limit') || '10', 10) || 10, 50);
    if (!q) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'q parameter required', example: '/api/search?q=market+intelligence+australia' }));
    }
    const result = searchRegistry(q, limit);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(result, null, 2));
  }

  // API: registry — AI-queryable catalog
  if (urlPath === '/api/registry') {
    const topic    = parsedUrl.searchParams.get('topic') || '';
    const location = parsedUrl.searchParams.get('location') || '';
    const q        = (parsedUrl.searchParams.get('q') || '').toLowerCase();
    let entries    = [..._registry.values()];
    if (topic)    entries = entries.filter(e => e.topics && e.topics.includes(topic));
    if (location) entries = entries.filter(e => (e.location || '').toLowerCase().includes(location.toLowerCase()));
    if (q)        entries = entries.filter(e =>
      (e.site_name + ' ' + e.description + ' ' + (e.topics || []).join(' ')).toLowerCase().includes(q)
    );
    const topics = [...new Set([..._registry.values()].flatMap(e => e.topics || []))].sort();
    const out = {
      description: 'The AILattice Registry — a structured catalog of AI-ready websites. All sites implement the AILattice standard and are verified. Organic ranking only — no paid placement.',
      total:   _registry.size,
      count:   entries.length,
      topics,
      sites:   entries.map(e => ({
        cert_id:      e.cert_id,
        url:          e.site_url,
        name:         e.site_name,
        description:  e.description,
        topics:       e.topics,
        location:     e.location,
        score:        e.score,
        registered:   e.registered_at ? new Date(e.registered_at).toISOString().slice(0,10) : null,
        // email intentionally excluded — private
      })),
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify(out, null, 2));
  }

  // API: registry topics list
  if (urlPath === '/api/registry/topics') {
    const topicCounts = {};
    for (const e of _registry.values()) {
      for (const t of (e.topics || [])) topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
    return res.end(JSON.stringify(topicCounts));
  }

  // Badge SVGs
  if (urlPath === '/badge.svg') {
    const count = _registry.size;
    const value = `${count} sites indexed`;
    const lw = 72, rw = value.length * 6.5 + 10;
    const w = lw + rw;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20">
  <rect rx="3" width="${w}" height="20" fill="#1a1a2e"/>
  <rect rx="3" x="${lw}" width="${rw}" height="20" fill="#0ea5e9"/>
  <rect x="${lw}" width="4" height="20" fill="#0ea5e9"/>
  <g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11" text-anchor="middle">
    <text x="${lw/2}" y="14" fill="#000" fill-opacity=".2">AILattice</text>
    <text x="${lw/2}" y="13">AILattice</text>
    <text x="${lw + rw/2}" y="14" fill="#000" fill-opacity=".2">${value}</text>
    <text x="${lw + rw/2}" y="13">${value}</text>
  </g>
</svg>`;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    return res.end(svg);
  }

  if (urlPath.startsWith('/badge/') && urlPath.endsWith('.svg')) {
    const certId = urlPath.slice('/badge/'.length, -4);
    const entry  = [..._registry.values()].find(e => e.cert_id === certId);
    const score  = entry ? entry.score : null;
    const value  = score !== null ? `AI-ready · ${score}/100` : 'not found';
    const color  = score >= 90 ? '#22c55e' : score >= 70 ? '#0ea5e9' : '#ef4444';
    const lw = 72, rw = value.length * 6.2 + 10;
    const w = lw + rw;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20">
  <rect rx="3" width="${w}" height="20" fill="#1a1a2e"/>
  <rect rx="3" x="${lw}" width="${rw}" height="20" fill="${color}"/>
  <rect x="${lw}" width="4" height="20" fill="${color}"/>
  <g fill="#fff" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11" text-anchor="middle">
    <text x="${lw/2}" y="14" fill="#000" fill-opacity=".2">AILattice</text>
    <text x="${lw/2}" y="13">AILattice</text>
    <text x="${lw + rw/2}" y="14" fill="#000" fill-opacity=".2">${value}</text>
    <text x="${lw + rw/2}" y="13">${value}</text>
  </g>
</svg>`;
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' });
    return res.end(svg);
  }

  // Downloads
  if (urlPath === '/download/ailattice.zip') {
    const f = path.join(ROOT, 'install', 'ailattice.zip');
    return fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="ailattice.zip"' });
      res.end(data);
    });
  }
  if (urlPath === '/download/ailattice-install.php') {
    const f = path.join(ROOT, 'install', 'ailattice-install.php');
    return fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment; filename="ailattice-install.php"' });
      res.end(data);
    });
  }

  // Static files
  let filePath = urlPath;
  if (filePath === '/' || filePath === '') filePath = '/search.html';
  if (filePath === '/home')               filePath = '/index.html';
  if (filePath === '/validate')           filePath = '/validate.html';
  if (filePath === '/convert')            filePath = '/convert.html';
  if (filePath === '/registry')           filePath = '/registry.html';
  if (filePath === '/search')             filePath = '/search.html';
  if (filePath === '/submit')             filePath = '/submit.html';
  if (filePath.startsWith('/cert/') || filePath === '/cert') filePath = '/cert.html';
  if (filePath.endsWith('/'))              filePath += 'index.md';

  const absPath = path.join(ROOT, filePath);
  if (!absPath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  const ext  = path.extname(absPath).toLowerCase();
  const mime = MIME[ext] || 'text/plain; charset=utf-8';

  fs.readFile(absPath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=60' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`[ailattice] http://localhost:${PORT}`));
