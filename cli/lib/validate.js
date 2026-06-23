'use strict';
const { get } = require('./fetch');

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

async function validate(siteUrl) {
  if (!siteUrl.match(/^https?:\/\//i)) siteUrl = 'https://' + siteUrl;
  siteUrl = siteUrl.replace(/\/+$/, '');
  const base = new URL(siteUrl).origin;

  const checks = [];
  let score = 0;

  async function probe(p) {
    try { return await get(base + p); }
    catch(e) { return { status: 0, body: '', error: e.message }; }
  }

  const llms = await probe('/llms.txt');
  const llmsOk = llms.status === 200;
  if (llmsOk) score += 20;
  checks.push({ label: '/llms.txt found', ok: llmsOk, points: llmsOk ? 20 : 0, max: 20 });

  const { ok: llmsFm, missing: llmsMissing } = llmsOk
    ? hasLlmsFields(llms.body, ['name', 'description', 'url', 'ai-entry'])
    : { ok: false, missing: ['name', 'description', 'url', 'ai-entry'] };
  if (llmsFm) score += 10;
  checks.push({ label: 'llms.txt required fields', ok: llmsFm, points: llmsFm ? 10 : 0, max: 10,
    detail: llmsFm ? null : (llmsOk ? `Missing: ${llmsMissing.join(', ')}` : 'llms.txt not found') });

  const idx = await probe('/ai/index.md');
  const idxOk = idx.status === 200;
  if (idxOk) score += 20;
  checks.push({ label: '/ai/index.md found', ok: idxOk, points: idxOk ? 20 : 0, max: 20 });

  const fmFields = ['title', 'description', 'last-updated'];
  const { ok: idxFm, missing: idxMissing } = idxOk ? hasFrontmatter(idx.body, fmFields) : { ok: false, missing: fmFields };
  if (idxFm) score += 10;
  checks.push({ label: '/ai/index.md frontmatter', ok: idxFm, points: idxFm ? 10 : 0, max: 10,
    detail: idxFm ? null : (idxOk ? `Missing: ${idxMissing.join(', ')}` : '/ai/index.md not found') });

  const sm = await probe('/ai/sitemap.md');
  const smOk = sm.status === 200;
  if (smOk) score += 15;
  checks.push({ label: '/ai/sitemap.md found', ok: smOk, points: smOk ? 15 : 0, max: 15 });

  const { ok: smFm, missing: smMissing } = smOk ? hasFrontmatter(sm.body, fmFields) : { ok: false, missing: fmFields };
  if (smFm) score += 10;
  checks.push({ label: '/ai/sitemap.md frontmatter', ok: smFm, points: smFm ? 10 : 0, max: 10,
    detail: smFm ? null : (smOk ? `Missing: ${smMissing.join(', ')}` : '/ai/sitemap.md not found') });

  let extraFound = 0;
  if (smOk) {
    const links = [...sm.body.matchAll(/\]\((\/ai\/[^)]+\.md)\)/g)]
      .map(m => m[1]).filter(l => !l.endsWith('/index.md') && !l.endsWith('/sitemap.md')).slice(0, 3);
    for (const l of links) { const r = await probe(l); if (r.status === 200) extraFound++; }
  }
  const extraOk = extraFound > 0;
  if (extraOk) score += 10;
  checks.push({ label: 'Additional content pages', ok: extraOk, points: extraOk ? 10 : 0, max: 10,
    detail: extraOk ? `${extraFound} page(s) found` : 'No additional pages found in sitemap' });

  const html = await probe('/');
  const htmlOk = html.status === 200 && /rel=["']alternate["']/.test(html.body) && /text\/markdown/.test(html.body);
  if (htmlOk) score += 5;
  checks.push({ label: 'HTML discovery <link>', ok: htmlOk, points: htmlOk ? 5 : 0, max: 5 });

  return { url: base, score, certified: score >= 70, checks };
}

module.exports = { validate };
