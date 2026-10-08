# 0006 — Eligibility gates

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** Austin Anderson (Recruitics, Seat 1)
- **Related RFC / PR:** [RFC 0006](../rfcs/0006-eligibility-gates.md); PR #24 (RFC); resolves [Issue #19](https://github.com/ojcp-org/ojcp/issues/19) item 4

## Context

Some conditions decide whether an application can succeed at all: whether the employer will
sponsor a work visa, whether it supports or requires relocation, and whether the role requires a
security clearance. Postings often state these and providers often extract them, but OJCP had no
field to carry them, so an agent filtering on a candidate's behalf could not see them. The RFC's
evidence, from one catalogue of 6,064,722 open postings, shows that for each gate the "not stated"
population is far larger than the stated one, and that security clearance is never stated as not
required. Reading "not stated" as "no" would therefore assert restrictions employers never wrote.

The RFC was numbered 0005, a number also used by another RFC. It was renumbered to 0006 on
2026-10-08 because it was merged later (PR #24, merged 2026-10-06).

## Decision

`JobPosting` gains an optional `eligibility` object with three optional gates, each a closed enum
that includes a "not stated" member: `visa_sponsorship` (`offered`, `not_offered`, `unspecified`),
`relocation` (`offered`, `not_offered`, `required`, `unspecified`) and `security_clearance`
(`required`, `not_required`, `unspecified`). A gate that is absent or `unspecified` MUST NOT be
read as a negative. Agents MUST ignore enum members they do not recognise rather than rejecting
the posting, per Schema Extensibility.

## Consequences

- Agents can filter on the hard gates in a comparable way across providers.
- Providers that omit `eligibility` remain conforming, and agents that ignore it behave as before.
- Gates may gain states in later revisions without invalidating existing postings.
- Softer descriptors (company size, posting language, English level, education level, minimum
  experience) are out of scope and remain for extensions.

## Alternatives considered

Booleans with absence meaning "unknown", leaving the gates in `agent_notes` (the status quo), a
general-purpose facet bag, and including the softer descriptors. Each is detailed in RFC 0006's
*Alternatives considered*.

## Deviation from the bootstrap-period rule

The bootstrap-period rule in [GOVERNANCE.md](../../GOVERNANCE.md) requires a minimum 30-day
public comment window before a spec-affecting decision is resolved. RFC 0006's comment period
opened on 2026-09-23 and runs to **2026-10-23**; it was accepted on 2026-10-08, before that window
closed. No comments had been received on the RFC PR at the time of acceptance. Every change it
makes is optional and additive, so no existing provider or agent is affected. Comments received
through 2026-10-23 will be answered on the RFC PR and resolved as errata, and this decision may be
revisited once the committee is fully seated.

## Recusal note

The RFC author (Ilya Strelov, freehire) holds no steering seat. Recruitics (Seat 1), which recorded
this decision, has no specific commercial interest in this RFC beyond operating a provider.
