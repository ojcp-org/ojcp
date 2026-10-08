---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Provider-derived attribution — credit the source of an application without asking agents to relay tokens

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-08
- **Resolves:** —

## Motivation

Employers and their advertising partners pay for job distribution on the outcome it produces: an application. Paying on outcome requires knowing, for each application, which distribution source produced it. In OJCP that source is the agent (or the job board, aggregator, or platform behind it) that put the job in front of the candidate.

OJCP v0.2 has exactly one attribution mechanism: the agent self-reports `source_attribution` (`referrer`, `reference_id`) on `begin_application` and `submit_application`. This has three problems.

1. **It depends on the model remembering.** For a provider to tie an application back to the search that produced it, the agent must carry an opaque value from a `search_jobs` result into a later `begin_application` call. In an MCP client that value passes through the LLM's context. General-purpose clients do not reliably relay it: in a test session against a production-grade provider on 2026-10-07, every `begin_application` call made by a frontier-model MCP client omitted `source_attribution`, although every `search_jobs` result it acted on carried the provider's per-job reference. Each of those applications was recorded as unattributed, and the source that surfaced the job lost credit for it.
2. **There is nothing standard to relay.** The spec defines no provider-issued reference on search or detail results. `reference_id` is described as a token *the source* uses for its own reconciliation, so a provider that wants to issue its own reference has to overload that field with a provider-specific meaning.
3. **Self-report is the weakest evidence available.** By the time `begin_application` arrives, the provider already knows who is calling (an authenticated credential, or an `agent_id` verified under the spec's *Agent Identity* section) and which job they are applying to, and its own logs say whether it served that job to that caller. A self-reported `referrer` string adds nothing to that and can be spoofed.

Advertising has already settled this question. Agentic ad standards and the ad platforms inside AI assistants attribute server to server: the platform issues a click identifier, the conversion is reported by a server ([AdCP `log_event`](https://docs.adcontextprotocol.org/docs/media-buy/task-reference), conversion APIs), and the platform does the matching. None of them ask the model to carry a token. OJCP should follow the same principle.

## Proposal

Attribution becomes something the **provider derives** from evidence it already holds. Relayed references remain, but only as OPTIONAL evidence for the one case the provider cannot see: a handoff between two different identities.

This RFC standardizes how attribution **evidence** is established and reported. How credit is priced, split between sources, or billed is a commercial matter and out of scope.

### 1. Terminology

- **Impression** — a provider returning a job (by `ojcp_id`) to a caller in a `search_jobs` or `get_job_detail` response.
- **Attributable identity** — the identity an impression or application is recorded against. In order of strength: a **verified** `agent_id` (spec *Agent Identity → Verification*), then an **authenticated** credential the provider issued (API key, OAuth client). A self-asserted, unverified `agent_id` is **not** an attributable identity.
- **Attribution window** — the period after an impression during which an application can be credited to it.
- **Attribution reference** — an opaque, provider-issued value bound to one impression (new field `attribution_ref`, §3).

### 2. In-protocol attribution (impression matching)

A provider that declares attribution support in its manifest (§5):

- **SHOULD** record each impression against the caller's attributable identity, keyed by `ojcp_id`, with the time and the result's rank. It MAY also record `fit_score`. Impression records MUST NOT contain CandidateContext contents or any candidate identifier.
- **MUST** establish attribution when it handles `begin_application`, by applying these rules in order:
  1. **Reference.** If `source_attribution.attribution_ref` is present, valid, unexpired, and bound to the requested `job_id`, the impression it names is credited. If the reference was issued to a **different** attributable identity than the caller's, that identity is recorded as `referred_by` and the caller as the applying agent (see *Reference stuffing* under Security and privacy considerations).
  2. **Impression match.** Otherwise, the most recent impression of the requested `job_id` served to the caller's attributable identity within the attribution window is credited (last touch).
  3. **None.** Otherwise, the application is unattributed.
- **MUST NOT** treat a missing `source_attribution` as unattributed when rule 2 applies.
- **MUST NOT** match on IP address, user agent, device characteristics, or any other fingerprint. Rule 2 applies only to attributable identities, so an anonymous caller can be credited only through rule 1.
- **MUST** fix the attribution when `begin_application` is handled. `submit_application` inherits it through `application_id`. A provider MAY apply `source_attribution` supplied on `submit_application` only when the application was unattributed at `begin_application`.

`get_job_detail` counts as an impression because an agent that fetched a job's detail has engaged with it, whether or not it ran a search first.

### 3. A standard provider-issued reference

Add an OPTIONAL `attribution_ref` to each job in the `search_jobs` response and to the `get_job_detail` response, and accept it in `source_attribution`:

```json
// schemas/responses/search-jobs.json — jobs[].properties
// schemas/responses/job-detail.json — properties
"attribution_ref": {
  "type": "string",
  "description": "Opaque, provider-issued attribution reference for this impression. Agents that hand this job to another agent or platform SHOULD pass it along; agents MAY pass it back in source_attribution.attribution_ref."
}

// schemas/tools/begin-application-input.json and submit-application-input.json — source_attribution.properties
"attribution_ref": {
  "type": "string",
  "description": "An attribution_ref previously returned by this provider for the job being applied to."
}
```

Requirements on `attribution_ref`:

- It MUST be opaque to agents and integrity-protected: an agent cannot forge one or alter its contents.
- It MUST be bound to the `ojcp_id` it was issued for. A provider MUST ignore a reference presented for a different `job_id`.
- It SHOULD be bound to the attributable identity it was issued to, and it SHOULD expire no later than the end of the attribution window.
- A provider MUST treat an invalid, expired, or mismatched reference as absent: it falls through to rule 2. A bad reference MUST NOT cause the application itself to be rejected.

`referrer` and `reference_id` keep their existing meaning: values **the source** supplies for its own reconciliation, which a provider MAY echo back in reports. Providers MUST NOT require them, and SHOULD NOT use them as attribution evidence on their own because they are self-asserted.

Because of rule 2, an agent that searches and applies under the same identity gets credit **without relaying anything**. `attribution_ref` matters only when the identity that surfaced the job differs from the one that applies, for example a job board that shows a job to a person who then applies through their own assistant.

### 4. Off-protocol applications

When the returned apply path is completed outside OJCP (`email`, `external_redirect`, and any path with `supports_agent_submission: false`), the provider SHOULD embed an attribution reference in the apply `url` it returns. The parameter name and encoding are the provider's choice. The URL is what the candidate opens, so no agent action is required. Agents MUST pass apply URLs through unmodified (in particular, without stripping query parameters).

Reporting the resulting conversion from the employer's ATS back to the provider happens between those two parties, not between agent and provider, so it is out of scope for this RFC (see Open questions).

### 5. Manifest declaration

Add an OPTIONAL `attribution` block to the Job Manifest:

```json
"attribution": {
  "supported": true,
  "methods": ["impression_match", "reference"],
  "window_days": 30
}
```

- `methods` lists the rules (§2) the provider applies.
- `window_days` is the attribution window. RECOMMENDED 30. A provider MUST NOT retain impression records longer than its declared window.

An agent can read this block to decide whether relaying `attribution_ref` matters to the provider.

### 6. Attribution outcome in `begin_application`

A provider MAY return the outcome to the caller, so a source can confirm it was credited without waiting for an out-of-band report:

```json
// schemas/responses/begin-application.json — properties
"attribution": {
  "type": "object",
  "properties": {
    "method": { "type": "string", "enum": ["reference", "impression_match", "none"] },
    "referred_by": { "type": "string", "description": "Present when a reference issued to another identity was credited." }
  },
  "required": ["method"]
}
```

A provider MUST NOT reveal anything about another identity's impressions other than `referred_by`, and only when that identity's own reference was presented.

## Security and privacy considerations

- **Spoofed identity.** Rule 2 keys on attributable identities only. A self-asserted `agent_id` could be claimed by anyone, so impression matching on it would let a caller manufacture or misdirect credit. This is consistent with the spec's *Agent Identity* section, which already forbids using an unverified `agent_id` for session binding.
- **Fabricated conversions.** `begin_application` is cheap to call. A provider that bills on outcomes SHOULD treat a submitted application, not an initiated one, as the conversion.
- **Reference stuffing.** An identity could push its references into other agents' flows to claim credit for applications it did not drive (the equivalent of cookie stuffing). Rule 1 therefore records a foreign reference as `referred_by` next to the applying identity, and never erases the applying identity's own evidence. How credit is divided between them is a commercial decision.
- **Replay.** Binding a reference to an `ojcp_id` and expiring it with the window limits replay to the job it was issued for and the window it was issued in.
- **Candidate privacy.** Impressions are recorded against the calling software's identity, never against the candidate. No fingerprinting is permitted, and retention is capped at the declared window. Impression matching does not add a candidate tracking surface.

## Affected areas

- [x] Tool definitions (`search_jobs`, `get_job_detail`, `begin_application`, `submit_application` — new optional fields)
- [x] Manifest (`attribution` block)
- [x] Security and privacy
- [ ] Core schemas (JobPosting, CandidateContext, AgentDeclaration) — unchanged

## Alternatives considered

- **Require agents to relay `reference_id`.** Rejected. This is the current design, and the evidence above shows general-purpose clients do not do it. Making it required would turn a reliability problem into a rejection problem without making clients any more reliable.
- **A request header carrying the attribution token** (e.g., `OJCP-Attribution`). Rejected as the primary mechanism. Generic MCP clients do not replay headers a server hands them, so a header only moves the opt-in from the model to the client. Clients would have to be changed either way. A harness or SDK that wants to relay `attribution_ref` can already do so in `source_attribution`; nothing is gained by defining a second carrier.
- **The MCP session as the join key.** Rejected. MCP is moving to stateless transport, sessions do not span reconnects, and a session says nothing about which business is calling.
- **IP or device matching for anonymous callers.** Rejected as fingerprinting. Anonymous callers who want credit can relay `attribution_ref` or authenticate.

## Breaking changes

None. Every new field and block is optional, and `referrer` and `reference_id` keep their meaning. Agents that ignore this RFC lose nothing, and the applications they drive start being attributed by impression matching. Providers that currently overload `source_attribution.reference_id` with their own reference SHOULD move it to `attribution_ref`, and MAY keep accepting the old placement during a transition.

## Open questions

1. **Conversion return for off-protocol applications.** Should OJCP define a standard ATS-to-provider postback (in the spirit of AdCP `log_event`), or leave it to existing ATS integrations? It lies outside the agent-provider relationship, so it may belong in a companion specification.
2. **Should the window be bounded?** This RFC recommends 30 days and caps retention at the declared window, but sets no maximum.
3. **Should `get_job_detail` count as an impression** when it comes after a search of the same job by the same identity, or only the search? Last touch makes the difference immaterial for crediting, but it affects impression counts in reporting.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes: (30 days)

Resolution:
