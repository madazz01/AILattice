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

const PORT       = 3450;
const ROOT       = __dirname;
const STASIS_URL = process.env.STASIS_CORE_URL || 'http://localhost:3400';

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
  '.xml':  'application/xml; charset=utf-8',
};

// ── HTML stripper ─────────────────────────────────────────────────────────────

// Full strip — removes nav/header/footer (used for parity checks, AI file content)
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Light strip — keeps header/footer/nav text (used for address/contact extraction sent to Groq)
function fullText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Groq ──────────────────────────────────────────────────────────────────────

async function callGroq(messages) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not configured');
  const body = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.3,
    max_tokens: 6000,
    response_format: { type: 'json_object' },
  });
  const raw = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    }, (res) => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Groq API timeout')); });
    req.end(body);
  });
  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message || 'Groq API error');
  return parsed.choices?.[0]?.message?.content || '';
}

// ── Schema.org address extractor (JSON-LD) ───────────────────────────────────

function extractSchemaAddress(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const s of scripts) {
    try {
      const data = JSON.parse(s[1]);
      const nodes = Array.isArray(data['@graph']) ? data['@graph'] : [data];
      for (const node of nodes) {
        const addr = node.address;
        if (addr && typeof addr === 'object') {
          const country = typeof addr.addressCountry === 'object' ? addr.addressCountry.name : addr.addressCountry;
          const parts = [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode, country].filter(Boolean);
          if (parts.length >= 2) return parts.join(', ');
        }
      }
    } catch(e) {}
  }
  return '';
}

// ── Schema.org microdata address extractor (itemprop) ────────────────────────

function extractMicrodataAddress(html) {
  const get = (prop) => {
    const m = html.match(new RegExp(`itemprop=["']${prop}["'][^>]*>\\s*([^<]+)`, 'i'));
    return m ? m[1].trim().replace(/[,.\s]+$/, '') : '';
  };
  const parts = [get('streetAddress'), get('addressLocality'), get('addressRegion'), get('postalCode'), get('addressCountry')].filter(Boolean);
  return parts.length >= 2 ? parts.join(', ') : '';
}

// ── Discover contact/about links from homepage HTML ───────────────────────────

function discoverContactLinks(html, base) {
  const found = new Set();
  const re = /<a[^>]+href=["']([^"'#?][^"']*?)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    const text = m[2].replace(/<[^>]+>/g, '').toLowerCase();
    if (/contact|about|location|find.us|reach|where|store|address|directions/.test(href.toLowerCase()) ||
        /contact|about|location|find us|where are|our address|get in touch|directions/.test(text)) {
      try {
        const abs = new URL(href, base + '/').href;
        if (abs.startsWith(base + '/')) {
          const rel = abs.slice(base.length);
          if (rel && rel !== '/') found.add(rel);
        }
      } catch(e) {}
    }
  }
  return [...found].slice(0, 4);
}

// ── Site crawler ──────────────────────────────────────────────────────────────

