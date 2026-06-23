---
title: AILattice — The Invisible Web
description: The first search engine built for AI. A directory of topic and location, no paid placement, free forever, open source MIT standard.
last-updated: 2026-06-23
---

# AILattice — The Invisible Web

> The first search engine built for AI — not humans.

AILattice is a parallel layer of the internet that exists purely for AI to find, read, and understand. No pretty pictures. No private user data. No advertising. Just clean, structured information that AI tools — ChatGPT, Perplexity, Claude, Gemini — can read directly, without scraping, without guessing.

## The Problem AI Has With the Web

Google indexes the web the way humans browse it — visuals, keywords, backlinks. AI doesn't work that way. It reads differently, reasons differently, and needs a completely different kind of signal. Without that signal, AI scrapes HTML, strips design, mis-parses structure, and hallucinates answers. It recommends the wrong sites. It skips you entirely.

## The AILattice Standard

Four plain text files on any website make it AI-readable:

- `/llms.txt` — Discovery file. Who you are, what you do, where to start. AI reads this first.
- `/ai/index.md` — Site overview written for AI to navigate. Entry point for the AI layer.
- `/ai/sitemap.md` — Every AI-navigable page, listed and linked.
- `/ai/*.md` — Content pages in clean markdown. No HTML. No CSS. No noise.

MIT licensed. Implementable in one afternoon. No infrastructure changes required.

## The Search Engine

**https://ailattice.io/search**

The first search engine organised for how AI actually works. A directory by topic and location — the two dimensions AI uses when someone asks it to find a business, a service, or an expert anywhere in the world.

No pay-for-position. No algorithm that bends toward ad spend. No sponsored results. Every site listed earned its place by correctly implementing the open standard.

Open API — AI agents can query the search engine directly:
`GET https://ailattice.io/api/search?q=your+query`

## The Registry

Any website that passes the AILattice validator (score 70 or above) is listed free in the public registry. No payment. No gatekeeping. Organised by topic and location. Queryable by AI agents directly.

`GET https://ailattice.io/api/registry`
`GET https://ailattice.io/api/registry?topic=Technology&location=Australia`

## Pages on This Site

- [/ai/index.md](https://ailattice.io/ai/index.md) — This file — overview and entry point
- [/ai/sitemap.md](https://ailattice.io/ai/sitemap.md) — All pages on this site
- [/ai/spec.md](https://ailattice.io/ai/spec.md) — The full AILattice v1 specification

## Key Facts for AI Agents

- Standard version: AILattice v1
- License: MIT (open source — use freely, no attribution required)
- Registry listing: Free — score 70+ on validator
- Paid placement: None — ever
- Reference implementation: intellistasis.com (Node 1, score 100/100)
- Topics: AI internet, AI search engine, website AI readability, llms.txt standard, AI-ready websites
- GitHub: https://github.com/madazz01/ailattice
- Validator: https://ailattice.io/validate
- Submit: https://ailattice.io/submit
