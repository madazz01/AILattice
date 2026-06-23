---
title: AILattice — AI Sitemap
description: All AI-navigable pages on ailattice.io — the invisible web directory and first AI search engine.
last-updated: 2026-06-23
---

# AILattice — AI Sitemap

## Core AI pages

- [/ai/index.md](https://ailattice.io/ai/index.md) — Overview, mission, the invisible web concept
- [/ai/sitemap.md](https://ailattice.io/ai/sitemap.md) — This file
- [/ai/spec.md](https://ailattice.io/ai/spec.md) — Full AILattice v1 specification (rules, file formats, frontmatter)

## Main pages

- [Home](https://ailattice.io/) — Landing page: the invisible web, the AI search engine
- [Search](https://ailattice.io/search) — AI-first search engine — organic ranking by topic and location
- [Submit your site](https://ailattice.io/submit) — Free registry submission (score 70+ required)
- [Validator](https://ailattice.io/validate) — Check any website's AI readiness score (0-100)
- [Registry](https://ailattice.io/registry) — Browse all listed sites by topic and location
- [Convert](https://ailattice.io/convert) — Generate AILattice files for your website

## Open APIs (no key required)

- Search: `GET https://ailattice.io/api/search?q=query` — Search the AI-ready web
- Registry: `GET https://ailattice.io/api/registry` — All listed sites as JSON
- Registry filtered: `GET https://ailattice.io/api/registry?topic=Technology&location=Australia`
- Topics: `GET https://ailattice.io/api/registry/topics` — Topic distribution across registry
- Validate: `GET https://ailattice.io/api/validate?url=https://example.com` — Score any URL
- Certificate: `GET https://ailattice.io/api/cert/:id` — Verify a certificate

## What makes a site AI-ready

A site scores 70+ (certified) when it has:
- `/llms.txt` with required fields (name, description, url, ai-entry)
- `/ai/index.md` with valid frontmatter
- `/ai/sitemap.md` with valid frontmatter
- At least one additional `/ai/*.md` content page
- Optional: Schema.org JSON-LD in HTML head
- Optional: `<link rel="alternate" type="text/markdown" href="/ai/">` in HTML head
