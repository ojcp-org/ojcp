# 0008 — Standing mandates

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0008](../rfcs/0008-standing-mandates.md); PR #40. Comment period 2026-10-12 to 2026-11-11.

## Context

RFC 0003 lets a person authorize one specific application. Agents told "apply to these kinds of jobs
until March" had to interrupt the person before every application, or rely on `user_consent_token`, which
in `autonomous` mode is only the operator's own say-so. Nothing in 0.3 bounded or identified an agent that
loops over postings and applies.

## Decision

RFC 0008 is **accepted**.

- A *standing mandate* is an SD-JWT VC the person approves once at an issuer they choose, scoping
  applications by RFC 0009 occupation codes, a salary floor, location, employment type and an end date.
- `limits.per_employer` is required and is 1, 2 or 3; the provider enforces it per candidate and employer,
  keyed on the candidate binding, over a trailing window.
- A standing mandate never covers binding actions or EEO answers, and never authorizes applications to
  providers below the derived `verified` tier (RFC 0010).
- Providers declare admission in `auth.user_mandates` and mark every application made under a standing
  mandate in what they deliver to the employer.

**Placement.** The normative text lands in the optional **OJCP Mandates** extension. Core keeps `AgentDeclaration.user_mandate` and the `user_mandate_required` error as hooks. RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- Auto-apply that 0.3 already permits becomes scoped, capped per employer, visible to the employer and
  attributed per agent (RFC 0007).
- A provider can decline standing mandates or narrow them in `auth.user_mandates`.
- **Employer comment.** Tom Chevalier (Tink, Seat 7) asked on PR #40 that providers be able to refuse standing
  mandates universally or per employer. The universal case is covered by `auth.user_mandates`. Refusal by one
  employer on a shared provider is not, and needs more than a flag: a provider-side check, and a rule that
  one-time approvals on those postings carry proof that a person approved them. It changes RFC 0003 and is
  taken up as a follow-up RFC.
- The §5.4 default (submissions admitted, subject to §5.1–5.3) stands; whether it should default to opt-in is
  a candidate for revision once providers implement it.
- Follow-up: implementation PR; §10 fixtures in the conformance suite; Type Metadata published byte-exact at
  `spec.ojcp.dev/vct/standing-mandate/v1`; the per-employer refusal RFC.

## Alternatives considered

Detailed in RFC 0008's *Alternatives considered*.

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
