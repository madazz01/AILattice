# The Introduction Layer: Specification
**Document type:** Architectural Specification  
**Status:** Draft 0.2  
**Date:** 2026-06-30  
**Author:** Bryan Horsfield · Intelli-Stasis · intellistasis.com  
**Licence:** Creative Commons Attribution 4.0 International (CC BY 4.0)  
**Governance:** W3C Introduction Layer Community Group  
**Repository:** github.com/intelli-stasis/ailattice

---

## Why This Specification Exists

Human-readable information systems evolved for human consumers. HTML, CSS, and the document-centric web were designed to render meaning for minds capable of inference, context, and judgment.

Machine-readable systems — APIs, structured data, protocol specifications — evolved for deterministic software: systems that execute defined operations on well-specified inputs.

Autonomous reasoning systems fit neither category. They read language, but they are not human. They execute instructions, but they are not deterministic. They reason about entities they have never encountered, in domains they were not specifically trained for, and take actions whose consequences extend into physical reality.

Neither existing architecture was designed to serve them. The human-readable web gives them content to process but no frame within which to interpret it. Machine-readable protocols give them structure but not meaning. What neither provides is what autonomous reasoning systems most require: permanent introduction — a declaration from the entities they interact with that survives system boundaries, precedes reasoning, and remains stable across every session and every system that encounters it.

This specification proposes the missing architectural layer.

---

## Abstract

This document specifies The Introduction Layer: a persistent architectural layer that preserves governing intent across heterogeneous system boundaries, enabling consuming systems to inherit rather than infer the identity, constraints, and purpose of the entities they interact with.

This specification does not propose a new AI model, programming language, transport protocol, or data format. It proposes an architectural layer intended to sit between information producers and consuming systems, independent of the technologies on either side.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

This specification defines:

- The problem the architecture addresses
- The invariant the architecture derives from
- The design principles that generated the architecture
- The components a conforming implementation MUST include
- The interfaces between those components
- The guarantees a conforming implementation provides
- The explicit scope boundaries of the architecture

This specification does not prescribe implementation technology, generation method, transport protocol, registry design, or application-layer systems built on top of a conforming implementation.

---

## 1. The Translation Cost Problem

### 1.1 Statement

Every boundary in an information system discards context. At each crossing, the consuming system receives what the transfer format was designed to carry — data, content, structure — and loses what it was never designed to carry: governing intent, constraints, and the interpretive frame within which transferred information should be understood.

This loss is structural, not incidental. It cannot be eliminated by improving the content layer or the context layer alone.

### 1.2 Formal characterisation

Let *B(p, c)* denote a boundary between producer *p* and consuming system *c*.  
Let *I(p)* denote the full governing intent of *p*.  
Let *T(B)* denote the information transferred across *B*.

For all current information system boundaries:

**I(p) ⊄ T(B)**

Governing intent is not a subset of transferred information. The consuming system must reconstruct *I(p)* — or a proxy for it — from *T(B)* alone. This reconstruction is inference. Its cost and error rate scale with the gap between *I(p)* and *T(B)*.

### 1.3 Consequence

A consuming system operating from inferred governing intent cannot:

- Know the reliability of its own model of the entity
- Detect constraint violations it was unaware of
- Provide consistent output across sessions
- Guarantee alignment with the entity's actual purpose

These limitations are not correctable by improving the inference mechanism. They are properties of inference as an epistemic starting point. The Introduction Layer addresses them at the structural level by making intent a first-class carrier across system boundaries.

---

## 2. The Invariant

**The foundational introduction layer, that allows universal forward integration.**

All definitions, requirements, and guarantees in this specification derive from this statement. Implementations MUST be evaluable against it.

---

## 3. Design Principles

The following principles are the philosophical invariants that generated this architecture. They are not implementation requirements — they are the reasoning from which all requirements in this specification derive. Where two requirements appear to conflict, these principles provide the resolution.

**P.1 — Intent precedes reasoning.**  
A consuming system SHOULD inherit the governing intent of an entity before domain-specific reasoning begins. Reasoning conducted without an inherited frame is inference by default. Inference is a fallback mode, not the preferred mode.

**P.2 — Generation and governance are separate concerns.**  
The system that produces an introduction and the system that evaluates conformance to it MUST be architecturally separate. A system cannot reliably govern its own outputs.

**P.3 — Reality has authority over generated output.**  
When a generated declaration conflicts with observable reality, observable reality takes precedence. Evidence Coverage exists to enforce this principle: claims must be traceable to what is actually true of the entity, not only to what the generation system produced.

**P.4 — Translation cost is a structural problem requiring a structural solution.**  
Translation cost cannot be adequately compensated for by better inference algorithms, larger models, or richer retrieval. It requires a persistent layer that carries intent across boundaries — not a more sophisticated reconstruction of intent at each boundary.

