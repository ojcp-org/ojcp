# 0005 — Inline identity verification via MCP Apps

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** Austin Anderson (Recruitics, Seat 1)
- **Related RFC / PR:** [RFC 0005](../rfcs/0005-inline-identity-verification-mcp-apps.md); PR #25 (RFC); implementation PR (this change)

## Context

A verification step returned only a `verification_url`. The candidate left the conversation to
complete the verifier's hosted flow and then returned, a context switch at the most sensitive
point of the application. Verification steps are already `human_required`, so rendering the flow
inline removes no agent automation. The MCP Apps extension lets a tool reference a `ui://` resource
that the host renders in a sandboxed iframe, but OJCP gave hosts no way to discover that a verifier
supported this and defined no fallback contract.

## Decision

Inline rendering through MCP Apps is an optional, alternative delivery surface for a verification
step. Verifiers advertise it with a new `embedded_app` value in the verifier manifest's
`proof_delivery_methods`. A `VerificationStep` may carry an optional `ui_resource` (`ui://` URI).
`verification_url` remains required, and no step may be completable only through `ui_resource`.
Proof delivery and validation are unchanged. The verifier's UI runs in its own origin inside the
host's sandbox, and no PII crosses the protocol.

## Consequences

- Hosts that support MCP Apps can keep the candidate in the conversation during verification;
  hosts that do not fall back to `verification_url` with no loss of function.
- Verifiers that declare `embedded_app` take on the obligation to serve a `ui://` resource that
  yields the same proof as their hosted flow and to keep the hosted URL valid.
- Open questions from the RFC remain open and are not resolved by this decision:
  - the exact channel by which an app returns the proof to the host for `agent_submitted` steps
    (returned value versus proxied tool call), to be pinned down against the MCP Apps message
    dialect;
  - whether the verifier manifest should declare the origins and permissions (CSP) its app needs;
  - tracking MCP Apps stabilization; the feature stays optional until host support is broad.

## Alternatives considered

Leaving it to providers with no spec change (no discovery and no fallback contract), using WebMCP
(fits provider-hosted apply pages, not a verifier flow inside a conversation host), and requiring
the app while dropping the link (would break hosts without MCP Apps support). Each is detailed in
RFC 0005's *Alternatives considered*.

## Deviation from the bootstrap-period rule

The bootstrap-period rule in [GOVERNANCE.md](../../GOVERNANCE.md) requires a minimum 30-day
public comment window before a spec-affecting decision is resolved. RFC 0005 was opened and merged
in PR #25 on 2026-09-24 and accepted on 2026-10-08, before its comment period closes. No comments
had been received at the time of acceptance. Every change it makes is optional and additive, so no
existing provider, verifier or agent is affected. The comment period still runs to
**2026-10-24**: comments received in that window will be answered on the RFC PR and resolved as
errata, and this decision may be revisited once the committee is fully seated.

## Recusal note

The RFC author (Austin Anderson, Recruitics) holds Seat 1 and recorded this decision. Recruitics
operates a provider that uses identity verification.
