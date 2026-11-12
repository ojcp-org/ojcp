# 0011 — Key transparency log

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0011](../rfcs/0011-key-transparency-log.md); PR #42. Comment period 2026-10-12 to 2026-11-11.

## Context

A provider's JWK Set shows only its current keys. Someone who takes over an employer's domain can publish
keys of their own, and an agent cannot tell that anything changed or how long the real owner held its keys.

## Decision

RFC 0011 is **accepted**.

- Identity-key events (creation, rotation, certification, revocation) are signed by the organization's own
  keys and appended to C2SP-style transparency logs.
- Independent witnesses cosign checkpoints; lineage tenure is measured from witnessed time, never from a date
  the organization supplies.
- Providers staple proofs in `ojcp_transparency` on `ojcp-keys.json`, so agents verify without querying logs
  about the employers they look at.
- Everything is OPTIONAL for providers, and required of agents only when their own trust policy requires it.

**Placement.** The normative text lands in the optional **OJCP Trust** extension. It builds on RFC 0010 and adds no core fields. RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- A domain takeover yields a new lineage with zero tenure instead of inheriting the owner's history.
- The `audited` tier's 90-day condition becomes lineage tenure, applied through RFC 0010.
- No log or witness operator exists yet; the RFC has no implementation beyond an interface in the reference
  SDK. Errors found while implementing are handled as errata.
- Follow-up: implementation PR (`schemas/key-event.json`, `schemas/key-transparency-bundle.json`); §14
  fixtures; finding operators for the first two logs and witnesses (open question 5); IANA registration of
  `application/ojcp-key-event+jwt` at stable status.

## Alternatives considered

Detailed in RFC 0011's *Alternatives considered*, including *Why not a blockchain* (§13).

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
