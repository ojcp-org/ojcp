# 0010 — Decentralized provider trust

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0010](../rfcs/0010-decentralized-provider-trust.md); PR #41. Comment period 2026-10-12 to 2026-11-11.

## Context

Provider trust tiers (`unverified`, `verified`, `audited`) were assigned by one registry, and every agent
followed its grade. Whoever ran the registry decided who counted as a legitimate employer, and an error or
compromise there propagated to every agent.

## Decision

RFC 0010 is **accepted**.

- An organization is identified by a `did:web` identifier and a long-term identity key; other keys are
  certified by it (`ojcp_role`, `ojcp_cert`).
- Independent attesters issue SD-JWT VC attestations about organizations; each is checkable, expiring and
  revocable by its issuer.
- Agents choose key-pinned trust lists and derive an *effective trust tier*, by default requiring two
  unrelated operators to agree. OJCP publishes no default list.
- `find_ojcp_providers` gains `did`, `attestations`, `indexed_at` and `has_attestation_types`; its tier fields
  are deprecated with unchanged enums. No index is authoritative.
- Registry-assigned tiers stay valid during migration and are removed no earlier than the next major
  version (§10).

**Placement.** The normative text lands in the optional **OJCP Trust** extension. Core keeps only the hooks (`provider.did`, `trust.attestations_uri`, the deprecated tier fields). RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- No single party, including the RFC author's employer, decides which employers are trusted.
- Agents that take `trust_tier` from an index they did not pin are no longer conformant.
- Standing mandates (RFC 0008) and wallet steps (RFC 0013) depend on a derived `verified` tier, which needs
  real attesters and list publishers. None exist yet.
- Follow-up: implementation PR; §11 conformance fixtures; registry and `find_ojcp_providers` fields;
  IANA registration of `ojcp-keys.json` and `ojcp-attestations.json`; recruiting the first attesters and
  list publishers per §10.

## Alternatives considered

Detailed in RFC 0010's *Alternatives considered*.

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
