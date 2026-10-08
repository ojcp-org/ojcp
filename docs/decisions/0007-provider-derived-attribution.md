# 0007 — Provider-derived attribution

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** Austin Anderson (Recruitics, Seat 1)
- **Related RFC / PR:** [RFC 0007](../rfcs/0007-provider-derived-attribution.md); PR #31 (RFC); implementation PR #32

## Context

OJCP's only attribution mechanism was `source_attribution`: values the agent self-reports on
`begin_application` and `submit_application`. For a provider to tie an application to the search
that produced it, the agent had to carry an opaque value from a `search_jobs` result into a later
call, through the model's context. General-purpose MCP clients do not do this reliably. The spec
also defined no provider-issued reference, so providers overloaded `reference_id`, which the spec
describes as the *source's* own reconciliation value. Meanwhile, the provider already holds better
evidence: the caller's authenticated or verified identity, and the record of which jobs it served
to that caller.

## Decision

Attribution is derived by the provider. A provider that declares attribution credits an application
when it handles `begin_application`, in order: a valid provider-issued `attribution_ref`, then the
caller's most recent impression of the job within the attribution window (last touch), then none.
Impression matching applies only to authenticated or verified identities; fingerprinting is
forbidden. `attribution_ref` is a new optional field on search and detail results, needed only when
the identity that surfaced a job differs from the one that applies. Providers declare support in an
optional manifest `attribution` block and may report the outcome on `begin_application`.

## Consequences

- Agents that search and apply under the same authenticated or verified identity are credited
  without relaying anything; nothing in an agent's tool calls has to change.
- Anonymous callers can be credited only by relaying `attribution_ref`. That is deliberate: the
  only alternative is fingerprinting.
- A handoff between two identities still needs the reference to travel. The spec makes that a
  SHOULD for the agent that passes the job on.
- Reporting conversions of off-protocol applications from the employer's ATS back to the provider
  is out of scope, and may be taken up in a companion specification.
- Follow-up: conformance vectors for the crediting order, the window boundary, foreign references,
  and anonymous callers.

## Alternatives considered

Requiring agents to relay `reference_id` (the status quo, which clients do not follow), a request
header carrying the token (generic MCP clients do not replay server-issued headers), the MCP session
as the join key (MCP is moving to stateless transport), and IP or device matching for anonymous
callers (fingerprinting). Each is detailed in RFC 0007's *Alternatives considered*.

## Deviation from the bootstrap-period rule

The bootstrap-period rule in [GOVERNANCE.md](../../GOVERNANCE.md) requires a minimum 30-day
public comment window before a spec-affecting decision is resolved. RFC 0007 was accepted on
2026-10-08, the day its comment period opened, because providers needed a standard attribution
mechanism immediately. Every change it makes is optional and additive, so no existing provider or
agent is affected. The comment period still runs to **2026-11-07**: comments received in that
window will be answered on the RFC PR and resolved as errata, and this decision may be revisited
once the committee is fully seated.

## Recusal note

The RFC author (Austin Anderson, Recruitics) holds Seat 1 and recorded this decision. Recruitics
operates a provider that bills on attributed applications, so it has a commercial interest in this
decision.