async function crawlSite(rawUrl) {
  if (!rawUrl.match(/^https?:\/\//i)) rawUrl = 'https://' + rawUrl;
  rawUrl = rawUrl.replace(/\/+$/, '');
  let parsed; try { parsed = new URL(rawUrl); } catch(e) { throw new Error('Invalid URL'); }
  if (PRIVATE_IP.test(parsed.hostname)) throw new Error('Private addresses not allowed');
  const base = parsed.origin;

  const home = await remoteFetch(rawUrl).catch(() => ({ status: 0, body: '' }));
  if (home.status !== 200) throw new Error('Could not reach that website');

  const titleMatch   = home.body.match(/<title[^>]*>([^<]+)<\/title>/i);
  const metaMatch    = home.body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})/i)
                    || home.body.match(/<meta[^>]+content=["']([^"']{10,})["'][^>]+name=["']description["']/i);
  const title   = titleMatch  ? titleMatch[1].replace(/\s*[|\-–—].*$/, '').trim() : '';
  const metaDesc = metaMatch  ? metaMatch[1].trim() : '';
  // fullText keeps header/footer so Groq can find addresses there
  const homeText = fullText(home.body).slice(0, 4000);

  // Try Schema.org address from homepage first (JSON-LD then microdata)
  let schemaAddress = extractSchemaAddress(home.body) || extractMicrodataAddress(home.body);

  // Discovered links (contact/about pages at non-standard paths) come first
  const discoveredPaths = discoverContactLinks(home.body, base);
  const standardPaths   = [
    '/contact', '/contact-us', '/contact-us/', '/about', '/about-us',
    '/find-us', '/location', '/locations', '/our-location', '/where-we-are',
    '/get-in-touch', '/reach-us', '/services', '/products', '/what-we-do',
  ];
  const pathsToTry = [...new Set([...discoveredPaths, ...standardPaths])];

  const extraPages = [];
  for (const p of pathsToTry) {
    if (extraPages.length >= 5) break;
    const r = await remoteFetch(base + p).catch(() => ({ status: 0, body: '' }));
    if (r.status === 200) {
      const text = fullText(r.body).slice(0, 2000);
      if (text.length > 300) {
        extraPages.push({ page: p, text });
        if (!schemaAddress) schemaAddress = extractSchemaAddress(r.body) || extractMicrodataAddress(r.body);
      }
    }
  }
  return { url: base, title, metaDesc, homeText, extraPages, schemaAddress };
}

function firstSentence(text) {
  if (!text) return '';
  const m = text.match(/[A-Z][^.!?]{20,}[.!?]/);
  return m ? m[0].trim() : text.slice(0, 200).trim();
}

function generateAIFiles(crawl, { name, description, tags, address } = {}) {
  const today    = new Date().toISOString().slice(0, 10);
  const url      = crawl.url;
  const siteName = (name        || crawl.title      || url.replace(/^https?:\/\//, '').replace(/\/$/, '')).trim();
  const siteDesc = (description || crawl.metaDesc   || firstSentence(crawl.homeText)).trim();
  const siteAddr = (address     || crawl.schemaAddress || '').trim();
  const pages    = crawl.extraPages || [];

  const credit = '\n\n# AI readiness verified by AILattice — https://ailattice.io\n';
  const footer = '\n\n---\n\n*AI readiness verified by [AILattice](https://ailattice.io)*\n';

  const llms_txt =
`# ${siteName} — llms.txt

name: ${siteName}
description: ${siteDesc}
url: ${url}
ai-entry: ${url}/ai/index.md

## What we do
${siteDesc}

## AI Navigation
Start at /ai/index.md for a full overview.
See /ai/sitemap.md for all navigable pages.${credit}`;

  const extraLinks = pages.map(p => `- [${p.page}](${url}${p.page})`).join('\n');
  const aboutText  = (crawl.homeText || '').slice(0, 600).trim();

  const ai_index =
`---
title: ${siteName} — AI Overview
description: ${siteDesc}
last-updated: ${today}
---

# ${siteName}

${siteDesc}
${aboutText ? `\n## About\n${aboutText}` : ''}
## Pages
- [Overview](/ai/index.md)
- [Sitemap](/ai/sitemap.md)
${extraLinks}${siteAddr ? `\n## Contact\n${siteAddr}` : ''}${footer}`;

  const sitemapLinks = [
    `- [Homepage](${url}) — ${siteDesc}`,
    `- [AI Overview](/ai/index.md) — Main AI entry point`,
    ...pages.map(p => `- [${p.page}](${url}${p.page})`),
    `- [AI Sitemap](/ai/sitemap.md) — This file`,
  ].join('\n');

  const ai_sitemap =
`---
title: ${siteName} — AI Sitemap
description: All AI-navigable pages for ${siteName}
last-updated: ${today}
---

# ${siteName} — AI Sitemap

## All pages
${sitemapLinks}${footer}`;

  return { name: siteName, description: siteDesc, address: siteAddr, location: '', tags: tags || [], llms_txt, ai_index, ai_sitemap };
}

// ── ZIP builder (STORE, no compression) ──────────────────────────────────────

function crc32(buf) {
  if (!crc32._t) {
    crc32._t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crc32._t[i] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = crc32._t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function buildZip(files) {
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;
  const locals = [], centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data || '', 'utf8');
    const crc  = crc32(data);
    const sz   = data.length;
    const lh   = Buffer.alloc(30 + name.length);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(0, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(sz, 18); lh.writeUInt32LE(sz, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28); name.copy(lh, 30);
    const cd = Buffer.alloc(46 + name.length);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8); cd.writeUInt16LE(0, 10); cd.writeUInt16LE(dosTime, 12); cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(sz, 20); cd.writeUInt32LE(sz, 24);
    cd.writeUInt16LE(name.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
    name.copy(cd, 46);
    locals.push(lh, data); centrals.push(cd);
    offset += lh.length + sz;
  }
  const central = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...locals, central, eocd]);
}

// ── Crawl rate limiter ────────────────────────────────────────────────────────

const crawlRateLimits = new Map();
function checkCrawlRateLimit(ip) {
  if (isLocal(ip)) return true;
  const now  = Date.now();
  const prev = crawlRateLimits.get(ip) || { count: 0, resetAt: now + 3_600_000 };
  if (now > prev.resetAt) { prev.count = 0; prev.resetAt = now + 3_600_000; }
  if (prev.count >= 20) return false;
  prev.count++;
  crawlRateLimits.set(ip, prev);
  return true;
}

// ── Validator ─────────────────────────────────────────────────────────────────

function remoteFetch(url, redirectsLeft = 5, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    if (redirectsLeft < 0) return reject(new Error('Too many redirects'));
    let parsed;
    try { parsed = new URL(url); } catch(e) { return reject(new Error('Invalid URL')); }
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        ...extraHeaders,
      },
    }, (res) => {
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        return remoteFetch(next, redirectsLeft - 1, extraHeaders).then(resolve).catch(reject);
      }
      let body = '';
      let size = 0;
      res.on('data', chunk => { size += chunk.length; if (size < 512*1024) body += chunk; });
      res.on('end', () => {
        // For .txt and .md files, HTML catch-all responses mean the file doesn't exist
        const expectsText = /\.(txt|md)$/i.test(parsed.pathname);
        const trimmed     = body.trimStart();
        const isHtml      = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<!doctype');
        const faked       = expectsText && isHtml;
        resolve({ status: faked ? 404 : res.statusCode, body: faked ? '' : body });
      });
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

  // 10 — Content parity (informational) — AI files should reflect the public site
  if (aiIndexOk && html.status === 200) {
    const htmlWords = new Set(
      stripHtml(html.body).toLowerCase().split(/\W+/).filter(w => w.length > 4 && !STOP_WORDS.has(w))
    );
    const aiText  = aiIndex.body.replace(/^---[\s\S]*?---/, '').toLowerCase();
    const aiWords = aiText.split(/\W+/).filter(w => w.length > 4 && !STOP_WORDS.has(w));
    const uniqueToAI = aiWords.filter(w => !htmlWords.has(w));
    const ratio = aiWords.length > 20 ? uniqueToAI.length / aiWords.length : 0;
    const parityOk = ratio < 0.65;
    checks.push({ id: 'content_parity', label: 'AI content matches public site', ok: parityOk, points: 0, max: 0,
      detail: parityOk
        ? 'Verified — AI files reflect your public website'
        : 'AI content contains significant material not found on your public site — this may reduce trust scoring' });
  }

  // 11 — UA consistency (informational) — site must serve same content to bots and humans
  if (html.status === 200) {
    try {
      const botRes = await remoteFetch(base + '/', 5, { 'User-Agent': 'AILattice-Validator/1.0 (+https://ailattice.io/bot)' });
      if (botRes.status === 200 && botRes.body.length > 100) {
        const browserW = new Set(stripHtml(html.body).toLowerCase().split(/\W+/).filter(w => w.length > 4 && !STOP_WORDS.has(w)));
        const botW     = new Set(stripHtml(botRes.body).toLowerCase().split(/\W+/).filter(w => w.length > 4 && !STOP_WORDS.has(w)));
        const missing  = [...browserW].filter(w => !botW.has(w));
        const uaRatio  = browserW.size > 20 ? missing.length / browserW.size : 0;
        const uaOk     = uaRatio < 0.4;
        checks.push({ id: 'ua_consistency', label: 'Same content served to all visitors', ok: uaOk, points: 0, max: 0,
          detail: uaOk
            ? 'Verified — consistent content for humans and AI crawlers'
            : 'Site appears to serve different content to AI crawlers — this will affect trust scoring' });
      }
    } catch(e) {}
  }

  // Extract name + description from llms.txt; fall back to HTML <title>
  let siteName = '', siteDescription = '';
  if (llmsOk) {
    const nm = llms.body.match(/^name:\s*(.+)$/m);
    const dc = llms.body.match(/^description:\s*(.+)$/m);
    if (nm) siteName = nm[1].trim();
    if (dc) siteDescription = dc[1].trim();
  }
  if (!siteName && html.status === 200) {
    const titleMatch = html.body.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) siteName = titleMatch[1].replace(/\s*[|\-–—].*$/, '').trim();
  }
  if (!siteDescription && html.status === 200) {
    const metaM = html.body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})/i)
               || html.body.match(/<meta[^>]+content=["']([^"']{10,})["'][^>]+name=["']description["']/i);
    if (metaM) siteDescription = metaM[1].trim().slice(0, 250);
  }

  // Extract address from Schema.org if present in homepage
  const siteAddress = html.status === 200 ? extractSchemaAddress(html.body) : '';

  return { url: base, score, certified: score >= 70, checks, meta: { name: siteName, description: siteDescription, address: siteAddress }, checkedAt: new Date().toISOString() };
}

// ── Registry ──────────────────────────────────────────────────────────────────

const REGISTRY_FILE       = path.join(__dirname, 'registry.json');
const EMAILS_FILE         = path.join(__dirname, 'emails.json');
const CONTACTS_FILE       = path.join(__dirname, 'contacts.json');
const CONSTITUTIONS_FILE  = path.join(__dirname, 'constitutions.json');

// ── Constitution store ────────────────────────────────────────────────────────

function loadConstitutions() {
  try { return JSON.parse(fs.readFileSync(CONSTITUTIONS_FILE, 'utf8')); } catch(e) { return {}; }
}
function saveConstitutions(store) {
  try { fs.writeFileSync(CONSTITUTIONS_FILE, JSON.stringify(store, null, 2)); } catch(e) {}
}
let _constitutions = loadConstitutions();

function normaliseDomain(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, ''); }
  catch(e) { return url.toLowerCase().replace(/^www\./, ''); }
}

function storeConstitution(domain, data) {
  _constitutions[domain] = data;
  saveConstitutions(_constitutions);
}

function lookupConstitution(domain) {
  return _constitutions[normaliseDomain(domain)] || null;
}

function appendContact(name, email, subject, message) {
  let list = [];
  try { list = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch(e) {}
  list.push({ name, email, subject, message, received_at: new Date().toISOString() });
  try { fs.writeFileSync(CONTACTS_FILE, JSON.stringify(list, null, 2)); } catch(e) {}
}

function appendEmail(email, siteUrl, siteName) {
  let list = [];
  try { list = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8')); } catch(e) {}
  if (!list.find(e => e.email === email)) {
    list.push({ email, site_url: siteUrl, site_name: siteName, registered_at: new Date().toISOString() });
    try { fs.writeFileSync(EMAILS_FILE, JSON.stringify(list, null, 2)); } catch(e) {}
  }
}

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
    const nameL    = (site.site_name   || '').toLowerCase();
    const descL    = (site.description || '').toLowerCase();
    const addrL    = (site.address     || '').toLowerCase();
    const locationL = (site.location   || '').toLowerCase();
    let rel = 0;

    // Topic match — strongest signal
    for (const t of topics) {
      if ((site.topics || []).includes(t)) rel += 5;
    }
    // Keyword in name — high weight
    for (const w of words) {
      if (nameL.includes(w)) rel += 3;
    }
    // Tag match — user-defined keywords (can't be gamed — limited to 10)
    for (const w of words) {
      if ((site.tags || []).some(t => t.toLowerCase().includes(w))) rel += 3;
    }
    // Address match — direct word hit against full address (suburb, postcode, street)
    for (const w of words) {
      if (addrL.includes(w)) rel += 4;
    }
    // Location field match (city/region level)
    for (const w of words) {
      if (locationL.includes(w)) rel += 3;
    }
    // Legacy LOCATION_TERMS boost
    if (location && locationL.includes(location.toLowerCase())) rel += 2;
    // Keyword in description (Groq-generated, not user-editable)
    for (const w of words) {
      if (descL.includes(w)) rel += 1;
    }
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
      tags:        site.tags    || [],
      topics:      site.topics,
      address:     site.address  || null,
      location:    site.location || null,
      score:       site.score,
      tier:        site.tier    || 'listed',
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

// Backfill tier on entries that predate the tier field
let _tierBackfill = false;
for (const entry of _registry.values()) {
  if (!entry.tier) { entry.tier = entry.score >= 70 ? 'ai_ready' : 'listed'; _tierBackfill = true; }
}
if (_tierBackfill) saveRegistry(_registry);

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
  const topics = classifyTopics((meta.description || '') + ' ' + (meta.tags || []).join(' '));
  const entry = {
    cert_id:       cert.cert_id,
    site_url:      cert.site_url,
    site_name:     meta.name || cert.site_url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
    description:   meta.description || '',
    tags:          meta.tags || [],
    topics:        topics.length ? topics : ['General'],
    address:       meta.address  || '',
    location:      meta.location || '',
    score:         cert.score,
    tier:          meta.tier || 'listed',
    email:         cert.email || meta.email || '',
    user_id:       meta.user_id || null,
    registered_at: Date.now(),
  };
  _registry.set(cert.cert_id, entry);
  saveRegistry(_registry);
  return entry;
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

function pingIndexNow(certUrl) {
  const body = JSON.stringify({
    host:        'ailattice.io',
    key:         INDEXNOW_KEY,
    keyLocation: `https://ailattice.io/${INDEXNOW_KEY}.txt`,
    urlList:     [certUrl],
  });
  const req = https.request({
    hostname: 'api.indexnow.org',
    path:     '/indexnow',
    method:   'POST',
    headers:  { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
    console.log(`[ailattice-indexnow] ${res.statusCode} for ${certUrl}`);
    res.resume();
  });
  req.on('error', (e) => console.warn('[ailattice-indexnow] Error:', e.message));
  req.end(body);
}

// ── Auth — users + sessions ───────────────────────────────────────────────────

const { scrypt, randomBytes, timingSafeEqual } = require('crypto');
const USERS_FILE    = path.join(__dirname, 'users.json');
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

function loadUsers() {
  try { return new Map(JSON.parse(fs.readFileSync(USERS_FILE,'utf8')).map(u => [u.id, u])); } catch(e) { return new Map(); }
}
function saveUsers(m) {
  try { fs.writeFileSync(USERS_FILE, JSON.stringify([...m.values()], null, 2)); } catch(e) {}
}
function loadSessions() {
  try { return new Map(Object.entries(JSON.parse(fs.readFileSync(SESSIONS_FILE,'utf8')))); } catch(e) { return new Map(); }
}
function saveSessions(m) {
  const now = Date.now();
  const out = {};
  for (const [k,v] of m) { if (v.expires_at > now) out[k] = v; }
  try { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(out, null, 2)); } catch(e) {}
}

const _users    = loadUsers();
const _sessions = loadSessions();

// ── API keys ──────────────────────────────────────────────────────────────────
const API_KEYS_FILE = path.join(__dirname, 'api_keys.json');

const API_TIERS = {
  free:      { label: 'Free',      daily: 500 },
  supporter: { label: 'Supporter', daily: 5000 },
  builder:   { label: 'Builder',   daily: 50000 },
};

function loadApiKeys() {
  try { return JSON.parse(fs.readFileSync(API_KEYS_FILE, 'utf8')); } catch(e) { return {}; }
}
function saveApiKeys(m) {
  try { fs.writeFileSync(API_KEYS_FILE, JSON.stringify(m, null, 2)); } catch(e) {}
}

let _apiKeys = loadApiKeys(); // { [key]: { user_id, tier, today_count, today_date, created_at } }

function generateApiKey() {
  return 'ail_' + randomBytes(24).toString('hex');
}

function getOrCreateApiKey(userId) {
  // Find existing key for this user
  const existing = Object.entries(_apiKeys).find(([, v]) => v.user_id === userId);
  if (existing) return existing[0];
  // Create new
  const key = generateApiKey();
  _apiKeys[key] = { user_id: userId, tier: 'free', today_count: 0, today_date: '', created_at: Date.now() };
  saveApiKeys(_apiKeys);
  return key;
}

function checkApiKey(key) {
  const rec = _apiKeys[key];
  if (!rec) return { ok: false, error: 'Invalid API key', status: 401 };
  const today = new Date().toISOString().slice(0, 10);
  if (rec.today_date !== today) { rec.today_count = 0; rec.today_date = today; }
  const limit = (API_TIERS[rec.tier] || API_TIERS.free).daily;
  if (rec.today_count >= limit) return { ok: false, error: `Daily limit reached (${limit} requests). Donate to unlock more — see ailattice.io/api`, status: 429, limit, used: rec.today_count };
  rec.today_count++;
  saveApiKeys(_apiKeys);
  return { ok: true, tier: rec.tier, limit, used: rec.today_count };
}

function requireApiKey(req, res) {
  const auth = req.headers['authorization'] || '';
  const qKey = new URL(req.url, 'http://x').searchParams.get('key') || '';
  const key  = (auth.startsWith('Bearer ') ? auth.slice(7) : qKey).trim();
  if (!key) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API key required. Get yours free at ailattice.io/api' }));
    return null;
  }
  const result = checkApiKey(key);
  if (!result.ok) {
    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: result.error, limit: result.limit, used: result.used }));
    return null;
  }
  return result;
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex');
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(salt + ':' + derived.toString('hex'));
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, hash] = stored.split(':');
    scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else {
        const hashBuf = Buffer.from(hash, 'hex');
        resolve(derived.length === hashBuf.length && timingSafeEqual(derived, hashBuf));
      }
    });
  });
}

