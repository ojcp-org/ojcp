# 0009 — Occupation codes and binding actions

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0009](../rfcs/0009-occupation-codes-and-binding-actions.md); PR #46. Comment period 2026-10-12 to 2026-11-11.

## Context

Agents could not tell reliably what a job is: titles vary, `occupationalCategory` was free text, and
locations mixed country names, alpha-3 codes and `"Remote"`. Separately, application forms can record
legal commitments (arbitration agreements, background-check authorizations, attestations) that look to an
agent like any other question. Nothing told the agent which answers bind the candidate, and RFC 0008's
standing mandates need that boundary to be explicit.

## Decision

RFC 0009 is **accepted**.

- JobPosting gains `occupationalCategory` as O*NET-SOC `CategoryCode`s with the taxonomy edition, at most
  three, omitted when the provider is unsure. A string value is display text only.
- Locations use ISO 3166-1 alpha-2 and 3166-2 codes; remote reach is stated by country-only Places and
  `remote_policy`, never by `addressLocality: "Remote"`.
- `search_jobs` gains `filters.occupational_category` and returns `occupationalCategory` in summaries.
- `begin_application` returns `binding_actions`: every commitment the submission would record. An empty list
  means none. An absent list, or an unknown type, is treated as binding.
- `submit_application` carries `binding_actions_digest`; providers reject submissions without it when a
  listed action is required, and record no assent.
- EEO self-identification is never a binding action.

**Placement.** The normative text lands in OJCP Core. Occupation codes and binding actions describe jobs and applications for every agent, with or without a mandate. RFCs 0008–0014 were accepted together for OJCP 0.4.

## Consequences

- Agents can filter and scope by occupation instead of guessing from titles.
- Providers that emit country names or alpha-3 codes must switch to alpha-2 to stay conformant.
- Agents that predate this RFC cannot submit through flows that list a required binding action until they
  send `binding_actions_digest`. This is intended.
- Follow-up: implementation PR (spec, the five schemas in *Affected areas*, examples); the eight conformance
  fixtures listed in the RFC; the reference provider emitting codes and alpha-2 locations.

## Alternatives considered

Detailed in RFC 0009's *Alternatives considered*.

## Recusal note

The RFC author (Austin Anderson, Recruitics, Seat 1) declared a commercial interest in the RFC's *Interests* section and recused from the resolution, per the Conflict of Interest rules in [GOVERNANCE.md](../../GOVERNANCE.md#conflict-of-interest). No committee member objected during the comment window, so the RFC is accepted by lazy consensus and no vote was held. Seat 1 records the outcome only.
