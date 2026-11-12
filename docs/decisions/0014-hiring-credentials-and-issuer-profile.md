# 0014 — Hiring credentials and issuer profile

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0014](../rfcs/0014-hiring-credentials-and-issuer-profile.md); PR #45. Comment period 2026-10-12 to 2026-11-11.

## Context

RFC 0013 lets a candidate present a signed record from a wallet, but nothing defined what an employment,
education, licence or certification record contains, who vouches for it, or how an HR system issues one.

## Decision

RFC 0014 is **accepted**.

- Four credential types (employment, education, professional licence, certification) with closed claim sets,
  coarse variants of sensitive claims, and lifetime caps, under the `spec.ojcp.dev` namespace.
- A `basis` claim says who vouches: the organization itself, a platform on its behalf, or a source check.
- A baseline issuer profile built from OpenID4VCI, published keys and status lists, plus a high-assurance
  profile for issuers that need it.
- Former employees can obtain records after offboarding through the contact on record.

**Placement.** The normative text lands in the optional **OJCP Candidate Verification** extension. It adds no core fields. RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- HR systems can issue hiring records with parts they already run for single sign-on.
- Built-in phone wallets hold only government IDs today, so these records need a separate wallet app.
- Follow-up: implementation PR; §9 fixtures; Type Metadata published byte-exact under `spec.ojcp.dev/vct/`;
  counsel on consumer-reporting treatment (open question 5).

## Alternatives considered

Detailed in RFC 0014's *Alternatives considered*.

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