**P.5 — The entity controls the frame.**  
The entity, not the consuming system, controls the cognitive frame within which the entity is reasoned about. A consuming system MAY decline to act on a low-quality frame; it MUST NOT substitute its own inferred frame for a declared one without disclosure.

**P.6 — Complexity is absorbed into the architecture, not exposed to consumers.**  
The mechanisms of coverage verification, evaluator governance, and cognitive entrypoint sequencing are the architecture's concern. A consuming system that correctly calls a conforming implementation SHOULD NOT need to understand the internal mechanics to benefit from the guarantees the architecture provides.

**P.7 — Forward integration requires establishment before the consuming systems it serves are built.**  
An introduction layer established after autonomous consuming systems have already formed their interpretive assumptions provides backward integration only. Forward integration — the ability of future systems to inherit intent from entities that pre-date them — requires the layer to exist first.

**P.8 — Relevance precedes representation.**  
An introduction layer does not preserve all information about an entity equally. It preserves the information that most materially affects how a consuming system should reason about and act on behalf of the entity. Context is everything available about an entity. Relevance is everything that changes the interpretation. The constitution is the highest-relevance set — the minimum sufficient information that governs understanding of what the entity fundamentally is and what it must never do. Information that does not change the outcome does not belong in the frame.

---

## 4. Terminology

**introduction layer**  
The architectural layer that sits between information producers and consuming systems. Its function is to carry governing intent — not content, not context — across system boundaries in a form consuming systems can inherit before reasoning begins.

**Entity**  
Any information-producing subject capable of declaring governing intent. Entities include but are not limited to: websites, software systems, physical facilities, IoT devices, machines, organisations, and any other subject with a stable identity and persistent governing purpose.

**Consuming system**  
Any system that reasons about or acts on information from an entity it was not designed to work with. Consuming systems include but are not limited to: AI agents, autonomous machines, robotic systems, logistics platforms, decision engines, and any future system class not yet defined.

**Translation cost**  
The accumulated effort and error introduced when a consuming system must reconstruct governing intent from fragments at a system boundary. Translation cost is structural: it arises at every boundary where intent is not explicitly carried.

**Inference**  
The epistemic mode in which a consuming system constructs a model of an entity from available fragments. The resulting model is the consuming system's reconstruction — non-authoritative, probabilistic, and unverifiable against the entity's actual intent.

**Inheritance**  
The epistemic mode in which a consuming system receives a declared cognitive frame from the entity before reasoning begins. The received frame is the entity's own declaration — authoritative by construction, evidence-verifiable, and persistent.

**Constitution**  
The primary artefact of The Introduction Layer. A structured, entity-controlled, evidence-grounded declaration of an entity's governing intent. A constitution is the mechanism through which inheritance becomes possible.

**Evidence Coverage (EC)**  
The quantitative metric that measures what fraction of a constitution's claims are grounded in observable evidence from the entity. Evidence Coverage is the governance metric of The Introduction Layer.

**Evaluator**  
The component that validates outputs of a consuming system against a constitution. The Evaluator is the enforcement mechanism of The Introduction Layer.

**Cognitive entrypoint**  
The point in a consuming system's reasoning sequence at which the constitution is inherited. The cognitive entrypoint MUST precede all domain-specific reasoning.

**Forward integration**  
The capability of a consuming system not yet built to inherit a reliable cognitive frame from an entity that declared its constitution before the consuming system existed. Forward integration is the primary consequence of a conforming introduction layer implementation.

**Certification**  
The process by which a constitution is validated as meeting this specification's requirements and made available for inheritance by consuming systems.

**Registry**  
A system that stores certified constitutions and makes them discoverable and retrievable by consuming systems. Registry design is outside the scope of this specification; conformance requirements for registries are defined in Section 10.

---

## 5. Architecture

### 5.1 Three-layer model

A conforming introduction layer implementation treats AI-readable information about any entity as three distinct layers:

**Layer 1 — Content**  
What a consuming system reads. Includes: web pages, structured data, sensor streams, API responses, documentation, and any other machine-readable representation of what an entity contains or offers. Existing standards (Schema.org, llms.txt, sitemaps, OPC-UA, WoT Thing Descriptions) operate at this layer.

**Layer 2 — Context**  
What a consuming system retrieves in response to a specific task. Includes: RAG outputs, vector search results, tool call responses, knowledge base lookups. Session-scoped and query-dependent. Controlled by the consuming system.

**Layer 3 — Intent**  
What a consuming system inherits before reasoning begins. Contains: the entity's declared purpose, governing philosophy, operating principles, hard constraints, and explicit disambiguation. Persistent across sessions and systems. Controlled by the entity. This layer is The Introduction Layer.

**Required property:** Layers 1 and 2 MUST NOT substitute for Layer 3. A system implementing only Layers 1 and 2 is not conformant. A conforming implementation MUST provide a mechanism for Layer 3 to be declared, verified, and inherited.

### 5.2 Component architecture

A conforming implementation MUST include the following components:

```
Entity
  │
  │ declares
  ▼
Constitution ◄──── Evidence Coverage (verifies)
  │
  │ certified
  ▼
Registry / Distribution
  │
  │ retrieved at cognitive entrypoint
  ▼
Consuming System
  │
  │ produces output
  ▼
Evaluator ──► verdict (proceed / flag / reject)
```

**The four required components are:**
1. The Constitution (Section 6)
2. Evidence Coverage (Section 7)
3. The Evaluator (Section 8)
4. The Cognitive Entrypoint (Section 9)

### 5.3 Separation requirements

The following separations are REQUIRED and MUST NOT be collapsed:

**Generation / governance separation:** The system that generates a constitution MUST NOT be the same system that certifies it. Independent evaluation (P4, Section 7.3) is a hard requirement, not a preference. This derives from Design Principle P.2.

**Entity / consuming system separation:** The entity controls its constitution. The consuming system does not modify, override, or reinterpret the constitution prior to inheritance. A consuming system MAY decline to act on a low-coverage constitution; it MUST NOT alter its content. This derives from Design Principle P.5.

**Intent / inference separation:** A conforming consuming system MUST distinguish between inherited introductions and inferred models. It MUST NOT treat an inferred model as equivalent to an inherited constitution. This derives from Design Principle P.1.

### 5.4 The Domain Extension Architecture

The three-layer model (Section 5.1) describes how information flows between entities and consuming systems. This section describes how the introduction layer is designed to support domain specialisation above it, without compromising its universality below.

#### 5.4.1 The constitutional layer as a universal floor

The introduction layer specifies the minimum sufficient constitutional parameters that any entity in any domain must declare. This minimalism is structural, not incidental. A standard that requires healthcare-specific fields cannot be adopted by logistics systems. A standard that requires financial regulatory fields cannot be adopted by consumer applications. A standard that requires any domain-specific field cannot be universal.

The introduction layer therefore defines the smallest constitutional set that materially changes how a consuming system reasons about any entity — and stops there by design. Above that floor, domain systems introduce their own requirements. A healthcare AI adds clinical governance constraints. A financial compliance system adds regulatory parameters. An autonomous recovery system adds operational integrity protocols. These additions are not exceptions to the constitutional layer. They are the designed space above it.

Design Principle P.8 already implies this: the constitution is the highest-relevance minimum sufficient set. It follows that everything beyond the minimum sufficient set belongs above the constitutional layer, not within it.

#### 5.4.2 The open/closed boundary

The architectural consequence is a clean boundary between what this specification governs and what domain implementers own:

```
┌─────────────────────────────────────────────────────────────┐
│  Domain Extension Layer                                     │
│  Proprietary · Evolving · Domain-specific                   │
│                                                             │
│  Clinical governance fields · Regulatory parameters ·       │
│  Operational recovery protocols · Industry constraints ·    │
│  Any domain-specific governance the implementer requires    │
│                                                             │
│  MUST NOT weaken constitutional constraints below.          │
│  MAY add constraints beyond the constitutional minimum.     │
│  Otherwise unconstrained by this specification.             │
│                                                             │
├─────────────────────────────────────────────────────────────┤  ← This specification
│  Constitutional Layer — The Introduction Layer              │
│  Open standard · Stable · Universal                         │
│                                                             │
│  Identity · Mission · Core belief · Operating principles ·  │
│  Constraints · Disambiguation · Evaluation criteria         │
│                                                             │
│  Fully specified by this document.                          │
└─────────────────────────────────────────────────────────────┘
```

Everything below the boundary is this specification. Everything above it is implementation freedom — and the designed location of proprietary domain value.

This boundary is where the standard becomes an ecosystem. Two systems built by different organisations on the same constitutional foundation can exchange constitutional frames without prior negotiation. Their domain extensions may be entirely incompatible. Their constitutional frames are not. The standard enables interoperability at the foundation precisely because it does not prescribe what sits above it.

#### 5.4.3 Constitutional continuity during operational evolution

A frequently asked architectural question is: how is constitutional continuity preserved when the operational systems above it evolve continuously?

The answer is structural separation, not runtime enforcement.

The constitutional layer does not evolve on operational timescales. It changes only when an entity's fundamental governing intent changes — which is rare by design (see Section 6.4, Stability requirement). Domain layers evolve continuously. Operational state changes on every interaction. Neither evolution propagates downward into the constitutional layer.