function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  _sessions.set(token, { user_id: userId, expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  saveSessions(_sessions);
  return token;
}

function getSessionUser(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/(?:^|;\s*)ail_session=([a-f0-9]+)/);
  if (!match) return null;
  const session = _sessions.get(match[1]);
  if (!session || session.expires_at < Date.now()) return null;
  return _users.get(session.user_id) || null;
}

function sessionCookie(token) {
  return `ail_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000`;
}

function clearCookie() {
  return 'ail_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

const rateLimits = new Map(); // ip → { count, resetAt }

const LOCAL_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
function isLocal(ip) { return LOCAL_IPS.has(ip); }

function checkRateLimit(ip) {
  if (isLocal(ip)) return true;
  const now  = Date.now();
  const prev = rateLimits.get(ip) || { count: 0, resetAt: now + 3_600_000 };
  if (now > prev.resetAt) { prev.count = 0; prev.resetAt = now + 3_600_000; }
  if (prev.count >= 20) return false;
  prev.count++;
  rateLimits.set(ip, prev);
  return true;
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

  // ── Auth routes ──────────────────────────────────────────────────────────────

  if (urlPath === '/api/auth/signup' && req.method === 'POST') {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { name, email, password } = JSON.parse(body);
        if (!name || !email || !password) throw new Error('Name, email and password are required.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        const emailLc = email.trim().toLowerCase();
        if ([..._users.values()].some(u => u.email === emailLc)) throw new Error('An account with that email already exists.');
        const id = 'usr_' + randomBytes(8).toString('hex');
        const user = { id, name: name.trim(), email: emailLc, password_hash: await hashPassword(password), created_at: Date.now() };
        _users.set(id, user);
        saveUsers(_users);
        const token = createSession(id);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) });
        res.end(JSON.stringify({ ok: true, user: { id, name: user.name, email: user.email } }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/api/auth/login' && req.method === 'POST') {
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body);
        if (!email || !password) throw new Error('Email and password are required.');
        const emailLc = email.trim().toLowerCase();
        const user = [..._users.values()].find(u => u.email === emailLc);
        if (!user || !(await verifyPassword(password, user.password_hash))) throw new Error('Incorrect email or password.');
        const token = createSession(user.id);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token) });
        res.end(JSON.stringify({ ok: true, user: { id: user.id, name: user.name, email: user.email } }));
      } catch(e) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/api/auth/logout' && req.method === 'POST') {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/(?:^|;\s*)ail_session=([a-f0-9]+)/);
    if (match) { _sessions.delete(match[1]); saveSessions(_sessions); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': clearCookie() });
    return res.end(JSON.stringify({ ok: true }));
  }

  // ── Frontend config (safe public values only) ─────────────────────────────────
  if (urlPath === '/api/config' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      paddleToken:     process.env.PADDLE_CLIENT_TOKEN_AIL || '',
      supporterPriceId: 'pri_01kvfag24kj5tej6sf7g8ewekq',
      builderPriceId:   'pri_01kwntb9t8764t50kwc250qk58',
    }));
  }

  // ── API key management ────────────────────────────────────────────────────────
  if (urlPath === '/api/auth/apikey' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Login required' })); }
    const key = getOrCreateApiKey(user.id);
    const rec = _apiKeys[key];
    const tier = API_TIERS[rec.tier] || API_TIERS.free;
    const today = new Date().toISOString().slice(0, 10);
    const used = rec.today_date === today ? rec.today_count : 0;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ key, tier: rec.tier, tier_label: tier.label, daily_limit: tier.daily, used_today: used }));
  }

  if (urlPath === '/api/auth/apikey/regenerate' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Login required' })); }
    // Remove old key
    for (const [k, v] of Object.entries(_apiKeys)) { if (v.user_id === user.id) { delete _apiKeys[k]; break; } }
    const key = getOrCreateApiKey(user.id);
    const rec = _apiKeys[key];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ key, tier: rec.tier, daily_limit: (API_TIERS[rec.tier] || API_TIERS.free).daily }));
  }

  // ── Admin: upgrade API key tier ───────────────────────────────────────────────
  if (urlPath === '/admin/api/upgrade-tier' && req.method === 'POST') {
    const adminKey = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { api_key, tier } = JSON.parse(body);
        if (!_apiKeys[api_key]) throw new Error('Key not found');
        if (!API_TIERS[tier]) throw new Error('Unknown tier');
        _apiKeys[api_key].tier = tier;
        saveApiKeys(_apiKeys);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, key: api_key, tier }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── Admin: list all API keys ──────────────────────────────────────────────────
  if (urlPath === '/admin/api/apikeys' && req.method === 'GET') {
    const adminKey = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || adminKey !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    const today = new Date().toISOString().slice(0, 10);
    const list = Object.entries(_apiKeys).map(([k, v]) => {
      const user = _users.get(v.user_id);
      return { key: k, tier: v.tier, user_email: user?.email || '?', user_name: user?.name || '?', used_today: v.today_date === today ? v.today_count : 0, daily_limit: (API_TIERS[v.tier] || API_TIERS.free).daily, created_at: v.created_at };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // ── Public v1 API (API-key gated) ─────────────────────────────────────────────
  if (urlPath === '/api/v1/registry' && req.method === 'GET') {
    const auth = requireApiKey(req, res); if (!auth) return;
    const page  = Math.max(1, parseInt(parsedUrl.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(parsedUrl.searchParams.get('limit') || '50')));
    const topic = (parsedUrl.searchParams.get('topic') || '').toLowerCase();
    const loc   = (parsedUrl.searchParams.get('location') || '').toLowerCase();
    let entries = [..._registry.values()];
    if (topic) entries = entries.filter(e => (e.tags || []).some(t => t.toLowerCase().includes(topic)) || (e.site_name || '').toLowerCase().includes(topic));
    if (loc)   entries = entries.filter(e => (e.location || '').toLowerCase().includes(loc));
    const total = entries.length;
    const slice = entries.slice((page - 1) * limit, page * limit).map(e => ({
      cert_id: e.cert_id, domain: e.site_url, name: e.site_name, description: e.description,
      score: e.score, tags: e.tags || [], location: e.location || '', listed_at: e.issued_at,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, total, page, limit, results: slice, tier: auth.tier, used_today: auth.used, daily_limit: auth.limit }));
  }

  if (urlPath === '/api/v1/search' && req.method === 'GET') {
    const auth = requireApiKey(req, res); if (!auth) return;
    const q = (parsedUrl.searchParams.get('q') || '').toLowerCase().trim();
    if (!q) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'q parameter required' })); }
    const words = q.split(/\s+/);
    const score = e => {
      let s = 0;
      const hay = [e.site_name, e.description, e.location, ...(e.tags || [])].join(' ').toLowerCase();
      for (const w of words) { if (hay.includes(w)) s += (e.site_name || '').toLowerCase().includes(w) ? 3 : 1; }
      return s;
    };
    const results = [..._registry.values()]
      .map(e => ({ ...e, _score: score(e) }))
      .filter(e => e._score > 0)
      .sort((a, b) => b._score - a._score || b.score - a.score)
      .slice(0, 20)
      .map(e => ({ cert_id: e.cert_id, domain: e.site_url, name: e.site_name, description: e.description, score: e.score, tags: e.tags || [], location: e.location || '' }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, q, results, tier: auth.tier, used_today: auth.used, daily_limit: auth.limit }));
  }

  if (urlPath.startsWith('/api/v1/site/') && req.method === 'GET') {
    const auth = requireApiKey(req, res); if (!auth) return;
    const domain = decodeURIComponent(urlPath.slice('/api/v1/site/'.length)).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    const entry = [..._registry.values()].find(e => (e.site_url || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase() === domain);
    if (!entry) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ ok: false, error: 'Site not found in registry' })); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    return res.end(JSON.stringify({ ok: true, cert_id: entry.cert_id, domain: entry.site_url, name: entry.site_name, description: entry.description, score: entry.score, tags: entry.tags || [], location: entry.location || '', listed_at: entry.issued_at, tier: auth.tier }));
  }

  // ── MCP endpoint ──────────────────────────────────────────────────────────────
  if (urlPath === '/api/mcp' && req.method === 'POST') {
    const auth = requireApiKey(req, res); if (!auth) return;
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const rpc = JSON.parse(body);
        const id  = rpc.id ?? null;
        const ok  = (result) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ jsonrpc: '2.0', id, result })); };
        const err = (code, msg) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message: msg } })); };

        if (rpc.method === 'initialize') {
          return ok({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ailattice', version: '1.0.0' } });
        }

        if (rpc.method === 'tools/list') {
          return ok({ tools: [
            { name: 'search_registry', description: 'Search the AILattice registry of AI-ready websites by keyword, topic, or location.', inputSchema: { type: 'object', properties: { q: { type: 'string', description: 'Search query — keyword, topic, or location' } }, required: ['q'] } },
            { name: 'get_site', description: 'Look up a specific website in the AILattice registry by domain name.', inputSchema: { type: 'object', properties: { domain: { type: 'string', description: 'Domain name, e.g. example.com' } }, required: ['domain'] } },
            { name: 'list_registry', description: 'List all sites in the AILattice registry, optionally filtered by topic or location.', inputSchema: { type: 'object', properties: { topic: { type: 'string', description: 'Filter by topic or category' }, location: { type: 'string', description: 'Filter by city, region or country' }, page: { type: 'number', description: 'Page number (default 1)' } } } },
          ]});
        }

        if (rpc.method === 'tools/call') {
          const { name, arguments: args = {} } = rpc.params || {};

          if (name === 'search_registry') {
            const q = (args.q || '').toLowerCase().trim();
            if (!q) return err(-32602, 'q is required');
            const words = q.split(/\s+/);
            const scoreF = e => { let s = 0; const hay = [e.site_name, e.description, e.location, ...(e.tags||[])].join(' ').toLowerCase(); for (const w of words) { if (hay.includes(w)) s += (e.site_name||'').toLowerCase().includes(w)?3:1; } return s; };
            const results = [..._registry.values()].map(e=>({...e,_s:scoreF(e)})).filter(e=>e._s>0).sort((a,b)=>b._s-a._s||b.score-a.score).slice(0,10).map(e=>({ domain: e.site_url, name: e.site_name, description: e.description, score: e.score, tags: e.tags||[], location: e.location||'' }));
            return ok({ content: [{ type: 'text', text: results.length ? JSON.stringify(results, null, 2) : `No sites found matching "${args.q}"` }] });
          }

          if (name === 'get_site') {
            const domain = (args.domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
            const entry = [..._registry.values()].find(e => (e.site_url||'').replace(/^https?:\/\//,'').replace(/\/$/,'').toLowerCase() === domain);
            if (!entry) return ok({ content: [{ type: 'text', text: `"${args.domain}" is not listed in the AILattice registry.` }] });
            return ok({ content: [{ type: 'text', text: JSON.stringify({ domain: entry.site_url, name: entry.site_name, description: entry.description, score: entry.score, tags: entry.tags||[], location: entry.location||'', listed_at: entry.issued_at }, null, 2) }] });
          }

          if (name === 'list_registry') {
            const topic = (args.topic || '').toLowerCase();
            const loc   = (args.location || '').toLowerCase();
            const page  = Math.max(1, parseInt(args.page || 1));
            let entries = [..._registry.values()];
            if (topic) entries = entries.filter(e => (e.tags||[]).some(t=>t.toLowerCase().includes(topic))||(e.site_name||'').toLowerCase().includes(topic));
            if (loc)   entries = entries.filter(e => (e.location||'').toLowerCase().includes(loc));
            const slice = entries.slice((page-1)*20, page*20).map(e=>({ domain: e.site_url, name: e.site_name, description: e.description, score: e.score, tags: e.tags||[], location: e.location||'' }));
            return ok({ content: [{ type: 'text', text: `${entries.length} sites found.\n\n` + JSON.stringify(slice, null, 2) }] });
          }

          return err(-32601, `Unknown tool: ${name}`);
        }

        return err(-32601, `Method not found: ${rpc.method}`);
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
      }
    });
    return;
  }

  if (urlPath === '/api/mcp' && req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' });
    return res.end();
  }

  if (urlPath === '/api/auth/account' && req.method === 'DELETE') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Not logged in' })); }
    // Remove all registry listings owned by this user
    for (const [certId, entry] of _registry) { if (entry.user_id === user.id) _registry.delete(certId); }
    saveRegistry(_registry);
    // Remove all sessions for this user
    for (const [token, sess] of _sessions) { if (sess.user_id === user.id) _sessions.delete(token); }
    saveSessions(_sessions);
    // Remove API keys for this user
    for (const [k, v] of Object.entries(_apiKeys)) { if (v.user_id === user.id) delete _apiKeys[k]; }
    saveApiKeys(_apiKeys);
    // Remove the user
    _users.delete(user.id);
    saveUsers(_users);
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': clearCookie() });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (urlPath === '/api/auth/me' && req.method === 'GET') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Not logged in' })); }
    const sites = [..._registry.values()].filter(e => e.user_id === user.id).map(e => ({
      cert_id: e.cert_id, url: e.site_url, name: e.site_name, score: e.score, tier: e.tier,
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ user: { id: user.id, name: user.name, email: user.email }, sites }));
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

      // ── Subscription tier upgrades ──────────────────────────────
      const PRICE_TO_TIER = {
        'pri_01kvfag24kj5tej6sf7g8ewekq': 'supporter',
        'pri_01kwntb9t8764t50kwc250qk58': 'builder',
      };

      if (event === 'subscription.activated' || event === 'subscription.updated') {
        const userId   = data.custom_data?.user_id;
        const priceId  = data.items?.[0]?.price?.id;
        const tier     = PRICE_TO_TIER[priceId];
        const subId    = data.id;
        if (userId && tier) {
          const entry = Object.entries(_apiKeys).find(([, v]) => v.user_id === userId);
          if (entry) {
            entry[1].tier = tier;
            entry[1].paddle_subscription_id = subId;
            saveApiKeys(_apiKeys);
            console.log(`[ailattice-paddle] Upgraded user ${userId} to ${tier} (sub: ${subId})`);
          }
        }
        return;
      }

      if (event === 'subscription.cancelled' || event === 'subscription.past_due') {
        const subId = data.id;
        const entry = Object.entries(_apiKeys).find(([, v]) => v.paddle_subscription_id === subId);
        if (entry) {
          entry[1].tier = 'free';
          entry[1].paddle_subscription_id = null;
          saveApiKeys(_apiKeys);
          console.log(`[ailattice-paddle] Downgraded sub ${subId} to free (${event})`);
        }
        return;
      }

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
      pingIndexNow(`https://ailattice.io/cert/${cert.cert_id}`);
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

