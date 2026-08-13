# Contributing to AILattice and the Introduction Layer

Welcome. This repository contains two things you can contribute to:

1. **The Introduction Layer specification** — the open standard
2. **The AILattice reference implementation** — the open source registry and certification platform

Both are open. Both welcome contributions. The processes are slightly different.

---

## Contributing to the Specification

The Introduction Layer specification (`drafts/specification.md`) is governed by the
W3C Introduction Layer Community Group. It is licensed CC BY 4.0.

**To propose a change to the specification:**
1. Join the W3C Introduction Layer Community Group: https://www.w3.org/community/groups/proposed/#intro-layer
2. Open a GitHub Issue describing the proposed change and your reasoning
3. The community group reviews and discusses
4. Accepted changes are incorporated into the next draft version

Specification changes require community consensus — no single contributor, including
the original author, can unilaterally modify the standard. This is by design.

**What belongs in the specification:**
- Architectural requirements and their rationale
- Conformance requirements (MUST/SHOULD/MAY)
- Formal definitions and their properties
- Discovery and representation standards

**What does not belong in the specification:**
- Implementation details
- Commercial terms
- Technology-specific guidance

---

## Contributing to the Reference Implementation

The AILattice reference implementation is licensed Apache 2.0.

**What we welcome:**
- Bug fixes
- Performance improvements
- New constitution generators (additional entity types)
- Integrations (CMS plugins, framework adapters, CI/CD tools)
- Conformance test improvements
- Documentation improvements
- Translations

**How to contribute:**
1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Ensure your changes pass the conformance tests in `/conformance`
5. Open a pull request with a clear description of what you've built and why

**Contribution licence agreement:**
By submitting a pull request you confirm that your contribution is your own work
and that you licence it under the same terms as the repository (Apache 2.0 for code,
CC BY 4.0 for specification content). You retain copyright. The Apache 2.0 patent
grant applies.

---

## Building On Top of AILattice

You don't need to contribute to this repo to build on the Introduction Layer.
The standard is open and the reference implementation is open source.

Things the community is encouraged to build:
- **CMS plugins** — WordPress, Ghost, Webflow, Squarespace intro.txt generators
- **Framework integrations** — Next.js, Nuxt, Astro, Django, Rails helpers
- **Hosting integrations** — Cloudflare Workers, Vercel, Netlify one-click setup
- **CI/CD tools** — GitHub Actions that validate intro.txt on commit
- **Harness integrations** — LangChain, LlamaIndex, CrewAI constitution loaders
- **Alternative registries** — Conformant registries serving specific domains or regions
- **Verification tools** — Evidence Coverage calculators, constitution validators
- **Evaluator implementations** — Conformant evaluators for specific use cases

If you build something useful, open a PR to add it to the ecosystem directory below.

---

## Ecosystem Directory

*Community-built tools and integrations. Submit yours via pull request.*

| Name | Type | Description | Link |
|------|------|-------------|------|
| — | — | Be the first | — |

---

## Code of Conduct

This project follows the W3C Code of Ethics and Professional Conduct.
Be direct. Be constructive. Assume good faith.

The goal is a standard that belongs to everyone and serves the open web.
That goal is more important than any individual contribution or opinion.

---

## Questions

Open a GitHub Issue for technical questions.
For specification governance questions, use the W3C community group.
For certification and AILattice platform questions: contact@ailattice.io
