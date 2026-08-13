# AILattice / Introduction Layer — Launch Kit
# Fire when W3C group goes active. Everything here is ready to go.

---

## 1. HACKER NEWS — Show HN post

**Title:**
Show HN: intro.txt – robots.txt tells crawlers what not to read, this tells AI who you are

**Body:**
robots.txt = what not to crawl
llms.txt = what to read
intro.txt = who I am

That's the gap. AI agents have no standard way to know what an entity actually is, what it stands for, or what it will never do. They infer it from scraped content, which means they're always guessing.

The Introduction Layer is an open standard that fixes this. Drop a plain-text file at /intro.txt and any conforming AI agent reads your identity, mission, constraints, and what you're not — before doing anything else with your site.

The spec covers two paths:
- Easy: /intro.txt (plain text, works on any host, no code required)
- Correct: compile a constitution file and serve it at GET /constitution (application/constitution+json)

What's live:
- Full RFC-style specification (15 sections, 8 design principles): ailattice.io/paper
- W3C Introduction Layer Community Group: w3.org/community/intro-layer/
- Reference implementation + registry: ailattice.io
- Developer hub with quickstart, API docs, conformance tests: ailattice.io/developers
- Open source: github.com/madazz01/AILattice (Apache 2.0 + CC BY 4.0)
- Conformance test suite: 16 tests across 5 categories, open for any implementation to use

The standard is governed by the W3C community group — no single entity including us can unilaterally change it.

Happy to answer questions about the spec design, the conformance model, or why we went to W3C rather than just publishing a draft.

---

## 2. PRODUCT HUNT listing

**Name:** AILattice

**Tagline:** The open standard that tells AI who you are

**Description:**
AI agents are reading the web — but they have no standard way to know who they're actually talking to. They guess from scraped content, which means they're always making assumptions about your identity, your constraints, and what you stand for.

The Introduction Layer fixes that. Drop intro.txt at your site root — a plain-text file that declares your name, mission, principles, constraints, and what you're not. Any conforming AI agent reads it before doing anything else.

Two minutes to implement. Works on any host, any stack, no code required.

**What's included:**
→ The open standard — specified, W3C-governed, CC BY 4.0
→ A public registry of certified sites — free to list
→ A reference implementation — open source, Apache 2.0
→ A conformance test suite — open for anyone to use
→ A developer hub — quickstart, API docs, ecosystem guide

The standard is open. The registry is free. Build on it.

**First comment (post as maker):**
Hey HN — maker here. Happy to go deep on any part of this.

The design question I get asked most: why a new file instead of extending robots.txt or llms.txt?

robots.txt answers "what can you touch?" — it's a permission layer.
llms.txt answers "what should you read?" — it's a navigation layer.
intro.txt answers "who am I?" — it's an identity layer.

They're complementary, not competing. A site can have all three. intro.txt is the one that was missing.

The spec took the hardest design constraint seriously: constraints must be prohibitions, not aspirations. "We will never sell user data" is a constraint. "We prioritise user privacy" is not. That distinction matters a lot when an AI agent is deciding what actions are in-bounds.

Links in comments: spec, GitHub, conformance tests, dev portal.

---

## 3. REDDIT — r/webdev

**Title:**
We built intro.txt — like robots.txt but tells AI agents who you are, not just what not to read

**Body:**
Quick background: AI agents and crawlers are reading the web constantly now. robots.txt tells them what not to touch. llms.txt (from fast.ai) tells them what to read. But there's no standard for telling them *who you actually are*.

That's the gap intro.txt fills.

Drop a plain text file at yourdomain.com/intro.txt with your name, mission, constraints (things you will *never* do), and what you're not. Any conforming AI agent reads it before reasoning about your site.

Example:

```
name:           Acme Corp
canonical_url:  https://acme.com
category:       SaaS / Project Management
mission:        Help teams ship software without the chaos.

constraints:
  - Will never sell user data to third parties
  - Will never lock exported data in proprietary formats

what_this_is_not:
  - Not a replacement for version control
  - Not a reporting tool for executives
```