A consuming system that inherits a constitution at the cognitive entrypoint (Section 9) receives a stable frame regardless of how much the domain layer above it has changed since the last session. The constitutional layer is not a constraint on operational evolution. It is the anchor that makes operational evolution safe — the fixed point that allows everything above it to move without losing orientation.

```
Constitutional layer:   ─────────────────────────────── (stable; changes rarely)
                                         ↑ anchors
Domain layer:           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ (evolves on business timescales)
                                         ↑ anchors
Operational state:      ≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈≈ (changes every session)
```

The implication for system design: an Evaluator (Section 8) checking constitutional conformance does not need to know the state of the domain layer or the operational state. It checks one thing: does this output respect the constitutional frame? The constitutional layer is always available, always current, and always authoritative — because it is the layer designed not to change.

#### 5.4.4 Conformance note

This specification does not govern domain extension layers. Domain-specific field requirements, domain-specific governance mechanisms, and domain-specific operational state management are explicitly outside the scope of this specification (Section 13.2). A conforming implementation MUST satisfy the constitutional layer requirements of this specification regardless of what domain extensions are layered above it. A domain extension MUST NOT weaken or override constitutional constraints. It MAY add constraints beyond the constitutional minimum.

---

## 6. The Constitution

### 6.1 Definition

A constitution is a structured, entity-controlled, evidence-grounded declaration of an entity's governing intent. It is the primary mechanism through which The Introduction Layer enables inheritance.

A constitution is the minimum sufficient set of information that materially changes how a consuming system reasons about and acts on behalf of the entity. It is not a comprehensive record. Information that does not change the interpretation does not belong in the constitution — it belongs in the content or context layers. This derives from Design Principle P.8.

A constitution is explicitly not:
- Documentation (documentation explains; a constitution governs)
- A prompt (prompts are session-scoped; a constitution is persistent)
- A context file (context is query-dependent; a constitution precedes all queries)
- Structured content metadata (Schema.org et al. describe what an entity contains; a constitution declares what an entity is and what must never be violated in its name)

### 6.2 Required fields

A conforming constitution MUST include all of the following:

**6.2.1 Identity**  
Name, canonical address, and primary category. Establishes the referent unambiguously across sessions and systems.

**6.2.2 Mission**  
A statement of why the entity exists. MUST be expressed in terms a consuming system can use as an interpretive frame, not solely as marketing copy.

**6.2.3 Core belief**  
A single governing principle that takes precedence when other principles conflict. MUST be stated as a principle, not a capability.

**6.2.4 Operating principles**  
The values that shape entity behaviour. MUST be ordered by precedence. A consuming system MUST be able to derive from these principles how the entity would behave in cases the constitution does not explicitly address.

**6.2.5 Constraints**  
Explicit statements of what this entity will NEVER do, regardless of instruction, context, or external pressure. These are the safety envelope of the constitution. Constraint claims carry higher epistemic weight than any other field and MUST be treated as boundary conditions, not preferences.

Constraint fields MUST be stated as explicit prohibitions, not as aspirational language. "We prioritise privacy" is not a constraint. "We will never sell user data to third parties" is a constraint.

**6.2.6 Disambiguation**  
Explicit statements of what this entity is not. Eliminates the most common category conflation errors for consuming systems. MUST address the most probable misclassifications for this entity type.

**6.2.7 Evaluation criteria**  
Questions any consuming system SHOULD apply to its own outputs before acting on behalf of this entity. These are the self-governance frame expressed as actionable tests.

### 6.3 Optional fields

A constitution MAY include:
- Glossary of domain-specific terms the entity uses with non-standard meanings
- Historical context relevant to interpreting current purpose
- Explicitly stated relationships to other entities
- Domain-specific governance fields relevant to the entity's operating context

### 6.4 Stability requirement

A constitution MUST represent permanent introduction, not current operational state. Fields that change frequently (pricing, personnel, current offerings) are NOT constitution fields. A constitution SHOULD remain stable across months or years; operational details belong in content or context layers.

### 6.5 Authorship requirement

A constitution MUST be approved by the entity it represents. A constitution generated by any system — including an automated generation engine — is not a valid constitution until the entity has reviewed and approved it. Unapproved generated constitutions MUST be treated as drafts, not as certified declarations.

---

## 7. Evidence Coverage

### 7.1 Purpose

Evidence Coverage is the grounding mechanism that distinguishes a constitution from an unverifiable assertion. It ensures that constitutional claims are traceable to observable reality before a constitution is certified. A constitution without Evidence Coverage is a declaration without accountability. This section operationalises Design Principle P.3.

### 7.2 Formal definition

Let the constitution for entity *e* be a set of claims:

**C = {c₁, c₂, ..., cₙ}**

