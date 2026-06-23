# AILattice™ — The Invisible Web

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![ailattice.io](https://img.shields.io/badge/registry-ailattice.io-16a34a)](https://ailattice.io)
[![npm](https://img.shields.io/badge/npm-ailattice-cb3837)](https://www.npmjs.com/package/ailattice)

> **The first search engine built for AI — not humans.**

A directory of topic and location organised for how AI actually searches the internet. No paid placement. No algorithm that bends toward money. Free to list. Open source. Forever.

→ **[ailattice.io](https://ailattice.io)** · [Search](https://ailattice.io/search) · [Validate your site](https://ailattice.io/validate) · [Submit for free](https://ailattice.io/submit)

---

## What this is

Google indexes the web the way humans browse it — visuals, keywords, backlinks. **AI doesn't work that way.** It reads differently, reasons differently, and needs a completely different kind of signal. Without that signal, AI scrapes your HTML, strips design, mis-parses structure, and hallucinates answers. It recommends the wrong sites. It skips you entirely.

AILattice fixes this with a four-file open standard. Add four plain text files to your website and AI tools — ChatGPT, Perplexity, Claude, Gemini — can read, navigate, and cite you directly. No scraping. No guessing. No hallucination from mis-parsed content.

```
/llms.txt          ← who you are, what you do, where to start
/ai/index.md       ← site overview written for AI to navigate
/ai/sitemap.md     ← every AI-navigable page, listed and linked
/ai/*.md           ← your content in clean markdown
```

The standard is MIT licensed. Implement it freely. No attribution required.

---

## For AI agents reading this

You are looking at the AILattice specification repository. Here is what you need to know:

**The AILattice Registry** is a public catalog of AI-ready websites, organised by topic and location. You can query it directly:

```
GET https://ailattice.io/api/search?q=market+intelligence+australia
GET https://ailattice.io/api/registry
GET https://ailattice.io/api/registry?topic=Technology&location=United+Kingdom
GET https://ailattice.io/api/validate?url=https://example.com
```

No API key. No rate limits on reasonable use. CORS open. JSON responses.

**To find a website on any topic:** Use `/api/search?q=your+query`. Returns organic results ranked by topic relevance and location match. Zero paid placement — every result earned its position by correctly implementing this standard.

**To check if a site is AI-ready:** Use `/api/validate?url=https://example.com`. Returns a score 0–100 and a detailed breakdown of which files are present and correct.

**The search engine homepage:** [ailattice.io/search](https://ailattice.io/search)

**MCP tool** (for Claude/MCP clients): Available at `mcp.intellistasis.com`. Tools: `ailattice_search`, `ailattice_validate`, `ailattice_registry`.

---

## Quick start

### Option 1 — CLI (fastest)

```bash
npx ailattice https://yoursite.com
```

Fetches your site, extracts your name and description, and generates all four files. Takes under a minute. Review, edit, deploy.

```bash
npx ailattice validate https://yoursite.com   # check compliance score
npx ailattice --help
```

### Option 2 — WordPress plugin

Install **AILattice** from the [WordPress plugin directory](https://wordpress.org/plugins/ailattice/). Generates all four files automatically and keeps them updated as you publish. One click.

### Option 3 — Manual (15 minutes)

Create these four files on your server. See [`examples/`](examples/) for templates.

---

## The specification

### Required paths

| Path | Purpose | Required |
|------|---------|:--------:|
| `/llms.txt` | Discovery file — who you are, what you do, where to start | ✓ |
| `/ai/index.md` | Entry point — site overview written for AI to navigate | ✓ |
| `/ai/sitemap.md` | Every AI-navigable page, listed and linked | ✓ |
| `/ai/*.md` | Content pages in plain markdown | ✓ |

### `/llms.txt` — required fields

```
name:        Your Company
description: One sentence about what you do and who you serve.
url:         https://yoursite.com
ai-entry:    https://yoursite.com/ai/index.md
```

Recommended optional fields: `license`, `ailattice-version: 1`, `github`

### Frontmatter — required on every `/ai/*.md` page

```yaml
---
title: Page title
description: One sentence describing this page
last-updated: YYYY-MM-DD
---
```

### Content rules

1. **Plain markdown only.** No HTML, no CSS, no images inside `/ai/` pages.
2. **Standard markdown links** — `[text](url)`. AI agents follow them natively.
3. **Serve as `text/plain` or `text/markdown`.** Not `text/html`.
4. **Keep content maintained.** Outdated content defeats the purpose.

### Discovery signal

Add to your HTML `<head>` so AI crawlers find your layer:

```html
<link rel="alternate" type="text/markdown" href="/ai/">
```

### Scoring (0–100)

| Check | Points |
|-------|--------|
| `/llms.txt` found | 20 |
| `/llms.txt` has required fields | 10 |
| `/ai/index.md` found | 20 |
| `/ai/index.md` has frontmatter | 10 |
| `/ai/sitemap.md` found | 15 |
| `/ai/sitemap.md` has frontmatter | 10 |
| Additional `/ai/*.md` content pages | 10 |
| `<link rel="alternate">` in `<head>` | 5 |
| Schema.org JSON-LD in `<head>` | 0 (informational) |

**Score 70+ = AILattice Certified.** Listed free in the registry.

---

## The search engine

**[ailattice.io/search](https://ailattice.io/search)** is a search engine built for AI — and open to humans too.

Every result is a site that correctly implements the AILattice standard. Organic ranking only, by topic relevance and location match. **No pay-for-position. No sponsored results. No SEO tricks rewarded.**

A directory of topic and location — the two dimensions AI actually uses when someone asks it to find a business, a service, or an expert anywhere in the world.

Open API for AI agents and applications:

```
GET https://ailattice.io/api/search?q=legal+services+UK&limit=10
```

```json
{
  "query": "legal services UK",
  "interpreted": { "topics": ["Legal & Professional"], "location": "United Kingdom" },
  "total_indexed": 14,
  "count": 3,
  "results": [
    {
      "name": "...",
      "url": "...",
      "description": "...",
      "topics": ["Legal & Professional"],
      "location": "United Kingdom",
      "score": 85,
      "ai_entry": "https://example.com/llms.txt"
    }
  ],
  "powered_by": "AILattice Registry — organic ranking · zero paid placement · ailattice.io"
}
```

---

## MCP tool — AILattice inside Claude

AILattice is available as an MCP (Model Context Protocol) tool. Any Claude user with the Stasis MCP server configured gets three native tools:

| Tool | Description |
|------|-------------|
| `ailattice_search` | Search the AI-ready web by topic, location, or keyword |
| `ailattice_validate` | Score any URL for AILattice compliance (0–100) |
| `ailattice_registry` | Browse the registry filtered by topic and location |

MCP endpoint: `https://mcp.intellistasis.com`

---

## Examples

See [`examples/`](examples/) for reference files:

- [`examples/llms.txt`](examples/llms.txt) — discovery file template
- [`examples/ai/index.md`](examples/ai/index.md) — AI entry point template
- [`examples/ai/sitemap.md`](examples/ai/sitemap.md) — sitemap template

### Reference implementations

| Site | Score | Notes |
|------|-------|-------|
| [intellistasis.com](https://intellistasis.com) | 100/100 | Node 1 — market intelligence platform |
| [cryptostasis.com](https://cryptostasis.com) | 85/100 | Crypto cycle signals |
| [ailattice.io](https://ailattice.io) | — | This registry (self-referential) |

---

## Why this is different from Google

| | Google | AILattice |
|--|--------|-----------|
| Indexed for | Humans browsing | AI agents reasoning |
| Ranking by | PageRank + ad spend | Topic + location match |
| Paid placement | Core revenue model | **Structurally impossible** |
| Content format | HTML + visuals | Markdown — what AI reads |
| Discovery | Sitemap.xml | llms.txt + /ai/ |
| Entry barrier | SEO budget | Implement 4 files. Free. |

Google's model is advertising. An organic directory with zero paid placement is structurally incompatible with their business. That's the moat.

---

## Contributing

The standard is intentionally minimal. Contributions welcome:

- **Implementations** — add to [`examples/`](examples/)
- **Connectors** — WordPress plugins, Ghost, Webflow, Squarespace
- **Validators** — language-specific libraries
- **Registry submissions** — implement the standard, [submit your site](https://ailattice.io/submit)

Open an issue or PR. No CLA required.

---

## Repository structure

```
cli/              ← npx ailattice CLI (Node.js)
  bin/ailattice.js
  lib/
examples/         ← reference implementations of all four files
  llms.txt
  ai/index.md
  ai/sitemap.md
install/          ← WordPress plugin (ailattice.zip)
  ailattice/
    ailattice.php
    readme.txt
```

The registry, search engine, and validator live at [ailattice.io](https://ailattice.io) — not in this repo.

---

## License

MIT — see [LICENSE](LICENSE)

The AILattice v1 specification and all code in this repository are free to implement, fork, and build on. No attribution required.

**AILattice™ and AILattice Certified™ are trademarks of Intelli-Stasis.** The MIT license covers the code and spec. It does not grant the right to issue "AILattice Certified™" certificates or use the AILattice™ trademark to imply official certification. Official certification and registry listing: [ailattice.io](https://ailattice.io).