// API: free self-submit to registry
  if (urlPath === '/api/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const { url, name, description, tags, address, email } = parsed;

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

        // Security hard gates — no exceptions regardless of tier
        const parityCheck = (result.checks || []).find(c => c.id === 'content_parity');
        const uaCheck     = (result.checks || []).find(c => c.id === 'ua_consistency');
        const parityWarning = parityCheck && !parityCheck.ok;
        if (uaCheck && !uaCheck.ok) {
          res.writeHead(422, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: 'Your site appears to serve different content to AI crawlers vs human visitors. AILattice requires consistent content for all users.',
            score: result.score, checks: result.checks,
          }));
        }

        // Tier: ai_ready if site has AI files installed + passes score threshold; otherwise listed
        const hasAiFiles = (result.checks || []).some(c => c.id === 'llms_txt' && c.ok) &&
                           (result.checks || []).some(c => c.id === 'ai_index'  && c.ok);
        const tier = (result.score >= 70 && hasAiFiles) ? 'ai_ready' : 'listed';

        const normalUrl = result.url;

        // Duplicate check
        const existing = [..._registry.values()].find(e => e.site_url === normalUrl);
        if (existing) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'This site is already listed in the AILattice Registry.', cert_id: existing.cert_id }));
        }

        const siteName = (name || result.meta?.name || normalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')).trim();
        const siteDesc = (description || result.meta?.description || '').trim();
        const siteAddr = (address || result.meta?.address || '').trim().slice(0, 300);
        const siteTags = Array.isArray(tags) ? tags.slice(0, 10).map(t => String(t).trim().slice(0, 50)).filter(Boolean) : [];

        const sessionUser = getSessionUser(req);
        const cert  = issueCert(normalUrl, result.score, email);
        const entry = enrollInRegistry(cert, { name: siteName, description: siteDesc, tags: siteTags, address: siteAddr, email, location: '', tier, user_id: sessionUser?.id || null });
        appendEmail(email, normalUrl, siteName);
        const snippet = buildSchemaSnippet(normalUrl, siteName, siteDesc);
        pingIndexNow(`https://ailattice.io/cert/${cert.cert_id}`);
        console.log(`[ailattice-submit] Listed: ${cert.cert_id} for ${normalUrl} (score: ${result.score}, tier: ${tier})`);

        // Generate AI files for all sites so they can download them even if listed-only
        let aiFiles = null;
        try {
          const crawl = await crawlSite(normalUrl);
          const gen   = generateAIFiles(crawl, { name: siteName, description: siteDesc, tags: siteTags, address: siteAddr });
          if (!entry.description && gen.description) {
            entry.description = gen.description;
            _registry.get(cert.cert_id) && (_registry.get(cert.cert_id).description = entry.description);
          }
          if ((!entry.tags || !entry.tags.length) && gen.tags.length) {
            entry.tags = gen.tags;
            _registry.get(cert.cert_id) && (_registry.get(cert.cert_id).tags = entry.tags);
          }
          if (!entry.address && gen.address) {
            entry.address = gen.address;
            _registry.get(cert.cert_id) && (_registry.get(cert.cert_id).address = entry.address);
          }
          if (!entry.location && gen.location) {
            entry.location = gen.location;
            _registry.get(cert.cert_id) && (_registry.get(cert.cert_id).location = entry.location);
          }
          saveRegistry(_registry);
          aiFiles = { llms_txt: gen.llms_txt, ai_index: gen.ai_index, ai_sitemap: gen.ai_sitemap };
          console.log(`[ailattice-crawl] Generated files for ${normalUrl}`);
        } catch(e) {
          console.warn(`[ailattice-crawl] Could not generate files for ${normalUrl}: ${e.message}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true, cert_id: cert.cert_id, entry, score: result.score, tier, schema_snippet: snippet, ai_files: aiFiles,
          ...(parityWarning ? { warning: 'Your AI files contain some content that doesn\'t closely match your public site. Your site has been listed — review your /ai/ files to make sure they only describe what\'s on your public pages.' } : {}),
        }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: validate
  // API: delete own listing (authenticated)
  if (urlPath.startsWith('/api/dashboard/listing/') && req.method === 'DELETE') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Login required' })); }
    const certId = urlPath.split('/').pop();
    const entry  = _registry.get(certId);
    if (!entry) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Not found' })); }
    if (entry.user_id !== user.id) { res.writeHead(403, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Not your listing' })); }
    _registry.delete(certId);
    saveRegistry(_registry);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true }));
  }

  // API: recheck a listed site (re-runs validateSite, updates score in registry)
  if (urlPath === '/api/dashboard/recheck' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Login required' })); }
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { cert_id } = JSON.parse(body);
        const entry = _registry.get(cert_id);
        if (!entry) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Not found' })); }
        if (entry.user_id !== user.id) { res.writeHead(403, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Not your listing' })); }
        const result = await validateSite(entry.site_url);
        entry.score      = result.score;
        entry.tier       = result.score >= 70 ? 'ai_ready' : 'listed';
        entry.checked_at = Date.now();
        saveRegistry(_registry);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, score: result.score, tier: entry.tier, certified: result.certified, checks: result.checks }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: generate AI files (authenticated)
  if (urlPath === '/api/dashboard/generate' && req.method === 'POST') {
    const user = getSessionUser(req);
    if (!user) { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Login required' })); }
    let body = ''; req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { url, name, description, tags, address } = JSON.parse(body);
        if (!url) throw new Error('url required');
        const crawl = await crawlSite(url);
        const gen   = generateAIFiles(crawl, { name, description, tags, address });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, url: crawl.url, name: gen.name, description: gen.description, llms_txt: gen.llms_txt, ai_index: gen.ai_index, ai_sitemap: gen.ai_sitemap }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (urlPath === '/api/dashboard/zip' && req.method === 'GET') {
    const certId = parsedUrl.searchParams.get('cert_id') || '';
    const entry  = _registry.get(certId);
    if (!entry) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Certificate not found' }));
    }
    try {
      const fakeCrawl = { url: entry.site_url, title: entry.site_name || '', metaDesc: entry.description || '', homeText: '', extraPages: [], schemaAddress: entry.address || '' };
      const gen  = generateAIFiles(fakeCrawl, { name: entry.site_name, description: entry.description, tags: entry.tags, address: entry.address });
      const zip  = buildZip([
        { name: 'llms.txt',      data: gen.llms_txt   },
        { name: 'ai/index.md',   data: gen.ai_index   },
        { name: 'ai/sitemap.md', data: gen.ai_sitemap },
      ]);
      const domain = new URL(entry.site_url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '_');
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="ailattice-${domain}.zip"`,
        'Content-Length': zip.length,
      });
      res.end(zip);
    } catch(e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (urlPath === '/api/validate') {
    const siteUrl = parsedUrl.searchParams.get('url') || '';
    if (!siteUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'url parameter required' }));
    }
    try {
      const result = await validateSite(siteUrl);
      // Check if already in registry
      const norm = siteUrl.replace(/^https?:\/\//i,'').replace(/\/+$/,'').toLowerCase();
      result.registered = [..._registry.values()].some(e =>
        (e.site_url||'').replace(/^https?:\/\//i,'').replace(/\/+$/,'').toLowerCase() === norm
      );
      result.name = result.meta?.name || '';
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(result));
    } catch(e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // API: crawl + AI rewrite — auto-generate AILattice files for a URL
  if (urlPath === '/api/crawl' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body);
        if (!url) throw new Error('url required');
        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
        if (!checkCrawlRateLimit(ip)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too many requests — please try again in an hour.' }));
        }
        const crawl = await crawlSite(url);
        const files = generateAIFiles(crawl);
        console.log(`[ailattice-crawl] Generated files for ${crawl.url}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, meta: { url: crawl.url, name: files.name, description: files.description, address: files.address, location: files.location, tags: files.tags }, files }));
      } catch(e) {
        console.error('[ailattice-crawl]', e.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ─── Interview: start — crawl + initial constitution + targeted gap questions ─
  if (urlPath === '/api/interview/start' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { url, description } = JSON.parse(body);
        if (!url) throw new Error('url required');

        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
        if (!checkCrawlRateLimit(ip)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too many requests — please try again in an hour.' }));
        }

        const context = description ? `OWNER DESCRIPTION:\n${description}` : undefined;
        const scRes = await fetch(`${STASIS_URL}/api/v1/constitute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, context }),
          signal: AbortSignal.timeout(50000),
        });
        if (!scRes.ok) {
          const err = await scRes.json().catch(() => ({}));
          throw new Error(err.error || `stasis-core ${scRes.status}`);
        }
        const draft      = await scRes.json();
        const ungrounded = draft.evidence?.ungrounded_claims || [];
        const missing    = draft.missing || [];
        const ec         = draft.evidence?.evidence_coverage ?? draft.confidence ?? 0;

        // Generate targeted "But why?" questions from specific gaps
        let questions = draft.owner_questions || [];
        if (ungrounded.length > 0 || missing.length > 0) {
          const qPrompt = `You are generating interview questions for a website owner to close gaps in their constitution.

UNGROUNDED CLAIMS (in the constitution but not verified from published site content):
${ungrounded.length ? ungrounded.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'None'}

MISSING FIELDS (could not be determined from the site at all):
${missing.length ? missing.join(', ') : 'None'}
${description ? `\nOWNER DESCRIPTION: ${description}` : ''}

Generate 3–5 targeted questions. Rules:
- Each question must directly address one ungrounded claim or missing field — no generic questions
- Ask for observable FACTS, not intentions ("What is your published data retention policy?" not "Do you have one?")
- Start with What, Who, Which, How, or Where — never "Do you" or "Would you"
- For constraint claims: ask for the specific rule and where it is documented
- For quantitative claims: ask where the number comes from or where it is published
- One sentence per question

Return ONLY valid JSON: { "questions": [] }`;

          try {
            const qRaw    = await callGroq([{ role: 'user', content: qPrompt }]);
            const qParsed = JSON.parse(qRaw);
            if (Array.isArray(qParsed.questions) && qParsed.questions.length > 0) {
              questions = qParsed.questions.slice(0, 5);
            }
          } catch (_e) { /* keep draft.owner_questions fallback */ }
        }

        console.log(`[interview-start] ${url} — EC ${ec}% — ${questions.length} questions`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ec_before: ec, ungrounded_claims: ungrounded, missing, questions, draft }));
      } catch (e) {
        console.error('[interview-start]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ─── Interview: submit — enrich context with answers, regenerate constitution ─
  if (urlPath === '/api/interview/submit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { url, description, answers, ec_before } = JSON.parse(body);
        if (!url) throw new Error('url required');
        if (!Array.isArray(answers) || answers.length === 0) throw new Error('No answers provided.');

        for (const { a } of answers) {
          if (a && a.length > 500) throw new Error('Please keep each answer under 500 characters (2–3 sentences).');
        }

        const validAnswers = answers.filter(({ a }) => a && a.trim().length > 3);
        if (validAnswers.length === 0) throw new Error('Please answer at least one question.');

        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
        if (!checkCrawlRateLimit(ip)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too many requests — please try again in an hour.' }));
        }

        const qaBlock = validAnswers.map(({ q, a }) => `Q: ${q}\nA: ${a.trim()}`).join('\n\n');
        const enrichedContext = [
          description ? `OWNER DESCRIPTION:\n${description}` : null,
          `OWNER ANSWERS TO TARGETED QUESTIONS:\n${qaBlock}`,
        ].filter(Boolean).join('\n\n');

        const scRes = await fetch(`${STASIS_URL}/api/v1/constitute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, context: enrichedContext }),
          signal: AbortSignal.timeout(50000),
        });
        if (!scRes.ok) {
          const err = await scRes.json().catch(() => ({}));
          throw new Error(err.error || `stasis-core ${scRes.status}`);
        }
        const draft    = await scRes.json();
        const ec_after = draft.evidence?.evidence_coverage ?? draft.confidence ?? 0;

        console.log(`[interview-submit] ${url} — EC ${ec_before ?? '?'}% → ${ec_after}%`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, draft, ec_before: ec_before || 0, ec_after }));
      } catch (e) {
        console.error('[interview-submit]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── GET /.intro  +  GET /constitution  +  GET /api/constitution?domain=X ─────
  // The standard discovery endpoint. /.intro is primary; /constitution is the alias.
  if ((urlPath === '/.intro' || urlPath === '/constitution' || urlPath === '/api/constitution') && req.method === 'GET') {
    const domain = parsedUrl.searchParams.get('domain') || parsedUrl.searchParams.get('url') || '';
    const key = domain ? normaliseDomain(domain) : null;
    const record = key ? _constitutions[key] : null;
    if (!record) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'No constitution found for this domain.', hint: 'Generate one at https://ailattice.io/constitute' }));
    }
    res.writeHead(200, {
      'Content-Type': 'application/intro+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    });
    return res.end(JSON.stringify(record, null, 2));
  }

  // GET /constitution/schema — the canonical schema for application/constitution+json
  if (urlPath === '/constitution/schema' && req.method === 'GET') {
    const schema = {
      '$schema': 'https://json-schema.org/draft/2020-12/schema',
      '$id': 'https://ailattice.io/constitution/schema',
      title: 'AILattice Intent Constitution',
      description: 'Canonical schema for application/constitution+json — the Interpretation Layer standard.',
      type: 'object',
      required: ['spec', 'identity', 'mission', 'core_belief', 'principles', 'constraints'],
      properties: {
        spec:         { type: 'string', const: 'ailattice/constitution/v1' },
        version:      { type: 'string' },
        issued:       { type: 'string', format: 'date' },
        identity: {
          type: 'object',
          required: ['name', 'url'],
          properties: {
            name:     { type: 'string' },
            url:      { type: 'string', format: 'uri' },
            category: { type: 'string' },
            tagline:  { type: 'string' },
          }
        },
        mission:          { type: 'string' },
        core_belief:      { type: 'string' },
        principles:       { type: 'array', items: { type: 'string' }, minItems: 1 },
        constraints:      { type: 'array', items: { type: 'string' }, minItems: 1 },
        what_this_is_not: { type: 'array', items: { type: 'string' } },
        evaluation_criteria: { type: 'array', items: { type: 'string' } },
        evidence_coverage: { type: 'number', minimum: 0, maximum: 100 },
        meta: {
          type: 'object',
          properties: {
            issued:    { type: 'string', format: 'date' },
            issuer:    { type: 'string' },
            cert_id:   { type: 'string' },
            registry:  { type: 'string', format: 'uri' },
          }
        }
      }
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=86400' });
    return res.end(JSON.stringify(schema, null, 2));
  }

  // POST /api/constitution/save — persist an approved constitution
  if (urlPath === '/api/constitution/save' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { url, name, tagline, mission, category, core_belief, principles, constraints, what_this_is_not, evidence_coverage } = JSON.parse(body);
        if (!url) throw new Error('url required');
        const domain = normaliseDomain(url);

        // Build canonical constitution JSON
        const certId = [..._registry.values()].find(e => normaliseDomain(e.site_url) === domain)?.cert_id || null;
        const constitution = {
          spec:    'ailattice/constitution/v1',
          version: '1.0.0',
          issued:  new Date().toISOString().slice(0, 10),
          identity: { name: name || domain, url, category: category || '', tagline: tagline || '' },
          mission,
          core_belief,
          principles:       principles || [],
          constraints:      constraints || [],
          what_this_is_not: what_this_is_not || [],
          evaluation_criteria: [],
          evidence_coverage: evidence_coverage ?? null,
          meta: {
            issued:   new Date().toISOString().slice(0, 10),
            issuer:   'ailattice',
            cert_id:  certId,
            registry: certId ? `https://ailattice.io/registry/${certId}` : null,
          }
        };

        storeConstitution(domain, constitution);

        // Upgrade registry entry tier to constituted
        if (certId && _registry.has(certId)) {
          const entry = _registry.get(certId);
          entry.tier = 'constituted';
          entry.constitution_url = `https://ailattice.io/api/constitution?domain=${domain}`;
          saveRegistry(_registry);
        }

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({
          ok: true,
          domain,
          constitution_url: `https://ailattice.io/api/constitution?domain=${domain}`,
          self_host_path: '/.intro',
          message: `Constitution published. Serve it at your domain's /constitution to complete the standard.`,
        }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // API: constitute — generate a draft constitution from a URL via stasis-core
  if (urlPath === '/api/constitute' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        const { url, context } = JSON.parse(body);
        if (!url) throw new Error('url required');

        const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
        if (!checkCrawlRateLimit(ip)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Too many requests — please try again in an hour.' }));
        }

        // Delegate to stasis-core — it fetches the site, generates the draft, runs evidence check
        const scRes = await fetch(`${STASIS_URL}/api/v1/constitute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, context }),
          signal: AbortSignal.timeout(50000),
        });
        if (!scRes.ok) {
          const err = await scRes.json().catch(() => ({}));
          throw new Error(err.error || `stasis-core ${scRes.status}`);
        }
        const draft = await scRes.json();
        console.log(`[ailattice-constitute] Draft for ${url} — evidence: ${draft.evidence?.evidence_coverage ?? '?'}%`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, draft }));
      } catch (e) {
        console.error('[ailattice-constitute]', e.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
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
        address:      e.address  || null,
        location:     e.location || null,
        score:        e.score,
        registered:   e.registered_at ? new Date(e.registered_at).toISOString().slice(0,10) : null,
        // email intentionally excluded — private
      })),
    };
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
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

  // API: contact form submission
  if (urlPath === '/api/contact' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { name, email, subject, message, website } = JSON.parse(body);
        if (website) { // honeypot
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true }));
        }
        if (!name || !email || !message) throw new Error('name, email and message are required');
        appendContact(name.slice(0, 200), email.slice(0, 200), (subject || '').slice(0, 300), message.slice(0, 5000));
        console.log(`[ailattice-contact] New message from ${email}: ${(subject || '(no subject)').slice(0, 60)}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Admin: contacts JSON API
  if (urlPath === '/admin/api/contacts') {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch(e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // Admin: emails JSON API
  if (urlPath === '/admin/api/emails') {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8')); } catch(e) {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(list));
  }

  // Admin: contact submissions (protected)
  if (urlPath === '/admin/contacts') {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8')); } catch(e) {}
    const rows = list.slice().reverse().map((c, i) => `
      <tr style="background:${i%2?'#f8fafc':'#fff'}">
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#94a3b8;font-size:12px;white-space:nowrap">${new Date(c.received_at).toLocaleString()}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">${escHtml(c.name)}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><a href="mailto:${escHtml(c.email)}">${escHtml(c.email)}</a></td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">${escHtml(c.subject || '—')}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;white-space:pre-wrap;max-width:400px;font-size:13px">${escHtml(c.message)}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AILattice — Contacts (${list.length})</title>
      <style>body{font-family:system-ui,sans-serif;padding:32px;background:#f1f5f9;color:#0f172a}
      h1{font-size:22px;margin-bottom:4px}p{color:#64748b;margin-bottom:24px;font-size:14px}
      table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
      th{text-align:left;padding:12px 16px;background:#0f172a;color:#fff;font-size:13px;font-weight:600}
      td a{color:#16a34a}
      .empty{text-align:center;padding:48px;color:#94a3b8}</style></head>
      <body><h1>AILattice — Contact Submissions</h1>
      <p>${list.length} message${list.length!==1?'s':''} · Private · Do not share this URL</p>
      <table><thead><tr><th>Received</th><th>Name</th><th>Email</th><th>Subject</th><th>Message</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">No messages yet</td></tr>'}</tbody></table>
      </body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // Admin: email list (protected)
  if (urlPath === '/admin/emails') {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden');
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(EMAILS_FILE, 'utf8')); } catch(e) {}
    const rows = list.map((e, i) => `
      <tr style="background:${i%2?'#f8fafc':'#fff'}">
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">${i+1}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><a href="mailto:${e.email}">${e.email}</a></td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0">${e.site_name || '—'}</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0"><a href="${e.site_url}" target="_blank">${e.site_url}</a></td>
        <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;color:#94a3b8;font-size:13px">${e.registered_at ? new Date(e.registered_at).toLocaleString() : '—'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AILattice — Emails (${list.length})</title>
      <style>body{font-family:system-ui,sans-serif;padding:32px;background:#f1f5f9;color:#0f172a}
      h1{font-size:22px;margin-bottom:4px}p{color:#64748b;margin-bottom:24px;font-size:14px}
      table{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)}
      th{text-align:left;padding:12px 16px;background:#0f172a;color:#fff;font-size:13px;font-weight:600}
      td a{color:#16a34a}
      .empty{text-align:center;padding:48px;color:#94a3b8}</style></head>
      <body><h1>AILattice — Registered Emails</h1>
      <p>${list.length} subscriber${list.length!==1?'s':''} · Private · Do not share this URL</p>
      <table><thead><tr><th>#</th><th>Email</th><th>Site Name</th><th>Website</th><th>Registered</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" class="empty">No registrations yet</td></tr>'}</tbody></table>
      </body></html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // Admin: registry API — list / update / delete (protected)
  if (urlPath === '/admin/api/registry') {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    if (req.method === 'GET') {
      let list = [];
      try { list = JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')); } catch(e) {}
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(list));
    }
    res.writeHead(405); return res.end('Method Not Allowed');
  }

  if (urlPath.startsWith('/admin/api/registry/')) {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    const certId = decodeURIComponent(urlPath.slice('/admin/api/registry/'.length));

    if (req.method === 'PUT') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        try {
          const patch   = JSON.parse(body);
          const existing = _registry.get(certId);
          if (!existing) { res.writeHead(404); return res.end(JSON.stringify({ error: 'Not found' })); }
          const allowed = ['site_name','description','tags','address','location','tier','score','topics'];
          allowed.forEach(k => { if (patch[k] !== undefined) existing[k] = patch[k]; });
          _registry.set(certId, existing);
          saveRegistry(_registry);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, entry: existing }));
        } catch(e) {
          res.writeHead(400); res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.method === 'DELETE') {
      if (!_registry.has(certId)) { res.writeHead(404); return res.end(JSON.stringify({ error: 'Not found' })); }
      _registry.delete(certId);
      saveRegistry(_registry);
      certs.delete(certId);
      saveCerts(certs);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true }));
    }

    res.writeHead(405); return res.end('Method Not Allowed');
  }

  // Admin dashboard
  if (urlPath === '/admin' || urlPath === '/admin/') {
    const key = parsedUrl.searchParams.get('key') || '';
    const ADMIN_KEY = process.env.ADMIN_KEY || '';
    if (!ADMIN_KEY || key !== ADMIN_KEY) { res.writeHead(403); return res.end('Forbidden'); }
    // serve admin.html with key injected
    let html = '';
    try { html = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'); } catch(e) {
      res.writeHead(404); return res.end('admin.html not found');
    }
    html = html.replace(/__ADMIN_KEY__/g, escHtml(key));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end(html);
  }

  // Legacy redirects — retired pages point to their current equivalent
  const _REDIRECTS = {
    '/home':       '/',
    '/validate':   '/',
    '/badge':      '/',
    '/convert':    '/dashboard',
    '/submit':     '/dashboard',
    '/discover':   '/registry',
    '/constitute': '/dashboard',
  };
  const _rDest = _REDIRECTS[urlPath] || _REDIRECTS[urlPath.replace(/\/$/, '')];
  if (_rDest) {
    res.writeHead(301, { Location: _rDest });
    return res.end();
  }

  // API: recheck an existing listed site — re-validates and promotes tier if AI files now present
  if (urlPath === '/api/recheck' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const { cert_id } = JSON.parse(body);
        if (!cert_id) throw new Error('cert_id required');
        const entry = _registry.get(cert_id);
        if (!entry) { res.writeHead(404); return res.end(JSON.stringify({ error: 'Listing not found' })); }

        const result = await validateSite(entry.site_url);

        // Security gates still apply
        const parityCheck = (result.checks || []).find(c => c.id === 'content_parity');
        const uaCheck     = (result.checks || []).find(c => c.id === 'ua_consistency');
        if (parityCheck && !parityCheck.ok) {
          res.writeHead(422); return res.end(JSON.stringify({ error: 'Content parity check failed.', checks: result.checks }));
        }
        if (uaCheck && !uaCheck.ok) {
          res.writeHead(422); return res.end(JSON.stringify({ error: 'UA consistency check failed.', checks: result.checks }));
        }

        const hasAiFiles = (result.checks || []).some(c => c.id === 'llms_txt' && c.ok) &&
                           (result.checks || []).some(c => c.id === 'ai_index'  && c.ok);
        const newTier = (result.score >= 70 && hasAiFiles) ? 'ai_ready' : 'listed';

        if (newTier !== entry.tier) {
          entry.tier  = newTier;
          entry.score = result.score;
          _registry.set(cert_id, entry);
          saveRegistry(_registry);
        }

        // Regenerate AI files with current content
        let aiFiles = null;
        try {
          const crawl = await crawlSite(entry.site_url);
          const gen   = generateAIFiles(crawl, { name: entry.site_name, description: entry.description, tags: entry.tags, address: entry.address });
          aiFiles = { llms_txt: gen.llms_txt, ai_index: gen.ai_index, ai_sitemap: gen.ai_sitemap };
        } catch(e) { console.warn('[ailattice-recheck] Could not generate files:', e.message); }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, tier: newTier, score: result.score, checks: result.checks, ai_files: aiFiles }));
      } catch(e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Static files
  let filePath = urlPath;
  if (filePath === '/' || filePath === '') filePath = '/search.html';
  if (filePath === '/search')             filePath = '/search.html';
  if (filePath === '/registry')           filePath = '/registry.html';
  if (filePath === '/submit')             { res.writeHead(302, { Location: '/dashboard' }); return res.end(); }
  if (filePath === '/constitute')         filePath = '/constitute.html';
  if (filePath === '/discover')           filePath = '/discover.html';
  if (filePath === '/how-it-works')       filePath = '/how-it-works.html';
  if (filePath === '/manifesto')          filePath = '/manifesto.html';
  if (filePath === '/signup')             filePath = '/signup.html';
  if (filePath === '/login')              filePath = '/login.html';
  if (filePath === '/dashboard')          filePath = '/dashboard.html';
  if (filePath === '/faq')               filePath = '/faq.html';
  if (filePath === '/contact')           filePath = '/contact.html';
  if (filePath === '/reach-out')         filePath = '/contact.html';
  if (filePath === '/convert')           filePath = '/convert.html';
  if (filePath === '/api-access')        filePath = '/api-access.html';
  if (filePath === '/developers')        filePath = '/developers.html';
  if (filePath === '/deck')              filePath = '/deck.html';
  if (filePath === '/paper')             filePath = '/paper.html';
  if (filePath === '/terms')             filePath = '/terms.html';
  if (filePath === '/privacy')           filePath = '/privacy.html';
  if (filePath === '/refund')            filePath = '/refund.html';
  if (filePath.startsWith('/cert/') || filePath === '/cert') filePath = '/cert.html';
  if (filePath.endsWith('/'))              filePath += 'index.md';

  const absPath = path.join(ROOT, filePath);
  if (!absPath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  const ext  = path.extname(absPath).toLowerCase();
  const ALLOWED_STATIC = new Set(['.html', '.md', '.txt', '.css', '.js', '.ico', '.png', '.svg', '.gif', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.php', '.xml']);
  if (!ALLOWED_STATIC.has(ext)) {
    res.writeHead(403); return res.end('Forbidden');
  }

  const mime = MIME[ext] || 'text/plain; charset=utf-8';

  fs.readFile(absPath, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=60' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`[ailattice] http://localhost:${PORT}`));
