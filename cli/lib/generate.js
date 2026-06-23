'use strict';
const fs   = require('fs');
const path = require('path');

const TODAY = new Date().toISOString().slice(0, 10);

function llmsTxt({ name, description, url, contact }) {
  return [
    `name: ${name}`,
    `description: ${description}`,
    `url: ${url}`,
    `ai-entry: ${url}/ai/index.md`,
    '',
    `# ${name} — llms.txt`,
    '',
    `## What we do`,
    description,
    '',
    `## AI Navigation`,
    `Start at /ai/index.md for a full overview.`,
    `See /ai/sitemap.md for all navigable pages.`,
    '',
    contact ? `## Contact\n${contact}` : '',
    '',
    `## Links`,
    `Human site: ${url}`,
    `AI layer:   ${url}/ai/index.md`,
  ].filter(l => l !== undefined).join('\n').trim() + '\n';
}

function aiIndexMd({ name, description, url, links, sections }) {
  const pageList = links.length
    ? links.map(l => `- [${l.text}](/ai/${slug(l.text)}.md)`).join('\n')
    : '- [Sitemap](/ai/sitemap.md)';

  return [
    '---',
    `title: ${name} — AI Overview`,
    `description: ${description}`,
    `last-updated: ${TODAY}`,
    '---',
    '',
    `# ${name}`,
    '',
    description,
    '',
    '## Pages',
    pageList,
    '',
    sections || '',
  ].join('\n').trim() + '\n';
}

function aiSitemapMd({ name, links, url }) {
  const rows = [
    `- [/ai/index.md](/ai/index.md) — Overview and entry point`,
    `- [/ai/sitemap.md](/ai/sitemap.md) — This file`,
    ...links.map(l => `- [/ai/${slug(l.text)}.md](/ai/${slug(l.text)}.md) — ${l.text}`),
  ];

  return [
    '---',
    `title: ${name} — AI Sitemap`,
    `description: All AI-navigable pages on ${new URL(url).hostname}`,
    `last-updated: ${TODAY}`,
    '---',
    '',
    `# ${name} — Sitemap`,
    '',
    `All pages in the AI layer.`,
    '',
    ...rows,
  ].join('\n').trim() + '\n';
}

function aiPageMd({ name, pageTitle, url, pagePath }) {
  return [
    '---',
    `title: ${name} — ${pageTitle}`,
    `description: ${pageTitle} information for ${name}.`,
    `last-updated: ${TODAY}`,
    '---',
    '',
    `# ${pageTitle}`,
    '',
    `<!-- Add your ${pageTitle.toLowerCase()} content here -->`,
    `<!-- Keep it factual, structured, and in plain markdown -->`,
    '',
    `[← Back to overview](/ai/index.md)`,
  ].join('\n').trim() + '\n';
}

function slug(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

function write(outDir, data) {
  const files = [];

  const ensure = (rel, content) => {
    const abs = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    files.push(rel);
  };

  ensure('llms.txt',        llmsTxt(data));
  ensure('ai/index.md',     aiIndexMd(data));
  ensure('ai/sitemap.md',   aiSitemapMd(data));

  for (const link of data.links) {
    ensure(`ai/${slug(link.text)}.md`, aiPageMd({
      name: data.name,
      pageTitle: link.text,
      url: data.url,
      pagePath: link.href,
    }));
  }

  return files;
}

module.exports = { write, slug };