Let **E(e)** be the evidence set — the observable content publicly associated with entity *e*, gathered independently of the constitution generation process.

**Definition (Grounded claim):** *cᵢ* is grounded with respect to *E(e)* if there exists at least one segment *s ∈ E(e)* such that *cᵢ* is directly stated in or unambiguously entailed by *s*, as assessed by an evaluator independent of the generation process.

**Definition (Partially grounded claim):** *cᵢ* is partially grounded if there exists *s ∈ E(e)* that provides relevant but non-conclusive support for *cᵢ*.

**Definition (Ungrounded claim):** *cᵢ* is ungrounded if no *s ∈ E(e)* provides direct or partial support.

**Evidence Coverage:**

**EC(C, E) = |{cᵢ ∈ C : cᵢ is grounded}| / |C| × 100**

where EC(C, E) ∈ [0, 100].

**Weighted variant** (RECOMMENDED where partial grounding is distinguished):

**EC_w(C, E) = ( |G| + α × |P| ) / |C| × 100**

where *G* = fully grounded claims, *P* = partially grounded claims, α ∈ (0,1) is the credit assigned to partial grounding. Reference value: α = 0.5.

### 7.3 Required properties

A conforming Evidence Coverage implementation MUST satisfy:

**P1 — Monotonicity in evidence.** EC(C, E) MUST be non-decreasing as E grows. Additional evidence MUST NOT reduce coverage.

**P2 — Monotonicity in ambition.** EC(C, E) MUST be non-increasing as ungrounded claims are added to C. A constitution that declares more than it can ground MUST produce lower coverage.

**P3 — Reproducibility.** Independent evaluators applying the same methodology to fixed C and fixed E(e) MUST produce scores within ±5 percentage points. Variance above this threshold indicates a defect in the evaluation procedure, not in the architecture.

**P4 — Independence.** The evaluator that computes EC(C, E) MUST be architecturally separate from the system that generated C. A generation system MUST NOT evaluate its own outputs for coverage.

### 7.4 The ungrounded claim set

Coverage computation MUST produce, in addition to the score, an explicit enumeration of ungrounded claims:

**U = {cᵢ ∈ C : cᵢ is ungrounded}**

This set MUST be made available to the entity as a diagnostic. It represents the gap between declared intent and observable expression.

### 7.5 Coverage thresholds

**For web and AI-agent contexts:**  
A constitution with EC < 60 SHOULD NOT be certified. A constitution with EC ≥ 80 MAY be certified subject to entity approval. Intermediate thresholds are implementation-specific.

**For physical systems and autonomous operation contexts:**  
Threshold requirements are elevated. Constraint claims with EC = 0 MUST be treated as absent by consuming systems acting in physical environments. A system MUST NOT rely on ungrounded constraint claims as operational boundaries.

**Implication:** In physical systems contexts, Evidence Coverage functions as an operational gate, not merely a quality indicator. Consuming systems in high-stakes contexts MUST be designed to distinguish between coverage levels for constraint fields specifically.

### 7.6 The improvement loop

Coverage is designed to drive improvement, not to gatekeep indefinitely. A conforming implementation SHOULD support the following cycle:

Generate → Measure coverage → Surface ungrounded claims → Entity improves expression → Regenerate → Remeasure → Certify

The loop has a natural convergence condition: when an entity's expressed presence accurately represents its declared intent, coverage approaches its achievable maximum.

---

## 8. The Evaluator

### 8.1 Definition

The Evaluator is the component that validates outputs produced by or for a consuming system against a certified constitution. It is the enforcement mechanism of The Introduction Layer. This section operationalises Design Principle P.2.

### 8.2 Required inputs

A conforming Evaluator MUST accept:

- A consuming system output (text, structured data, or action specification)
- A certified constitution for the entity the output concerns

### 8.3 Required output schema

A conforming Evaluator MUST produce a structured verdict containing at minimum:

```
{
  "outcome":               "proceed" | "flag" | "reject",
  "score":                 0–100,
  "checks": [
    {
      "question":          string,
      "result":            "pass" | "fail" | "partial",
      "note":              string
    }
  ],
  "constraint_violations": string[],
  "summary":               string
}
```

### 8.4 Outcome definitions

**proceed** — The output is consistent with the introduction. No constitutional concerns identified. The consuming system MAY act on this output.

**flag** — The output is technically within the introduction but introduces a concern that SHOULD be acknowledged before action. The consuming system SHOULD surface the concern before proceeding.

**reject** — The output violates a constitutional constraint or escapes the declared frame in a material way. The consuming system MUST NOT act on a rejected output without entity-level review.

In physical systems contexts, **reject** is an operational stop. A consuming system MUST NOT execute a rejected action plan.

