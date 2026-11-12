# 0012 — Signed job postings

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0012](../rfcs/0012-signed-job-postings.md); PR #43. Comment period 2026-10-12 to 2026-11-11.

## Context

Job postings are relayed by boards, aggregators and other agents. Any relay could change the apply link,
pay or closing date while keeping the employer's name, and an agent receiving a relayed copy had no way to
check what the publisher actually published.

## Decision

RFC 0012 is **accepted**.

- JobPosting gains OPTIONAL `dateModified` and `signature` (`alg`, `kid`, `iss`, `signed_at`, `expires_at`,
  `value`). A signed posting MUST carry `dateModified` and `validThrough`.
- Signatures use posting-signing keys certified under RFC 0010 and expire within days, so stale copies stop
  verifying.
- `attribution_ref`, `fit_score` and `fit_rationale` stay outside the signature as relay annotations.

**Placement.** The normative text lands in the optional **OJCP Trust** extension. Core keeps the two optional JobPosting members as hooks. RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- An agent can show "published by Acme, found on the board" for an intact relayed posting, and refuse to
  present an altered one as the publisher's.
- Unsigned postings are unaffected; consumers validating against a closed copy of the schema must update.
- Follow-up: implementation PR; conformance fixtures (the RFC lists none yet); the reference provider signing
  its postings.

## Alternatives considered

Detailed in RFC 0012's *Alternatives considered*.

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