It's an open standard — W3C Introduction Layer Community Group — Apache 2.0 reference implementation, open conformance tests.

Two minutes to implement. Works on any host. No code required for the basic version.

Full spec: ailattice.io/paper
Dev quickstart: ailattice.io/developers
GitHub: github.com/madazz01/AILattice

Happy to answer questions.

---

## 4. REDDIT — r/MachineLearning

**Title:**
The Introduction Layer: W3C standard for entity identity declaration to AI agents

**Body:**
AI agents reasoning about an entity — a company, a person, a service — have no authoritative source for who that entity is, what it stands for, and what constraints apply to interactions with it. They infer from scraped content, which is uncontrolled and often wrong.

The Introduction Layer is an open standard that gives AI agents a machine-native cognitive entrypoint before domain-specific reasoning begins.

**The architecture in brief:**

A constitution declares:
- Identity (name, canonical address, category)
- Mission and core belief
- Principles (ordered, governing)
- Constraints (explicit prohibitions — must be stated as "will never X", not aspirational)
- what_this_is_not (disambiguation)
- Evaluation criteria (for Evaluator conformance)

A conforming consuming system retrieves the constitution at step 1, before any entity-specific reasoning, tool invocation, or action planning. This is the cognitive entrypoint requirement (conformance test C4.1).

**Two discovery paths:**
- /intro.txt — plain text authoring format, zero friction
- GET /constitution → application/constitution+json — machine-native, compiled

**Evidence Coverage** is the formal property that measures how well a set of evidence grounds the claims in a constitution. Four formal properties: monotonicity in evidence, monotonicity in ambition, reproducibility (±5 points), independence of generation and evaluation.

**What's published:**
- Full RFC-style specification: ailattice.io/paper
- W3C Community Group: w3.org/community/intro-layer/
- Conformance test suite (16 tests, 5 categories): github.com/madazz01/AILattice/conformance
- Reference implementation: ailattice.io

The spec design was influenced by the same architectural gap identified independently by EvoHarness-RL (Meta AI + UIUC, arXiv:2608.05446), Eywa (UIUC, arXiv:2604.27351), and Wang et al. — none proposed a universal declaration standard. We did.

---

## 5. REDDIT — r/artificial OR r/ChatGPT

**Title:**
There's no standard for telling AI who you are — we built one

**Body:**
When ChatGPT, Claude, Gemini or any AI agent browses your website, it has no way to know who you actually are. It reads your homepage and makes inferences — which are often wrong or incomplete.

We built intro.txt to fix that.

It's a plain text file you drop at your site root. It tells AI agents:
- Who you are
- What you stand for
- What you will never do
- What you're not (to prevent misclassification)

It's like a first handshake between your organisation and any AI that touches your site.

The standard is open, W3C-governed, and free to implement. The registry listing is free. Two minutes to add intro.txt to any site.

Check if your site is AI-ready: ailattice.io
Full spec: ailattice.io/paper

---

## 6. X / TWITTER — Launch thread

**Tweet 1:**
The W3C Introduction Layer Community Group is now officially active.

robots.txt = what not to crawl
llms.txt = what to read
intro.txt = who I am

The missing file for the AI age. Open standard. W3C governed. Free to implement.

ailattice.io

**Tweet 2:**
What intro.txt actually does:

AI agents read your site and make assumptions about who you are. Often wrong. Always uncontrolled.

intro.txt gives them the authoritative version — your mission, your principles, your constraints (things you will NEVER do), and what you're not.

Before any reasoning. Before any action.

**Tweet 3:**
Two paths to implement:

Easy → drop /intro.txt at your site root. Plain text. Any host. 2 minutes.

Correct → compile a constitution, serve at GET /constitution (application/constitution+json). Full cognitive entrypoint for AI agents.

Both are in the spec. Both count.

**Tweet 4:**
What's live:

