---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc, security, privacy
---

## RFC: Action-bound user mandates and authorization conformance fixtures

- **Author:** Mathieu Colla, independent contributor
- **Status:** Draft
- **Created:** 2026-08-14
- **Related:** RFC 0001 — Verifiable agent identity via HTTP Message Signatures

### Motivation

RFC 0001 correctly separates two different facts:

1. A platform signature establishes which software or platform made a request.
2. A user authorization establishes whether that software may take a particular action for a
   particular person.

The RFC 0001 implementation adds `AgentDeclaration.user_mandate` as an optional SD-JWT VC, but
deliberately defers its claim set and verification rules to a future consent RFC. This is a good
scope boundary for the agent-identity work. It also leaves an interoperability and security gap
for providers that choose to require a user mandate: an opaque string alone does not say what
action the user authorized, which agent key may exercise it, whether it has been revoked, or
whether it has already been used.

In particular, a valid platform signature, a valid candidate identity-verification proof, or a
valid credential from an arbitrary key must not by themselves authorize a job application. Each
proves a different fact. A provider needs an explicit authorization policy that admits a mandate
for the requested operation.

This matters most for `application_prefill` and `submit_application`, where an agent may handle
PII or create an externally consequential submission. It also enables a provider to reject
plausible-looking but unsafe cases: a mandate replayed for a second submission, copied to a
different job, exercised by a different agent, or applied after revocation.

### Goals

- Define an interoperable minimum security profile for `user_mandate`.
- Bind a mandate to a well-defined OJCP action and to the verified agent signer that may perform
  it.
- Preserve selective disclosure: a mandate should prove authorization without requiring the
  candidate's identity or raw profile to appear in the credential.
- Define fail-closed verification requirements and portable negative conformance fixtures.
- Keep platform identity, candidate identity verification, evidence, and user authorization as
  distinct claims that compose without being confused for one another.

### Non-goals

- Defining a global identity system for job seekers or deciding how an employer establishes a
  candidate's real-world identity.
- Replacing provider authentication, OAuth, ATS accounts, or a provider's own consent UI.
- Mandating a particular wallet, key-management product, or delegation protocol.
- Defining employment-law retention requirements, which remain jurisdiction- and
  provider-specific.

### Proposal

#### 1. Three claims, three verification decisions

OJCP providers MUST treat the following claims independently:

| Claim | Typical evidence | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Platform / agent identity | RFC 9421 signature and `Signature-Agent` | The verified agent platform made this request. | A person authorized the request. |
| Candidate identity | OJCP identity-verification proof or provider account flow | A verifier or provider made the stated identity claim. | That an agent may submit a particular application. |
| User authorization | Valid `user_mandate` admitted by the provider's policy | A user-authorized key authorized this action under the disclosed constraints. | The candidate's civil identity, unless a separate identity flow establishes it. |

A provider MUST NOT promote a successful result in one row to a successful result in another.
For example, an identity-verification proof is not a submission mandate, and a platform-signed
`acting_on_behalf_of` value is not delegated user authority.

#### 2. Mandate acceptance is a policy decision

Cryptographic validity is necessary but insufficient. A provider that requires a `user_mandate`
MUST have a policy that determines which mandate issuers or user-rooted keys are admissible for
the relevant action. The policy is outside the credential itself; a credential issuer cannot make
itself authorized merely by issuing a valid credential.

Providers MAY support a user-controlled key, a provider account-bound credential, or an
independent identity-provider credential. If a provider must establish that the authorizing user
is the named applicant, it MUST perform that binding through its own account, verified email, or
identity-verification process. A newly generated public key alone is proof of key control, not
proof of a person's legal identity.

#### 3. Mandate claims

`user_mandate` SHOULD use an SD-JWT Verifiable Credential, as introduced by RFC 0001. The
companion consent specification MUST define a media type and an exact claim profile. At a minimum,
a mandate accepted for an OJCP action MUST convey, directly or by selectively-disclosed claims:

- `iss` and an issuer or user-root public-key reference;
- `cnf.jkt`, the RFC 7638 thumbprint of the *agent signing key* authorized to exercise the
  mandate;
- `aud`, the OJCP resource-server origin that will consume the mandate; for a multi-tenant ATS,
  this identifies the ATS endpoint, not the employer's public website (see section 4.1);
