# 0001 — Verifiable agent identity via HTTP Message Signatures (RFC 9421)

- **Status:** Accepted
- **Date:** 2026-07-28
- **Decided by:** Austin Anderson (Recruitics, Seat 1 — sole seated member during the bootstrap period)
- **Related RFC / PR:** [RFC 0001](../rfcs/0001-agent-identity-http-message-signatures.md); PR #4

## Context

In v0.1, `AgentDeclaration.agent_id` is self-asserted — any caller can claim to be
`com.acme.agent`, so every mechanism that keys on it (agent-scoped visibility, employer
allowlists, rate limiting, abuse attribution, audit trails) is spoofable. This is the
protocol's largest trust gap and is called out in Open Question #3. RFC 0001 proposed making
`agent_id` cryptographically verifiable via RFC 9421 HTTP Message Signatures, adopting the
Web Bot Auth wire profile already deployed by OpenAI and Cloudflare, and splitting the
personal-agent case into platform attestation plus a user-rooted authorization mandate.

## Decision

RFC 0001 is **accepted** as the design of record for agent identity in OJCP. The normative spec
and schema changes it describes will be implemented in a separate follow-up PR. The `user_mandate`
schema referenced in §6 is deferred to the forthcoming consent RFC.

## Consequences

- Unblocks agent-scoped visibility, enforceable employer allowlists, and reliable abuse
  attribution — all of which depend on a verifiable `agent_id`.
- Establishes the signing/identity substrate the provider-trust model and signed status-event
  RFCs will build on.
- Commits OJCP to interoperating with the Web Bot Auth profile (JWKS directory at
  `/.well-known/http-message-signatures-directory`, `Signature-Agent` header, Ed25519). This is
  a bet on an individual IETF draft; the signing layer is designed to coexist with MCP's
  bearer-token authorization so the bet is reversible.
- Follow-up required: (1) implementation PR editing `spec/ojcp-v0.1.bs` and the schemas;
  (2) consent RFC defining `user_mandate`; (3) conformance-suite tests for the new signature MUSTs.

## Alternatives considered

A bespoke OJCP key directory, platform-key-signed `acting_on_behalf_of` as delegation, mTLS,
OAuth client-credentials/bearer tokens, and signing the `AgentDeclaration` JSON blob — all
evaluated and rejected in RFC 0001's *Alternatives considered* section.

## Recusal note

The author of this RFC (Austin Anderson) is also the sole seated steering-committee member
during the bootstrap period and holds a commercial interest via Recruitics' AdaptiveApply. Per
GOVERNANCE.md, the full public 30-day comment window and this written decision record stand in
for independent committee resolution until at least 4 of 7 seats are filled. No objections were
raised during the comment period.
