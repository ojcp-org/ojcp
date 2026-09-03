---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Agent-scoped job visibility in `search_jobs`

- **Authors:** Tom Chevalier, Tink · Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-08-10
- **Builds on:** [RFC 0001 — Verifiable agent identity (RFC 9421)](0001-agent-identity-http-message-signatures.md) (Accepted). Audience gating in this RFC is enforced against a **verified** `agent_id`, not a self-asserted one.

### Motivation

`search_jobs` today returns the same job set to every caller. There is no way for a provider to surface different jobs to different agents. Real deployments need this:

- **Partner-exclusive inventory.** A provider may want to expose certain roles only to agents it has an established relationship with (e.g., a vetted supply partner), while keeping the public feed unchanged for everyone else.
- **Employer preference.** Based on prior experience with different agents, an employer may not want every agent to have access to every job.
- **Private / embargoed requisitions.** Confidential searches that should never appear in an anonymous feed but may be shared with a specific, trusted agent.
- **Tiered access.** Providers may wish to reveal richer result data (or simply more results) to authenticated, allowlisted agents than to anonymous ones.

Two primitives already exist: providers MAY allowlist `agent_id`s ([Employer Controls](https://spec.ojcp.dev/0.1/#security-employer)) and MAY gate capabilities behind `auth.optional_scopes`. And as of [RFC 0001](0001-agent-identity-http-message-signatures.md), `agent_id` is now **cryptographically verifiable** — the piece that makes per-agent gating trustworthy rather than spoofable. What's still missing is (a) a way for `search_jobs` to know *which agent* is asking, and (b) a way for a job to declare *who is allowed to see it*.

### Proposal

Three small, composable, backward-compatible additions. Absent any of them, behavior is identical to v0.1.

**1. Accept `agent_declaration` as optional input to `search_jobs`.**

`AgentDeclaration` already rides on `begin_application` and `submit_application`; this extends it upstream to discovery so providers can key results to the declared `agent_id`.

```json
"agent_declaration": { "$ref": "https://ojcp.dev/schemas/v0.1/agent-declaration.json" }
```

When absent, the provider MUST return only `public` jobs (today's behavior).

Because this RFC gates access on `agent_id`, the declared identity MUST be verified per [RFC 0001](0001-agent-identity-http-message-signatures.md#agent-identity) before any `restricted` or `private` job is returned. A provider that gates a feed MUST list the relevant context in `auth.agent_signatures.required_for` (the `restricted_feed` token already exists for this purpose) so agents know a signed request is required. An unsigned or unverifiable `agent_declaration` MUST be treated as anonymous.

**2. Add an optional `visibility` block to `JobPosting`.**

```json
"visibility": {
  "tier": "restricted",
  "audience": ["ai.wayfarer.agent", "ai.northstar.assistant"]
}
```

- `tier` — `public` (default) | `restricted` | `private`.
  - `public` — returned to all callers. Unchanged from v0.1.
  - `restricted` — returned only when the request carries a **verified** `agent_declaration` whose `agent_id` is in `audience`.
  - `private` — as `restricted`, and additionally requires the caller to hold a provider-granted auth scope (see #3). Existence MUST NOT be disclosed to unauthorized callers.
- `audience` — array of `agent_id`s permitted to see the job when `tier` is `restricted` or `private`. Matching is performed server-side only, against the verified identity.

**3. Declare the capability in the manifest `auth` block.**

```json
"auth": {
  "required": false,
  "optional_scopes": ["candidate_context", "application_tracking", "restricted_feed"],
  "agent_signatures": {
    "supported": true,
    "required_for": ["restricted_feed"]
  }
}
```

A provider grants a partner agent the `restricted_feed` scope through its existing allowlist / onboarding mechanism. Possession of the scope, together with a verified identity, is what unlocks `private`-tier jobs.

**Provider obligations:**

- Providers MUST evaluate `visibility` server-side and MUST NOT return `restricted` or `private` jobs to callers that do not satisfy the audience/scope requirement against a verified identity.
- `total_results` MUST reflect only the set visible to the caller. Providers MUST NOT leak the count, existence, or any field of non-visible jobs to unauthorized callers.
- Providers MUST ignore a `visibility` block they do not support and treat the job as `public` (forward compatibility).

**Agent obligations:**

- Agents SHOULD sign `search_jobs` requests and include an `agent_declaration` when they expect access to a provider's restricted inventory.
- Agents MUST NOT treat the absence of a job as proof it does not exist.

### Openness and non-discrimination

OJCP's premise is open rails, not walled gardens. This mechanism intentionally lets a provider *narrow* who sees a job, so it MUST NOT become a tool for opaque or discriminatory gatekeeping:

- Visibility gating MUST be based on the agent's identity and the provider's relationship with it — never on characteristics of the candidate the agent represents. A provider MUST NOT vary `visibility` by protected-class or protected-class-proxy attributes of candidates.
- Restricting a job to an `audience` MUST NOT be used to evade equal-opportunity advertising obligations. Providers remain responsible for their own regulatory compliance regardless of feed segmentation.
- The default is `public`. Restriction is an explicit, opt-in provider choice — the ecosystem stays open unless a provider deliberately narrows a specific role.

### Affected areas

- [x] Tool definitions (`search_jobs` input)
- [x] Core schemas (JobPosting — new `visibility` block)
- [ ] Apply path types
- [x] Manifest format (`auth.optional_scopes` + `agent_signatures.required_for`)
- [x] Identity verification (gating is enforced against a verified `agent_id`)
- [x] Security / privacy model (non-disclosure of restricted inventory; non-discrimination)
- [ ] Other:

### Alternatives considered

- **Custom namespaced tool** (e.g., `recruitics:search_private_jobs`) — works today with zero spec change and is a reasonable interim, but it is provider-specific, so no other agent benefits and there's no interoperable contract. Recommended only as a migration path.
- **Whole-feed auth scopes with no per-job labels** — gates the entire feed on/off but cannot express per-job audiences (the common case is "public feed plus a few partner-only roles"). The `visibility` field is what provides granularity; the scope alone is insufficient.
- **Self-asserted `agent_id` as the gate (the pre-RFC-0001 approach)** — rejected: an unverified `agent_id` is trivially spoofable, so audience gating would provide no real access control. This RFC depends on RFC 0001 to make the gate meaningful.

### Breaking changes

None. All additions are optional. A v0.1 provider that ignores `agent_declaration` and emits no `visibility` blocks behaves exactly as before; an agent that sends no `agent_declaration` sees only the public feed (today's result set).

---

### For maintainers — comment period and resolution

- **Comment period opens:** 2026-08-28
- **Comment period closes:** 2026-09-27 (30 days)
- **Resolution:** <!-- Accepted / Revisions requested / Declined / Withdrawn -->
- **Decision record:** <!-- link to docs/decisions/NNNN-*.md -->
- **Recusals:** <!-- list any committee members who recused; reason -->
