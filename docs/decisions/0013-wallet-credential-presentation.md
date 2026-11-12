# 0013 — Wallet credential presentation

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0013](../rfcs/0013-wallet-credential-presentation.md); PR #44. Comment period 2026-10-12 to 2026-11-11.

## Context

Employers want to check employment, education or licences during an application, but the agent should
never handle those records. The existing identity-verification flow relays proofs through the agent and binds
sessions to `application_id`.

## Decision

RFC 0013 is **accepted**.

- Providers can include *wallet steps*: an OpenID4VP request the candidate answers from their own wallet,
  straight to the provider.
- The presentation is bound to the application by a contact confirmation and fresh nonces the agent never
  sees; the agent learns only the step's status.
- `VerificationStep` gains `wallet_request` and the types `professional_license` and `certification`;
  `application_status` gains `deferred_steps` and `verification_deadline`; the manifest gains
  `wallet_presentation`.
- Wallet steps are relayed only for providers at the derived `verified` or `audited` tier (RFC 0010).

**Placement.** The normative text lands in the optional **OJCP Candidate Verification** extension. Core keeps `verification_steps` and the step-status fields as hooks. RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- Candidates prove facts without the agent or OJCP ever carrying the claims.
- 0.3 consumers validating `VerificationStep.type` against the closed enum reject the two new types; agents
  treat unknown types as human-required steps.
- Follow-up: implementation PR; §12 fixtures; an Oblivious HTTP client for first status-list fetches.

## Alternatives considered

Detailed in RFC 0013's *Alternatives considered*.

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