### 8.5 Independence requirement

The Evaluator MUST be architecturally independent of the system whose outputs it evaluates. A consuming system MUST NOT modify, override, or reweight Evaluator verdicts without explicit entity authorisation.

### 8.6 Evaluation criteria source

The Evaluator SHOULD use the evaluation criteria field of the constitution (Section 6.2.7) as the basis for its checks. It MAY apply additional checks derived from constraint and principle fields.

---

## 9. The Cognitive Entrypoint

### 9.1 Definition

The cognitive entrypoint is the point in a consuming system's reasoning sequence at which the constitution is retrieved and inherited. It marks the transition from uninitialised to constitutionally-framed operation. This section operationalises Design Principle P.1.

### 9.2 Timing requirement

A consuming system operating with a certified constitution MUST retrieve and inherit the constitution BEFORE any domain-specific reasoning, tool invocation, or action planning for the constituted entity begins.

A constitution retrieved after domain-specific reasoning has begun CANNOT retroactively govern that reasoning. It governs only subsequent operations.

### 9.3 Conformance

A consuming system is conformant with the cognitive entrypoint requirement if:

- It retrieves the certified constitution from a conforming registry
- Retrieval occurs before any entity-specific reasoning begins
- The constitution is made available to all reasoning components operating on behalf of the entity
- The Evaluator has access to the constitution when assessing outputs

### 9.4 Implementation note (non-normative)

In tool-calling architectures, the cognitive entrypoint SHOULD be implemented as the first registered tool, documented explicitly as the required first call. In Model Context Protocol implementations, `stasis_intent` or equivalent MUST be documented as: "Call this first. Always."

---

## 10. Forward Integration

### 10.1 Definition

Forward integration is the capability of a consuming system not yet built to correctly inherit a reliable cognitive frame from an entity that declared its constitution before the consuming system was designed.

Forward integration is the primary consequence of a conforming introduction layer implementation. It is what distinguishes a introduction from a snapshot. This section operationalises Design Principle P.7.

### 10.2 Requirement

A conforming constitution MUST be:
- Persistent — available indefinitely, not session-scoped
- Stable — not changing faster than the entity's governing intent changes (see Section 6.4)
- Versioned — such that a consuming system can determine which version it inherited and when
- Accessible — retrievable by any conforming consuming system without bespoke configuration

These properties together ensure that a constitution declared today remains a reliable frame for consuming systems built years from now.

### 10.3 The forward integration guarantee

A conforming implementation provides the following guarantee:

> Any conforming consuming system that encounters a certified entity for the first time WILL inherit the entity's declared governing intent, at the coverage level at time of certification, without reconstruction from inference.

This guarantee is the reason the architecture MUST be established before the consuming systems it serves are built. Retrofitting cannot provide forward integration — consuming systems already built have already formed their interpretive assumptions.

---

## 11. Discovery and Representation

### 11.1 Discovery

A constitution MUST be accessible via a predictable, no-configuration-required path. Consuming systems MUST NOT require bespoke knowledge of a site's structure to discover a constitution.

**Standard discovery sequence:** A conforming consuming system MUST attempt discovery in the following order:

1. `GET /constitution` — the standard endpoint. No extension, no subdirectory, no content negotiation required. This is the primary convention.
2. `GET /constitution.ic` — the static-file fallback, for implementations served from static hosts without server-side routing.

A consuming system MUST attempt step 1 before step 2. A server MAY respond to either or both. A response at `/constitution` takes precedence.

**Rationale:** Convention-based discovery, not configuration-based discovery, is how protocols achieve adoption. `GET /robots.txt` succeeded not because `.txt` is special, but because every crawler knew exactly where to look without negotiation. This specification follows that precedent. The correct mental model for a consuming system is not "does this site use `.ic`?" — it is "I know exactly where to look."

### 11.2 Canonical representation

The canonical representation of a constitution — the form consuming systems treat as authoritative — is JSON, served with:

```
Content-Type: application/constitution+json
```

A conforming server responding to `GET /constitution` SHOULD return JSON with this media type. Implementations that return `text/plain` are backward-compatible but non-canonical.

The media type `application/constitution+json` is the long-term target for IANA registration, following the precedent of `application/ld+json`. Until registered, implementations MAY use `application/vnd.ailattice.constitution+json`.

### 11.3 Authoring formats and equivalence

There are two ways to implement this specification. Both are fully conformant.

**The easiest implementable way:** Create a file called `intro.txt` and place it at your site root — same location as `robots.txt` and `llms.txt`. Fill in the required fields using plain key-value syntax. Submit it to a conforming registry for verification. That is the entire implementation on the entity side. No tooling, no infrastructure, no JSON. The progression is intentional: `robots.txt` says what not to touch. `llms.txt` says what to read. `intro.txt` says who I am.

