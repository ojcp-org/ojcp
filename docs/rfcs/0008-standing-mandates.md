---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc, security, privacy
---

## RFC: Standing mandates — authorize an agent once, within limits and until a date

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0001 (verifiable agent identity), RFC 0003 (action-bound user mandates), RFC 0009 (hiring vocabulary), RFC 0010 (decentralized provider trust)

## Summary

People want to tell an AI agent something like: *"Apply for data-analyst jobs in New York or remote, paying at least $125,000 a year. No more than two applications per company. Stop at the end of March."* Today the protocol can only prove that a person approved **one specific application at a time**, so an agent following that instruction has to interrupt the person before every application.

This proposal adds a **standing mandate**: a digital permission slip the person approves once, at a service they choose, much like written instructions left for someone running errands for you. It says which kinds of jobs the agent may apply to, the lowest pay the person will accept, how many applications each company may receive, and when the permission ends. The person can cancel it at any time.

Each permission slip names the person it belongs to, so an agent service cannot use one person's permission to apply on behalf of someone else. Each employer's application system can check for itself that a real person approved this, that the job falls inside the limits, and that the per-company limit has not been reached. That limit protects employers from being flooded with automated applications.

Some things are never covered. A standing mandate cannot agree to legal terms for the person (an arbitration agreement or a background-check authorization, for example), cannot answer voluntary equal-opportunity questions, and cannot send applications to employers whose identity has not been checked. For those, the agent has to ask the person at that moment.

It also limits tracking. Employers don't learn the person's minimum salary, only that a job pays enough. The agent shows each employer a different copy of the permission, so two employers comparing notes can't tell it came from the same person until that person actually applies to both, and no central service counts a person's applications across employers.

The pieces are existing standards for digital credentials. OJCP only defines what they mean in hiring.

## Motivation

The spec's *User Mandates* section (from RFC 0003) defines one kind of user authorization: a credential that binds one OJCP action, on one job, to one agent signing key. It is the right tool for a single consequential step. It doesn't fit the way people ask agents to job-hunt.

The *Action Statement* binds `application_id`, `mandate_nonce` and `candidate_data_digest`, none of which exist until the provider has answered `begin_application`. So the user has to be reached, and has to approve, at the moment of each submission. Three problems follow:

1. **`autonomous` mode can't use mandates.** The spec defines `interaction_mode: autonomous` as "pre-authorized", and *Personal-Agent Delegation* tells providers to require a `user_mandate` wherever user authority matters. An autonomous agent can meet both only by waking the user for every job.
2. **Pressure moves to weaker evidence.** Platforms fall back on what the spec forbids treating as authority (`acting_on_behalf_of`, an opaque `user_consent_token`), or on one long-lived credential reused everywhere, which links the candidate across every employer.
3. **Employers can't see or limit volume.** A provider has no interoperable way to tell whether an automated application falls inside what the user asked for, or to cap how many applications one person's agent sends to one employer.

RFC 0003 left the claim profile and the manifest signalling (`auth.user_mandates`) to a follow-up. This RFC is that follow-up for the standing case. It adds a second mandate type next to the existing one and doesn't weaken it.

No new cryptography or transport is defined. The credential is an SD-JWT VC ([RFC 9901](https://www.rfc-editor.org/rfc/rfc9901), [SD-JWT VC](https://datatracker.ietf.org/doc/draft-ietf-oauth-sd-jwt-vc/)), issued through [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html), with status through the IETF [Token Status List](https://datatracker.ietf.org/doc/draft-ietf-oauth-status-list/). [HAIP 1.0](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) §9.4 lists both of these as pre-final and its references pin `draft-ietf-oauth-sd-jwt-vc-13` and `draft-ietf-oauth-status-list-14`. Implementations follow HAIP's pins until the final RFCs are published. OJCP defines the hiring meaning: the scope vocabulary, the limits, which actions a standing mandate may authorize, and how providers check them.

## Proposal

### 1. Two mandate types

| | Action mandate (existing) | Standing mandate (new) |
| --- | --- | --- |
| Meaning | "Do this one thing." | "You may do these kinds of things for me until this date." |
| User approves | Each action | Once, at issuance |
| Bound to | One action statement, one `aud`, one agent key | A candidate, a scope, limits, permitted and prohibited actions, one agent key per credential |
| Per-request binding | In the credential | In the key-binding JWT the agent signs for each request (§4) |
| Lifetime | Short, single use | At most three calendar months (§2.7) |
| Can cover binding actions, EEO self-identification, or a provider below the user's trust floor | Yes | Never (§5) |

Definitions to add to *User Mandates → Definitions*:

- **Action mandate.** The existing user mandate. *Mandate Profile*, *Action Statement* and *Verification* apply to it unchanged.
- **Standing mandate.** A credential by which a user authorizes one agent signing key to perform OJCP actions of permitted kinds, for one named candidate, within a scope and limits, until an expiry.
- **Binding action.** An assent with legal or contractual effect recorded in the candidate's name: every entry RFC 0009 defines for the `begin_application` response's `binding_actions` (arbitration agreement, background-check authorization, attestation of truth, terms of service, and the others it lists), and accepting an offer.
- **Mandate issuer.** A network service, operating an OpenID4VCI Credential Issuer, that authenticates the user, verifies the candidate binding (§2.3), shows the consent screen (§3.3) and issues standing mandates.

*User mandate* becomes the umbrella term for both types. `AgentDeclaration.user_mandate` carries either.

### 2. The standing mandate credential

A standing mandate is an SD-JWT VC in compact serialization, media type `application/dc+sd-jwt`, with:

```
vct: https://spec.ojcp.dev/vct/standing-mandate/v1
```

That URL resolves to SD-JWT VC Type Metadata describing the claims below. Issuers MUST include `vct#integrity` (SD-JWT VC -13 §7) so the metadata used to render consent can't be swapped.

#### 2.1 Claims

| Claim | Disclosure | Value |
| --- | --- | --- |
| `iss`, `vct`, `ojcp_version` | Always | Issuer, the type above, the OJCP version of the vocabulary. |
| `nbf`, `exp` | Always | Validity window on issuer-wide epochs (§2.7). No `iat`, no `jti`. |
| `cnf` | Always | `cnf.jwk`, a P-256 agent key from the agent's mandate key set (§3.4). |
| `agent_id` | Always | The `agent_id` the user approved. Names the platform, not the user. |
| `status` | Always | `status.status_list` per Token Status List (§7). |
| `candidate` | Elements only | The candidate binding (§2.3). |
| `scope` | Elements only | Which jobs are covered (§2.2). |
| `limits` | Always | `{ "per_employer": 1 \| 2 \| 3 }` (§6). |
| `breadth` | Always | `narrow` or `broad` (§2.5). |
| `actions` | Elements only | Permitted OJCP tools (§2.6). |
| `prohibited` | Always | Forbidden actions; contains at least `accept_terms` and `accept_offer` (§2.6). |
| `consent_scope` | Always | The highest `CandidateContext.consent_scope` the agent may declare. |
| `provider_trust_floor` | Always | `verified` or `audited`: the lowest effective trust tier (RFC 0010) at which the agent may submit (§5.3). |

A standing mandate MUST NOT carry `aud`, `sub`, `acting_on_behalf_of`, or any user identifier outside `candidate`.

**Disclosure rule.** Hiding an element of an allow-list narrows what the agent can do. Hiding anything else could hide a restriction. So the rule is stated positively, and a provider MUST reject a standing mandate that breaks it:

1. No object anywhere in the payload, at any depth, contains an `_sd` key.
2. An array-element digest (`{"...": <digest>}`, [RFC 9901 §4.2.2](https://www.rfc-editor.org/rfc/rfc9901#section-4.2.2)) appears only as a direct element of one of these arrays: `candidate`, `scope.job_families`, `scope.locations`, `scope.remote_policy`, `scope.employment_type`, `scope.experience_level`, `scope.salary`, `actions`. Every element of those arrays is such a digest.
3. A disclosed element is a scalar or a flat object of the shape this RFC defines for that array; it contains neither `_sd` nor `...`.
4. An allow-list with no disclosed element covers nothing. It is never a wildcard.

Issuers MUST pad each of these arrays with decoy digests to the fixed length in §2.5, so the array length says nothing about the user.

#### 2.2 Scope

`scope` is a closed object. A provider MUST reject a `scope` member this RFC doesn't define. Scope is evaluated only for `begin_application` and `submit_application`. For search-time actions the agent discloses no scope elements.

| Member | Required | Element | Job covered when |
| --- | --- | --- | --- |
| `taxonomy` | Yes, always disclosed | The RFC 0009 taxonomy identifier, `"https://www.onetcenter.org/taxonomy/2019/list.html"` | The provider supports it. |
| `job_families` | Yes | An [O*NET-SOC 2019](https://www.onetcenter.org/taxonomy/2019/structure.html) code at any level (major group `15-0000` down to occupation `15-2051.00`). | The job's primary (first) `occupationalCategory` entry (RFC 0009), whose `inCodeSet` equals `taxonomy`, equals a disclosed code or lies beneath it in the published hierarchy. Hierarchy, not string prefix: broad occupation `29-1210` contains `29-1221` to `29-1229`. A residual occupation (its O*NET title ends in "All Other", such as `15-1299.00`) matches only when disclosed exactly. A job without a matchable code is not covered. |
| `locations` | Yes | `{ "addressCountry": ISO 3166-1 alpha-2, "addressRegion"?: subdivision part of the ISO 3166-2 code }` (the RFC 0009 encoding), or `{ "anywhere": true }` | A job location's country (and region, when the element has one) equals a disclosed element. Non-code location text counts as unstated. A remote job states a country that matches, or states none and `{ "anywhere": true }` is disclosed. |
| `remote_policy` | Yes | A JobPosting `remote_policy` value. | The job's `remote_policy` is disclosed. |
| `employment_type`, `experience_level` | No | A JobPosting value of that field. | When the member is present, the posting states a value and it is disclosed. Unstated is not covered. |
| `salary` | Yes | See below. | See below. |

Job family, location and pay are what the user authorized, so wherever a posting is silent or ambiguous the job is **not** covered, and the agent needs an action mandate or the user present. The spec's *Eligibility Gates* rule that "not stated" is never negative concerns a candidate's eligibility. It doesn't apply here.

**Salary.** `salary` is an allow-list of permissions. Each element is one of:

- `{ "any": true }`: the user set no floor. Covers every job.
- `{ "at_least": number, "currency": ISO 4217, "unitText": "HOUR" | "WEEK" | "MONTH" | "YEAR" }`: covers a job whose posted `baseSalary` has the same `currency` and `unitText` and whose low end (`minValue`) is at least `at_least`. A posting with only `maxValue` has no low end. Units are never converted.
- `{ "unstated": true }`: present only if the user explicitly opted in. Covers a job whose posting states no salary comparable with the user's floor: none at all, another currency, another unit, or no low end.

When the user sets a floor, the issuer doesn't put the floor itself in the credential. It includes one `at_least` element (a *rung*) for every value on the grid below that is at least the floor and at most four times the floor, in the floor's currency and unit. The grid is every value *m* × 10^*n* where *n* is an integer and *m* is one of 1.00, 1.06, 1.12, 1.18, 1.25, 1.32, 1.40, 1.50, 1.60, 1.70, 1.80, 1.90, 2.00, 2.12, 2.24, 2.36, 2.50, 2.65, 2.80, 3.00, 3.15, 3.35, 3.55, 3.75, 4.00, 4.25, 4.50, 4.75, 5.00, 5.30, 5.60, 6.00, 6.30, 6.70, 7.10, 7.50, 8.00, 8.50, 9.00, 9.50 (about 6% apart). The user picks the floor from grid values on the consent screen.

For a job with a comparable posted salary, the agent discloses the **highest** rung that does not exceed the posting's low end. The provider then learns only that the user's floor is no higher than a value within about 6% of what the job already pays, which the act of applying implies anyway. It never learns the floor. For a job without one, the agent discloses `unstated` if it has it, and otherwise the job isn't covered. The agent MUST also apply the floor itself and not begin an application it doesn't cover.

The trade-off: the provider verifies pay coverage only to grid precision, and the credential is larger (§9). The alternatives were sending the floor to every provider, which reveals the user's reservation wage to the employer's system, or leaving the floor unverifiable by the provider. Both are worse.

**Equal employment.** The scope vocabulary contains no protected characteristic or proxy for one (age, graduation year, sex, race, ethnicity, national origin, citizenship, religion, disability, veteran or family status, or anything in the spec's *EEOData*), which is why `scope` is closed. Mandate claims are authorization data. A provider uses them only for the authorization decision and the `per_employer` count (§6), MUST NOT retain them beyond that, MUST NOT use them in ranking, fit scoring or screening, and MUST NOT pass them to the employer.

#### 2.3 Candidate binding

`candidate` is a REQUIRED array. Each element is a salted commitment (an SD-JWT array-element disclosure) to one identifier of the candidate that the issuer has verified:

- `{ "email": "<address, lower-cased>" }`, verified by a one-time code sent to it;
- `{ "phone": "<E.164 number>" }`, verified the same way;
- `{ "jkt": "<RFC 7638 thumbprint>" }` of a key the user holds, verified by proof of possession at issuance.

On `begin_application` and `submit_application` the agent MUST disclose exactly one element. The provider MUST match it:

- `email` or `phone`: on `begin_application` the provider records the disclosed value in the session. On `submit_application` it MUST equal, after the same normalization, the corresponding contact field in `application_data`.
- `jkt`: it MUST equal a user key that the provider has already bound to the candidate's account through its own process (*Mandate Admission*).

The agent MUST NOT disclose any `candidate` element on search-time actions. The binding means a platform holding many users' mandates can't use one person's mandate for another person's application. The provider sees the disclosed contact at the moment the candidate applies, and receives it in `application_data` at submission anyway.

The binding is only as good as the issuer's verification. A mandate issuer that shares control with the agent platform (same operator, or the platform can direct its verifications) can mint bindings for addresses it controls. Such an issuer MUST say so when it seeks admission, and a provider's published admission policy (`policy_id`, §9) MUST list it as affiliated with that platform.

#### 2.4 Limits

`limits.per_employer` is the most applications this candidate may make under standing mandates to one employer (§6). The profile allows only 1, 2 or 3: higher values have no legitimate use, and a small enum is a weaker fingerprint.

A total across employers is not in the credential. Providers can't enforce it without cross-employer counting (§6.3), so publishing it would only add a fingerprint. The user sets it at the issuer, and the agent enforces it.

#### 2.5 Breadth

`breadth` tells providers how wide the hidden allow-lists can be, without showing them:

| `breadth` | Real elements allowed in `job_families` and in `locations` | Padded length of `job_families`, `locations` |
| --- | --- | --- |
| `narrow` | at most 3 each | 4 |
| `broad` | at most 10 each | 12 |

`remote_policy`, `employment_type`, `experience_level` and `actions` are padded to 8, `candidate` to 4, and `salary` to 26. The issuer computes `breadth` from what the user approved, and nothing wider than `broad` can be issued. A provider MAY refuse `broad` in its admission policy (§9). Undisclosed elements can't push a mandate past its class, because the issuer signs the class and the padded lengths make extra elements visible.

Breadth is disclosed only to this precision on purpose. Exact counts would fingerprint the user and wouldn't protect employers any better: what bounds an employer's load is `per_employer`, not how many job families the user picked.

#### 2.6 Actions and prohibited actions

`actions` elements are OJCP tool names: `search_jobs`, `get_job_detail`, `get_employer_context`, `begin_application`, `submit_application`, `check_application_status`. `prohibited` may contain these and the binding-action tokens `accept_terms` (any `binding_actions` entry) and `accept_offer`.

- A requested tool is permitted only if it is a disclosed `actions` element and not in `prohibited`.
- `prohibited` MUST contain `accept_terms` and `accept_offer`. A provider MUST reject a mandate whose `actions` contains either.
- A user who wants an agent that prepares but never sends applications puts `submit_application` in `prohibited`.

`prohibited` also states the user's instruction for off-protocol paths (`external_redirect`, form skills, email). OJCP has no tool for accepting an offer, and a provider can reject only what reaches it. An agent conformant to this RFC MUST NOT perform a prohibited action anywhere. But outside OJCP, nothing technical stops a non-conformant agent. The consent screen says so (§3.3).

#### 2.7 Time

`nbf` is 00:00:00Z on the first day of a calendar month. `exp` is 00:00:00Z on the first day of the first, second or third month after it. Every issuer uses these epochs, so time claims carry almost no information about when a user signed up ([OpenID4VCI §15.4.1](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-15.4.1) recommends rounding them). The consent screen shows the actual expiry date.

#### 2.8 Example

Decoded issuer-signed payload of one credential. Digests are illustrative and the padding is shortened.

```json
{
  "iss": "https://mandates.example-issuer.com",
  "vct": "https://spec.ojcp.dev/vct/standing-mandate/v1",
  "vct#integrity": "sha256-…",
  "ojcp_version": "0.3",
  "nbf": 1790812800,
  "exp": 1798761600,
  "cnf": { "jwk": { "kty": "EC", "crv": "P-256", "x": "…", "y": "…" } },
  "agent_id": "ai.northstar.assistant",
  "status": { "status_list": { "idx": 412907, "uri": "https://status.example-issuer.com/lists/7" } },
  "candidate": [{ "...": "Q2v…" }, { "...": "9mT…" }, { "...": "kL0…" }, { "...": "x1P…" }],
  "scope": {
    "taxonomy": "https://www.onetcenter.org/taxonomy/2019/list.html",
    "job_families": [{ "...": "kW1…" }, { "...": "3lD…" }, { "...": "Zr8…" }, { "...": "m4E…" }],
    "locations": [{ "...": "hX0…" }, { "...": "p7W…" }, { "...": "aQ2…" }, { "...": "c9J…" }],
    "remote_policy": [{ "...": "Vb3…" }, "…"],
    "salary": [{ "...": "T5n…" }, "…"]
  },
  "limits": { "per_employer": 2 },
  "breadth": "narrow",
  "actions": [{ "...": "Lp6…" }, "…"],
  "prohibited": ["accept_terms", "accept_offer"],
  "consent_scope": "application_prefill",
  "provider_trust_floor": "verified"
}
```

Disclosures the agent presents with `submit_application` for a hybrid analyst job in New York with a posted range of $132,000 to $150,000 a year:

```json
["<salt>", { "email": "jordan@example.com" }]
["<salt>", "15-2051"]
["<salt>", { "addressCountry": "US", "addressRegion": "NY" }]
["<salt>", "hybrid"]
["<salt>", { "at_least": 132000, "currency": "USD", "unitText": "YEAR" }]
["<salt>", "submit_application"]
```

The user's floor was $125,000. The provider learns only that it is at most $132,000.

### 3. Issuance

#### 3.1 Roles

Mandate issuers are network services. A user's device or wallet acting as its own issuer is out of scope for this RFC (Alternatives). The OpenID4VCI roles are:

| OpenID4VCI role | Here |
| --- | --- |
| Credential Issuer and its Authorization Server | The mandate issuer. |
| Wallet (the OAuth client that requests and holds credentials) | The agent platform, which proves possession of its mandate keys in the Credential Request `proofs`. |
| End-User | The candidate, who authenticates at the issuer's Authorization Server and approves the consent screen. |

The agent proposes the mandate in an `authorization_details` entry of type `openid_credential` ([OpenID4VCI §5.1.1](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-5.1.1), which allows additional data fields for that type) with `credential_configuration_id` set to the issuer's configuration for the `vct` above and a member `ojcp_standing_mandate`. That member is an object with the members `candidate` (the identifier types to verify), `scope` (with the floor as `salary_floor: {value, currency, unitText}` or absent, and `include_unstated_salary`), `per_employer`, `applications_total`, `actions`, `prohibited`, `consent_scope`, `provider_trust_floor` and `months` (1 to 3). Values use the vocabularies of §2. The user may narrow any of them at the issuer, but never widen past what the agent proposed. The issuer signs what the user approved. A JSON Schema for this member will be published at `https://spec.ojcp.dev/vct/standing-mandate/v1/authorization-details.json`.

#### 3.2 Issuer obligations

Before issuing, the issuer MUST:

- verify each `candidate` identifier (§2.3);
- verify that every key in `proofs` is a current mandate key (§3.4) in the key directory of the approved `agent_id`, using the spec's *Agent Identity → Key Discovery*, and that its `ojcp_mandate_until` is at or after `exp`;
- keep `applications_total` and the floor in its own record of the authorization, and return `applications_total` and the floor to the agent in the Token Response `authorization_details` (OpenID4VCI §6.2), so the agent can enforce them.

Issuers publish JWT VC Issuer Metadata (SD-JWT VC -13 §5) and MAY sign with `x5c`. Providers decide which issuers to admit (*Mandate Admission*). OJCP defines no list of mandate issuers in this RFC.

#### 3.3 Consent screen

The **issuer** renders the consent screen, never the agent platform. It renders from a locally pinned copy of the Type Metadata whose hash matches `vct#integrity`, never from a live fetch. In plain words, it shows:

- the agent platform's name, and whether the issuer is affiliated with it (§2.3);
- the job families as O*NET titles, the places in words, and the work arrangements;
- the pay floor, and whether jobs that don't state pay are included;
- at most N applications per company, and the overall total;
- the end date, and that the user can cancel at any time, with how;
- what candidate data the agent may share (the `consent_scope` categories);
- the trust floor: "Applications go only to employers whose identity your agent has verified" (`verified`), or "… verified and independently audited" (`audited`), using RFC 0010's definitions;
- that each employer the agent applies to sees the chosen email address or phone number;
- that the agent writes the application content on the user's behalf;
- what is never covered: legal agreements, background-check authorizations, attestations, voluntary equal-opportunity questions, and accepting an offer. "Never accept an offer" is enforced by employers' systems only within OJCP. Elsewhere, such as email, it is an instruction the agent is required to follow, which no employer can check;
- that the agent may renew the credentials without asking, only on the same terms and the same end date (§7.3).

#### 3.4 Batches and mandate keys

A credential reused everywhere could be linked by its signature, salts and status index. So issuance is in batches through OpenID4VCI batch issuance ([§3.3.2](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-3.3-2), [§8.2](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-8.2)): every credential has the same Credential Dataset and different salts, decoys, signature and status index. OpenID4VCI binds each credential to a different key from `proofs` ("Each key provided by the Wallet is used to bind to, at most, one Credential").

The holder is the agent platform, and its keys are public in its key directory. A key per user would be a cross-provider identifier. So:

- A platform publishes a **mandate key set**: P-256 keys in its key directory, each marked with the JWK member `ojcp_mandate_until` (a NumericDate after which it binds no mandate). Every key in the set is shared by all of the platform's users. The set holds at least 32 keys.
- Each batch is bound to a random subset of the set, one key per credential.
- Mandate keys SHOULD be held in an HSM.
- A key MUST have been published in the set for at least 7 days before an issuer binds a credential to it, so a key injected through a compromised directory can't be used before the platform notices.

Pool keys don't weaken candidate binding: whatever key a credential is bound to, it authorizes applications only for its own candidate. A per-user key would add nothing to that binding and would make every presentation linkable.

P-256 (`ES256`) is required because [HAIP §7](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-7) makes ES256 the baseline every issuer, wallet and verifier must support, and *Agent Identity* already permits `ecdsa-p256-sha256` request signatures. An agent that also signs with Ed25519 for other infrastructure adds a second RFC 9421 signature. The KB-JWT and the matching request signature use the mandate key.

### 4. Presentation

#### 4.1 Which credential where

- For `begin_application` and `submit_application`, the agent uses one credential per (resource server, `employer.ojcp_employer_id`) pair, and never presents it anywhere else.
- For search-time actions it uses a credential never presented for application actions, and SHOULD use a fresh one per request while the batch lasts. It never presents one to two resource servers.
- Before a batch runs out, the agent refreshes it (§7.3).

No pinning is needed: the `per_employer` count is keyed on the candidate binding (§6), not on the credential.

#### 4.2 Key-binding JWT

For every request relying on a standing mandate, the agent sends `<issuer-signed JWT>~<disclosures>~<KB-JWT>` in `agent_declaration.user_mandate`. The KB-JWT ([RFC 9901 §4.3](https://www.rfc-editor.org/rfc/rfc9901#section-4.3)) is signed by the `cnf` key with `alg: ES256` and carries:

- `iat`, within the validity window of the request signature;
- `aud`, the provider's resource-server origin;
- `nonce`:
  - for `submit_application`, the session's `mandate_nonce` (*Mandate Nonce*);
  - for every other tool, the `nonce` parameter of the RFC 9421 signature on the same request whose `keyid` is the `cnf` thumbprint;
- `sd_hash`;
- for `begin_application` and `submit_application`, `ojcp_action`: the spec's existing digest form of the *Action Statement*, `sha256:` + base64url(SHA-256(JCS(action statement))), with the fields the spec already requires per tool.

RFC 9901 advises against extra KB-JWT claims without compelling reason. Here the reason is that the application doesn't exist when the credential is issued, so its binding has to travel in the per-request proof. `ojcp_action` reuses the action-statement digest unchanged rather than borrowing OpenID4VP's `transaction_data_hashes`, which in OpenID4VP means a transaction the user approved in a wallet. Here the agent signs the binding under the user's standing authority. That is a different meaning, so it gets a different claim.

Example: the KB-JWT payload for the spec's `submit_application` action-statement example (with `ojcp_version` `0.3`). The `ojcp_action` value is the actual digest of that statement. The other values are illustrative.

```json
{
  "iat": 1792505100,
  "aud": "https://careers.acme.com",
  "nonce": "mn_xBVlesPAiuvWDyyxUDEDzDTG",
  "sd_hash": "Dy-RYwZfaaoC3inJbLslgPvMp09bH-clYP_3qbRqtW4",
  "ojcp_action": "sha256:9FB-VobIkY_6Z5nKxHLuSj0G5NdHZs5Z4ejTxdAq-7c"
}
```

#### 4.3 Replay and retries

- For tools other than `submit_application`, the replay check is the provider's existing RFC 9421 `(keyid, nonce)` cache (*Agent Identity → Verification*). The KB-JWT nonce equals the signature nonce, so no second cache is needed.
- For `submit_application`, the provider consumes the `mandate_nonce` only on terminal success. A retry after an indeterminate failure, carrying the same `ojcp_action` within the request-signature window, is handled by the spec's idempotency rule: it returns the original outcome and never creates a second application or a second count.

### 5. What a standing mandate can authorize

#### 5.1 Binding actions (fail closed)

A provider that admits standing mandates for `submit_application` MUST return RFC 0009's `binding_actions` in every `begin_application` response. A standing mandate authorizes the `submit_application` for that session only if `binding_actions` is present and empty. If it is non-empty, or absent, an action mandate or the user present is required, and that action mandate binds the binding-actions digest defined in RFC 0009. The agent MUST NOT answer a screening question or fill a field that records assent, an authorization or an attestation under a standing mandate, even if the provider failed to list it. It stops and asks the user.

#### 5.2 Equal employment self-identification

Under a standing mandate, `application_data.eeo` MUST be omitted. This follows the spec's rule that EEO data is sent only with per-submission consent. A provider MUST reject a standing-mandate submission that carries `eeo`, and MUST NOT store it. A provider MAY later invite the candidate to self-identify through its own channel.

#### 5.3 Provider trust

An agent MUST NOT exercise a standing mandate for `begin_application` or `submit_application` unless, for that provider, at that time:

- it has derived an effective trust tier under RFC 0010 (source (a) in that RFC);
- the tier is at least `verified`; and
- the tier is at least the mandate's `provider_trust_floor`.

A tier taken from an index the operator pinned during migration, from a discovered index, or from any tool response never qualifies. The spec's *Agent Obligations* require "explicit, per-submission user consent" below `verified`. A standing mandate is not that consent. The agent also MUST NOT declare a `consent_scope` above the lower of the mandate's ceiling and the *Agent Obligations* maximum for the tier.

The provider can't check the agent's view of the provider's own tier. This rule binds the agent, and the claim records what the user chose.

#### 5.4 Admission defaults

| Action | Default |
| --- | --- |
| Search-time tools | Standing mandate admitted |
| `begin_application`, `submit_application`, `check_application_status` | Admitted, subject to §5.1–5.3 |
| Binding actions | Never admitted, whatever the policy says |

A provider MAY narrow this (for example, action mandates for every submission) and declares that in its manifest (§9). An agent exercising a standing mandate without the user present SHOULD declare `interaction_mode: autonomous`. A provider MUST mark every application submitted under a standing mandate as such in what it delivers to the employer, so employers can see and filter delegated applications.

### 6. Enforcing `per_employer`

#### 6.1 The count

A provider MUST refuse a `submit_application` under a standing mandate that would make the count for this candidate and employer exceed the limit, where:

- **Count key:** HMAC-SHA-256, under a provider secret, of the employer identifier and the disclosed candidate binding (normalized as in §2.3). A multi-tenant provider uses a separate secret per `ojcp_employer_id`, so its counters can't be joined across the employers it hosts.
- **Count:** successful standing-mandate submissions under that key in the trailing window equal to the provider's maximum lifetime (§9).
- **Limit:** the lower of the mandate's `per_employer` and the provider's `max_per_employer`.

Because the key is the candidate, not the credential, the count survives switching to another credential in the batch, a refreshed batch, a new mandate from the same issuer, or a mandate from another issuer that binds the same identifier. A provider SHOULD also deduplicate against its own candidate records (contact data, resume) and count a match as the same candidate. Counter entries MUST be deleted after the window.

#### 6.2 Privacy trade-off

The provider holds a keyed hash of an identifier it receives in the application itself, scoped to one employer, for at most one window. That's the minimum needed to make a per-employer limit enforceable against the agent it restrains. Counting on the credential instead would preserve more privacy, but a platform could evade it by switching credentials. Employer protection wins here, and the count stays per provider and per employer.

#### 6.3 What no one counts

Applications to one employer through two different providers, and the user's overall total, are counted only by the agent. A cross-provider counting service SHOULD NOT be built: it would be a record of every employer each candidate applied to.

### 7. Status, revocation and keys

#### 7.1 Status

- Each credential MUST have its own unique, unpredictable index, as [HAIP §6.1](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-6.1) requires. The credentials of one batch MUST be spread across several status lists, and each list MUST hold many users' credentials.
- The issuer applies status changes at fixed epochs of at most one hour, mixed with all other changes in the epoch, so a list update doesn't reveal one user's action.
- Status List Tokens SHOULD be served by a Status Provider separate from the issuer, such as a CDN (Token Status List -14 §12.6). HAIP §6.1 requires `x5c` on Status List Tokens. Issuers that follow HAIP include it.
- Providers fetch each list on a fixed schedule with a `ttl` of at most one hour, never once per application, and MUST check status against a copy no older than that before every `begin_application` and `submit_application`.

The trade-off: a revocation can take up to about two hours to reach every provider. Sessions already open are invalidated when the provider's copy shows it.

#### 7.2 Revocation and recovery

The user revokes at the issuer. The issuer revokes every credential of the authorization, including refreshed batches. After losing a device or account, the user recovers it at the issuer and revokes there. Nothing in this design depends on a key held only on the user's device.

#### 7.3 Refresh and rebinding

Agents refresh batches through [OpenID4VCI §14.5](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-14.5). An issuer MAY reissue without the user only if the Credential Dataset is identical, `exp` is unchanged, the `agent_id` is unchanged, and every new key meets §3.2 and §3.4 (including the 7-day rule). It revokes the credentials it replaces. Anything else, including any change of `agent_id`, requires the user.

#### 7.4 Key retirement and compromise

A mandate key binds no credential beyond its `ojcp_mandate_until`. The platform keeps it in the directory until then and refreshes affected batches onto newer keys first. When a key is compromised, the platform removes it from the directory at once. Every credential bound to it stops verifying, because the provider's `cnf` check needs a verified request signature by that key. Removal ends the retention obligation of *Key Binding and Rotation* for that key. The platform then refreshes the affected batches onto other keys with user interaction.

The blast radius is the credentials bound to that key that the attacker also obtained. Candidate binding limits each one to applications for its own candidate, and each candidate's `per_employer` count still applies.

### 8. Verification

A provider MUST first have verified the request's agent identity. For a standing mandate, the spec's *Verification* steps become:

1. **Credential and holder proof.** Verify the issuer signature, the disclosures and the disclosure rule (§2.1), the closed `scope`, and the KB-JWT (`typ: kb+jwt`, `ES256`, signed by the `cnf` key, `iat`, `sd_hash`). Check that the `cnf` thumbprint equals the `keyid` of a verified request signature, and that `agent_id` equals the verified `agent_id`.
2. **Admission.** Check that the issuer is admitted for standing mandates and for this action (§5.4), and that `breadth` and `per_employer` are within policy.
3. **Audience, time, version.** KB-JWT `aud` equals the provider's origin. `nbf` ≤ now < `exp`. `exp` − `nbf` is within `max_lifetime_months`. The version and taxonomy are supported.
4. **Action and scope.** The tool is a disclosed action and not prohibited. For application actions: the job is covered (§2.2), the candidate binding matches (§2.3), `binding_actions` is present and empty for submission (§5.1), no `eeo` is present (§5.2), `consent_scope` is within the ceiling, and `ojcp_action` matches the action statement the provider rebuilds. `nonce` is checked per §4.2.
5. **Status** per §7.1.
6. **Replay and count** per §4.3 and §6. A successful terminal submission atomically consumes the `mandate_nonce` and records the count.
7. **Session binding** as today.

Every failure is `user_mandate_required` and fails closed. `details` MUST NOT say which credential check failed. It MAY carry `reason` with one of two values that depend only on published policy: `action_mandate_required` (the action or a non-empty `binding_actions` needs an action mandate) and `exceeds_provider_policy` (lifetime, `breadth` or `per_employer` above the manifest maximums).

### 9. Manifest signalling: `auth.user_mandates`

RFC 0003 deferred this block. It sits in the Job Manifest `auth` object:

```json
"user_mandates": {
  "types": ["action", "standing"],
  "required_for": ["application_prefill", "submit_application"],
  "action_mandate_required_for": ["accept_terms", "accept_offer"],
  "standing": {
    "vct_values": ["https://spec.ojcp.dev/vct/standing-mandate/v1"],
    "max_lifetime_months": 3,
    "max_per_employer": 2,
    "max_breadth": "narrow",
    "taxonomies": ["https://www.onetcenter.org/taxonomy/2019/list.html"]
  },
  "action": { "max_lifetime_seconds": 600 },
  "policy_id": "https://careers.acme.com/ojcp/mandate-policy/2026-10"
}
```

- `required_for` uses the token vocabulary of `agent_signatures.required_for`.
- `action_mandate_required_for` MUST contain `accept_terms` and `accept_offer`, and MAY add tools.
- `standing.*` are the provider's admission maximums. A mandate above any of them is rejected with `exceeds_provider_policy`.
- `policy_id` is a URL for the human-readable admission policy, which lists admitted mandate issuers and marks those affiliated with an agent platform (§2.3).

A provider that accepts standing mandates MUST list `ecdsa-p256-sha256` in `agent_signatures.algorithms`.

Size: with a two-certificate `x5c` chain, `broad` padding, the salary rungs, six disclosures and a KB-JWT, a presentation comes to about 10,400 characters by our estimate. `user_mandate` `maxLength` rises from 8192 to 16384.

### 10. Conformance

New `USER_MANDATE_FIXTURES` classes. On the wire, every failure is `user_mandate_required`.

| Fixture | Setup | Expected |
| --- | --- | --- |
| `standing_candidate_mismatch` | Disclosed email differs from `application_data`. No `candidate` element disclosed. A `jkt` not bound to the account. | Reject |
| `standing_hidden_restriction` | `_sd` at top level. `_sd` inside a `locations` element. `_sd` inside a `salary` element. A digest inside `prohibited`. A digest inside `limits`. A nested `...` inside a disclosed element. An undefined `scope` member (`age_range`). | Reject each |
| `standing_padding` | An allow-list longer than its padded length for the `breadth`. | Reject |
| `standing_scope` | Job code outside every family. `29-1210` disclosed, job `29-1221.00` (accept). `15-1299.00` job under disclosed `15-1200` (reject). Job without a code, or only a plain-string `occupationalCategory`. Remote job without a country and no `anywhere`. | As stated |
| `standing_salary` | Posting low end below the disclosed rung. Rung equal to the low end (accept). Posting with only `maxValue`. Hourly posting against a yearly rung. EUR posting against a USD rung. No salary stated, with `unstated` disclosed (accept) and without it (reject). | As stated |
| `standing_binding_actions` | `binding_actions` non-empty. `binding_actions` absent. `actions` containing `accept_terms`. | Reject |
| `standing_eeo` | Standing-mandate submission with `application_data.eeo`. | Reject, nothing stored |
| `standing_per_employer` | `per_employer: 2`, then a third submission to the same employer: same credential, another credential of the batch, a refreshed batch, another issuer binding the same email. Two employers on one multi-tenant origin, two applications each (accept). | Reject the third; accept the multi-tenant case |
| `standing_policy` | `exp` − `nbf` above `max_lifetime_months`. `broad` where policy is `narrow`. `per_employer: 3` where max is 2. | Reject with `exceeds_provider_policy` |
| `standing_wrong_agent_key` | `cnf` thumbprint not a verified `keyid`. `agent_id` mismatch. KB-JWT by another key. | Reject |
| `standing_replay` | Same KB-JWT on a second search request. KB-JWT nonce not the signature nonce or the session `mandate_nonce`. Wrong `aud`. `ojcp_action` over another job, employer or candidate data. A submit retry with the same `ojcp_action` (returns the original result, count unchanged). | As stated |
| `standing_revoked` / `standing_expired` | Revoked status. Expired, not yet valid. | Reject |
| `standing_unlinkable` | Tests agents and issuers. A harness posing as two providers, and as two employers on one origin, checks that credentials differ in signature, salts and status index; that time claims sit on monthly epochs; that no `candidate` or `scope` element is disclosed on search; that batches use several status lists. | Fail the agent or issuer when violated |
| `standing_trust_floor` | Tests agents. Provider tier from a tool response, from a pinned migration index, or below `provider_trust_floor`. | Agent does not submit |

## Security and privacy considerations

- **What is unlinkable, honestly.** Two providers, or two employers on one origin, can't link the same user's search-time presentations or not-yet-made applications through the credential: this is the Verifier/Verifier unlinkability of [RFC 9901 §10.1](https://www.rfc-editor.org/rfc/rfc9901#section-10.1), from batches, padding and epochs. It does **not** hold against an issuer that colludes with a provider. The issuer can recognise a status index ([Token Status List -14 §12.5.2](https://www.ietf.org/archive/id/draft-ietf-oauth-status-list-14.html#section-12.5.2)), and a signature unless it discards them as OpenID4VCI §15.4.1 recommends. Discarding can't be proven. Once a candidate applies, the disclosed contact identifies them to that provider. That is inherent in applying.
- **Remaining fingerprint.** The always-disclosed claims are `iss`, `agent_id`, a monthly `nbf`/`exp`, `per_employer` (three values), `breadth` (two), `consent_scope` (four), `provider_trust_floor` (two) and `prohibited`. Large issuers make the first two common to many users.
- **Platform misuse.** A platform holds its users' credentials and its own mandate keys, so it can act within any user's mandate. Candidate binding stops it from acting outside that user's identity, and `per_employer` bounds the volume per employer. An affiliated issuer can mint bindings and is disclosed as such (§2.3).
- **Employer flooding.** Per employer, volume is bounded by the provider-enforced, candidate-keyed `per_employer`. Across employers, volume isn't bounded by providers, by design (§6.3). Employers see which applications were made under standing mandates (§5.4).
- **Salary.** The floor never leaves the issuer and agent. Providers learn a grid value no higher than the job's own low end (§2.2).
- **Equal employment.** Closed scope vocabulary, purpose limitation, no EEO under standing mandates (§2.2, §5.2).
- **Hashes are not anonymization.** The spec's existing caution applies to `candidate_data_digest`. Implementations SHOULD NOT log raw presentations or disclosures.

## Affected areas

- [x] Tool definitions: `begin_application` response `binding_actions` is REQUIRED for providers that admit standing mandates for submission (the field is defined by RFC 0009). `submit_application`: `eeo` is forbidden under a standing mandate.
- [x] Core schemas:
  - `agent-declaration.json`: `user_mandate` `maxLength` 8192 → 16384; its description covers both mandate types and `cnf.jwk`. `user_consent_token` description: it is never user authority and never satisfies a user-mandate requirement.
  - `manifest.json`: `auth.user_mandates` (§9).
  - `responses/error.json`: `details.reason` values for `user_mandate_required` (§8).
  - JobPosting `occupationalCategory` comes from RFC 0009. This RFC requires providers that admit standing mandates for application actions to expose it.
- [ ] Apply path types
- [x] Manifest format: `auth.user_mandates`.
- [ ] Identity verification
- [x] Security / privacy model:
  - *User Mandates → Definitions*: action mandate, standing mandate, binding action, mandate issuer. *User mandate* becomes the umbrella term.
  - *Mandate Admission*: standing-mandate defaults, affiliated-issuer disclosure, admission maximums.
  - *Mandate Profile*: `aud`, `jti` and the embedded action statement apply to action mandates. Standing mandates bind them per request (§4.2). `cnf` may be `jwk` or `jkt`.
  - *Verification*: the standing-mandate steps (§8). Step 6: consumption per presentation, and the `per_employer` count.
  - *Key Binding and Rotation*: the mandate key set, `ojcp_mandate_until`, the compromise exception (§7.4).
  - *Signalling and Errors*: the manifest block replaces "document it in tool descriptions"; `details.reason`.
  - *Personal-Agent Delegation*: item 2 ("bound to a canonical statement of the specific action") covers standing mandates bound per request.
  - *Agent Obligations*: a standing mandate is not per-submission consent (§5.3).
  - *Agent Declaration*: the `user_consent_token` paragraphs, and the provider rule that it "MAY reject requests without a valid `user_consent_token`", state that the token never substitutes for a user mandate.
  - *Agent Identity → Key Discovery*: the `ojcp_mandate_until` JWK member.
- [x] Other: conformance fixtures (§10). New identifiers under `https://spec.ojcp.dev/vct/standing-mandate/v1`: the `vct` with its Type Metadata, and the `authorization_details` member schema.

## Alternatives considered

- **Action mandates only.** That makes `autonomous` mode incompatible with user authority, and pushes platforms to weaker evidence.
- **One long-lived credential everywhere.** It links the candidate across every employer.
- **Credential-keyed `per_employer` counting, or pinning a credential per provider.** A platform evades the first by switching credentials. The second gives each provider a long-lived handle and links employers on shared ATS origins. Counting on the candidate binding, per employer, avoids both.
- **Agent-enforced `per_employer`.** That leaves employers unprotected against the party the limit restrains.
- **Sending the salary floor to providers.** It reveals the reservation wage to the employer's system. Agent-only enforcement leaves the provider unable to check. Grid rungs disclose less than either.
- **Treating unstated pay or unclassified jobs as covered.** That fails open on exactly what the user authorized.
- **A user's wallet as its own mandate issuer.** Its `iss` would be the same at every provider, so a per-provider issuer key would be needed. It would also need its own status infrastructure and couldn't verify the candidate binding independently of the user. Services issue. Users with a provider account can use action mandates or a provider-issued mandate.
- **Per-user agent keys.** They are linkable across providers. Pool keys plus candidate binding give the same protection against cross-user misuse without that.
- **OpenID4VP `transaction_data_hashes` for the per-application binding.** In OpenID4VP it means a transaction the user approved. A separate claim avoids implying that.
- **Delegation tokens (macaroons, UCAN, Biscuit).** They would be a new format and verification algorithm for providers.
- **An OpenID4VP request round trip per presentation.** MCP has no channel for it, and it adds nothing over the KB-JWT bound to the signed request.
- **Cross-provider counting of the total.** That is cross-employer surveillance.
- **BBS or other zero-knowledge presentations.** They give better unlinkability, but they are not yet standardized for SD-JWT VC and not in HAIP. Out of scope.

## Breaking changes

- **Schema.** `user_mandate` `maxLength` rises to 16384. A 0.3 consumer validating against the old schema rejects a long standing mandate. That fails closed, but it blocks the feature until the consumer updates.
- **Closed enums.** `details.reason` is new. `details` already allows additional properties, so validators are unaffected. 0.3 consumers that validate `auth` strictly against a closed object would reject `user_mandates`. The current `manifest.json` doesn't close `auth`.
- **Normative text.** *Mandate Profile*'s "MUST convey `aud` … `jti` … the action statement" is scoped to action mandates. *Verification* step 3's `cnf.jkt` check becomes "`cnf.jkt`, or the thumbprint of `cnf.jwk`". `user_consent_token` loses any reading as authority for autonomous submission. Providers that accepted it as such MUST stop treating it as a user mandate.
- **Providers that haven't implemented this RFC** reject a standing mandate at their existing `aud` and action-statement checks. That fails closed.

## Open questions

1. **Mandate issuers in trust lists.** Providers admit issuers bilaterally today. Should a later RFC let RFC 0010 trust lists carry mandate-issuer attestations?
2. **Key attestation for mandate keys.** HAIP §4.5.1 expects key attestations. Can agent platforms' HSM-held keys produce attestations that issuers accept, and should the 7-day rule become "attested by the same HSM" instead?
3. **Taxonomy updates.** When O*NET-SOC is revised, should mandates be re-issued, or should a published crosswalk apply?
4. **Status latency.** Is up to about two hours from revocation to enforcement acceptable, or should the epoch shrink at the cost of more observable updates?
5. **Count window.** Is a trailing window equal to the maximum lifetime the right horizon for `per_employer`, or should employers be able to set a longer one?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, and holds Seat 1 on the steering committee. Standing mandates could increase application volume, which bears on that revenue. The author invites co-sponsors, particularly from employer, ATS and candidate-side participants, and will recuse from the resolution vote on this RFC.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes:

Resolution:

Decision record:
