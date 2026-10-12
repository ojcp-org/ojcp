---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Decentralized provider trust — no single gatekeeper decides which employers are real

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0008 (Standing mandates), RFC 0009 (Hiring vocabulary), RFC 0011 (Key transparency log), RFC 0012 (Posting integrity)

## Summary

When an AI agent is about to send someone's résumé somewhere, it needs to know that the company on the other end is real and not a scam set up to collect personal data. Today one registry answers that question for everyone. It grades each company as unverified, verified or audited, and every agent follows its grade. Whoever runs that registry therefore decides who counts as a legitimate employer, and if the registry is wrong, slow or compromised, every agent inherits the mistake.

This proposal replaces the single verdict with evidence that anyone can check:

- **A company is identified by its website and a long-term key it publishes there.** The key is what checkers vouch for. If the domain later lapses or is taken over, the new owner doesn't have that key, so the vouching doesn't carry over to them.
- **Many independent organizations can vouch for a company.** Business registries, background-check firms, applicant tracking system vendors and others can each issue a tamper-proof statement such as "this website is run by Acme Corporation, a company registered in Delaware." Each statement can be checked by anyone, expires, and can be cancelled by whoever issued it.
- **Each agent decides whose word it accepts,** much as web browsers decide which certificate authorities to trust. Agents combine lists from several publishers, and by default they want two unrelated checkers to agree. OJCP publishes no default list, and no single company, including the one that wrote this proposal, decides who is trusted.
- **The grade says exactly what it means.** "Verified" means a named legal entity runs the site that will receive the application. Agents show the candidate that checked legal name rather than whatever name the site gives itself.

For example, suppose Acme hires through an applicant tracking system at `acme.ats.example`. The candidate's agent sees that two independent checkers vouch for the company that runs that system, and a third confirms that it hosts Acme's careers site. It tells the candidate: "Your application goes to ExampleATS Inc. (verified) on behalf of Acme Corporation (confirmed)." If someone copies Acme's careers page onto a lookalike domain, none of that evidence applies to the copy, and the agent treats it as unverified.

Agents still get a simple grade in one step. Today's registry grades keep working during the move, and they're retired only after enough independent checkers and list publishers exist.

## Motivation

The spec's *Provider Trust* section has two layers. The first is cryptographic and anyone can check it: a signed manifest, a JWK Set at `/.well-known/ojcp-keys.json`, and the *Validation Procedure*. The second is a judgement made by one party. *Registry Trust Tiers* says that **the OJCP Registry assigns** `unverified`, `verified` and `audited`. *Agent Obligations* turns those tiers into hard limits on what an agent may send. *Ecosystem Integrity* says the Registry MUST verify providers before listing them, and `find_ojcp_providers` returns the Registry's `trust_tier`.

So one registry decides which companies may receive candidate data from every conforming agent. That causes four problems.

1. **One point of control.** Under the spec's *Scope* section, the Registry sets its own verification criteria outside the spec. OJCP's governance promises that no single party can change the protocol to its own advantage, yet a single trust gate gives its operator that leverage without changing any normative text.
2. **One point of failure.** If the Registry is down, wrong, slow or captured, every agent inherits the error. A legitimate employer that the Registry hasn't reviewed can't reach `verified` anywhere, however much independent evidence exists.
3. **Evidence that can't be checked or reused.** The Registry's identity check produces a database row, not a credential. An agent can't verify it, another index can't reuse it, and an ATS that has already done stronger know-your-customer checks on the same employer can't contribute them.
4. **It doesn't match the rest of OJCP.** Agent identity binds to DNS with no registry (*Agent Identity → Identity Binding*). Candidate verification uses plural verifiers that providers choose (*Identity Verification*). Mandate admission is the relying party's policy, not the issuer's (*User Mandates → Mandate Admission*). Provider trust is the one place where a central party decides.

The aim is to **decentralize authority, not convenience**. Agents still look providers up in one call and get a tier in one step. What changes is that no index, registry or attester has the final say, and the tier states precisely what it certifies.

