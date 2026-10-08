# Changelog

All notable changes to the OJCP specification and governance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Spec site layout** — [spec.ojcp.dev](https://spec.ojcp.dev/) serves the latest specification at the root, and every release keeps a permanent URL built from its tag (`/0.1/`, `/0.2/`, `/0.3/`). Pushing a release tag republishes the site.
- **Diagrams** — the agent-identity sequence shows grammar validation and namespace or delegated binding (replacing the Public Suffix List step); the apply flow shows attribution at `begin_application` and the optional user mandate bound to the application before submit; the agent-submitted verification flow shows inline rendering via MCP Apps.

## [0.3] - 2026-10-08

Minor version. All changes are additive and backward-compatible: the schema `$id`
namespace stays at `/v0.1/`, and `ojcp_version` accepts `"0.1"`, `"0.2"` and `"0.3"`, so
existing providers and agents keep validating.

### Changed

- **`jobLocation` accepts an array of `Place`** — a posting open in more than one location can now state every location the employer accepts, as schema.org itself permits. A single `Place` remains valid, so existing single-location consumers are unaffected. Providers MUST NOT reduce a multi-location posting to one of its locations. Updated in `schemas/job-posting.json`, `schemas/responses/search-jobs.json`, the JobPosting section of `spec/ojcp-v0.1.bs`, and `examples/responses/search-response.json`. Reported with coverage figures in [#19](https://github.com/ojcp-org/ojcp/issues/19).
- **Agent identity binding no longer uses the Public Suffix List** (RFC 0001 erratum E1, [#11](https://github.com/ojcp-org/ojcp/issues/11)). A signed `agent_id` binds when the reversed `Signature-Agent` host prefixes it on a label boundary (`wayfarer.ai` → `ai.wayfarer.*`), which closes the hole that let any subdomain claim every `agent_id` under its registrable domain. A verified `agent_id` must be lowercase LDH hostname labels. Providers MUST NOT use an unverified `agent_id` for allowlists, rate limiting or session binding. Updated in the spec's Agent Identity, Error Responses, Security and IANA sections. **Migration:** an agent that signs from a host outside its own namespace — a sibling subdomain such as `keys.eu.wayfarer.ai` signing as `ai.wayfarer.agent`, which bound under the PSL rule — must either sign from `wayfarer.ai` / `agent.wayfarer.ai` or list that origin in `https://agent.wayfarer.ai/.well-known/ojcp-agent.json`.
- **`restricted_feed`** in `auth.agent_signatures.required_for` also covers any `search_jobs` request that would return restricted or private jobs, and a provider that gates any part of its feed MUST list it. The manifest example declares `restricted_feed` in `optional_scopes` and `agent_signatures`.
- **`user_mandate`** on `AgentDeclaration` is now fully specified (see *User mandates* below); its schema description states the profile instead of deferring it.
- **Spec structure** — "Open Questions" is replaced by a **Scope** section stating what the specification deliberately does not define (form skill descriptors, the user-mandate credential format, registry operations, verifier internals, conversion reporting). The Versioning section states the current version and the minor-version compatibility rule. Examples now declare `ojcp_version` `"0.3"`.
- The eligibility-gates design record is renumbered from 0005 (a duplicate number) to 0006.

### Added

- **Delegated agent signing** — `/.well-known/ojcp-agent.json`, served at the host an `agent_id` names, authorizes third-party `Signature-Agent` origins to sign as it. Schema in `schemas/agent-identity.json`, example in `examples/agent-identity.json`.
- **`agent_id_malformed`** error code, in the spec's error table and `schemas/responses/error.json`.
- **Provider-derived attribution** (RFC 0007). A provider that declares attribution credits each application from evidence it already holds, in order: a valid provider-issued `attribution_ref`, then the caller's most recent impression of that job within the attribution window (last touch), then none. Agents that search and apply under the same authenticated or verified identity are credited without relaying anything. Providers MUST NOT treat a missing `source_attribution` as unattributed when an impression matches, and MUST NOT fingerprint callers. New optional fields: `attribution_ref` on `search_jobs` results and the `get_job_detail` response, `source_attribution.attribution_ref` on `begin_application` and `submit_application`, an `attribution` outcome on the `begin_application` response, and an `attribution` manifest block (`supported`, `methods`, `window_days`). New Attribution section in `spec/ojcp-v0.1.bs`; updated schemas, `examples/manifest.json`, `examples/responses/search-response.json`, `examples/responses/begin-application-verification.json`, and `docs/proposal.md`. All additions are optional, and `referrer` and `reference_id` keep their meaning.
- **User mandates** — a normative profile for `AgentDeclaration.user_mandate`: a key-bound credential (SD-JWT VC RECOMMENDED) that binds the exact agent signing key (`cnf.jkt`) and the consuming resource server (`aud`) to a canonical `ojcp_action` statement; on multi-tenant ATSs the statement also binds the employer, and for `submit_application` it binds the `application_id`, a JCS/SHA-256 candidate-data digest, and a provider-issued single-use `mandate_nonce` (new optional field on the `begin_application` response). Covers mandate-admission policy, independent decisions for platform identity, candidate identity and user authorization, a fixed fail-closed verification order, atomic `jti`/nonce consumption, exact-key binding across key rotation, and revocation. New error code `user_mandate_required`, returned whether a required mandate is missing or fails verification. Decision record 0003.
- **Agent-scoped job visibility** — `search_jobs` accepts an optional `agent_declaration`, and JobPosting gains an optional `visibility` block (`tier`: `public` | `restricted` | `private`; `audience`: permitted `agent_id`s), enforced server-side against a verified `agent_id`. `private` jobs also require the `restricted_feed` scope. Anonymous or unverified callers see only `public` jobs; `total_results`, `open_roles_count` and every other count include only visible jobs; `get_job_detail` and `begin_application` answer a non-visible job with `job_not_found`; `visibility.audience` is never returned. Gating MUST depend on the agent's identity, never on candidate characteristics. New example `examples/job-posting-restricted.json`. Decision record 0004.
- **Inline identity verification via MCP Apps** — optional `ui_resource` (`ui://` URI) on `VerificationStep`, and an `embedded_app` value in the verifier manifest's `proof_delivery_methods`. `verification_url` remains required as the fallback; proof delivery and validation are unchanged. Decision record 0005.
- **Eligibility gates** — an optional `eligibility` block on JobPosting with three hard gates: `visa_sponsorship` (`offered`, `not_offered`, `unspecified`), `relocation` (`offered`, `not_offered`, `required`, `unspecified`) and `security_clearance` (`required`, `not_required`, `unspecified`). An absent or `unspecified` gate MUST NOT be read as a negative, and agents MUST ignore enum members they do not recognise. Decision record 0006.
- **`user_mandate_required`** error code, in the spec's error table and `schemas/responses/error.json`.
- `ojcp_version` accepts `"0.3"` in the manifest and all tool response schemas (`"0.1"` and `"0.2"` remain valid).
- Interoperability table entries for MCP Apps, HTTP Message Signatures / Web Bot Auth, and SD-JWT VC.

## [0.2] - 2026-09-22

Minor version bump. All changes are additive and backward-compatible; the schema
`$id` namespace stays at `/v0.1/` and `ojcp_version` now accepts both `"0.1"` and
`"0.2"`, so existing providers keep validating.

### Added

- **Agent identity** — verifiable `agent_id` via HTTP Message Signatures, specified in the spec's Agent Identity section and implemented in the reference provider. `auth.agent_signatures` on the manifest and optional `user_mandate` on the agent declaration. Decision recorded in `docs/decisions/0001-agent-identity.md`.
- **`url` and `official_job_url` on JobPosting** — a candidate-facing trust/verification anchor and web fallback, in both `schemas/job-posting.json` and the spec prose. Decision recorded in `docs/decisions/0002-official-job-url.md`.
- `ojcp_version` accepts `"0.2"` in the manifest and all tool response schemas (0.1 still valid).
- `GOVERNANCE.md` — steering committee structure (7 founding seats), bootstrap period, decision-making, conflict-of-interest policy, patent non-assertion covenant, infrastructure succession plan
- `CODE_OF_CONDUCT.md` — adopts Contributor Covenant 2.1; bootstrap-period dual-review enforcement
- `ADOPTERS.md` — public list of adopters across Steering Members / Implementing / Evaluating tiers
- `.github/ISSUE_TEMPLATE/nomination.md` — steering committee nomination template
- `docs/decisions/` — Architecture Decision Record (ADR) directory with template

### Changed

- **Agent Identity (RFC 0001 implementation)** — new normative "Agent Identity" section in `spec/ojcp-v0.1.bs` defining verifiable `agent_id` via RFC 9421 HTTP Message Signatures (Web Bot Auth wire profile: JWKS directory, `Signature-Agent` header, Ed25519, PSL-based origin binding, replay/expiry rules, new signature error codes, and platform-attestation + user-mandate delegation for personal agents)
- `schemas/manifest.json` — added `auth.agent_signatures` (supported / algorithms / required_for)
- `schemas/agent-declaration.json` — added optional `user_mandate` (user-rooted authorization; schema TBD by the consent RFC)
- `examples/agent-signed-request.http` — worked signed-request example
- `CONTRIBUTING.md` — DCO sign-off now distinguishes between CC BY 4.0 (spec/schemas/examples/docs) and Apache 2.0 (code/tooling/CI) contributions
- `CONTRIBUTING.md` — corrected GitHub→GitHub and Pull Request→Pull Request terminology
- `.github/ISSUE_TEMPLATE/rfc-proposal.md` — added comment-period and resolution tracking fields
- WebMCP imperative API — `navigator.modelContext` → `document.modelContext` across spec, README, and proposal, tracking the WebML CG decision to scope tools to the active `Document` ([webmcp#173](https://github.com/webmachinelearning/webmcp/issues/173), [crbug 515330187](https://issues.chromium.org/issues/515330187))

## [0.1] - 2026-03-06

### Added

- Initial draft specification
- Job Manifest (`/.well-known/ojcp.json`) format
- Core MCP-compatible tools: `search_jobs`, `get_job_detail`, `get_employer_context`, `begin_application`, `check_application_status`
- Data schemas: JobPosting (extends schema.org), CandidateContext, AgentDeclaration
- Apply path taxonomy: `ats_direct`, `provider_hosted`, `platform_native`, `email`, `external_redirect`
- WebMCP integration pattern
- Two-layer feed discovery model (well-known manifest + OJCP Registry)
- Security and privacy considerations
- JSON Schemas for all core data types
- Example manifest, job posting, and search response
