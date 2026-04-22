# Open Job Context Protocol (OJCP)
### A Standard for Agent-Consumable Job Feeds

> Draft v0.1 — March 2026
>
> Recruitics, Inc.
>
> Author: Austin Anderson, CTO, Recruitics
>
> Status: **Open for Community Contribution**

---

## Abstract

The way candidates discover and apply for jobs is undergoing its most significant shift since the rise of the internet job board. AI agents — acting on behalf of candidates, recruiters, or autonomous workflows — are beginning to browse, filter, evaluate, and apply to jobs without direct human navigation. Simultaneously, employer-side agents are screening, scoring, and responding to candidates in automated pipelines.

The infrastructure connecting these two sides — job feeds — was designed for humans and web crawlers. It is not fit for agents.

**The Open Job Context Protocol (OJCP)** defines a standard for expressing job opportunities, employer context, and application affordances in a form that AI agents can discover, reason over, and act upon. It is designed to interoperate with the emerging LLM tool-use ecosystem, including the Model Context Protocol (MCP), WebMCP, and structured data conventions like JSON-LD and schema.org.

Recruitics is proposing this specification as an **open standard** and inviting job boards, ATS vendors, recruitment technology companies, browser/agent platform developers, and identity verification providers to contribute.

---

## Motivation

### The Agent Transition Is Underway

AI assistants are moving from answering questions to completing tasks. General-purpose assistants (from Apple, Google, OpenAI, and others) will increasingly act as job-seeking proxies — reading a candidate's resume, understanding their preferences, and autonomously browsing opportunities, comparing them, and initiating applications. This is not speculative: early versions of this behavior are already live in products like Claude's computer use, OpenAI Operator, and Gemini's agentic flows.

On the employer side, recruiters are deploying AI agents to source candidates, manage pipelines, and draft communications. These agents need structured, semantically rich data about candidate pools and job requirements — not HTML scraped from a careers page.

### Existing Formats Are Not Agent-Ready

Current job feed standards — XML-based job feeds (Indeed, ZipRecruiter), JSON feeds, and even schema.org `JobPosting` — were built to serve:

- Web crawlers for SEO indexing
- Programmatic bidding systems
- Human-readable job board listings

They were **not** designed to:

- Expose callable actions (apply, save, ask a question)
- Provide employer context rich enough for an agent to reason about culture, team, or fit
- Signal what application paths are available and whether they support agent submission
- Be securely discoverable and consumable by an LLM's tool-use interface
- Express dynamic state (role urgency, budget remaining, application volume)
- Verify that a real human stands behind an agent-submitted application

### Author Background

The author works at the intersection of job feeds, media buying, candidate tracking, and application technology, with direct exposure to the major job boards and enterprise ATS systems that sit at the end of every apply flow.

That experience informs this proposal, but the standard must be shaped by the broader community — job boards, ATS vendors, agent platforms, identity verification providers, and employers alike.

---

## Definitions

- **Job Context Provider**: A server, web application, or API endpoint that publishes job opportunities and associated context in OJCP format.
- **Job Agent**: An AI agent or LLM-powered application that consumes OJCP-formatted feeds to discover, evaluate, or act on job opportunities on behalf of a user or autonomous workflow.
- **Job Manifest**: A machine-readable JSON document describing a job context provider's available tools, endpoints, and capabilities.
- **Job Tool**: An MCP-compatible callable function exposed by a Job Context Provider (e.g., `search_jobs`, `get_job_detail`, `begin_application`, `submit_application`).
- **Candidate Context**: Structured data about a candidate (skills, experience, preferences, location) passed by a Job Agent when calling Job Tools. Consent-scoped and PII-minimized.
- **Apply Path**: A declared, structured description of how a candidate can apply for a role — including the mechanism, required fields, expected completion time, and whether identity verification is required.
- **Agent Declaration**: Structured self-identification that agents provide when initiating applications. Enables employer audit trails, rate limiting, and abuse prevention.
- **Identity Verifier**: A third-party service (e.g., ID.me, Clear) that performs identity verification and issues cryptographic proofs. External to OJCP.
- **Verification Step**: A discrete verification action required before an application can proceed, typically requiring human interaction (face scan, document upload, etc.).
- **Verification Proof**: A signed JWS artifact issued by an Identity Verifier after successful verification. Contains no PII — only a subject hash, timestamps, and the verifier's signature.

