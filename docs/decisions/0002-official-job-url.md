# 0002 — `url` and `official_job_url` on JobPosting

- **Status:** Accepted
- **Date:** 2026-09-16
- **Decided by:** OJCP Steering Committee, at the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0002](../rfcs/0002-official-job-url.md); PR #8; resolves [Issue #7](https://github.com/ojcp-org/ojcp/issues/7)

## Context

OJCP v0.1 leans on agentic `apply_paths` (direct submission endpoints) and moved away from
plain destination links. As AI-generated phishing listings rise, that removed the candidate's
primary safety workflow — cross-referencing an agent-found vacancy against the employer's
official careers site — and left agents with no web fallback when a direct API endpoint errors.
Some ATS architectures (e.g. SAP SuccessFactors' split RMK/RCM modules) also lack native job/apply
URL fields, making a definitive canonical URL hard to derive from the backend alone.

## Decision

RFC 0002 is **accepted** as the design of record. Two optional, additive string properties will be
added to `schemas/job-posting.json`:

- **`url`** — a general web URL (schema.org/JobPosting), which may point to aggregators or third-party boards.
- **`official_job_url`** (`format: uri`) — the canonical public page on the employer's official careers site or ATS, serving as a candidate-facing trust and verification anchor.

Both are optional and backward-compatible; a v0.1 provider or consumer that ignores them behaves
exactly as before.

## Consequences

- Restores the candidate's ability to manually verify a listing against its official source, and
  gives agents a web fallback when direct API apply fails.
- Composes with [RFC 0001](../rfcs/0001-agent-identity-http-message-signatures.md): an agent SHOULD
  check that the registrable domain of `official_job_url` matches the provider's verified domain
  (manifest signing / Provider Trust / `.well-known/ojcp-keys.json`), turning a spoofable link into
  a cryptographically backed trust anchor. This dependency is one reason 0002 was sequenced after
  0001's acceptance.
- Follow-up required: (1) an implementation PR adding both fields to `schemas/job-posting.json` and
  the corresponding spec prose; (2) a conformance-suite fixture exercising `official_job_url`.

## Alternatives considered

Relying solely on schema.org `url` (rejected — aggregators inject their own URLs, so it cannot
guarantee the canonical employer source) and no fallback URL / status quo (rejected — a single point
of failure on API error, and no candidate-side fraud check). Both are detailed in RFC 0002's
*Alternatives considered*.

## Recusal note

The RFC author (Radu Stoian, Enhance Media) does not hold a steering-committee seat, so no seated
member recused. The decision was recorded at the close of the public comment period per the
bootstrap-period process in [GOVERNANCE.md](../../GOVERNANCE.md).
