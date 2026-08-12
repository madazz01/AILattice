# Legal Review Required — Introduction Layer / AILattice

This file documents the items that require qualified legal advice before they
can be considered watertight. It is not a legal document. It is a brief for
a lawyer familiar with IP, open source, and standards governance.

---

## 1. Specification Licence — W3C Compatibility

**Current state:**
The Introduction Layer specification (drafts/specification.md) is currently
licensed under CC BY 4.0. This was applied by the author as the best available
open licence for a standards document.

**The issue:**
W3C Community Groups operate under W3C's own document licensing framework
(the W3C Software and Document Notice and License, or W3C CLA). CC BY 4.0
may conflict with or complicate the W3C process. The correct licence for a
document intended to become a W3C standard may be the W3C Document Licence,
not CC BY 4.0.

**What needs answering:**
- Is CC BY 4.0 compatible with the W3C Community Group process?
- Should the specification carry the W3C Document Licence instead?
- If the specification is eventually adopted as a W3C Recommendation, what
  happens to the current CC BY 4.0 licence?
- How do we protect the open character of the standard throughout the W3C process?

**Desired outcome:**
The specification is irrevocably open — free to implement, share, and adapt
with attribution. No entity, including Intelli-Stasis, can lock it down.
The licence should make this legally certain and be compatible with W3C process.

---

## 2. Trademark Registration — AILattice™

**Current state:**
AILattice™ and AILattice Certified™ are asserted as trademarks under common
law in the LICENSE file. The ™ symbol is used, not ®. No formal registration
has been confirmed.

**The issue:**
Common law trademark rights are limited in scope and jurisdiction. Without
registered trademark protection, the marks are vulnerable to:
- Third parties registering the same name in other jurisdictions
- Large companies claiming prior use in jurisdictions where we have no presence
- Difficulty enforcing the marks internationally

**What needs answering:**
- What jurisdictions should AILattice™ be registered in as a priority?
  (At minimum: Australia, USA, EU, UK)
- Is "AILattice" available for registration in these jurisdictions?
- What is the trademark class? (Likely Class 42 — scientific and technological
  services; software as a service; certification services)
- Should "Introduction Layer" also be trademarked, or should it remain purely
  as a common descriptor for the open standard?
- Timeline and cost for priority registrations

**Desired outcome:**
AILattice™ registered in key jurisdictions. The certification mark
"AILattice Certified™" protected. "Introduction Layer" left as an open
descriptor that anyone can use to refer to the standard.

---

## 3. Foundation Structure — Future Governance

**Current state:**
The Introduction Layer standard is governed informally through the W3C
Community Group process, with Bryan Horsfield as chair. The reference
implementation is owned by Intelli-Stasis (unincorporated / sole trader).

**The issue:**
As the standard gains adoption, two risks emerge:
- Acquisition risk: if Intelli-Stasis is acquired, the acquirer gains control
  of the reference implementation and potentially undue influence over the standard
- Single point of failure: the W3C chair role is held by one person

The standard should be structured so that no acquisition, death, incapacity,
or commercial pressure on any single party can compromise its open character.

**What needs answering:**
- What legal structure protects the standard from capture? Options include:
  (a) A non-profit foundation (similar to Linux Foundation, Apache Foundation)
  (b) A dedicated legal entity that holds the standard in trust
  (c) Relying entirely on W3C governance (no separate legal entity)
- If a foundation is appropriate, when should it be established and in which
  jurisdiction?
- How do we structure Intelli-Stasis's relationship to the foundation so that
  AILattice (the commercial layer) can remain a viable business while the
  standard remains genuinely open?
- What governance rights, if any, should early W3C group members have?

**Desired outcome:**
A structure where: the standard cannot be captured by any commercial entity;
the reference implementation (AILattice) can operate as a business; and Bryan
Horsfield retains meaningful governance authority over the standard's direction
without creating a single point of failure.

---

## 4. Contributor Licence Agreement (CLA)

**Current state:**
CONTRIBUTING.md states that contributors licence their contributions under
Apache 2.0 (for code) and CC BY 4.0 (for specification content) by submitting
a pull request. This is a lightweight inbound = outbound approach.

**The issue:**
For a standard intended to be adopted at scale, a formal CLA may be required.
The W3C Community Group has its own Contributor Licence Agreement (W3C CLA)
that contributors must sign. For the reference implementation, a formal CLA
(rather than implicit PR agreement) provides stronger patent protection.

**What needs answering:**
- Is the current "by submitting a PR you agree" approach legally sufficient?
- Should we implement a formal CLA for the reference implementation?
- The W3C CLA covers specification contributions — does it also need to cover
  reference implementation contributions, or are these separate?
- What is the interaction between the W3C CLA and the Apache 2.0 patent grant?

**Desired outcome:**
Clear, enforceable contributor agreements that protect both contributors and
the project, compatible with W3C process.

---

## 5. Jurisdiction and Incorporation

**Current state:**
Intelli-Stasis is operated by Bryan Horsfield, based in Australia. No formal
incorporation has occurred. The entity is pre-incorporation.

**The issue:**
Contracts, trademark registrations, foundation structures, and investor
agreements all require a legal entity. Operating as an unincorporated sole
trader limits the ability to enter these agreements and creates personal
liability exposure.

**What needs answering:**
- What entity type is appropriate? (Pty Ltd in Australia, or incorporate in
  a jurisdiction more favourable for standards bodies / tech companies?)
- Delaware C-Corp is standard for US VC investment — is that relevant here
  given the YC angle?
- What is the interaction between an Australian operating entity and a
  US/international foundation structure?
- What personal liability exposure exists currently?

**Desired outcome:**
Incorporated entity in place before any significant investor conversation,
partnership agreement, or trademark filing.

---

## Priority Order

Based on the current stage of the project:

1. **Incorporation** (blocks everything else — do first)
2. **Trademark registration** (AILattice™ in AU + US at minimum)
3. **Specification licence / W3C compatibility** (clarify before W3C group grows)
4. **CLA** (before significant external contributions land)
5. **Foundation structure** (when community is large enough to warrant it)

---

*This document is a brief for legal review, not legal advice.*
*Last updated: 2026-08-13*