---

## Design Goals

1. **Agent-native, not human-last.** OJCP is designed first for LLM tool-use. Human readability is a secondary concern.
2. **MCP-interoperable.** Job Tools exposed via OJCP should be callable by any MCP-compatible agent with no translation layer.
3. **WebMCP-compatible.** For browser-native agents (Apple Intelligence, browser assistants), OJCP tools can be registered via `navigator.modelContext` (imperative API) or annotated in HTML forms (declarative API).
4. **Schema.org backward-compatible.** Existing `JobPosting` schema.org markup is preserved and extended, not replaced.
5. **Privacy-preserving.** Candidate context passed to Job Tools must be explicitly consented to and minimized by default. Identity verification proofs carry no PII — only cryptographic attestations.
6. **Employer-controlled.** Employers retain the ability to restrict, rate-limit, audit agent interactions, and require identity verification on any apply path.
7. **Feed-forward.** The spec anticipates agentic apply flows, not just discovery — including multi-step application orchestration with identity verification.

---

## Specification

### 1. The Job Manifest (`/.well-known/ojcp.json`)

Every OJCP-compliant job context provider exposes a manifest at a well-known path, similar to how OAuth exposes `/.well-known/openid-configuration`.

```json
{
  "ojcp_version": "0.1",
  "provider": {
    "name": "Acme Corp Careers",
    "employer_id": "acme-corp",
    "logo_url": "https://careers.acme.com/logo.png",
    "description": "Acme Corp is a global leader in industrial innovation.",
    "culture_context": "We operate with a bias for action and invest heavily in internal mobility.",
    "industries": ["manufacturing", "engineering", "logistics"],
    "hq_location": { "city": "Chicago", "state": "IL", "country": "US" }
  },
  "feed_endpoints": {
    "search": "https://careers.acme.com/ojcp/v1/search",
    "detail": "https://careers.acme.com/ojcp/v1/jobs/{job_id}",
    "apply_init": "https://careers.acme.com/ojcp/v1/apply/init"
  },
  "mcp_endpoint": "https://careers.acme.com/ojcp/mcp",
  "tools": [
    "search_jobs", "get_job_detail", "get_employer_context",
    "begin_application", "submit_application", "check_application_status"
  ],
  "apply_paths": ["ats_direct", "provider_hosted"],
  "auth": {
    "required": false,
    "optional_scopes": ["candidate_context", "application_tracking"]
  },
  "rate_limits": {
    "anonymous_rps": 10,
    "authenticated_rps": 100
  },
  "supported_verifiers": [
    {
      "verifier_id": "id.me",
      "verifier_name": "ID.me",
      "verifier_manifest_url": "https://id.me/.well-known/ojcp-verifier.json",
      "verification_types": ["identity", "government_id"],
      "required_for_paths": ["ats_direct"]
    }
  ]
}
```

This manifest is the entry point for any agent discovering whether a careers site or job board is OJCP-compliant.

---

### 2. Job Tools (MCP-Compatible)

OJCP defines six standard MCP-compatible tools. Providers MUST implement at least `search_jobs`. All other tools are RECOMMENDED.

#### `search_jobs`

Search for open job opportunities. Returns a ranked list of jobs matching the provided criteria. When `candidate_context` is provided, results include `fit_score` and `fit_rationale`.

```json
{
  "name": "search_jobs",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": { "type": "string" },
      "location": { "type": "object", "properties": { "city": {}, "state": {}, "country": {}, "remote_ok": {}, "radius_miles": {} } },
      "filters": { "type": "object", "properties": { "employment_type": {}, "salary_min": {}, "salary_max": {}, "experience_level": {}, "posted_within_days": {} } },
      "candidate_context": { "$ref": "CandidateContext" },
      "pagination": { "type": "object", "properties": { "limit": {}, "offset": {} } }
    },
    "required": ["query"]
  }
}
```

#### `get_job_detail`

Retrieve full details for a specific job posting, including responsibilities, qualifications, compensation, team context, and available apply paths.

#### `get_employer_context`

Retrieve contextual information about an employer — culture, team structure, benefits, and hiring practices.