- `iat`, `nbf` when used, `exp`, and a unique `jti`;
- an OJCP version identifier;
- an action statement defined in section 4; and
- a revocation or status mechanism, unless the mandate has a short, provider-defined maximum
  lifetime and is single-use.

The credential MUST NOT carry `acting_on_behalf_of` or other direct user identifiers unless the
provider's matched action actually needs them. A provider MUST NOT require disclosure of a stable
user identifier merely to validate delegation.

#### 4. Canonical OJCP action statement

An action-bound mandate needs a stable representation of the action; hashing an unspecified HTTP
or JSON-RPC payload is not interoperable. This RFC proposes a canonical `ojcp_action` object,
serialized using JCS (RFC 8785) and hashed using SHA-256 when it is embedded by digest.

```json
{
  "ojcp_version": "0.1",
  "resource_server": "https://careers.example.com",
  "employer": { "ojcp_employer_id": "acme" },
  "tool": "submit_application",
  "job_id": "careers.example.com:1234",
  "application_id": "app_7f3a...",
  "agent_id": "ai.example.agent",
  "agent_key_thumbprint": "base64url-rfc7638-thumbprint",
  "candidate_data_digest": "sha256:base64url(JCS(candidate fields and answers))",
  "mandate_nonce": "provider-issued-single-use-nonce"
}
```

`resource_server`, `tool`, `job_id`, `agent_id`, and `agent_key_thumbprint` are REQUIRED. The
`employer` binding is REQUIRED when the resource server serves more than one employer. For
`submit_application`, `application_id`, `candidate_data_digest`, and `mandate_nonce` are also
REQUIRED. The digest is over the semantically material candidate data sent with the submission,
excluding transport metadata and the mandate itself. It prevents substitution of a different
resume reference, screening answer, contact address, or profile after consent.

#### 4.1. Multi-tenant ATS audience and employer binding

Many ATS providers host application flows for multiple employers. In that case, the recipient of
the mandate and the employer for whom an application is made are separate security properties:

- `aud` and `resource_server` identify the OJCP endpoint that consumes the mandate, such as an
  ATS tenant or shared ATS API origin. They prevent a credential issued for one resource server
  from being presented to another.
- The action statement MUST also bind the employer context of the job. A multi-tenant provider
  MUST include `employer.ojcp_employer_id` from the JobPosting when it is available. It MAY also
  include an `official_job_url` once that field is standardized and the provider has verified its
  association with the job. An unverified URL alone is not an authorization boundary.

For clarity, a multi-tenant action statement uses `resource_server` rather than an ambiguous
`provider` field and includes the employer binding explicitly:

```json
{
  "resource_server": "https://apply.example-ats.com",
  "employer": { "ojcp_employer_id": "acme" },
  "tool": "submit_application",
  "job_id": "apply.example-ats.com:1234",
  "application_id": "app_7f3a...",
  "agent_id": "ai.example.agent",
  "agent_key_thumbprint": "base64url-rfc7638-thumbprint",
  "candidate_data_digest": "sha256:base64url(JCS(candidate fields and answers))",
  "mandate_nonce": "provider-issued-single-use-nonce"
}
```

The provider MUST reconstruct both bindings from its own session state and reject a mandate that
matches its endpoint but names a different employer, tenant, job, or official-job anchor. This
prevents a mandate for Acme from being reused for another employer on the same ATS.

For `begin_application`, a provider MAY accept a mandate without `application_id`; when it does,
the action statement MUST still bind the resource server, employer when multi-tenant, job, agent
signing key, requested consent scope, and any candidate data to be prefetched. Before a
mandate-bound `submit_application`, the provider MUST return an unpredictable `mandate_nonce`
with the application session. This avoids using a low-entropy PII digest alone as a reusable or
dictionary-attackable authorization handle.

The final consent RFC SHOULD define a short action-statement schema and a registry for any
additional tool-specific fields. Providers and agents MUST ignore fields they do not recognize,
but a provider MUST reject a mandate when a required field for the requested tool is absent or
does not match its independently reconstructed action statement.

#### 5. Verification and use

For a context that requires a user mandate, a provider MUST:

1. Verify the credential signature and the holder proof required by its selected SD-JWT VC
   profile.
2. Apply its mandate-admission policy; cryptographic validity alone is not sufficient.
3. Verify `aud`, time bounds, OJCP version, and the binding to the currently verified agent
   signing key (`cnf.jkt`).
4. Reconstruct the canonical action statement from the received request and the provider's
   session state, then verify every required action field or action digest.
5. Enforce the mandate's revocation/status rule before executing the action.
6. Atomically record `jti` and `mandate_nonce` as consumed for a successful terminal submission.
   A retry after an indeterminate network failure may use the provider's ordinary idempotency
   mechanism, but MUST NOT create a second application.
7. Bind the acceptance decision to the application session and invalidate it when the user
   revokes consent or when the mandate expires.

A mandate bound through `cnf.jkt` authorizes that exact agent signing key, not every key that the
agent platform may publish in the future. An agent's key directory MUST retain the mandated key
until the mandate expires; key rotation does not transfer a mandate to a new key. If the old key
cannot remain available for verification, the user mandate MUST be reissued for the new key. This
keeps the mandate lifetime within the key-retention/rotation window and avoids silently widening
the user's authorization.

Failure at any step MUST fail closed and MUST NOT fall back to treating
`acting_on_behalf_of`, a platform signature, or an identity-verification proof as authorization.

#### 6. Manifest signalling

The final consent RFC SHOULD add an optional `auth.user_mandates` object to the Job Manifest.
It should state whether mandates are supported or required, the supported credential profile(s),
the actions and consent scopes for which they are required, the maximum mandate lifetime, and the
provider's public policy identifier. A provider need not publish private acceptance rules or user
identifiers.

Until this field exists, a provider MUST document any mandate requirement in its tool
descriptions and return a machine-readable error stating that user authorization is required.

#### 7. Protocol-neutral conformance fixtures

The project SHOULD publish portable fixtures covering an authorization decision, not a specific
wallet or vendor format. Each fixture should provide the canonical action statement, public keys,
credential/status inputs, expected outcome, and expected error class.

Required negative cases:

1. Valid platform signature but no mandate where the action requires one.
2. A credential signed only by the platform key and presented as user authority.
3. Valid mandate bound to a different agent signing-key thumbprint.
4. Valid mandate bound to a different provider, job, application, or submitted-data digest.
5. Expired, revoked, or not-yet-valid mandate.
6. Reuse of an already consumed `jti` or `mandate_nonce`.
7. Valid candidate identity-verification proof presented in place of a user mandate.
8. Valid signature from a key that the provider's mandate-admission policy does not accept.

These fixtures should be format-neutral at first. Implementations may add bindings for SD-JWT VC,
but the expected authorization result must not depend on an implementation-specific wire format.

### Privacy and security considerations

The action statement intentionally binds hashes rather than duplicating candidate data. This is
not a general guarantee that hashes of low-entropy data are safe to disclose; the provider-issued
`mandate_nonce`, selective disclosure, short validity, and one-time use are all important.
Implementations should avoid logging raw mandates, candidate data, or undisclosed SD-JWT claims.

Revocation is especially important in hiring: a candidate may withdraw consent while a long-running
verification or application session is pending. A provider must stop accepting the mandate and
invalidate the associated OJCP session once revocation becomes effective.

Key rotation must not weaken agent binding. Providers should cache the mandated key only in line
with the directory's rotation and expiry rules, and agents must publish the old key for at least
the full lifetime of every outstanding mandate that references it.

### Alternatives considered

#### Treat the platform signature as user authorization

Rejected. It proves control of the platform key, not the user's authority. It would allow a
platform compromise or an over-broad platform policy to impersonate user consent.

#### Treat any signed credential as sufficient

Rejected. A valid credential from a self-selected issuer cannot grant permission to a relying
provider. The provider's policy must decide which authorization roots are admissible.

#### Defer all semantics indefinitely to provider-specific OAuth flows

Rejected as the only path. Provider-specific OAuth remains valid, but it does not yield portable
agent delegation or interoperable audit semantics for OJCP providers.

#### Standardize a full delegation protocol in this RFC

Deferred. The minimum profile defines the security boundary and fixtures needed for OJCP
interoperability. It does not need to select a general-purpose delegation wire format beyond the
SD-JWT VC direction already adopted in RFC 0001.

### Breaking changes

None for existing v0.1 providers or agents. The profile is additive and applies only when a
provider declares or otherwise requires a user mandate. Providers that require it should offer a
clear migration path for existing unsigned application flows.

### Affected areas

- [ ] Tool definitions
- [x] Core schemas (`AgentDeclaration`, Job Manifest)
- [ ] Apply path types
- [x] Manifest format
- [ ] Identity verification
- [x] Security / privacy model
- [x] Conformance tests
