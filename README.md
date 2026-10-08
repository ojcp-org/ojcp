<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="content/logos/ojcp-dark.svg">
    <img src="content/logos/ojcp-light.svg" alt="OJCP — Open Job Context Protocol" width="420">
  </picture>
</h1>

<p align="center"><strong>An open standard for agent-consumable job data, built on MCP.</strong></p>

<p align="center">
  <a href="https://github.com/ojcp-org/ojcp/releases/tag/v0.3"><img src="https://img.shields.io/badge/version-0.3-blue" alt="Version 0.3"></a>
  <a href="https://spec.ojcp.dev/"><img src="https://img.shields.io/badge/spec-spec.ojcp.dev-blue" alt="Spec"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/code-Apache%202.0-green" alt="License: Apache 2.0"></a>
  <a href="CONTRIBUTING.md#licensing"><img src="https://img.shields.io/badge/spec-CC%20BY%204.0-green" alt="License: CC BY 4.0"></a>
</p>

---

AI agents are beginning to search for jobs, evaluate opportunities, and submit applications on behalf of candidates. The infrastructure they're trying to use — job feeds, careers pages, ATS apply flows — was never designed for them.

**OJCP defines how job opportunities, employer context, and application affordances are expressed so that AI agents can discover, reason over, and act on them.** It composes with the [Model Context Protocol (MCP)](https://modelcontextprotocol.io), [WebMCP](https://developer.chrome.com/docs/ai/webmcp), and schema.org/JobPosting.

- 📖 **Spec:** [spec.ojcp.dev](https://spec.ojcp.dev/)
- 🌐 **Site:** [ojcp.dev](https://ojcp.dev)
- ✅ **Conformance suite:** [ojcp-org/conformance](https://github.com/ojcp-org/conformance)
- 🗂️ **Provider registry:** [ojcp-org/registry](https://github.com/ojcp-org/registry)

<p align="center">
  <img src="content/images/overview.png" alt="OJCP — Candidate, Agent, Provider Journey" width="600" />
</p>

---

## Governed by a founding steering committee

OJCP is a community standard, not a single-vendor project. It is governed by a **nine-seat founding steering committee** whose members share equal authority over the protocol's direction. Seats are held by people across the ecosystem — ATS vendors, job boards, auto-apply tools, agent platforms, and staffing — so that no single party can steer the spec to its own advantage.

<p align="center">
  <a href="https://www.workday.com"><img src="content/logos/members/workday.svg" alt="Workday" height="40" hspace="12"></a>
  <a href="https://www.crosscountryhealthcare.com"><img src="content/logos/members/crosscountry.png" alt="CrossCountry Healthcare" height="40" hspace="12"></a>
  <a href="https://www.recruitics.com"><img src="content/logos/members/recruitics.jpg" alt="Recruitics" height="40" hspace="12"></a>
  <a href="https://loopcv.pro"><img src="content/logos/members/loopcv.png" alt="LoopCV" height="40" hspace="12"></a>
  <a href="https://hiring.cafe"><img src="content/logos/members/hiringcafe.png" alt="Hiring.cafe" height="40" hspace="12"></a>
  <a href="https://aiapply.co"><img src="content/logos/members/aiapply.png" alt="aiApply" height="40" hspace="12"></a>
  <a href="https://scale.jobs"><img src="content/logos/members/scalejobs.jpg" alt="scale.jobs" height="40" hspace="12"></a>
  <a href="https://gettink.ai"><img src="content/logos/members/tink.jpg" alt="Tink" height="40" hspace="12"></a>
</p>

<p align="center">
  <em>Workday · CrossCountry Healthcare · Recruitics · LoopCV · Hiring.cafe · aiApply · scale.jobs · Tink</em>,
  with an invited-expert seat held by Andrew Nolan (WebMCP co-creator).
</p>

See [GOVERNANCE.md](GOVERNANCE.md) for the seat table, term rules, and how changes are decided, and [ADOPTERS.md](ADOPTERS.md) for organizations building on OJCP.

---

## The OJCP project

| Repo | What it is |
|---|---|
| **[ojcp](https://github.com/ojcp-org/ojcp)** (this repo) | The specification, JSON Schemas, examples, diagrams, and governance |
| **[conformance](https://github.com/ojcp-org/conformance)** | Test suite that validates a provider implementation against the published schemas |
| **[registry](https://github.com/ojcp-org/registry)** | The provider registry — one reviewed JSON entry per provider, added by PR |

---

## What's in this repo

```
/spec
  ojcp-v0.1.bs              # Bikeshed spec source (compiles to spec.ojcp.dev)
/schemas
  README.md                 # $id convention + how to validate offline
  manifest.json             # ojcp.json manifest schema
  job-posting.json          # JobPosting JSON schema
  candidate-context.json    # CandidateContext JSON schema
  agent-declaration.json    # AgentDeclaration JSON schema
  agent-identity.json       # ojcp-agent.json delegated-signer document schema
  eeo-data.json             # EEO data schema (EEOC/OFCCP/GDPR)
  verification-step.json    # VerificationStep schema
  verification-proof.json   # VerificationProof schema
  verifier-manifest.json    # Verifier discovery manifest schema
  tools/                    # Tool input schemas
  responses/                # Tool response schemas
/examples                   # Worked manifests, job postings, tool responses,
                            #   and a signed agent request (agent-signed-request.http)
/diagrams                   # Mermaid diagram sources (*.mmd)
/content
  images/                   # Rendered diagram PNGs
  logos/members/            # Steering-member logos
/docs
  proposal.md               # Original proposal
  rfcs/                     # Design documents behind each feature
  decisions/                # Architecture Decision Records (ADRs)
GOVERNANCE.md               # Governance charter, steering committee, IP policy
CONTRIBUTING.md             # How to contribute, change process, DCO, licensing
CODE_OF_CONDUCT.md          # Contributor Covenant
ADOPTERS.md                 # Organizations using or evaluating OJCP
CHANGELOG.md                # Notable spec + governance changes
```

---

## Quick Start

### For job boards and employer career sites

Add a manifest at `/.well-known/ojcp.json`:

```json
{
  "ojcp_version": "0.3",
  "provider": {
    "name": "Acme Corp Careers",
    "employer_id": "acme-corp"
  },
  "mcp_endpoint": "https://careers.acme.com/ojcp/mcp",
  "tools": ["search_jobs", "get_job_detail", "get_employer_context", "begin_application", "submit_application", "check_application_status"]
}
```

Then expose the standard OJCP tools via any MCP-compatible transport, and check your implementation against the [conformance suite](https://github.com/ojcp-org/conformance). See the [full spec](https://spec.ojcp.dev/) for tool and data schemas.

### For browser-native agents (WebMCP)

OJCP supports [WebMCP](https://developer.chrome.com/docs/ai/webmcp) via two complementary APIs.

**Imperative API** — register OJCP tools directly on your careers page:

```js
if ("modelContext" in document) {
  document.modelContext.registerTool({
    name: "search_jobs",
    description: "Search open roles at Acme Corp.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        location: { type: "string", description: "Location filter" }
      },
      required: ["query"]
    },
    execute: async (params) => {
      const results = await fetchJobs(params);
      return { content: [{ type: "text", text: JSON.stringify(results) }] };
    }
  });
}
```

**Declarative API** — annotate apply forms so agents can submit applications natively:

```html
<form toolname="begin_application"
      tooldescription="Apply to this role at Acme Corp."
      action="/apply" method="POST">
  <input name="full_name" toolparamdescription="Candidate full name" />
  <input name="email" type="email" toolparamdescription="Contact email" />
  <textarea name="cover_letter" toolparamdescription="Cover letter" />
  <button type="submit">Apply</button>
</form>
```

See the WebMCP integration section of the [spec](https://spec.ojcp.dev/) for the full guide.

### For agent developers

Discover providers from the [registry](https://github.com/ojcp-org/registry) — a Git-backed directory with one reviewed JSON entry per provider. Each entry points at a provider's `/.well-known/ojcp.json`; from there, probe the manifest and call the standard OJCP tools over MCP. To be listed, open a PR adding your entry (domain control is proven per the registry README).

---

## Core Concepts

**Job Manifest** — Every OJCP provider exposes `/.well-known/ojcp.json` declaring its tools, endpoints, apply paths, attribution policy, and which requests require a verified agent identity. Agents and browsers probe this to discover capabilities without navigating the full site.

**Job Tools** — MCP-compatible callable functions: `search_jobs`, `get_job_detail`, `get_employer_context`, `begin_application`, `submit_application`, `check_application_status`. Any MCP client can call them directly.

**Apply Paths** — A normalized taxonomy of how candidates can apply (`ats_direct`, `provider_hosted`, `platform_native`, `email`, `external_redirect`, `custom`), each declaring whether it `supports_agent_submission`.

![Apply Path Types](content/images/apply-paths.png)

**Candidate Context** — A minimal, consent-scoped candidate profile passed by agents for personalized search and fit scoring. PII-minimized by design.

**Eligibility Gates** — Postings state their hard gates (visa sponsorship, relocation, security clearance) in a structured `eligibility` block, so agents can filter before applying instead of wasting an application. A gate the posting didn't state is never read as "no".

**Agent Identity** — Agents prove who they are with verifiable request signatures, so providers can distinguish a real, accountable agent from an anonymous scraper without a central gatekeeper. OJCP uses [HTTP Message Signatures](https://www.rfc-editor.org/rfc/rfc9421) on the [Web Bot Auth](https://developer.chrome.com/docs/ai/web-bot-auth) wire profile: the agent publishes its keys at a signatures directory, signs each request (Ed25519 recommended), and names its key via the `Signature-Agent` header. An `agent_id` binds to the signing domain's namespace, or to signers its own domain delegates to. Providers declare which contexts require a verified identity under `auth.agent_signatures` in their manifest.

**Agent Declaration** — Agents identify themselves and who they act for on every application initiation. Enables employer audit trails, rate limiting, and abuse prevention.

**User Mandates** — A verified identity proves *which software* is calling, not that a person approved the action. A `user_mandate` closes that gap: a credential issued under the user's authority that binds the agent's signing key to one specific action — this job, this application, this exact candidate data — and can be used once.

**Agent-Scoped Visibility** — Providers can make individual jobs visible only to specific verified agents (`restricted`) or to authorized partner feeds (`private`). Non-visible jobs are never disclosed — not in results, counts, or lookups — and gating depends only on the agent, never on the candidate.

**Attribution** — Providers credit each application to the source that surfaced the job, from evidence they already hold: the caller's verified or authenticated identity and the jobs they showed it. Agents get credit without relaying tokens; a provider-issued `attribution_ref` covers hand-offs between agents, and apply URLs carry it for applications completed off-protocol. No fingerprinting, and no candidate tracking.

**Identity Verification** — For roles that require verified human identity (finance, government, healthcare), OJCP integrates with third-party verifiers like ID.me and CLEAR. Two delivery models are supported: **provider-managed** (verification embedded in the apply form, proof delivered directly to the provider) and **agent-submitted** (agent collects the proof and includes it in `submit_application`). Verifiers can also render inline in the conversation via [MCP Apps](https://apps.extensions.modelcontextprotocol.io). In every case a cryptographic proof is validated — no raw PII flows through the protocol.

### How it works

<p align="center">
  <img src="content/images/ecosystem.png" alt="OJCP Ecosystem Overview" width="600" />
</p>

An agent discovers a provider, searches for jobs, and initiates an application — all through standard MCP tool calls:

![Agent Discovery Sequence](content/images/discovery.png)

When the agent applies on behalf of a candidate, OJCP enforces a consent gate before submission:

![Agent Apply Flow](content/images/apply-flow.png)

When an agent proves its identity, the provider verifies the request signature, binds the `agent_id` to the signing domain, and enforces per-context signature policy:

![Agent Identity Verification](content/images/agent-identity.png)

---

## Interoperability

| Standard | Relationship |
|---|---|
| MCP | OJCP tools are valid MCP tools — callable by any MCP client |
| WebMCP | Imperative API (`document.modelContext.registerTool()`) and declarative form annotations |
| HTTP Message Signatures / Web Bot Auth | Verifiable agent identity (see Agent Identity) |
| MCP Apps | Inline identity verification rendered in a sandboxed `ui://` resource |
| SD-JWT VC | Key-bound user mandates |
| schema.org/JobPosting | OJCP extends it; existing structured data stays valid |
| Indeed / Zip XML Feeds | OJCP layers over existing feeds via adapter; no replacement required |

---

## Status

**Current release: [0.3](https://github.com/ojcp-org/ojcp/releases/tag/v0.3)** (2026-10-08). Minor releases are additive and backward-compatible: the schema namespace stays at `/v0.1/`, and implementations of earlier versions remain conforming. See [CHANGELOG.md](CHANGELOG.md) for release notes.

**Specification** — published at [spec.ojcp.dev](https://spec.ojcp.dev/), with JSON Schemas for every data type and tool:

- Job manifest, job tools, apply paths, and screening questions
- JobPosting with multi-location support, eligibility gates, and the `official_job_url` trust anchor
- Verifiable agent identity, with namespace and delegated binding
- User mandates for action-level authorization
- Agent-scoped job visibility
- Provider-derived attribution
- Identity verification, including inline rendering via MCP Apps
- Provider trust (signed manifests) and resume upload

**Ecosystem**

- Reference provider live at [ojcp.dev](https://ojcp.dev); independent providers live, including FoundRole and freehire ([ADOPTERS.md](ADOPTERS.md))
- [Conformance suite](https://github.com/ojcp-org/conformance) with schema validation and reference test vectors
- [Provider registry](https://github.com/ojcp-org/registry)
- Nine-seat steering committee ([GOVERNANCE.md](GOVERNANCE.md))

---

## Contributing

OJCP is built in the open, and external contributions are already shaping it. Several of the features and providers above came from the community. We especially welcome:

- **Job boards, aggregators & ATS vendors** who want their inventory reachable by candidate agents
- **Agent & browser platform developers** building the candidate-side experience
- **Employers** with high-volume hiring who want their apply flows agent-ready

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for the change process, DCO sign-off, and licensing. Validate implementations with the [conformance suite](https://github.com/ojcp-org/conformance), and add yourself to [ADOPTERS.md](ADOPTERS.md).

Discuss: [GitHub Discussions](https://github.com/ojcp-org/ojcp/discussions) · `ojcp-discuss@recruitics.com`

---

## License

Dual-licensed by content type (see [CONTRIBUTING.md](CONTRIBUTING.md#licensing)):

- **Specification, schemas, examples, docs** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Code, tooling, CI** — [Apache License 2.0](LICENSE)

OJCP was authored by **Austin Anderson** (CTO, Recruitics) and is now governed by its [steering committee](GOVERNANCE.md).
