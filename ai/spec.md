---
title: AILattice v1 — Full Specification
description: The complete AILattice specification. Four files, required frontmatter, link conventions.
last-updated: 2026-06-19
---

# AILattice v1 Specification

Version: 1.0
License: MIT
Status: Live

## Overview

A site is AILattice compliant when it serves four paths and follows the
content rules below. The standard is intentionally minimal — implementable
in an afternoon without new infrastructure.

## Required Paths

### /llms.txt

The discovery file. Served at the root. Plain text.

Required fields:
  name:        Site or organisation name
  description: One sentence about what the site does
  url:         Canonical URL
  ai-entry:    URL of /ai/index.md

Recommended fields:
  license:     Content license
  contact:     Contact email or URL

The file should also include 1-3 short paragraphs of plain-text description.
AI agents read this file first. Keep it factual and brief.

### /ai/index.md

The entry point for AI navigation. Markdown.

Required frontmatter:
  title:        Human-readable page title
  description:  One sentence describing the page
  last-updated: ISO date (YYYY-MM-DD)

Required content:
  - One paragraph describing the site
  - A list of links to other pages in /ai/

### /ai/sitemap.md

A flat list of all AI-navigable pages. Markdown.

Same frontmatter requirements as /ai/index.md.

Content: one link per line, with a short description. Example:
  - [/ai/api.md](/ai/api.md) — Full API reference
  - [/ai/pricing.md](/ai/pricing.md) — Pricing and tiers

### /ai/*.md

Content pages. Markdown.

Same frontmatter requirements as above (title, description, last-updated).
Content is free-form markdown. Use standard markdown links to other /ai/ pages.

## Content Rules

1. Format: plain text or markdown only. No HTML tags in content.
2. Links: use standard markdown links — [text](url). AI agents follow them.
3. Serving: Content-Type should be text/plain or text/markdown.
4. No images, no CSS, no JavaScript in /ai/ pages.
5. Keep content factual and maintained. Outdated content defeats the purpose.

## Discovery Signal

Add to HTML <head> to signal the AI layer to crawlers:
  <link rel="alternate" type="text/markdown" href="/ai/">

## Versioning

This is AILattice v1. Future versions will be backwards-compatible.
Version is declared in llms.txt as: ailattice-version: 1

## Reference Implementation

intellistasis.com implements AILattice v1 in full.
  /llms.txt:           https://intellistasis.com/llms.txt
  /ai/index.md:        https://intellistasis.com/ai/
  /ai/api.md:          https://intellistasis.com/ai/api.md
  /ai/markets.md:      https://intellistasis.com/ai/markets.md
  /ai/examples.md:     https://intellistasis.com/ai/examples.md
