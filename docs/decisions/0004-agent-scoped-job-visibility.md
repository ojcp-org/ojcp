# 0004 — Agent-scoped job visibility in `search_jobs`

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0004](../rfcs/0004-agent-scoped-job-visibility.md); PR #16 (RFC)

## Context

`search_jobs` returned the same job set to every caller, so a provider could not surface
partner-exclusive, employer-preferred, embargoed or tiered inventory to specific agents. Providers
could already allowlist `agent_id`s (Employer Controls) and gate capabilities behind
`auth.optional_scopes`, and [RFC 0001](../rfcs/0001-agent-identity-http-message-signatures.md)
made `agent_id` cryptographically verifiable. What was missing was a way for `search_jobs` to know
which agent is asking, and a way for a job to declare who may see it.

RFC 0004 was opened in PR #16 on 2026-08-28 and merged on 2026-09-03. Its comment period ran from
2026-08-28 to 2026-09-27. The only comments on the PR were from the maintainer ("Looking!" and
"Looks great, Tom! Merging the RFC.").

## Decision

RFC 0004 is **accepted** as the design of record. Three optional, backward-compatible additions:

- **`agent_declaration`** on `search_jobs` input. Absent, unsigned or unverifiable declarations are
  treated as anonymous, and anonymous callers receive only `public` jobs.
- **`visibility`** on `JobPosting`: `tier` (`public` default, `restricted`, `private`) and
  `audience` (permitted `agent_id`s). `restricted` jobs are returned only to a verified `agent_id`
  in `audience`; `private` additionally requires the provider-granted `restricted_feed` scope, and
  their existence is not disclosed to unauthorized callers.
- **Manifest `auth`**: `restricted_feed` in `optional_scopes`, and a provider that gates its feed
  lists `restricted_feed` in `agent_signatures.required_for`.

Providers evaluate `visibility` server-side, count only caller-visible jobs in `total_results`, leak
no count, existence or field of non-visible jobs, and treat an unsupported `visibility` block as
`public`. Gating is based on the agent's identity and the provider's relationship with it, never on
candidate characteristics, and does not relieve providers of equal-opportunity advertising
obligations.

Applying the RFC's non-disclosure rule conservatively, the implementation also requires that
`get_job_detail` and `begin_application` answer a non-visible `job_id` exactly as a nonexistent job
(`job_not_found`), and that `visibility.audience` is never returned in `search_jobs` or
`get_job_detail` responses, since it would reveal other agents' identities. Returning
`visibility.tier` is optional.

## Consequences

- Providers can serve per-job partner inventory through the standard tool instead of
  provider-specific custom tools.
- Access control is only as strong as identity verification: the gate depends on RFC 0001, and
  providers that gate a feed must verify signed requests.
- Agents can no longer assume a provider's result set is the same for every caller, and must not
  treat a missing job as proof it does not exist.
- Implemented in spec § Agent-Scoped Visibility, `schemas/tools/search-jobs-input.json`,
  `schemas/job-posting.json` and the `auth.optional_scopes` description in `schemas/manifest.json`
  (the `restricted_feed` token already existed in `agent_signatures.required_for`).

## Alternatives considered

A provider-specific custom tool (rejected as a standard — no interoperable contract; acceptable as
an interim migration path), whole-feed scopes without per-job labels (rejected — cannot express
per-job audiences), and gating on a self-asserted `agent_id` (rejected — trivially spoofable). All
are detailed in RFC 0004's *Alternatives considered*.

## Recusal note

Both RFC authors hold steering-committee seats: Tom Chevalier (Tink) holds Seat 7, and Austin
Anderson (Recruitics) holds Seat 1 and recorded this decision. No member recused. The decision was
recorded after the close of the public comment period per the bootstrap-period process in
[GOVERNANCE.md](../../GOVERNANCE.md).