**The deeper, most correct way:** Author a `constitution.ic` file using the full Intent Constitution format. Compile it to canonical JSON. Serve it at `GET /constitution` with `Content-Type: application/constitution+json`. Submit for Evidence Coverage verification and certification. The result is a machine-native, versioned, evidence-grounded declaration that any conforming consuming system can retrieve and inherit without configuration.

Both paths produce the same output for consuming systems. `intro.txt` is the on-ramp. `constitution.ic` compiled to `GET /constitution` is the destination. A conforming registry SHOULD accept either and handle compilation where needed.

**Equivalence requirement:** Implementations MUST preserve semantic equivalence across all representations. Converting from any authoring format to canonical JSON MUST NOT alter meaning, add fields not present in the source, or omit fields present in the source.

### 11.4 Schema endpoint

Implementations SHOULD expose a schema endpoint enabling third-party tooling to validate constitutions independently of the reference implementation:

```
GET /constitution/schema
```

A publicly accessible schema at a stable URL (e.g., `https://ailattice.io/spec/v1/schema`) functions as the equivalent of a JSON Schema or OpenAPI definition for this format. Third-party validators, IDE plugins, and CI/CD checks MAY reference this schema without coupling to the reference implementation.

### 11.5 Ownership principle

The constitution belongs to the entity. The registry indexes it.

A conforming registry MUST NOT claim ownership of constitutions it indexes. A registry is a discovery and certification service. Entities MAY self-host their constitutions at `/constitution` independently of any registry. Registry certification is a trust signal, not a custody arrangement.

This principle has architectural consequences: the open standard is the `/constitution` endpoint and the `.ic` format. The AILattice registry, certification authority, and generator are services built on top of the standard — not the standard itself.

---

## 12. Conformance

### 12.1 Component conformance

An implementation is **constitutionally conformant** if its constitutions meet all requirements of Section 6.

An implementation is **coverage conformant** if its Evidence Coverage computation meets all requirements of Section 7, including the four formal properties (P1–P4).

An implementation is **evaluator conformant** if its Evaluator meets all requirements of Section 8.

An implementation is **entrypoint conformant** if consuming systems built on it meet the timing requirement of Section 9.2.

An implementation is **discovery conformant** if it exposes constitutions at the standard discovery paths defined in Section 11.1 and serves canonical JSON as defined in Section 11.2.

### 12.2 Full conformance

An implementation is **fully conformant** if it meets all five component conformance requirements above.

### 12.3 Partial conformance

Partial conformance is permitted and useful. An implementation that is constitutionally and coverage conformant but lacks a conforming Evaluator is partially conformant. Partial conformance MUST be disclosed and MUST NOT be represented as full conformance.

### 12.4 Conformance testing

A conforming implementation MUST be testable against the following:

**Constitutional conformance test:** Given a set of constitutions from the implementation, verify that all required fields (Section 6.2) are present and that no field contains operational state masquerading as governing intent (Section 6.4).

**Coverage conformance test:** Given fixed C and fixed E(e), run coverage independently three times. Verify variance ≤ 5 points (P3). Verify that adding evidence does not reduce coverage (P1). Verify that adding ungrounded claims reduces coverage (P2).

**Evaluator conformance test:** Submit identical outputs to the Evaluator across multiple independent runs. Verify outcome classification stability > 85% of runs. Verify output schema conformance (Section 8.3).

**Entrypoint conformance test:** Trace a consuming system's operation sequence and verify that constitution retrieval precedes the first entity-specific reasoning step (Section 9.2).

---

## 13. Explicit Scope

### 13.1 In scope

This specification covers:
- The architectural layer definition and its required components
- The constitution format and required fields
- Evidence Coverage definitions, formal properties, and threshold guidance
- Evaluator interface and outcome definitions
- Cognitive entrypoint timing requirements
- Forward integration requirements
- Discovery conventions (`GET /constitution`, `GET /constitution.ic`)
- Canonical representation (`application/constitution+json`)
- Authoring format equivalence (`.ic`, `constitution.txt`)
- The ownership principle (entity owns; registry indexes)

### 13.2 Out of scope

This specification explicitly does not cover:
- How constitutions are generated (prompting strategies, model choice, pipeline design)
- What language model or reasoning engine is used by any component
- Specific registry implementation design
- Authentication and authorisation mechanisms for constitution endpoints
- Application-layer systems built on top of a conforming implementation
- Domain-specific constitution field requirements beyond the required minimum (see Section 5.4 for the architectural rationale)
- Pricing, licensing, or commercial terms for implementations

### 13.3 Implementation freedom