#### `begin_application`

Initiate an application for a job. Returns an apply path descriptor including required fields, the preferred apply mechanism, and a session token for multi-step apply flows. May include `screening_questions` — questions the candidate must answer (with optional validation constraints: `min_length`/`max_length`, `pattern`, `min`/`max`), whose answers are submitted via `application_data` in `submit_application`. When the selected apply path requires identity verification, returns `status: "pending_verification"` with a `verification_steps` array describing the required verification actions. Accepts optional `source_attribution` for traffic source tracking.

#### `submit_application`

Submit a previously initiated application with application data, verification proofs, and/or candidate context. Accepts `application_data` (screening question answers, cover letter, resume reference, custom ATS fields), `verification_proofs` (required for `"agent_submitted"` steps; omitted for `"provider_managed"`), `candidate_context`, `agent_declaration`, and `source_attribution`. Providers validate each proof's JWS signature against the verifier's published JWKS before accepting the application.

#### `check_application_status`

Check the status of a previously initiated application. Statuses include: `initiated`, `pending_submission`, `pending_verification`, `submitted`, `verification_failed`, `received`, `reviewing`, `interview_scheduled`, `offer_extended`, `rejected`, `withdrawn`.

#### Custom Tools

Providers MAY expose additional tools using namespaced names (e.g., `acme:get_referral_link`). Custom tools are self-described via MCP's native `tools/list` method.

---

### 3. Core Data Schemas

#### `JobPosting` (extends schema.org/JobPosting)

OJCP extends schema.org's `JobPosting` with agent-specific fields: `skills_required`, `skills_preferred`, `team_context`, `urgency`, `application_volume_signal`, `requisition_id`, `department`, `hiring_manager`, `remote_policy`, `agent_notes`, and `apply_paths`. Each apply path declares `supports_agent_submission`, and optionally `requires_verification`, `accepted_verifiers`, and `product_name`.

```json
{
  "@context": ["https://schema.org", "https://ojcp.dev/context/v1"],
  "@type": "JobPosting",
  "ojcp_id": "careers.acme.com:swe-42091",
  "title": "Senior Software Engineer, Platform",
  "employer": { "@type": "Organization", "name": "Acme Corp", "ojcp_employer_id": "acme-corp" },
  "datePosted": "2026-02-28",
  "employmentType": "full_time",
  "baseSalary": { "currency": "USD", "minValue": 140000, "maxValue": 185000 },
  "skills_required": ["Go", "Kubernetes", "distributed systems"],
  "urgency": "high",
  "apply_paths": [
    {
      "type": "provider_hosted",
      "url": "https://careers.acme.com/apply/swe-42091",
      "required_fields": ["resume", "work_authorization"],
      "supports_agent_submission": true
    }
  ]
}
```

#### `CandidateContext`

Consent-scoped candidate profile. Agents MUST NOT transmit candidate data beyond the declared `consent_scope`. Providers MUST ignore any field that exceeds the declared scope. Standard scopes and their permitted fields:

| Scope | Fields permitted (cumulative) |
|---|---|
| `search_personalization` | `skills`, `experience_years`, `location_preference`, `employment_type_preference` |
| `fit_scoring` | + `current_title`, `salary_expectation`, `work_authorization`, `resume_embedding_hash` |
| `application_prefill` | + `name`, `email`, `resume_url` |
| `full_profile` | All fields, no restrictions |

#### `AgentDeclaration`

Agent self-identification for audit trails and rate limiting. Includes `agent_id` (reverse-domain notation), `acting_on_behalf_of`, `interaction_mode`, and optional `user_consent_token`.

#### `VerificationStep`

A discrete verification action the candidate must complete. Includes `step_id`, `type` (identity, government_id, biometric, background_check, etc.), `verifier_id`, `verification_url`, `human_required` flag, and `proof_delivery` (`"agent_submitted"` or `"provider_managed"`). The `proof_delivery` field determines whether the agent must collect and submit the proof, or the provider handles it directly. The agent cannot complete steps where `human_required` is true.

#### `VerificationProof`

