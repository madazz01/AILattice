#!/usr/bin/env node
'use strict';

const readline = require('readline');
const path     = require('path');
const { get }  = require('../lib/fetch');
const parse    = require('../lib/parse');
const generate = require('../lib/generate');
const { validate } = require('../lib/validate');

// ── ANSI colours (no deps) ────────────────────────────────────────────────────
const g  = s => `\x1b[32m${s}\x1b[0m`;   // green
const d  = s => `\x1b[2m${s}\x1b[0m`;    // dim
const b  = s => `\x1b[1m${s}\x1b[0m`;    // bold
const y  = s => `\x1b[33m${s}\x1b[0m`;   // yellow
const r  = s => `\x1b[31m${s}\x1b[0m`;   // red
const c  = s => `\x1b[36m${s}\x1b[0m`;   // cyan

const tick  = g('✓');
const cross = r('✕');

// ── Prompt helper ─────────────────────────────────────────────────────────────
function prompt(rl, question, defaultVal) {
  return new Promise(resolve => {
    const q = defaultVal ? `  ${c('?')} ${question} ${d('[' + defaultVal + ']')}: ` : `  ${c('?')} ${question}: `;
    rl.question(q, answer => resolve(answer.trim() || defaultVal || ''));
  });
}

// ── Help ──────────────────────────────────────────────────────────────────────
function showHelp() {
  console.log(`
  ${b('ailattice')} — The AI Web Standard converter

  ${b('Usage:')}
    npx ailattice <url>                 Convert a site to AILattice format
    npx ailattice validate <url>        Check compliance of a live site
    npx ailattice --help                Show this help

  ${b('Options:')}
    --output <dir>                      Output directory ${d('[./ailattice-output]')}

  ${b('Examples:')}
    npx ailattice https://mysite.com
    npx ailattice validate https://mysite.com
    npx ailattice https://mysite.com --output ./ai-files

  ${b('Standard:')} https://ailattice.io
  `);
}

// ── Convert ───────────────────────────────────────────────────────────────────
async function convert(siteUrl, outDir) {
  if (!siteUrl.match(/^https?:\/\//i)) siteUrl = 'https://' + siteUrl;
  siteUrl = siteUrl.replace(/\/+$/, '');

  console.log(`\n  ${b('AILattice')} — Making your site AI-readable\n`);
  process.stdout.write(`  Fetching ${d(siteUrl)}…`);

  let res;
  try {
    res = await get(siteUrl);
  } catch(e) {
    console.log(` ${cross}\n\n  ${r('Error:')} ${e.message}\n`);
    process.exit(1);
  }

  if (res.status !== 200) {
    console.log(` ${cross}\n\n  ${r('Error:')} Got HTTP ${res.status} from ${siteUrl}\n`);
    process.exit(1);
  }

  const html    = res.body;
  const finalUrl = res.url || siteUrl;
  const rawTitle = parse.extractTitle(html);
  const rawDesc  = parse.extractMeta(html, 'description') || parse.extractH1(html);
  const links    = parse.extractLinks(html, finalUrl);
  const sections = parse.extractMainContent(html);

  // Clean title (strip site name suffix like "— Company")
  const titleParts = rawTitle.split(/[|—–-]/);
  const pageTitle  = titleParts[0].trim();
  const siteSuffix = titleParts.length > 1 ? titleParts[titleParts.length - 1].trim() : pageTitle;

  console.log(` ${tick}`);
  if (rawTitle) console.log(`  ${d('Found:')} "${rawTitle}"`);
  console.log();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const name        = await prompt(rl, 'Site / company name', siteSuffix || pageTitle);
  const description = await prompt(rl, 'One sentence about what you do', rawDesc);
  const contact     = await prompt(rl, 'Contact email (optional)', '');

  rl.close();

  const baseOrigin = new URL(finalUrl).origin;

  console.log(`\n  ${d(`Generating AILattice files…`)}`);
  const files = generate.write(outDir, {
    name, description, url: baseOrigin, contact, links, sections,
  });

  console.log();
  for (const f of files) console.log(`  ${tick} ${d(outDir + '/')}${g(f)}`);

  const linkCount = links.length;
  console.log(`
  ${b('Done!')} ${files.length} files generated${linkCount ? ` (${linkCount} nav page${linkCount > 1 ? 's' : ''} scaffolded)` : ''}.

  ${b('Next steps:')}
  1. Review and edit the files in ${c(outDir + '/')}
  2. Copy to your site root:  ${d('/llms.txt')}  and  ${d('/ai/')}
  3. Add to your HTML <head>:
     ${d('<link rel="alternate" type="text/markdown" href="/ai/">')}
  4. Validate: ${c(`npx ailattice validate ${baseOrigin}`)}

  ${b('Get certified at')} ${g('https://ailattice.io/validate')}
`);
}

// ── Validate ──────────────────────────────────────────────────────────────────
async function runValidate(siteUrl) {
  if (!siteUrl.match(/^https?:\/\//i)) siteUrl = 'https://' + siteUrl;
  console.log(`\n  ${b('AILattice')} Validator — ${d(siteUrl)}\n`);

  let result;
  try {
    result = await validate(siteUrl);
  } catch(e) {
    console.log(`  ${r('Error:')} ${e.message}\n`);
    process.exit(1);
  }

  const { score, certified, checks } = result;

  for (const ch of checks) {
    const icon   = ch.ok ? tick : cross;
    const pts    = ch.ok ? g(`+${ch.points}`) : d(`+0`);
    const detail = ch.detail ? `  ${d(ch.detail)}` : '';
    console.log(`  ${icon}  ${ch.label.padEnd(40)} ${pts}/${ch.max}${detail}`);
  }

  const color  = score >= 70 ? g : score >= 40 ? y : r;
  const status = score >= 70 ? g('Certified ✓') : score >= 40 ? y('Partial') : r('Not compliant');

  console.log(`\n  Score: ${color(b(score + '/100'))}  ${status}`);

  if (certified) {
    console.log(`\n  ${g('Get your badge at')} https://ailattice.io/validate?url=${encodeURIComponent(result.url)}`);
  } else {
    console.log(`\n  ${d('Fix the failing checks above and re-run.')}`);
    console.log(`  ${d('Full guide: https://ailattice.io')}`);
  }
  console.log();

  process.exit(certified ? 0 : 1);
}

// ── Entry ─────────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const outIdx = args.indexOf('--output');
const outDir = outIdx !== -1 ? args.splice(outIdx, 2)[1] : './ailattice-output';

if (!args.length || args[0] === '--help' || args[0] === '-h') {
  showHelp();
} else if (args[0] === 'validate') {
  const url = args[1];
  if (!url) { console.log(`\n  ${r('Usage:')} npx ailattice validate <url>\n`); process.exit(1); }
  runValidate(url).catch(e => { console.error(r(e.message)); process.exit(1); });
} else {
  convert(args[0], path.resolve(outDir)).catch(e => { console.error(r(e.message)); process.exit(1); });
}
