---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Verifiable agent identity via HTTP Message Signatures (RFC 9421)

- **Authors:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-06-23
- **Resolves:** [Open Question #3](https://spec.ojcp.dev/0.1/#open-questions) (Agent trust model — cryptographic agent identity)

### Motivation

In v0.1, [`AgentDeclaration`](https://spec.ojcp.dev/0.1/#schema-agent-declaration)`.agent_id` is **self-asserted**. An agent simply claims to be
`ai.wayfarer.agent`; the provider has no way to verify it. The spec acknowledges this directly
in [Open Question #3](https://spec.ojcp.dev/0.1/#open-questions): *"Agent identity verification — cryptographic signatures on Agent
Declarations — remains TBD."*

This is not a theoretical gap. Several existing and proposed mechanisms are only as strong as
the unverifiable string they key on:

- **Agent-scoped visibility** (a forthcoming RFC) gates restricted/private jobs on `agent_id`. With
  self-declared identity, *any* caller can set `agent_id: "ai.wayfarer.agent"` and read another
  partner's restricted inventory. The access control is spoofable by design until identity is
  verifiable.
- **Employer allowlists** ([`Employer Controls`](https://spec.ojcp.dev/0.1/#security-employer): "Providers MAY allowlist specific agent IDs")
  are unenforceable against a determined actor.
- **Rate limiting and abuse attribution** key on `agent_id`; an abuser rotates the claimed id
  to evade limits.
- **Audit trails** ("All agent-initiated application events SHOULD be logged with agent
  identity") record a claim, not a fact.

This RFC makes `agent_id` **cryptographically verifiable** by adopting [[RFC9421]] HTTP Message
Signatures, **using the same wire profile that deployed agent infrastructure already serves**
(see below). It is the substrate the broader provider-trust model (forthcoming RFC) and signed
status events (forthcoming RFC) build on — one signing/identity fabric rooted in domain
ownership, consistent with the manifest signing and verification proofs already in the spec.

**This is an identity layer, not an authorization layer.** MCP — which OJCP layers on — uses
OAuth 2.1 bearer tokens for authorization. This RFC does not replace that; it adds a
*who-controls-this-domain* proof that bearer tokens do not provide, and it is OPTIONAL. A
provider MAY use both: a bearer token for "may this caller act" and a request signature for
"is this caller really `ai.wayfarer.agent`."

**Alignment with deployed infrastructure.** RFC 9421 is a finalized
IETF standard. The **Web Bot Auth** drafts ([[WEBBOTAUTH-ARCH]], [[WEBBOTAUTH-DIR]], by
Cloudflare and Google) apply it to agent-to-origin authentication, and it is **already in
production**: OpenAI's ChatGPT agent serves an Ed25519 key directory at
`/.well-known/http-message-signatures-directory` and signs requests with
`Signature-Agent: https://chatgpt.com`. This RFC deliberately adopts that wire profile so that
**an OJCP agent signature is verifiable by the same infrastructure**, layering OJCP's
reverse-domain `agent_id` on top. Caveat for reviewers: Web Bot Auth is still an *individual*
Internet-Draft, not WG-adopted; the ecosystem could yet converge on token-bound proof-of-
possession (DPoP, [[RFC9449]]) instead. Because this RFC's signing layer coexists with — rather
than replaces — MCP's bearer-token authorization, that risk is contained.

### Agent Owner Flow (non-normative)

Illustrative, not normative — the normative rules are in *Proposal* below.

**Mental model — DKIM for agents.** As with DKIM email signing, a domain owner publishes a
public key on a domain they control, signs each outgoing message with the private key, and any
receiver verifies against the published key — no shared secret, no pre-arrangement. Domain
ownership is the root of trust.

**Platform agent (e.g., Wayfarer) — one-time setup:**

1. **Pick an `agent_id` on a domain you control.** Wayfarer owns `wayfarer.ai` → `ai.wayfarer.agent`.
2. **Generate a signing keypair** (Ed25519 recommended). Private key stays in your
   infrastructure (KMS/HSM); the public key becomes a JWK.
3. **Publish a key directory** (JWKS) at `https://agent.wayfarer.ai/.well-known/http-message-signatures-directory`
   — the *same well-known path OpenAI's and Cloudflare's agents already serve*. Hosting it on
   your authority domain is the proof you control the id.

**At runtime (automatic, in code):**

4. Sign each request you want verified per RFC 9421, send a `Signature-Agent` header pointing at
   your directory, and include your `agent_id` in the `AgentDeclaration`. Written once in your
   HTTP client; automatic thereafter.

**Per provider (out-of-band business step):**

5. Tell a provider your `agent_id`; they allowlist it / grant `restricted_feed`. No key
   exchange — keys are self-published and origin-bound.

**Identity vs. authorization — two separate things; this RFC provides only the first:**

| | Answers | Who does it | How |
|---|---|---|---|
| **Identity** (this RFC) | "Is this *really* `ai.wayfarer.agent`?" | Automatic, cryptographic | Verify signature vs published key — works with every provider, no pre-arrangement |
| **Authorization** (allowlists; forthcoming visibility RFC) | "Is `ai.wayfarer.agent` *allowed* to see these jobs?" | Provider business decision | Allowlist the id out-of-band |

What an owner does **not** do: no central registry signup, no per-provider key exchange, no
certificate authority. Key rotation = publish the new key in the directory, sign with it,
retire the old.

**Personal / individual agents (e.g., Claude Cowork or a personal assistant acting for one
job-seeker).** The flow above assumes the operator controls a domain. A personal agent acting
for an individual does not. The naive fix — the platform signs with its own key and asserts
`acting_on_behalf_of: "human_user"` — is **impersonation, not delegation**: the *user's*
authority is never cryptographically present, so a compromised platform could forge a mandate
for any user and no provider could tell. OJCP therefore splits the personal-agent case into
**two distinct cryptographic facts** (see Proposal §6):

- **Platform attestation** — the platform/agent signs the request with its own key (exactly the
  OpenAI `Signature-Agent: https://chatgpt.com` model). Proves *which software* is calling.
- **User authorization** — a separate mandate **rooted in a key the user controls** (a
  user-signed credential that endorses the agent's key over a hash of the action). Proves
  *whose authority* the agent carries. Defined in coordination with the forthcoming consent RFC.

A platform-only-signed `acting_on_behalf_of` string MUST NOT be treated as delegated user
authority — at most an unverified hint.

### Proposal

All additions are **optional by default** — a provider that requires nothing and an agent that
signs nothing behave exactly as in v0.1 (the agent is unauthenticated, seeing only what an
anonymous caller sees).

**1. Signing profile (RFC 9421, Web-Bot-Auth-aligned).**

When an agent signs a request it MUST produce an [[RFC9421]] signature with:

- **Covered components:** `@method`, `@authority`, `@path`, **`@query`**, `content-digest`,
  and the `signature-agent` header. *(Covering `@query` is required — omitting it permits
  query-parameter tampering, RFC 9421 §7.2.1. Implementations MAY instead cover `@target-uri`.)*
- **Signature parameters:** `created`, `expires`, `nonce`, `keyid`, and **`tag="web-bot-auth"`**.
- **`keyid`:** the base64url-encoded **JWK SHA-256 thumbprint** of the signing key per
  [[RFC7638]] (the Web Bot Auth convention), not a free-form label.
- **`Content-Digest`** ([[RFC9530]], `sha-256`) over the exact transmitted body bytes. For
  bodyless requests (GET/DELETE) the digest MUST be computed over empty content and still
  covered, so verification does not break.

**Algorithms (registry labels, not JOSE names):** `ed25519` is **RECOMMENDED** (and is required
for interoperability with currently-deployed Web Bot Auth verifiers, which are Ed25519-only).
`ecdsa-p256-sha256`, `ecdsa-p384-sha384`, and `rsa-pss-sha512` are PERMITTED. `rsa-v1_5-sha256`
(PKCS#1 v1.5) MUST NOT be used. *(The prior draft's "RS384" has no registered RFC 9421 label and
is removed.)* The verifier MUST derive the algorithm from the resolved key, not from any wire
`alg` parameter; a wire `alg` is advisory and MUST be rejected if it conflicts with the key
(RFC 9421 §7.3.6, algorithm-substitution defense).

```http
POST /ojcp/mcp?limit=10 HTTP/1.1
Host: careers.acme.com
Signature-Agent: "https://agent.wayfarer.ai"
Content-Digest: sha-256=:X48E9qOokqqrvdts8nOJRJN3OWDUoyWxBf7kbu9DBPE=:
Content-Type: application/json
Signature-Input: ojcp=("@method" "@authority" "@path" "@query" "content-digest" "signature-agent");\
  created=1750684800;expires=1750685040;nonce="a1b2c3d4";keyid="poqkLGiymh_W0uP6PZFw-...";tag="web-bot-auth"
Signature: ojcp=:k8J...:

{ "jsonrpc": "2.0", "method": "tools/call", "params": { "name": "search_jobs", ... } }
```

**2. Key discovery (Web Bot Auth directory).**

The `Signature-Agent` header carries an `https://` directory origin. The provider fetches a
**JWKS** at `<origin>/.well-known/http-message-signatures-directory` (media type
`application/http-message-signatures-directory+json`), honoring OJCP's existing JWKS
key-rotation conventions, and selects the key whose RFC 7638 thumbprint equals `keyid`. The
fetch MUST be HTTPS and MUST NOT follow cross-host redirects.

**3. OJCP identity binding (the layer on top).**

`AgentDeclaration` carries `agent_id` (unchanged) and the request carries `Signature-Agent`.
The provider MUST verify the **`Signature-Agent` origin corresponds to the authority of
`agent_id`** — the **registrable domain** of the reversed reverse-domain id, computed using the
Public Suffix List ([[PSL]]). For `ai.wayfarer.agent` the authority is `wayfarer.ai`, so
`Signature-Agent` MUST be on `wayfarer.ai` or a subdomain. (PSL is required because naive label
reversal mishandles multi-label public suffixes, e.g. `co.uk`.) This binds the cryptographic
identity (the signing domain) to the OJCP identity (`agent_id`) and is what prevents an attacker
hosting keys on a domain they control while claiming someone else's `agent_id`.

**4. Verification and binding.**

A provider that accepts a signed request MUST, in order:

1. Resolve the signer's key from the `Signature-Agent` directory by `keyid` thumbprint (§2).
2. Verify the signature per [[RFC9421]], deriving the algorithm from the resolved key (§1).
3. Verify `Content-Digest` matches the received (or empty) body.
4. Verify freshness: `created` not in the future beyond the clock-skew tolerance (RECOMMENDED
   ≤ 60s), `expires` present and not past (MUST reject if expired), and `expires − created`
   within a maximum window (RECOMMENDED ≤ 300s).
5. Verify the `nonce` has not been seen for this `keyid` within the freshness window (the
   provider MUST maintain a replay cache; RFC 9421 defines `nonce` but leaves replay detection
   to the application).
6. Verify the OJCP identity binding (§3): `Signature-Agent` origin ↔ `agent_id` authority.
7. Treat `agent_id` as **verified** only if all of the above pass. A mismatch MUST be rejected.

On any failure the provider MUST return the standard OJCP error envelope with one of:
`signature_missing`, `signature_invalid`, `key_not_found`, `digest_mismatch`,
`algorithm_unsupported`, `signature_expired`, `nonce_replayed`, `identity_mismatch` — and MUST
NOT process the request as if the identity were verified.

**5. Manifest declaration of signature policy.**

```json
"auth": {
  "required": false,
  "optional_scopes": ["candidate_context", "application_tracking", "restricted_feed"],
  "agent_signatures": {
    "supported": true,
    "algorithms": ["ed25519", "ecdsa-p256-sha256"],
    "required_for": ["restricted_feed", "application_prefill", "submit_application"]
  }
}
```

`required_for` lists contexts where a **verified** identity is mandatory. RECOMMENDED:
restricted/private feeds, any [`consent_scope`](https://spec.ojcp.dev/0.1/#schema-candidate-context) of `application_prefill` or higher (PII), and
`submit_application`. Permissionless unsigned access remains available for anonymous
`search_jobs` at `fit_scoring` scope and below.

**6. Personal-agent delegation (platform attestation + user-rooted authorization).**

For an agent acting on behalf of an individual, identity is two facts, established by two keys:

- **(a) Platform attestation** = §§1–4 above, signed with the *platform's* key. The `agent_id`
  identifies the platform (e.g., `ai.anthropic.claude`, directory on `anthropic.com`). This
  proves *which software* is calling — it does **not** establish user authority.
- **(b) User authorization** = a `user_mandate` carried in `AgentDeclaration`: a credential
  **signed by a key the user controls** that endorses the agent's signing key (a `cnf`
  key-binding) and is bound to a hash of the specific action, realized as an **SD-JWT VC**
  ([[SD-JWT-VC]]) so the agent can prove *"an authorized user of this platform mandated action
  X"* **without disclosing which human** unless the provider requires it. This mirrors the
  AP2 ([[AP2]]) open→closed mandate chain and the RFC 8693 ([[RFC8693]]) subject/actor model.

Normative rules:

- Providers MUST NOT treat `acting_on_behalf_of` (a self-asserted string) as delegated user
  authority. Where user authority matters (e.g., `submit_application` for a named candidate),
  providers requiring it MUST require a `user_mandate` whose authority chains to a user-
  controlled key, not the platform key.
- The mandate's bound action hash MUST cover the material application content so a captured
  mandate cannot be replayed against a different submission.
- Agents SHOULD honor the existing `interaction_mode` distinction (`assisted`/`supervised` =
  user-present; `autonomous` = pre-authorized), and a `user_mandate` for an `autonomous` action
  SHOULD carry the user's pre-authorized scope/constraints/TTL (the AP2 "Intent Mandate" shape).

The precise `user_mandate` schema is defined in coordination with the forthcoming **consent
RFC**; this RFC fixes the *requirement* (user-rooted, key-bound, selectively disclosed) so that
0001's identity model is correct for personal agents from the outset.

**Relationship to candidate identity.** Distinct from the existing [Identity Verification
extension](https://spec.ojcp.dev/0.1/#identity-verification), which verifies the *human candidate* via third-party verifiers and [`subject_hash`](https://spec.ojcp.dev/0.1/#identity-subject-hash).
This RFC verifies the *agent* (and, via §6, the *user's authorization* of the agent). All three
compose on a `submit_application`.

### Affected areas

- [x] Tool definitions (request signing applies across all tools)
- [x] Core schemas (`AgentDeclaration` gains `agent_id` binding + optional `user_mandate`)
- [ ] Apply path types
- [x] Manifest format (`auth.agent_signatures` block)
- [x] Identity verification (agent + user-authorization identity, composing with candidate identity)
- [x] Security / privacy model (signature, replay, downgrade, origin-binding, delegation, disclosure)
- [ ] Other:

### Alternatives considered

- **A bespoke OJCP key directory** (the prior draft's `/.well-known/ojcp-agent.json` with
  free-form `keyid`). Rejected: it diverges from the deployed Web Bot Auth profile on path,
  format, `keyid`, `tag`, and algorithms, so OJCP signatures would be unverifiable by OpenAI's
  and Cloudflare's infrastructure and vice versa. Adopting the shared profile and layering
  `agent_id` on top gives interoperability for free.
- **Platform-key-signed `acting_on_behalf_of` as delegation.** Rejected as impersonation: the
  user's authority is never cryptographically present (see §6).
- **mTLS.** Strong, but per-relationship certificate provisioning breaks permissionless
  discovery. MAY be used out-of-band; not standardized here.
- **OAuth 2.0 / bearer tokens (incl. DPoP, [[RFC9449]]).** This is MCP's authorization model and
  the enterprise mainstream; it answers "may this caller act," not "who controls this domain,"
  and bearer tokens don't bind per-request. This RFC is complementary and coexists with it; if
  the ecosystem standardizes on token-PoP over message signing, OJCP's signing layer can remain
  optional alongside bearer auth.
- **Signing the `AgentDeclaration` JSON (a JWS blob).** A signed blob isn't bound to a specific
  request and can be replayed; RFC 9421 binds to `@method`/`@path`/`@query`/`content-digest`.

### Breaking changes

None. Signing is optional and providers opt into requiring it per context. A v0.1 provider that
omits `auth.agent_signatures` never demands signatures; a v0.1 agent that never signs keeps
today's behavior (unauthenticated, anonymous-tier results). Existing flows are unaffected.

### Security considerations

- **Query / body tampering.** Covered by signing `@query` and `content-digest`; an altered URL
  query or body fails verification.
- **Algorithm substitution / downgrade.** Algorithm is derived from the resolved key, not the
  wire `alg`; `rsa-v1_5-sha256` is forbidden to avoid PKCS#1-v1.5/PSS confusion. When a context
  is in `required_for`, providers MUST NOT fall back to unsigned processing.
- **Replay.** `expires` MUST be enforced; `created` skew ≤ 60s and max window ≤ 300s
  RECOMMENDED; per-`keyid` `nonce` cache REQUIRED. Without the cache the nonce is decorative.
- **Bodyless requests.** Empty-content `Content-Digest` MUST still be present and covered.
- **Key-directory spoofing.** Defeated by the PSL-based origin binding (§3) and HTTPS-only,
  no-cross-host-redirect fetches.
- **Authority-mapping ambiguity.** Reverse-domain → registrable-domain mapping MUST use the
  Public Suffix List; naive label-reversal is a spoofing surface for multi-label suffixes.
- **Delegation forgery (personal agents).** A platform cannot forge user authority because the
  `user_mandate` chains to a user-controlled key over an action hash (§6).
- **Identity privacy.** `acting_on_behalf_of`/user identifiers MUST NOT be sent in the clear
  where avoidable; the `user_mandate` uses SD-JWT selective disclosure so the human is revealed
  only when the provider requires it — preserving today's anonymous-until-necessary posture.
- **MCP transport / session binding.** The signature covers the HTTP request, not JSON-RPC
  fields. With verified identity, providers SHOULD reject a `submit_application` whose verified
  signer differs from the `begin_application` signer, and MUST account for MCP session
  resumption / connection reuse when enforcing that continuity.

---

### For maintainers — comment period and resolution

- **Comment period opens:** 2026-06-23
- **Comment period closes:** 2026-07-23 (30 days)
- **Resolution:** <!-- Accepted / Revisions requested / Declined / Withdrawn -->
- **Decision record:** <!-- will update the decision link via docs/decisions/NNNN-*.md -->

<!-- References:
[[RFC9421]] HTTP Message Signatures
[[RFC9530]] Digest Fields (Content-Digest)
[[RFC7638]] JSON Web Key (JWK) Thumbprint
[[RFC9449]] OAuth 2.0 Demonstrating Proof of Possession (DPoP)
[[RFC8693]] OAuth 2.0 Token Exchange (subject/actor delegation model)
[[WEBBOTAUTH-ARCH]] draft-meunier-web-bot-auth-architecture (individual I-D; verify status)
[[WEBBOTAUTH-DIR]] draft-meunier-http-message-signatures-directory (individual I-D; verify status)
[[SD-JWT-VC]] SD-JWT-based Verifiable Credentials (selective disclosure)
[[AP2]] Agent Payments Protocol — mandate chain (ap2-protocol.org/specification)
[[PSL]] Public Suffix List (publicsuffix.org)
Deployed reference: OpenAI ChatGPT agent serves Ed25519 JWKS at
/.well-known/http-message-signatures-directory with Signature-Agent: https://chatgpt.com
-->