A signed JWS artifact issued by an Identity Verifier. Contains no PII. The `proof_token` is a JWS compact serialization whose payload MUST include the claims: `iss` (verifier), `aud` (provider or `"*"`), `sub` (SHA-256 subject hash), `iat`, `exp`, and `nonce` (set to the `application_id`). The nonce is always required to prevent replay attacks. `subject_hash` is required in the proof envelope. ES256 signing is RECOMMENDED; ES384, RS256, and RS384 are also permitted.

#### `VerifierManifest`

Discovery document hosted by verifiers at `/.well-known/ojcp-verifier.json`. Declares `verification_types`, `proof_format` (`jws` for v0.1; encrypted formats may be added in future versions), `signing_algorithms`, `public_keys_url` (JWKS endpoint), `proof_ttl_seconds`, and `proof_delivery_methods` (`callback`, `redirect`, `polling`).

---

### 4. Identity Verification

As AI agents begin submitting applications on behalf of candidates, employers increasingly need to verify that a real human stands behind each submission. OJCP defines how agents discover, orchestrate, and submit identity proofs without PII ever flowing through the protocol.

**The flow:**

1. Agent calls `begin_application` — provider creates a verification session with each required verifier, then returns `status: "pending_verification"` with `verification_steps` (each declaring a `proof_delivery` mode).
2. Agent presents the `verification_url` to the candidate (opens browser, deep link).
3. Candidate completes verification with the Identity Verifier (face scan, ID upload, etc.).
4. Proof delivery depends on the step's `proof_delivery` mode:
   - **`agent_submitted`** (default) — Verifier delivers the proof to the agent (via redirect or polling). Agent calls `submit_application` with the proof(s) and session token.
   - **`provider_managed`** — Verifier delivers the proof directly to the provider (via server callback or iframe postMessage). Agent polls `check_application_status` until verification completes, then calls `submit_application` without proofs.
5. Provider validates each proof — signature against JWKS, issuer, audience, expiry, nonce.
6. Application accepted — status transitions to `submitted`.

**Key properties:**

- **No PII through OJCP.** Biometric data, government IDs, names, and dates of birth remain with the verifier. Only cryptographic proofs flow through the protocol.
- **No replay.** Every proof includes a `nonce` (the `application_id`), binding it to a specific application session. Proofs cannot be replayed across applications. Wildcard audience (`aud: "*"`) allows submission to any provider but still requires a matching nonce.
- **Multi-verifier.** Apply paths can require multiple verifiers (e.g., ID.me for identity + Checkr for background check). Each returns an independent proof.
- **Session initiation.** When `begin_application` triggers verification, the provider creates a session with each verifier by POSTing to their `verification_endpoint` with `provider_id`, `nonce`, and a `callback_url` (for provider-managed) or `redirect_url` (for agent-submitted). The verifier returns a session-scoped `verification_url`.
- **Provider validation.** Providers MUST validate JWS signatures against the verifier's JWKS, check all required claims (`iss`, `aud`, `sub`, `iat`, `exp`, `nonce` when present), and reject expired or mismatched proofs.

---

### 5. WebMCP Integration

For browser-native agents, providers can register OJCP tools via two complementary WebMCP APIs:

**Imperative API** — Register tools programmatically via `navigator.modelContext.registerTool()`. Providers should unregister tools when they are no longer applicable to the current page.

**Declarative API** — Annotate HTML forms with `toolname`, `tooldescription`, and `toolparamdescription` attributes. The browser translates annotated forms into structured tools. Providers detect agent submissions via `SubmitEvent.agentInvoked` and return structured results via `SubmitEvent.respondWith()`.

Both APIs MUST conform to the same input schemas as MCP-served tools.

---

### 6. Feed Discovery

**Layer 1: Well-Known Manifest** — Any site hosting jobs exposes `/.well-known/ojcp.json`. Agents and browsers probe this endpoint to discover OJCP capabilities.

**Layer 2: OJCP Registry** — A public registry at `registry.ojcp.dev` indexes verified OJCP providers. The registry exposes an MCP tool `find_ojcp_providers` for agent-driven discovery by industry, location, or employer name.

---

### 7. Apply Path Interoperability

OJCP normalizes the fragmented landscape of application mechanisms:

| Type | Description | Agent Submission |
|---|---|---|
| `ats_direct` | Apply via ATS (Workday, Greenhouse, Lever, etc.) | Varies by ATS |
| `provider_hosted` | Provider controls the apply flow and delivers to ATS | Full support |
| `platform_native` | Third-party platform owns the flow (e.g., Indeed Apply, Easy Apply) | Limited |
| `email` | Legacy email-based application | None |
| `external_redirect` | Redirect to opaque external page | None |
| `custom` | Catch-all for non-standard mechanisms | Varies |

Apply paths MAY declare `requires_verification: true` and `accepted_verifiers` to require identity verification before agent submission. A `form_skill_url` field can reference a companion form skill descriptor to teach agents how to fill out complex forms.

### 8. Source Attribution

Both `begin_application` and `submit_application` accept an optional `source_attribution` object:

| Field | Description |
|---|---|
| `referrer` | The source that referred the candidate (e.g., domain name, platform identifier) |
| `reference_id` | Opaque token the source can use for reconciliation (e.g., click ID, session ID) |

This enables job boards and aggregators to track referral value without baking ad-tech semantics into the protocol. Analogous to HTTP's `Referer` header or email's `List-Unsubscribe`.

---

## Relationship to Existing Standards

| Standard | Relationship |
|---|---|
| **MCP (Model Context Protocol)** | OJCP tools are valid MCP tools. Any MCP client can call OJCP-compliant endpoints. |
| **WebMCP** | OJCP tools can be registered via the imperative API (`navigator.modelContext.registerTool()`) or the declarative API (`toolname`/`tooldescription` form attributes) for browser agent access. |
| **schema.org/JobPosting** | OJCP's `JobPosting` extends schema.org. Existing structured data remains valid; OJCP adds agent-specific fields. |
| **JSON Feed / RSS** | OJCP is not a syndication format — it is an action-oriented, tool-native interface. Legacy feeds remain complementary for SEO. |
| **Indeed XML Feed / ZipRecruiter API** | OJCP can be layered over existing job board APIs via an adapter. No replacement required. |
| **OpenAPI 3.1** | OJCP REST endpoints SHOULD be documented with OpenAPI 3.1. The registry validates conformance. |
| **RFC 7515 / 7517 / 7519 (JWS, JWK, JWT)** | Verification proofs use JWS compact serialization. Verifier public keys are published as JWK Sets. |

---

## Security and Privacy Considerations

### For Candidates
- Candidate context is **opt-in and scoped**. Agents must declare the consent scope with every tool call.
- `resume_embedding_hash` allows fit-scoring without transmitting sensitive PII.
- Candidates can revoke agent access tokens, immediately invalidating in-flight apply sessions.
- Identity verification proofs contain **no PII** — biometric data and government IDs remain with the verifier.

### For Employers
- Employers can require `AgentDeclaration` and allowlist specific agent IDs.
- Rate limits are declared in the manifest and enforced by the provider.
- All agent-initiated application events are logged with agent identity and timestamp.
- Employers may disable `supports_agent_submission` on any apply path at any time.
- Employers may require identity verification on any apply path, specifying accepted verifiers.

### For Identity Verification
- Verification proofs MUST be JWS-signed. Providers MUST validate signatures against the verifier's JWKS.
- ES256 is the RECOMMENDED signing algorithm; RS256, ES384, and RS384 are also permitted.
- The `subject_hash` is SHA-256 of a verifier-internal identifier — not reversible to PII.
- Providers MUST validate `aud` to prevent cross-provider proof replay and `nonce` (always required) to prevent replay across applications.
- Session tokens SHOULD be cryptographically random (128+ bits entropy) and short-lived (30 min recommended).
- Providers validate proofs against a 10-code error taxonomy: `invalid_structure`, `key_resolution_failed`, `invalid_signature`, `issuer_mismatch`, `audience_mismatch`, `expired_proof`, `nonce_mismatch`, `type_mismatch`, `unrecognized_verifier`, `missing_proof`.

### Transport Security
- All OJCP endpoints — manifests, MCP endpoints, feed endpoints, verification URLs — MUST use HTTPS.

### For the Ecosystem
- The OJCP Registry performs basic provider verification before listing.
- Agents SHOULD include a `user_consent_token` when initiating applications.
- Agent spam and fake application abuse are mitigated via `AgentDeclaration` and provider-side rate limiting.

---

## Conformance

The spec defines two conformance classes:

- **Conforming Provider**: MUST serve a valid manifest at `/.well-known/ojcp.json` over HTTPS, implement `search_jobs`, enforce rate limits. SHOULD implement all six tools and validate verification proofs when required.
- **Conforming Agent**: MUST discover provider capabilities via the manifest, respect `consent_scope`, include `AgentDeclaration` on application tools, and respect rate limits.

Schemas permit additional properties for forward-compatible extension. Implementations MUST ignore unrecognized fields rather than rejecting them.

## IANA Considerations

OJCP registers two well-known URIs per RFC 8615: `ojcp.json` and `ojcp-verifier.json`. Registration will be submitted when the spec reaches stable status.

## Governance

OJCP is proposed as an **open specification** governed by a lightweight community process:

- **RFC Process**: Changes proposed via GitHub pull requests with a 30-day comment period. See [CONTRIBUTING.md](../CONTRIBUTING.md) and [GOVERNANCE.md](../GOVERNANCE.md).
- **Steering Committee**: Seven founding seats representing distinct ecosystem segments — see [GOVERNANCE.md](../GOVERNANCE.md#steering-committee).
- **Versioning**: Semantic versioning. Breaking changes require a major version bump and a 12-month deprecation window.
- **Registry**: `registry.ojcp.dev` — open to all verified providers.

See [GOVERNANCE.md](../GOVERNANCE.md) for steering committee composition, decision-making, and the bootstrap-period authority limits.

---

## Roadmap

| Phase | Milestone | Target |
|---|---|---|
| **0.1** | Draft spec published; Recruitics reference implementation; identity verification extension | Q1 2026 |
| **0.2** | First external partner integration (ATS or job board); verifier pilot | Q2 2026 |
| **0.3** | Registry MVP live; browser agent pilot (WebMCP) | Q3 2026 |
| **1.0** | Stable spec; 10+ verified providers; agent platform adoption | Q4 2026 |
| **1.x** | Headless/background agent flows; resume embedding standard; verifier companion spec | 2027 |

---

## Open Questions for Community Input

1. **Form skill schema** — The `form_skill_url` field on apply paths references a companion specification for form skill descriptors (field mappings, validation rules, conditional logic, submission instructions). To be defined in a separate RFC.
2. **CandidateContext as companion spec** — Privacy sensitivity may warrant splitting `CandidateContext` into its own RFC track.
3. **Agent trust model** — The identity verification extension addresses verification of *candidates*. *Agent* identity verification — cryptographic signatures on `AgentDeclaration` — remains TBD. A future version may allow agents to sign declarations with keys registered in the OJCP Registry.
4. **Registry governance** — Registration process, verification criteria, provider auditing, and dispute resolution for the OJCP Registry.
5. **Verifier internal protocol** — OJCP defines the proof envelope (JWS format, required claims, JWKS discovery, validation procedure) and verifier discovery convention. How verifiers conduct verification internally (biometric capture, document processing, etc.) is intentionally out of scope. May warrant a companion spec.

---

## Call to Action

We are seeking co-contributors and early adopters in four categories:

- **Job Boards & Aggregators** (Indeed, Zip, LinkedIn, Greenhouse, Lever, Workday, iCIMS, SmartRecruiters)
- **Agent Platform Developers** (browser vendors, AI assistant teams, recruiting AI startups)
- **Identity Verification Providers** (ID.me, Clear, Checkr) — partners for the verification layer
- **Enterprise Employers** managing high-volume hiring who want their ATS accessible to candidate agents

To contribute: [github.com/ojcp-org/ojcp](https://github.com/ojcp-org/ojcp)
To discuss: `ojcp-discuss@recruitics.com`

---

## Acknowledgments

This proposal is informed by the WebMCP proposal (Walderman, Nolan, Bokan, Sagar, Van Opstal — August 2025), the Model Context Protocol (Anthropic, 2024), schema.org's JobPosting vocabulary, RFC 7515/7517/7519 (JWS, JWK, JWT), and the collective experience of Recruitics in programmatic recruitment advertising since 2012.

---

*Open Job Context Protocol (OJCP) — Draft v0.1*
*© 2026 Recruitics, Inc. — Proposed for open community governance*
*This specification is released under the Apache License 2.0*
