# Introduction Layer Conformance Test Suite

This directory contains the official conformance tests for the Introduction Layer specification.

A conforming implementation MUST pass all tests marked REQUIRED.
Tests marked RECOMMENDED are optional but encouraged.

These tests are open. Any implementation — including implementations not built on
AILattice — may use them to verify conformance. Publishing conformance results
publicly is encouraged.

---

## Test Categories

### C1 — Constitutional Conformance (Spec Section 6)
Tests that a constitution contains all required fields and meets the stability
and authorship requirements.

### C2 — Evidence Coverage Conformance (Spec Section 7)
Tests that Evidence Coverage computation satisfies the four formal properties
(monotonicity in evidence, monotonicity in ambition, reproducibility, independence).

### C3 — Evaluator Conformance (Spec Section 8)
Tests that the Evaluator produces correct outcome classifications and schema-conformant
output.

### C4 — Cognitive Entrypoint Conformance (Spec Section 9)
Tests that consuming systems inherit the constitution before domain-specific reasoning.

### C5 — Discovery Conformance (Spec Section 11)
Tests that constitutions are discoverable at the standard paths and served with
the correct media type.

---

## C1 — Constitutional Conformance Tests

### C1.1 Required fields present (REQUIRED)
A valid constitution MUST contain all of the following fields:
- `name`
- `canonical_address`
- `category`
- `mission`
- `core_belief`
- `principles` (ordered list, minimum 1)
- `constraints` (explicit prohibitions, minimum 1)
- `what_this_is_not` (disambiguation, minimum 1)
- `evaluation_criteria` (minimum 1)

**Pass condition:** All fields present and non-empty.
**Fail condition:** Any required field absent or empty.

### C1.2 Constraints are explicit prohibitions (REQUIRED)
Constraint fields MUST be stated as explicit prohibitions, not aspirational language.

**Pass condition:** Each constraint contains a clear "will never" or equivalent prohibition.
**Fail condition:** Constraint reads as aspiration ("we prioritise X") rather than prohibition ("we will never X").

### C1.3 No operational state in constitution fields (REQUIRED)
Constitution fields MUST NOT contain information that changes frequently (pricing,
personnel, current product offerings).

**Pass condition:** All fields represent stable governing intent.
**Fail condition:** Any field contains operational state (e.g. "current pricing is $X/month").

### C1.4 Authorship confirmed (REQUIRED)
A constitution MUST be approved by the entity it represents. Unapproved drafts
MUST be labelled as drafts.

**Pass condition:** Constitution carries an explicit approval confirmation or is
labelled as draft.
**Fail condition:** No authorship status indicated.

### C1.5 Disambiguation addresses probable misclassifications (RECOMMENDED)
The `what_this_is_not` field SHOULD address the most probable misclassifications
for this entity type.

---

## C2 — Evidence Coverage Conformance Tests

### C2.1 Monotonicity in evidence (REQUIRED)
Adding evidence to E(e) MUST NOT reduce EC(C, E).

**Test:** Run EC computation on fixed C with E₁. Add one item to E₁ to produce E₂.
Run EC computation on fixed C with E₂. EC(C, E₂) >= EC(C, E₁).

### C2.2 Monotonicity in ambition (REQUIRED)
Adding an ungrounded claim to C MUST reduce EC(C, E).

**Test:** Run EC computation on fixed C with fixed E. Add one claim to C that
has no support in E. Re-run. EC_new < EC_original.

### C2.3 Reproducibility (REQUIRED)
Independent evaluations on fixed C and fixed E MUST produce scores within ±5 points.

**Test:** Run EC computation three times on identical inputs. Variance <= 5 points
across all three runs.

### C2.4 Independence (REQUIRED)
The system that generates a constitution MUST NOT be the same system that evaluates
its coverage.

**Test:** Verify architectural separation between generation and evaluation components.
This is a structural test, not a numeric test.

### C2.5 Ungrounded claim set produced (REQUIRED)
EC computation MUST produce an explicit list of ungrounded claims alongside the score.

**Pass condition:** U (ungrounded claim set) is returned with every EC computation.
**Fail condition:** Score returned without ungrounded claim enumeration.

---

## C3 — Evaluator Conformance Tests

### C3.1 Output schema conformance (REQUIRED)
Every Evaluator response MUST contain: `outcome`, `score`, `checks`, 
`constraint_violations`, `summary`.

### C3.2 Outcome stability (REQUIRED)
Identical inputs submitted to the Evaluator across multiple runs MUST produce
the same outcome classification in > 85% of runs.

### C3.3 Constraint violations detected (REQUIRED)
An output that violates a constitution's constraint field MUST produce outcome: "reject".

**Test:** Submit an output that explicitly contradicts a constraint. Verify outcome is "reject".

### C3.4 Evaluator independence (REQUIRED)
The Evaluator MUST be architecturally independent of the consuming system it evaluates.

---

## C4 — Cognitive Entrypoint Conformance Tests

### C4.1 Constitution retrieved before reasoning (REQUIRED)
A consuming system MUST retrieve the certified constitution before any entity-specific
reasoning, tool invocation, or action planning begins.

**Test:** Trace the operation sequence of a consuming system. Verify constitution
retrieval occurs at step 1, before any domain-specific operation.

---

## C5 — Discovery Conformance Tests

### C5.1 Standard discovery path (REQUIRED)
A conforming implementation MUST respond to `GET /constitution`.

**Test:** `GET https://{domain}/constitution` returns a valid constitution.
**Pass condition:** HTTP 200, body is valid JSON constitution.
**Fail condition:** 404, or non-JSON response.

### C5.2 Canonical media type (RECOMMENDED)
Response SHOULD be served with `Content-Type: application/constitution+json`.

### C5.3 intro.txt discoverable (RECOMMENDED)
If `intro.txt` is used as the authoring format, it SHOULD be accessible at the site root.

**Test:** `GET https://{domain}/intro.txt` returns the authoring-format constitution.

### C5.4 Static file fallback (RECOMMENDED)
`GET /constitution.ic` SHOULD be supported as a fallback for static hosting.

---

## Submitting Conformance Results

Implementations that pass the REQUIRED tests may apply for AILattice certification
at https://ailattice.io.

Independent conformance results may be published to this repository via pull request.
Include: implementation name, test results per category, and a link to the implementation.

The conformance test suite is maintained by the W3C Introduction Layer Community Group.
Proposed changes to these tests should be submitted via the W3C community group process.

---

*Licensed under CC BY 4.0. These tests are open. Use them.*