→ Full specification (15 sections, RFC-style): ailattice.io/paper
→ W3C group: w3.org/community/intro-layer/  
→ Reference implementation + registry: ailattice.io
→ Developer hub + conformance tests: ailattice.io/developers
→ Open source: github.com/madazz01/AILattice

The standard is open. The registry is free.

**Tweet 5:**
Three independent research teams published work this year addressing the same gap — none proposed a universal standard.

The W3C group has [X] members and is growing.

If you build on standards, this one is worth knowing about.

---

## 7. LINKEDIN — Launch post

The W3C Introduction Layer Community Group is now officially active.

Here's what we've been building for the past year:

robots.txt tells AI crawlers what not to touch.
llms.txt tells them what to read.
Neither tells them who you are.

That's the gap. The Introduction Layer fills it.

A single plain-text file at /intro.txt gives any AI agent the authoritative version of your identity, mission, constraints, and what you're not — before it starts reasoning about you. Two minutes to implement. Works on any site, any stack.

The harder part was making it a standard that no single company controls.

That's what the W3C community group is for. The spec is CC BY 4.0. The reference implementation is Apache 2.0 with full patent grant. No entity — including us — can lock this down.

What's live:
• Full RFC-style specification: ailattice.io/paper
• Developer hub: ailattice.io/developers  
• Public registry: ailattice.io/registry
• GitHub: github.com/madazz01/AILattice

Three independent research teams published papers this year identifying the same architectural gap. The window is open. The standard is here.

If your organisation is building AI systems that interact with external entities, this is worth 10 minutes of your time.

#AI #WebStandards #OpenSource #W3C #ArtificialIntelligence

---

## 8. DEV.TO article

**Title:** intro.txt — The Missing File Your Website Needs for the AI Age

**Tags:** ai, webdev, opensource, standards

**Body:**

You probably know about robots.txt. You might know about llms.txt. But there's a third file your site is missing — and it's the most important one for how AI agents understand who you are.

### The problem

AI agents are reading the web constantly. When one visits your site, it has no authoritative source for:
- Who you actually are
- What your organisation stands for
- What you will never do
- What you're not (to prevent misclassification)

It infers all of this from your homepage content. Which means it's always guessing.

### The three files

| File | Answers |
|------|---------|
| robots.txt | What can you touch? |
| llms.txt | What should you read? |
| intro.txt | Who am I? |

They're complementary. A site should eventually have all three. intro.txt is the one that's been missing.

### What intro.txt looks like

```
# intro.txt — Introduction Layer declaration
# Spec: https://ailattice.io/paper

name:           Acme Corp
canonical_url:  https://acme.com
category:       SaaS / Project Management
mission:        Help teams ship software without the chaos.
core_belief:    Good tooling gets out of your way.

principles:
  - Clarity over completeness
  - Speed is a feature
  - The team is the product

constraints:
  - Will never sell user data to third parties
  - Will never lock exported data in proprietary formats
  - Will never charge for data export

what_this_is_not:
  - Not a replacement for version control
  - Not a reporting tool for executives
```

Drop it at yourdomain.com/intro.txt. That's it.

### The key design decision: constraints are prohibitions

The spec is strict about one thing: constraints must be explicit prohibitions, not aspirational language.

✅ "Will never sell user data to third parties"
❌ "We prioritise user privacy"

The first is actionable. An AI agent can check whether a proposed action violates it. The second is vague enough to mean anything.

### Two paths to conformance

**Easy path (2 minutes):**
Drop /intro.txt at your site root. Plain text. Works on any host, any stack, no code required.

**Correct path (full implementation):**
Compile a constitution and serve it at `GET /constitution` with `Content-Type: application/constitution+json`. This is the machine-native cognitive entrypoint — a conforming AI agent retrieves it before any entity-specific reasoning begins.

Both paths are in the spec. You can start with intro.txt and upgrade later.

### It's a W3C standard

The Introduction Layer is governed by the W3C Introduction Layer Community Group — not by us. The spec is CC BY 4.0. The reference implementation (AILattice) is Apache 2.0 with full patent grant.

No single entity can lock this down. That's by design.