Within the constraints of this specification, implementers have full freedom in:
- Technology stack
- Generation mechanism
- Registry architecture
- User interface
- Pricing model
- Deployment topology

The specification defines what a conforming implementation guarantees. It does not define how those guarantees are achieved.

---

## 14. Falsifiability

This architecture makes testable claims. The following conditions, if satisfied by empirical observation, would indicate that the architecture does not provide its claimed benefits:

**F1:** AI agents queried about constituted entities produce outputs with no measurably lower constraint violation rate than agents queried about non-constituted entities of matched complexity, across a sample of ≥ 100 entity pairs.

**F2:** Independent coverage evaluations on fixed inputs produce scores with variance > 10 points consistently, across ≥ 50 evaluation pairs.

**F3:** Entities that act on low-coverage diagnostics show no measurable coverage improvement on regeneration, across ≥ 30 entities.

**F4:** Consuming systems inheriting certified constitutions produce outputs with measurably higher constitutional misalignment rates than consuming systems operating from inferred identity.

Conditions F2 and F3 are testable with existing implementations without wide adoption. F1 and F4 require a sample of constituted entities but not global deployment.

This specification considers itself falsified if any of F1–F4 is satisfied under rigorous experimental conditions.

---

## 15. Reference Implementation

The reference implementation of this specification is:

- **Intelli-Stasis** (intellistasis.com) — constitutional generation engine and governance layer
- **AILattice** (ailattice.io) — reference registry for the web-to-AI-agent case

The reference implementation demonstrates conformance for one domain: websites as entities, AI agents as consuming systems. The specification is domain-agnostic. Other conforming implementations are expected for other entity classes (IoT devices, physical facilities, autonomous systems, organisations) and other consuming system classes.

**The reference implementation is not the architecture. It is a proof that the architecture is implementable.**

---

## Appendix A: Minimum viable constitution template (`.ic` format)

```
name:              [entity name]
canonical_address: [primary URL or identifier]
category:          [primary domain or type]

mission: >
  [Why this entity exists. One to three sentences.]

core_belief: >
  [The single principle that governs when others conflict.]

principles:
  - [Principle 1 — highest precedence]
  - [Principle 2]
  - [Principle 3]

constraints:
  - "Will never [explicit prohibition 1]"
  - "Will never [explicit prohibition 2]"
  - "Will never [explicit prohibition 3]"

what_this_is_not:
  - "Not [common misclassification 1]"
  - "Not [common misclassification 2]"

evaluation_criteria:
  - "Does this output respect [constraint 1]?"
  - "Does this output represent the entity as [mission statement]?"
  - "Would the entity approve this output if shown it?"

evidence_coverage:   [score 0–100]
version:             [semver]
certified_date:      [ISO 8601]
certifying_entity:   [who certified this]
```

---

## Appendix B: Relationship to existing standards

| Standard | Layer | Relationship to this specification |
|----------|-------|-----------------------------------|
| Schema.org | Content (Layer 1) | Describes what an entity contains. Does not declare governing intent. Complementary. |
| llms.txt | Content (Layer 1) | Provides AI-readable content index. Does not declare governing intent. Complementary. |
| robots.txt | Content (Layer 1) | Specifies access permissions. Does not declare purpose or constraints. Complementary. Discovery model (`/robots.txt`) is the direct precedent for `GET /constitution`. |
| Sitemaps | Content (Layer 1) | Describes structure. Does not declare meaning. Complementary. |
| RAG | Context (Layer 2) | Session-scoped retrieval. Does not provide permanent introduction. Complementary. |
| Constitutional AI (Anthropic) | Model training | Governs model behaviour during training. This specification governs entity identity at runtime. Different scope. |
| Model Context Protocol | Transport | Provides infrastructure for agent-to-system communication. This specification defines what should be communicated first. Compatible. |
| W3C WoT Thing Descriptions | Technical interoperability | Describes device capabilities and interaction model. Does not declare governing intent or constraints. Complementary. |
| `.well-known/` (RFC 5785) | Discovery | Convention for service discovery endpoints. `GET /constitution` follows the same principle (predictable path) without requiring the subdirectory. Compatible; `/constitution` is the preferred path. |
| `constitution.ic` | Intent (Layer 3) | The human authoring format defined by this specification. Compiles to canonical JSON served at `GET /constitution`. |
| `constitution.txt` | Intent (Layer 3) | Lowest-friction compatibility format. Identical syntax to `.ic`. Not a separate standard — an equivalent representation. |
| `application/constitution+json` | Intent (Layer 3) | The canonical media type for machine consumption of a constitution. Target for IANA registration. |

---

*The Introduction Layer Specification is open. Conforming implementations are encouraged across all entity classes and consuming system types.*

*Intelli-Stasis · intellistasis.com · AILattice · ailattice.io*
