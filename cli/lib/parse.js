'use strict';

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}=["']([^"']*?)["']`, 'i'));
  return m ? m[1].trim() : '';
}

function innerText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? innerText(m[1]) : '';
}

function extractMeta(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*?)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

function extractH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? innerText(m[1]) : '';
}

function extractLinks(html, baseUrl) {
  const { URL } = require('url');
  const seen  = new Set();
  const links = [];

  // Prefer nav links, fall back to all links
  const navMatch = html.match(/<(?:nav|header)[^>]*>([\s\S]*?)<\/(?:nav|header)>/i);
  const source   = navMatch ? navMatch[1] : html;

  const re = /<a[^>]+href=["']([^"'#?][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(source)) !== null) {
    let href = m[1].trim();
    const text = innerText(m[2]).trim();
    if (!text || !href) continue;
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      href = new URL(href, baseUrl).pathname;
    } catch(e) { continue; }
    if (href === '/' || seen.has(href)) continue;
    seen.add(href);
    links.push({ href, text });
    if (links.length >= 12) break;
  }
  return links;
}

function extractMainContent(html) {
  // Pull out <main>, <article>, or fall back to <body>
  const mainM = html.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  const src = mainM ? mainM[1] : html;
  // Extract h2/h3 headings and their following paragraphs
  const sections = [];
  const headRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  let hm;
  while ((hm = headRe.exec(src)) !== null) {
    sections.push('## ' + innerText(hm[1]));
  }
  return sections.slice(0, 6).join('\n');
}

module.exports = { extractTitle, extractMeta, extractH1, extractLinks, extractMainContent, innerText };