### What's available

- **Full specification** (15 sections, RFC-style): [ailattice.io/paper](https://ailattice.io/paper)
- **Developer hub** with quickstart, API docs, conformance tests: [ailattice.io/developers](https://ailattice.io/developers)
- **Public registry** of certified sites: [ailattice.io/registry](https://ailattice.io/registry)
- **GitHub** (Apache 2.0): [github.com/madazz01/AILattice](https://github.com/madazz01/AILattice)
- **Conformance test suite** (16 tests, open): [/conformance](https://github.com/madazz01/AILattice/tree/main/conformance)

### Add your site

The registry listing is free. The standard is free. The conformance tests are open.

Add intro.txt to your site and [submit it to the registry](https://ailattice.io/dashboard) — takes under 3 minutes.

---

## 9. OUTREACH EMAIL — sites to add intro.txt

**Subject:** intro.txt for [Site name] — 2 minutes, free

Hi [Name],

I'm reaching out because [Site name] is exactly the kind of organisation the Introduction Layer was designed for.

Short version: AI agents are reading the web and guessing who they're talking to. intro.txt gives them the authoritative version — your mission, your constraints, what you're not. Two minutes to add. No code required.

It's an open W3C standard (CC BY 4.0). The registry listing is free.

Spec: ailattice.io/paper
Quickstart: ailattice.io/developers

If you'd like to be listed in the public registry as an early adopter I'm happy to help generate your intro.txt file — just reply with a few sentences about what your organisation does and what it will never do.

Bryan Horsfield
Intelli-Stasis / AILattice
ailattice.io

---

## 10. PRESS OUTREACH — journalist template

**Subject:** W3C launches open standard for AI-readable websites — for your consideration

Hi [Name],

I'm writing because you cover [AI / web standards / open source] and this may be relevant to your readers.

The W3C Introduction Layer Community Group officially launched this week. It defines a standard for how any website or organisation declares its identity, constraints, and governing intent to AI agents — before those agents start reasoning about them.

The short version: robots.txt tells crawlers what not to touch. llms.txt tells AI what to read. intro.txt (the Introduction Layer) tells AI who you are. It's the file that's been missing.

Three independent research teams published papers this year identifying the same architectural gap. None proposed a universal standard. This one is W3C-governed, open source (Apache 2.0 + CC BY 4.0), and has a working reference implementation and public registry live at ailattice.io.

Happy to provide more detail, a briefing call, or access to the full specification.

Bryan Horsfield
Chair, W3C Introduction Layer Community Group
bryan@intellistasis.com
ailattice.io

---

## PRESS TARGET LIST

**AI/tech publications:**
- The Register (webdev + standards audience)
- Ars Technica (technical depth, open standards coverage)
- VentureBeat (AI infrastructure angle)
- TechCrunch (startup + open source)
- The Verge (broader AI audience)
- Wired (the big picture angle)

**Developer-focused:**
- InfoQ (standards + architecture)
- The New Stack (open source infrastructure)
- Dev.to newsletter (developer community)
- Smashing Magazine (webdev audience)

**AI specialist:**
- Import AI (Jack Clark's newsletter — technical AI audience)
- The Batch (Andrew Ng — AI practitioner audience)
- TheSequence (ML/AI practitioner)

**Standards/governance:**
- W3C blog (they announce new community groups — ask them to feature it)
- Standards bodies newsletters

---

## TIMING — when to fire

Trigger: W3C group reaches 5 supporters and goes active.

Day 1:
- X/Twitter thread
- LinkedIn post
- Submit to Product Hunt (schedule for 12:01am PST)

Day 2:
- Dev.to article goes live
- Begin HN karma building comments if not ready to post yet
- Start outreach emails (10/day)

Day 3-5:
- arXiv submission goes in
- HN post (Show HN) when karma ready OR ask a supporter to post it

Week 2:
- Press outreach (5 journalists)
- Reddit posts (space them out across subreddits, don't post all same day)

---

*All links should be updated on the day to reflect live W3C group URL once active.*