The proposal adds no new cryptography or transport. It composes [`did:web`](https://w3c-ccg.github.io/did-method-web/) as a name, SD-JWT VC and the IETF Token Status List for attestations, a trust-list format modelled on OpenID Federation's `trust_mark_issuers`, and the MCP Registry's API for indexes. Key history and first-seen times come from RFC 0011, Key transparency log. Signatures on individual postings are defined in RFC 0012, Posting integrity.

## Proposal

### 1. Terminology

- **Organization identifier**: the `did:web` DID derived from a provider's manifest origin (§2.1).
- **Organization identity key** (identity key): the long-lived key in a provider's `ojcp-keys.json` that names the organization cryptographically and certifies its working keys (§2.2).
- **Attester**: a party that issues verifiable statements about organizations, such as a business registry, a know-your-business (KYB) firm, an ATS vendor or an auditor.
- **Attestation**: an SD-JWT VC from an attester about one organization identifier, bound to its identity key (§3).
- **Operator**: the legal entity behind an attester, as assigned by list publishers (§4.1). Independence is counted by operator.
- **Trust list**: a signed document in which a **list publisher** names the attesters it accepts, per attestation type (§4).
- **Trust policy**: an agent operator's configuration: which lists it uses, pinned to which keys, and its thresholds (§4.3).
- **Effective trust tier**: `unverified`, `verified` or `audited`, as derived by an agent under §5. It replaces the registry-assigned tier as the input to *Agent Obligations*.
- **Receiving origin**: the origin that will receive candidate data. Tiers are always about this origin.

### 2. Organization identity

#### 2.1 The identifier

A provider's organization identifier is `did:web:` followed by the host of the origin serving `/.well-known/ojcp.json`, lowercased, in A-label form, with a non-default port percent-encoded (`did:web:careers.acme.com`, `did:web:jobs.example%3A8443`). Path-form identifiers aren't used, because a manifest is per origin. The [`did:web` method](https://w3c-ccg.github.io/did-method-web/) forbids IP addresses, so an origin whose host is an IP literal has no organization identifier, and its effective tier is `unverified`.

All comparisons of identifiers (`sub`, `provider.did`, `iss`) are byte-exact on this canonical form, and origins are compared as ASCII serializations per [RFC 6454 §6.2](https://www.rfc-editor.org/rfc/rfc6454#section-6.2), as in *Delegated Binding*.

Add an OPTIONAL `provider.did` to the manifest. When it is present and differs from the derived identifier, the agent treats it as the existing `domain_mismatch` failure. When it is absent, the derived identifier applies. Agents never resolve a provider's DID: every check below compares evidence with the origin the agent is already talking to over HTTPS.

A provider MAY serve a minimal DID document at `/.well-known/did.json` with a `service` entry of type `OJCPManifest` pointing at its manifest, so that generic DID tooling can find it. OJCP consumers MUST NOT use verification methods from a DID document for any OJCP purpose. ([DID Core 1.0](https://www.w3.org/TR/did-1.0/) makes `verificationMethod` OPTIONAL, so a document without keys is valid.)

#### 2.2 One key location, and the identity key

All OJCP keys stay in the existing JWK Set at `/.well-known/ojcp-keys.json`. Two members are added to the JWKs in that set:

- `"ojcp_role": "identity"` marks the **organization identity key**. A set MUST contain at most one current identity key. It is long-lived, SHOULD be held offline or in an HSM, and is used only to certify other keys and to sign its key events (RFC 0011). Its rotation is valid only as a logged step in its identity lineage (RFC 0011), which is bound to one `sub`, so it never follows a domain rename. An identity key that appears without a logged link from its predecessor starts a new lineage, with no tenure (§5.3) and none of the predecessor's attestations.
- `"ojcp_cert"` on any other key is a **key certificate**: a compact JWS signed by the identity key, with protected header `typ` `ojcp-key-cert+jwt` and `kid` set to the identity key's RFC 7638 thumbprint, whose payload is:

```json
{
  "sub": "did:web:careers.acme.com",
  "jkt": "NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs",
  "purposes": ["manifest"],
  "iat": 1791763200,
  "exp": 1799539200
}
```

`jkt` is the [RFC 7638](https://www.rfc-editor.org/rfc/rfc7638) thumbprint of the certified key, and `purposes` lists what it may sign: `manifest`, or `posting` (RFC 0012). Certificate lifetime SHOULD NOT exceed 180 days. Manifest-signing keys keep rotating every 90 days as *Key Rotation* recommends. Rotation needs a new certificate from the identity key but never touches attestations, which bind to the identity key.

For derivation under §5, a manifest counts as signed only if it validates under the existing *Validation Procedure* **and** its signing key carries an unexpired `ojcp_cert` that verifies under the current identity key, has `sub` equal to the organization identifier, and lists `manifest`. The 0.3 procedure is otherwise unchanged.

Keeping one key location matters. Agents already resolve keys from `ojcp-keys.json`, RFC 0011 logs one set per origin, and two copies (for example in `did.json`) would drift and become an attack surface.

`ojcp-keys.json` is used by the spec but missing from *IANA Considerations*, and this RFC adds it.

### 3. Attestations

#### 3.1 Format

An attestation is an SD-JWT VC (`typ` `dc+sd-jwt`) built on [RFC 9901](https://www.rfc-editor.org/rfc/rfc9901) SD-JWT. Implementations follow the drafts that [HAIP 1.0](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) pins in its §9.4: [SD-JWT VC draft-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-13) and [Token Status List draft-14](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14). They keep following HAIP's pins until the final RFCs are published. Attestations are published, not presented to a verifier, so there's no Key Binding JWT. OJCP does not claim HAIP conformance; §3.3 states what is reused.

An OJCP attestation MUST carry:

- `iss`: the attester's identifier, an HTTPS origin with no path;
- `sub`: an organization identifier (§2.1);
- `vct`: a type from §3.2;
- `cnf.jkt`: the RFC 7638 thumbprint of the subject's identity key (§2.2);
- `iat` and `exp`, with `exp` − `iat` no longer than the type's maximum in §3.2;
- `status.status_list` (§3.4);
- `relationship`: `none`, or the commercial or control relationship the attester has with the subject (`operator`, `host`, `customer`, `affiliate`). Agents count only `none` towards a tier (§4.3).

An attestation counts only when `sub` equals the organization identifier of the receiving origin (or a parent under §3.5) **and** `cnf.jkt` equals the thumbprint of that origin's current identity key, or of a predecessor linked to it by an RFC 0011 successor chain. A copied attestation therefore never transfers: a lookalike domain fails on `sub`, and a party that takes over the domain fails on `cnf.jkt` because it doesn't hold the identity key. Any party, including an index, may mirror attestations without being trusted.

Attesters MAY issue through [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) or any other means. Agents compare `vct` as an exact string and MUST NOT need SD-JWT VC Type Metadata to evaluate one. The `vct` URLs SHOULD resolve to Type Metadata for tooling. Every OJCP-defined `vct` and `typ` URI lives under `https://spec.ojcp.dev/vct/<name>/v1`, a site served by the ojcp-org spec repository and governed by the steering committee.

#### 3.2 Attestation types

| Type (`vct`) | What it certifies | Required claims | Max lifetime |
|---|---|---|---|
| `https://spec.ojcp.dev/vct/domain-control/v1` | The holder of the identity key controlled the origin at issuance. | `method` ([RFC 8555](https://www.rfc-editor.org/rfc/rfc8555) `dns-01` or `http-01`), `checked_at` | 90 days |
| `https://spec.ojcp.dev/vct/legal-entity/v1` | The named legal entity operates the origin and holds the identity key. | `legal_name`, `jurisdiction` (ISO 3166-1 or 3166-2 code), `checked_at`; OPTIONAL `lei` ([ISO 17442](https://www.gleif.org/en/about-lei/iso-17442-the-lei-code-structure)) | 180 days |
| `https://spec.ojcp.dev/vct/business-registration/v1` | The operating entity holds the named registration, in the stated status. | `legal_name`, `jurisdiction`, `registry`, `registration_number`, `registration_status`, `checked_at` | 180 days |
| `https://spec.ojcp.dev/vct/hosted-employer/v1` | The origin hosts jobs and receives applications for the named employer, under a contract the attester has checked. | `employer_legal_name`, `employer_jurisdiction`, `checked_at`; OPTIONAL `employer` (organization identifier), `employer_id` (the posting's `employer.ojcp_employer_id`) | 180 days |
| `https://spec.ojcp.dev/vct/conformance/v1` | The origin passed the OJCP conformance suite. | `suite_version`, `ojcp_version`; OPTIONAL `report_uri` | 365 days |
| `https://spec.ojcp.dev/vct/security-review/v1` | The origin passed a review of key handling and PII flows. | `scope`; OPTIONAL `report_uri` | 365 days |
| `https://spec.ojcp.dev/vct/listing-tenure/v1` | An index assigned the origin the 0.3 `audited` tier continuously since `listed_since`. | `listed_since`, `index` | 365 days; issuable only during migration (§10) |

New types are added by RFC.

**Domain checks at issuance and afterwards.** Before issuing any type except `conformance` and `security-review`, an attester MUST:

1. prove control of the origin with an RFC 8555 challenge whose response is signed by the identity key;
2. query the domain's registration data over RDAP ([RFC 9082](https://www.rfc-editor.org/rfc/rfc9082), [RFC 9083](https://www.rfc-editor.org/rfc/rfc9083)) and record its `registration`, `transfer` and `expiration` events (RFC 9083 §4.5);
3. for `legal-entity` and `business-registration`, confirm that the registrant, where the registry discloses it, matches the entity, or else obtain the entity's written confirmation through a channel independent of the domain (for example its registered office).

While the attestation is valid, the attester MUST repeat step 2 at least every 7 days. It MUST set the attestation's status to SUSPENDED within 24 hours of observing any of these: a `transfer` or `registration` event later than `checked_at`; a lapse past `expiration`; a registrant change it can observe; or an RFC 0011 key event that adds an identity key for the subject outside the attested key's lineage, revokes the attested key, or contests its successor. It reinstates or reissues only after repeating steps 1–3. Short lifetimes cap the damage when registration data is redacted and a change goes unnoticed.

#### 3.3 Attester keys

An attestation's issuer key is acceptable only if the agent's trust policy pins it (§4.1). There are two ways:

- **JWK thumbprints.** The list pins the RFC 7638 thumbprints of the attester's keys. The agent takes the key itself from the list's embedded `jwks`, from a provider's staple (§3.6), or from the attester's [JWT VC Issuer Metadata](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-13#section-5) (`/.well-known/jwt-vc-issuer`), and accepts it only if the thumbprint matches.
- **X.509.** The attestation carries `x5c`. The chain MUST validate to an anchor that the list pins for this attester, and the end-entity certificate MUST contain a URI SAN equal to `iss`. An anchor is always paired with the attester identifiers it may vouch for. It never trusts a whole PKI for a type.

This reuses SD-JWT VC's two issuer signature mechanisms (draft-13 §3.5). HAIP's profile mandates `x5c`. OJCP agents MUST support both, so attesters that already follow HAIP can take part unchanged. Thumbprint pinning comes from OJCP, not from SD-JWT VC or HAIP.

#### 3.4 Revocation and status

Attestations reference an IETF Token Status List (`statuslist+jwt`). OJCP uses `0x00` VALID, `0x01` INVALID and `0x02` SUSPENDED. Beyond the pinned draft, OJCP requires:

- `status.status_list.uri` MUST be on the same origin as `iss`, and the Status List Token MUST be signed by a key pinned for that attester (§3.3), so a third party can't answer for an attester.
- Each attestation gets a unique, unpredictable index (as HAIP requires). Attesters MUST NOT use per-subject lists or per-subject URIs, and SHOULD keep each list at 10,000 entries or more.
- Status List Tokens MUST carry `exp` and `ttl`, which the draft only RECOMMENDS. An agent caches a token for no longer than the earliest of `exp`, `iat` + `ttl`, and **24 hours**, whatever the issuer says. A token without `exp` or `ttl` counts as unavailable.
- An attestation whose status can't be established inside that window is **absent**: it adds nothing to the tier, and it doesn't mark the provider as bad. This fails closed, because tiers only ever rise from accepted evidence.

#### 3.5 Hosted providers

Many employers receive applications through an ATS or a board. The tier is always about the **receiving origin** and the legal entity that operates it, never about the employer named in a posting.

- **Own evidence only.** An origin reaches `verified` only with identity attestations about itself. Attestations about another organization never count towards its tier: not those of an employer it hosts, and not those reached through any self-issued link.
- **Tenants under a host's namespace.** For an ATS that gives each tenant its own subdomain (`acme.ats.example`), the legal entity receiving data is the ATS. An attestation whose `sub` is the ATS origin (`did:web:ats.example`) counts for a tenant origin only when the tenant's host ends with `.` followed by the ATS host, **and** the tenant's `ojcp-keys.json` carries the same identity key as the ATS origin (equal thumbprints). This is the rule of *Namespace Binding*: authority flows only from a host to the names beneath it, so no Public Suffix List is involved. A tenant that runs its own identity key needs its own attestations.
- **Who the employer is.** The employer shown to a candidate is a separate fact. An agent MAY present a posting's employer as confirmed only when the receiving origin holds an accepted `hosted-employer` attestation from an attester with `relationship` `none`, and the posting's `employer.ojcp_employer_id` or employer DID matches its `employer_id` or `employer`. Self-issued links and employer-signed claims do not confirm an employer. Such an attestation doesn't change the host's tier.

#### 3.6 Publishing and stapling

Add an OPTIONAL `trust` block to the manifest:

```json
"provider": { "name": "Acme Careers", "did": "did:web:careers.acme.com" },
"trust": {
  "attestations_uri": "https://careers.acme.com/.well-known/ojcp-attestations.json"
}
```

`attestations_uri` MUST be on the manifest's origin. It returns a JSON object with `attestations` (an array of compact SD-JWT VCs, at most 32), `status_tokens` (current Status List Tokens for them) and `issuer_jwks` (each attester's JWK Set). Every item is signed by its own issuer, so stapling is safe and the provider can't forge any of it. Providers SHOULD refresh status tokens at least every 12 hours. Agents use stapled items first and fetch from attesters only when a staple is missing or stale.

#### 3.7 Attester accountability

An attester whose attestations a list includes MUST publish, in its JWT VC Issuer Metadata, an `ojcp_attester` object with:

- `policy_uri`: a practice statement covering the checks behind each type, its fees (or that there are none), and the liability it accepts;
- `abuse_uri`: where anyone can report a subject or an attestation;
- `appeals_uri`: how a subject contests a refusal, suspension or revocation;
- `suspension_hours`: the maximum time from a credible abuse report to SUSPENDED, no more than 72.

OJCP doesn't create liability. Liability is whatever the attester's practice statement and law provide, and list publishers decide whether that's adequate. Business-registration checks against public government registries can be fully automated, and this RFC RECOMMENDS that list publishers include at least one attester that offers them free of charge, so that small employers aren't priced out. The existing VerifierManifest is not changed (see Breaking changes).

### 4. Trust lists

#### 4.1 Format

A trust list is a compact JWS with `typ` `https://spec.ojcp.dev/vct/trust-list/v1`. Its shape borrows from the `trust_mark_issuers` claim of [OpenID Federation 1.0](https://openid.net/specs/openid-federation-1_0-final.html), which maps each type to the issuers trusted for it:

```json
{
  "publisher": "https://lists.candidate-advocates.example",
  "iat": 1791763200,
  "exp": 1792368000,
  "policy_uri": "https://lists.candidate-advocates.example/criteria",
  "appeals_uri": "https://lists.candidate-advocates.example/appeals",
  "next_keys": ["vbP5...thumbprint"],
  "attesters": [
    {
      "id": "https://kyb.attester.example",
      "operator": "lei:5493001KJTIIGC8Y1R12",
      "vct": ["https://spec.ojcp.dev/vct/legal-entity/v1", "https://spec.ojcp.dev/vct/business-registration/v1"],
      "jwks": { "keys": [ { "kty": "EC", "crv": "P-256", "x": "…", "y": "…", "kid": "kyb-2026" } ] }
    },
    {
      "id": "https://registry-a.example.gov",
      "operator": "gov:registry-a",
      "vct": ["https://spec.ojcp.dev/vct/business-registration/v1"],
      "x509": [ { "anchor_sha256": "9b2c…", "san_uri": "https://registry-a.example.gov" } ]
    }
  ],
  "logs": [ { "origin": "keys.log-operator-a.example/ojcp", "key": "keys.log-operator-a.example/ojcp+…" } ],
  "witnesses": [ { "name": "witness-1.example", "key": "witness-1.example+…" }, { "name": "witness-2.example", "key": "…" }, { "name": "witness-3.example", "key": "…" } ],
  "witness_quorum": 2,
  "distrusted": [
    { "id": "https://cheap-attest.example", "keys": ["Q3x…thumbprint"], "distrust_after": "2026-09-01T00:00:00Z", "reason_uri": "https://lists.candidate-advocates.example/incidents/12" }
  ]
}
```

- Trust is per type. An attester listed for `domain-control` gains nothing for `legal-entity`. An entry with an empty or missing `vct` grants nothing, and agents MUST reject the list as malformed.
- Every entry pins keys: `jwks` (agents use the embedded keys, or compare thumbprints when fetching), or `x509` anchors paired with the SAN the end-entity certificate must carry.
- `operator` identifies the legal entity behind the attester: an LEI (`lei:`) where one exists, otherwise an identifier the publisher assigns and documents. Two attesters count as one operator if **any** configured list gives them the same `operator`.
- `distrusted` names an attester by `id`, by key thumbprints, or by certificate SPKI hash (`spki_sha256`). Without `distrust_after`, every attestation from it is rejected. With `distrust_after`, an attestation still counts only if the agent itself recorded accepting it before that time. The attester-signed `iat` is never evidence, and an agent with no such record rejects the attestation, so the subject needs a reissue from another attester.
- `logs`, `witnesses` and `witness_quorum` carry a transparency policy in the shapes RFC 0011 defines (keys are C2SP vkey strings, and the quorum is a strict majority of `witnesses`). An agent doesn't merge witness sets across lists: its operator selects one witness policy per log, so a union of lists can never dilute a quorum.

#### 4.2 Pinning, freshness and distribution

- **Pinned keys, not names.** An agent's trust policy names each list publisher by the RFC 7638 thumbprints of its signing keys, as browser root stores pin keys. A list is valid only if one of those keys signed it. The publisher's DNS name and the URL the list came from don't matter, so a list can be served from any mirror, including an index or a CDN.
- **Key rollover.** A publisher pre-announces successor keys in `next_keys` on a list signed by a currently pinned key. Agents add them to the pin set and drop a key only when a list signed by a pinned key no longer names it.
- **Ordering.** An agent rejects a list whose `iat` is earlier than the newest `iat` it has accepted from that publisher, and rejects any `iat` more than 5 minutes in the future. A mistake can therefore never lock a publisher out for longer than the clock skew. `exp` − `iat` MUST NOT exceed 7 days, which limits rollback to a week-old list at most.
- **Refresh.** Agents refresh every configured list at least every 24 hours, on a schedule that doesn't depend on which providers they're evaluating.
- **Expiry is asymmetric.** When a list expires, or no valid copy can be fetched, its grants (`attesters`) stop counting, but its `distrusted` entries stay in force until a newer valid list from the same publisher removes them. A lapse can never quietly re-enable a distrusted attester.

#### 4.3 Agent trust policy and combination

- **OJCP defines no default trust list,** and the OJCP project publishes none. It MAY keep an informational directory of known lists without endorsing any of them.
- A conforming agent MUST let its operator configure lists and their pinned keys, MUST support at least three configured lists, and SHOULD ship with lists from at least two publishers that are not the same operator. Each agent MUST show its users which lists it uses and where to send an appeal.
- **Accepted attestation.** An attestation is accepted when its attester and key are listed for its `vct` on at least one configured, valid list, it isn't distrusted on any configured list (expired lists included, per §4.2), and `relationship` is `none`.
- **Identity threshold.** By default, `verified` needs accepted `legal-entity` or `business-registration` attestations from **at least two different operators**, and they MUST agree on `legal_name` (after Unicode NFKC normalization and case folding) and `jurisdiction`, and on `lei` or `registration_number` where both carry one. Disagreeing attestations count for nothing. An operator MAY configure stricter thresholds. It MAY lower the threshold to one only by explicit configuration, and the agent MUST then show that weaker policy wherever it shows the tier. This default stops a single attester, or a single ATS vendor, from making any origin `verified` on its own.
- **Veto.** A distrust entry on any configured list removes that attester for the agent. This is the conservative choice. Its cost (one publisher can block an attester for its subscribers) is an open question.

### 5. Effective trust tiers

The tier names and the *Agent Obligations* table stay. Their source changes: "registry tier X" becomes "effective trust tier X", and "Manifest unsigned, no registry record" becomes "Manifest unsigned".

#### 5.1 What a tier certifies

- **`verified`** certifies that a named legal entity (the agreed `legal_name` and `jurisdiction`) operates the receiving origin and holds its identity key, as checked by independent attesters the agent's policy accepts. It does **not** certify that this entity is the employer named in a posting, or that a job is real.
- **`audited`** adds that the origin passed the conformance suite and a security review, and that its identity key has been continuously and publicly in place for at least 90 days (§5.3).

#### 5.2 Derivation

An agent derives the tier at the consent boundary (*When to Validate*), in this order. No network fetch to an attester happens before step 4.

1. Validate the manifest under §2.2. If validation fails, or the manifest is unsigned, the tier is `unverified`.
2. Derive the organization identifier *D* and the identity key thumbprint *K* (§§2.1–2.2). Check `provider.did`.
3. Collect at most 32 attestations from the staple (§3.6). Discard any that fail locally: issuer signature against a pinned key, `typ`, known `vct`, lifetime cap, `exp` (60 seconds of skew, as elsewhere in the spec), `sub` and `cnf.jkt` against *D* and *K* (or the namespace rule of §3.5), `relationship`, and the trust policy of §4.3.
4. Establish status for the survivors, from staples first. Fetches are limited to issuers that passed step 3, to at most 8 per evaluation, within a total deadline of 5 seconds, under the SSRF rules of *Agent Identity → Key Discovery*. Anything unresolved is absent.
5. Apply §5.1 and the thresholds of §4.3. For `audited`, add §5.3.

The tier is cached for no longer than its shortest input: manifest `expires_at`, key certificate, attestation `exp`, status cache (≤ 24 hours), and list validity. Agents MUST NOT raise a tier by caching or by ignoring a failed check (the existing rule).

#### 5.3 Tenure

Tenure for `audited` is the **lineage tenure (RFC 0011)** of the identity key *K*: the time since the authenticated first-seen time of the genesis entry of *K*'s identity lineage, provided *K* is reached from that genesis through an unbroken logged rotation chain. It counts only under a log and witness policy the agent accepts, and `audited` needs at least 90 days. Any new genesis resets tenure to zero. A new owner of the domain can't inherit tenure, because it can't extend the old owner's lineage. Tenure never comes from an unauthenticated timestamp, an index's listing date, or `iat`.

During migration only (§10), an accepted `listing-tenure` attestation bound to *K* counts as tenure from its `listed_since`. This lets providers that were `audited` under 0.3 keep that standing while their logged history builds up.

#### 5.4 Sources of an effective tier

Only two sources give a conformant effective tier:

- **(a)** derivation under §5.2;
- **(b)** during migration only, the `trust_tier` from an index that the agent's operator explicitly pinned in configuration (by index URL and, where the index signs responses, its key). A tier from an unpinned or discovered index, from a provider's own claims, or from any tool response is never an effective tier.

An agent that implements §5.2 during migration uses the higher of (a) and a pinned index's (b), so implementing derivation never lowers a tier. When (b) is the higher, the tier's source is (b). Agents record the source with the tier. RFC 0008, Standing mandates, accepts only source (a) for submission without the user present.

#### 5.5 Display

Wherever an agent shows a tier to a candidate, it MUST:

- show the attested `legal_name` and `jurisdiction` next to it, never the self-asserted `provider.name` or a posting's `employer.name`;
- show the receiving origin's host in A-label form, or in Unicode only if it passes the mixed-script and whole-script confusable checks of [UTS #39](https://www.unicode.org/reports/tr39/);
- for a hosted origin, name both parties ("ExampleATS Inc., verified, on behalf of Acme Corporation, confirmed" or "…, not confirmed"), and present an employer as confirmed only under §3.5.

### 6. Key transparency

Identity lineage, authenticated first-seen times and lineage tenure are defined in RFC 0011, Key transparency log, which logs the key certificates of §2.2 as they are. RFC 0011 also defines the stapled proof bundle, carried in `ojcp-keys.json` rather than in the manifest. This RFC uses lineage in two places: identity key continuity (§§2.2, 3.1) and tenure (§5.3). A trust policy MAY require that the identity key appear in a log under the policy of §4.1. Requiring it means that an attacker who takes over a domain and installs a new identity key does so in public, where the owner's monitors and attesters will see it (§3.2).

### 7. Postings

Signatures on individual postings are defined in RFC 0012, Posting integrity, using keys certified by the identity key with purpose `posting` (§2.2). A posting signature shows who published a posting. The tier at the consent boundary is always derived for the receiving origin, never for a posting's signer.

### 8. Indexes and the MCP Registry

- **No index is authoritative.** Anyone may run an index. An index's `trust_tier` is a hint for discovery. It becomes an effective tier only under §5.4(b). An index MUST state in its documentation whose policy its `trust_tier` reflects.
- **`find_ojcp_providers`.** Each provider gains `did`, `attestations` (mirrored, unmodified) and `indexed_at`. A new filter, `has_attestation_types`, matches by `vct`. `min_trust_tier`, `trust_tier`, `verified` and `verified_at` are deprecated (§10) and keep their current enums. `manifest_signed` keeps its meaning: the index saw a valid signature when it last fetched the manifest.
- **Upstream publication to the official MCP Registry.** The [official registry keeps only `_meta` data under `io.modelcontextprotocol.registry/publisher-provided`, silently drops all other keys, and limits that data to 4 KB](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/server-json/official-registry-requirements.md). A provider that publishes its MCP endpoint there MAY include only pointers, under the reverse-DNS subkey `dev.ojcp.spec/provider`: `did` and `manifest_url`. Attestations are never published upstream. Indexes fetch them from the origin. A multi-tenant host publishes one server record for its host and lists tenants in its manifest. [The registry's moderation policy](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/moderation-policy.mdx) treats the same server submitted under different names as spam, so tenants don't get one record each.
- **Indexes as MCP sub-registries.** An index MAY implement the [MCP Registry OpenAPI](https://github.com/modelcontextprotocol/registry/blob/main/docs/reference/api/openapi.yaml) and inject OJCP data under a `_meta` key named after itself, as the [aggregator guidance](https://modelcontextprotocol.io/registry/registry-aggregators) recommends, so that readers can tell which index added what. What carries over is the read API, the `server.json` record, and the expectation that aggregators sync about hourly and do their own moderation. What doesn't carry over: registry namespace authentication proves control of a name, not anything about an employer, and confers no tier.
- **`registry.ojcp.dev`** is one index among many and has no special status in any normative rule. Where it attests, it is one attester among many and counts only for agents whose lists include it.

### 9. What stays central

The specification (types, list format, derivation rules), the conformance suite ([ojcp-org/conformance](https://github.com/ojcp-org/conformance)), which anyone may run and attest to, and governance under `GOVERNANCE.md`, including *Infrastructure Succession*. None of these decides whether a given employer is legitimate.

### 10. Migration

0.3 consumers keep working at every step.

1. **0.4 (additive).** Add `provider.did`, the key members, the `trust` block, the attestation types, the trust-list format and the new `find_ojcp_providers` fields. Reword *Agent Obligations* to effective tiers with the two sources of §5.4. Indexes keep computing `trust_tier`. An index that assigned `audited` under 0.3 MAY issue `listing-tenure` attestations to those providers, bound to their identity keys, with `listed_since` taken from its records.
2. **Deprecation.** Registry-assigned tiers are marked deprecated, and agents SHOULD implement §5.2, only once the steering committee has recorded that all of these thresholds are met:
   - at least three list publishers from at least three different segments (agent platforms, candidate-advocacy or public-interest bodies, employers or their vendors, government or academia), with no two sharing an operator;
   - for each of `legal-entity` and `business-registration`, at least two operators listed by at least two of those publishers, at least one of which offers the free automated path of §3.7;
   - at least two RFC 0011 logs run by different operators, each cosigned by a witness quorum drawn from at least three witness operators;
   - every OJCP-held attester role, key and dataset (including any held for `registry.ojcp.dev`) entered in the *Infrastructure Succession* inventory.

   Attesters and publishers operated by the author's employer don't count towards these minimums.
3. **End of the migration.** Twelve months after step 2 at the earliest, and no earlier than the next major version under *Versioning*: source (b) and `listing-tenure` are removed, and `trust_tier`, `min_trust_tier`, `verified` and `verified_at` leave the normative text.

### 11. Conformance

Fixtures for the suite:

- **Identity key:** a manifest key with a valid `ojcp_cert`; an expired certificate; a certificate for another `sub`; a certificate without `manifest`; two identity keys in one set.
- **Attestations:** valid; wrong `sub`; `cnf.jkt` for a former identity key with no successor link (rejected); the same with a link (accepted); lifetime over the cap; `relationship` other than `none` (not counted); IP-literal origin.
- **Hosted:** a tenant sharing the ATS identity key under the ATS host (counts); a tenant on an unrelated host (doesn't count); a host whose only evidence is an employer's attestation (stays `unverified`); a self-issued employer link (no confirmation).
- **Threshold:** one operator (not `verified` by default); two operators that agree; two that disagree on `legal_name`; two attester IDs that one list maps to one operator.
- **Status:** VALID, INVALID, SUSPENDED; a status URI on another origin; a token signed by an unpinned key; a token without `exp` or `ttl`; a stale staple past 24 hours.
- **Trust lists:** signature by an unpinned key; rollover through `next_keys`; an older `iat`; an `iat` far in the future; an expired list whose grants are dropped while its distrust stays; distrust without `distrust_after`; distrust with `distrust_after` and only `iat` as evidence (rejected); an empty `vct` array (malformed).
- **Tenure:** first-seen at 89 and 91 days; a new identity key without a link (zero); a `listing-tenure` attestation during migration.
- **Sources:** a tier from an unpinned index (not effective); a pinned index tier above the derived tier (used, marked as source (b)).
- **Fetch order:** a status URI from an issuer not on any list is never fetched.

## Security and privacy considerations

- **Domain lapse and takeover.** `did:web` inherits DNS, but attestations bind to the identity key, so a new domain owner gets none of them, and tenure needs a logged successor link. Attesters re-check registration data weekly and suspend on transfer, re-registration, lapse or an unlinked key. Lifetimes are capped. Residual risk: a takeover that also steals the identity key. Offline storage of the key and RFC 0011 monitoring reduce this, but don't remove it.
- **Laundering through hosts and links.** No attestation about one organization counts for another, except the namespace rule for tenants that share the host's identity key, where the host really is the recipient. Employer confirmation is display-only and needs an independent attester.
- **Lookalike domains and homographs.** A lookalike origin has its own identifier and no attestations. The display rules show attested names and safe host forms, so a copied careers page doesn't inherit the real company's name.
- **Attester capture, collusion and Sybils.** The two-operator default, per-type listing, operator grouping across lists, exclusion of `relationship` other than `none`, key-level distrust and sticky distrust bound what one captured attester can do. Common ownership that no list publisher has spotted defeats the threshold, so publishers have to judge independence. That's why `operator` is publisher-assigned and grouped across lists.
- **Compromised attester keys.** Distrust by key rejects everything signed with it, unless there's independent evidence that an attestation existed earlier. A backdated `iat` doesn't help.
- **List publisher compromise.** Lists are pinned by key and limited to 7 days. Rollback is limited, and a future `iat` can't lock out a publisher. Distrust survives expiry. The worst case is limited to the lists an operator chose.
- **Fetch safety.** All fetches (`attestations_uri`, metadata, status, lists) apply the SSRF hardening of *Agent Identity → Key Discovery*, a 256 KB size limit, the caps in §5.2, and the rule that attester endpoints are fetched only for issuers that already passed policy. Indexes and lists can't make an agent fetch arbitrary URLs.
- **Fail-closed caching.** Missing or unreachable evidence is absent. It never raises a tier. Required `exp`/`ttl` and the 24-hour cap prevent unbounded caching. One trade-off: an attester outage lowers tiers for its subjects. Stapling and the two-operator threshold soften this, and we choose the conservative side.
- **Privacy at the consent boundary.** Fetching at the consent boundary can reveal that some agent is about to apply to some employer. Stapling means most evaluations make no attester fetch at all, lists refresh on a schedule that doesn't depend on which providers are being evaluated, and Token Status List's herd privacy ([§12.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14#section-12.1)) applies only if lists are large and not per-subject, which §3.4 requires. When an agent does fetch directly, the attester can still see its IP address. Client-side agents SHOULD fetch through a relay such as [Oblivious HTTP (RFC 9458)](https://www.rfc-editor.org/rfc/rfc9458). No candidate data appears in any artifact here. A sole trader's legal name can be personal data: attesters SHOULD disclose only the claims a tier needs, and RFC 0011 covers what logs retain.
- **Index poisoning.** An index can omit or reorder data but can't forge attestations. Its tier matters only if the agent's operator pinned that index, and only during migration.

## Affected areas

- [x] Manifest: OPTIONAL `provider.did` and `trust.attestations_uri`; *JWK Set Discovery* gains the `ojcp_role` and `ojcp_cert` JWK members (`schemas/manifest.json`).
- [x] *Provider Trust*: *Validation Procedure* (key certificate check for derivation), *Key Rotation* (identity key and certificates), *Registry Trust Tiers* (replaced by effective trust tiers, §5), *Agent Obligations* (keyed on effective tiers, two sources, display rules), *Provider-Side Considerations*.
- [x] *Feed Discovery → OJCP Registry* and `schemas/responses/find-providers.json`: new `did`, `attestations` and `indexed_at` fields, a `has_attestation_types` filter, tier fields deprecated with unchanged enums, and the "verified providers" wording removed.
- [x] *Ecosystem Integrity*: "The OJCP Registry MUST perform provider verification before listing" is replaced by "No index is authoritative" (§8).
- [x] *Conformance → Conforming Agent*: configurable, key-pinned trust lists; derivation under §5.2.
- [x] *IANA Considerations*: register `ojcp-keys.json` (used but unlisted) and `ojcp-attestations.json`.
- [x] New normative text: attestation types and `typ` URIs under `https://spec.ojcp.dev/vct/`, the trust-list format, and `ojcp_attester` issuer metadata.
- [ ] VerifierManifest and its schema: unchanged.
- [ ] Tool definitions, CandidateContext, AgentDeclaration, User Mandates, Agent Identity: unchanged. RFC 0008 consumes §5.4.

## Alternatives considered

- **Keep the single registry.** Rejected for the reasons in Motivation. Its checks survive as attestations from whoever runs it.
- **Several registries, each assigning tiers.** Rejected. This multiplies the central points, and "verified at A" and "verified at B" would be unverifiable and incomparable.
- **Bind attestations to the domain name only.** Rejected: copied attestations would follow the name to a new owner. Binding to the rotating manifest key was also rejected, because every 90-day rotation would force reissue. A separate identity key avoids both problems.
- **Extend the VerifierManifest for attesters.** Rejected. 0.3 consumers validate `verification_types`, `proof_format` and `ojcp_verifier_version` against closed enums. SD-JWT VC's issuer metadata already allows extra parameters, so `ojcp_attester` goes there.
- **Count independence by registrable domain.** Rejected. It needs the Public Suffix List, which the spec avoids elsewhere, and one company can register many domains. Publisher-assigned operators, grouped across lists, are explicit and can be audited.
- **Union of lists with one attester sufficient.** Rejected as the default. It reduces trust to the weakest listed attester, and it lets one ATS vendor verify its own customers.
- **Keys in `did.json`, or [`did:webvh`](https://identity.foundation/didwebvh/v1.0/).** Rejected for now. A second key store breaks 0.3 key resolution or drifts. `did:webvh` adds a per-DID log and a second signature stack beside JOSE.
- **OpenID Federation trust chains.** [OpenID Federation 1.0](https://openid.net/specs/openid-federation-1_0-final.html) builds trust from superiors' statements, which reintroduces a hierarchy, and would require every provider to run a Federation entity. Only the `trust_mark_issuers` shape is borrowed.
- **EV certificates for employers.** Rejected. CA validation rules weren't designed for hiring, and they don't support per-type, plural trust.

## Breaking changes

None for 0.3 consumers in 0.4:

- Every new field is OPTIONAL. `find_ojcp_providers` keeps `trust_tier`, `min_trust_tier`, `verified`, `verified_at` and `manifest_signed`, with their current enums (`unverified`, `verified`, `audited`). The response schema doesn't forbid additional properties, so consumers that validate against it keep passing.
- The VerifierManifest is unchanged: no new `verification_types`, `proof_format` values or version. Consumers that validate against its closed enums are unaffected.
- An agent that doesn't implement §5.2 stays conformant during migration by taking `trust_tier` from an index its operator pinned. Taking it from any index it happens to discover was never safe, and is no longer conformant.

Changes in meaning: *Ecosystem Integrity* no longer makes any registry authoritative, and *Agent Obligations* is keyed on effective tiers. Removing registry-assigned tiers is breaking, and happens only at the end of §10, no earlier than the next major version.

## Open questions

1. **Veto or quorum for distrust.** One list's distrust entry removes an attester for that agent (§4.3). Should distrust instead require *m* lists, at the cost of slower response to a compromise?
2. **Threshold for small markets.** Two independent operators may not exist for some jurisdictions at launch. Should list publishers be able to mark a jurisdiction where one government-registry attester suffices, and how should agents display that?
3. **Attestation transparency.** Should attestation digests be logged (RFC 0011 logs only key events today), so that bulk misissuance becomes publicly visible and `distrust_after` has evidence beyond each agent's own records?
4. **Per-job employer tiers.** §3.5 gives a confirmed or unconfirmed employer for display. Should a later RFC let agents derive a full employer tier when the employer runs its own OJCP origin?
5. **Trust Marks.** Would OpenID Federation Trust Marks give better tooling reuse than SD-JWT VCs for attestations?
6. **Identity key loss.** RFC 0011 lets a pre-committed recovery key (`recovery_jkt`) sign one successor rotation, within a bounded window. An organization that loses both its identity key and its recovery key starts a new lineage with zero tenure and must be re-attested. Is that acceptable for small employers, or should attesters be able to vouch for a recovery, and would that open a capture route?
7. **Thresholds in §10.** Are three publishers across three segments, two operators per type, and two logs with three witness operators the right minimums?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, so it has a commercial interest in how providers are trusted and in which applications agents submit. Recruitics holds Seat 1 on the OJCP steering committee. The author invites co-sponsors from other organizations and will recuse from the vote that resolves this RFC.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes:

Resolution:

Decision record:
