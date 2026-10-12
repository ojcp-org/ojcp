---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Signed job postings — let anyone who receives a job second-hand check who published it and that it is unaltered

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0002 (Official job URL), RFC 0007 (Provider-derived attribution), RFC 0010 (Decentralized provider trust), RFC 0011 (Key transparency log)

## Summary

Job ads rarely stay where they were first published. A job board copies them, a search site mirrors them, and one AI assistant passes a job to another. Every copy is a chance for someone in the middle to change the details — swap the "apply" link for one that harvests personal data, raise the advertised salary, or keep showing a job that was filled last month — while the employer's name stays on top.

This RFC lets the organization that publishes a job attach a digital seal to it. Anyone who later receives a copy, however many hands it passed through, can check the seal and learn two things: which organization published it, and that nothing in it has changed since. The seal also carries the date of the latest edit and the closing date, so an old copy can't be passed off as current, and it lapses after a few days so stale copies stop checking out.

For example: Acme publishes a nurse opening paying $42 an hour and seals it. A board relists it with the apply link pointing to its own form and the pay changed to $55. An assistant that picks the job up from the board checks the seal, sees the job no longer matches what Acme published, and does not show the board's version as Acme's job. If the board had relisted the job untouched, the assistant could say "published by Acme, found on the board", and keep the two apart.

Seals are optional. Nothing changes for jobs an assistant gets straight from the organization that published them, which are already protected in transit.

## Motivation

A JobPosting received directly from the provider that published it is protected by TLS: the agent knows which origin it talked to. OJCP postings travel further than that. Boards relist employer jobs, indexes mirror provider data, and the spec's attribution model expects agents to hand jobs to other agents and platforms (the *Attribution References* section). After the first hop, an agent knows only who handed it the job, not who published it or whether it was changed.

Three problems follow.

1. **Alteration.** An intermediary can change `apply_paths`, `official_job_url`, compensation or eligibility while keeping `employer.name`. The candidate's trust in the employer is spent on the intermediary's content.
2. **Staleness and replay.** A filled or expired posting, or an older version with a higher salary, can be recirculated indefinitely. The *Data Freshness* rule that agents not present expired postings depends on a `validThrough` the agent has no reason to believe.
3. **Borrowed credibility.** A relay that carries a well-known employer's posting can be mistaken for that employer, or for a provider as trustworthy as the employer's.

The spec already has the parts needed to solve this: JCS canonicalization and JWS signatures for manifests (*Manifest Signing*), key discovery at `/.well-known/ojcp-keys.json` (*JWK Set Discovery*), an organization identity key that certifies signing keys (RFC 0010), and a log of that key's history (RFC 0011). This RFC applies them to individual postings.

## Proposal

### 1. Terminology

- **Publisher:** the provider whose origin signs a posting, named by `signature.iss`.
- **Relay:** any party that delivers a posting it did not publish: a board, mirror, aggregator, index, or an agent handing a job to another.
- **Signed posting:** a JobPosting carrying a `signature` that verifies under §4.

### 2. The `signature` member

A provider MAY add an OPTIONAL `signature` object to a JobPosting it publishes. It has the shape of the manifest signature in *Manifest Signing* (`alg`, `kid`, `signed_at`, `expires_at`, `value`), with these differences:

- `iss` is REQUIRED. It is the publisher's origin in the ASCII serialization of [RFC 6454 §6.2](https://www.rfc-editor.org/rfc/rfc6454#section-6.2) (scheme `https`, lowercase host in A-label form, any non-default port), and agents compare it byte for byte. It MUST NOT be an IP literal.
- The signed posting MUST carry `ojcp_id`, `dateModified` and `validThrough`.
  - `dateModified` is new to JobPosting: an RFC 3339 date-time at which the publisher last changed the posting's content. The name is the [schema.org `dateModified`](https://schema.org/dateModified) property. It is the posting's version marker: the publisher MUST increase it whenever any signed member changes, and MUST NOT sign two different contents with the same `dateModified`.
  - `validThrough` keeps its existing meaning. A date-only value ends at 24:00 UTC on that date.
- `expires_at` MUST NOT be later than any of: 7 days after `signed_at`; the end of `validThrough`; the `exp` of the signing key's certificate (§3).
- Only full JobPosting objects are signed. A provider MUST NOT sign a summary subset of a posting such as a search result that omits members; where it returns a signed posting in `search_jobs`, the posting is complete.

Providers sign postings they serve directly and postings they syndicate alike, so that a copy is verifiable wherever it ends up. Agents MUST NOT require a signature on a posting received directly from its publisher's origin.

### 3. Signing keys

A posting-signing key is a key in the publisher's `/.well-known/ojcp-keys.json` that carries an `ojcp_cert` member certifying it for the `posting` purpose, as defined by RFC 0010 (Decentralized provider trust): a JWS of type `ojcp-key-cert+jwt`, signed by the organization identity key (the key marked `"ojcp_role": "identity"`), naming the certified key's [RFC 7638](https://www.rfc-editor.org/rfc/rfc7638) thumbprint and its purposes. The identity key itself MUST NOT sign postings. The certificate is recorded in the key transparency log of RFC 0011 (Key transparency log) as a `key_certified` event, next to the identity key's own history, so a domain takeover that substitutes a new identity key, or certifies a key the organization did not, is visible in the log. Under a trust policy that requires transparency, a posting key counts only with a stapled inclusion proof of its `key_certified` entry, carried in the `ojcp_transparency` member of `ojcp-keys.json`.

Key lifetime and signature lifetime are tied together:

- The certificate's `exp` bounds every signature made under it (§2).
- A provider MUST keep a posting-signing key, with its certificate, in `ojcp-keys.json` until every posting signature made with it has expired. This extends the 24-hour overlap in *Key Rotation* for keys that sign postings; at most it is 7 days after the key's last use.
- **Revocation.** To revoke a compromised posting key, the provider removes it from `ojcp-keys.json` and records a `key_revoked` event under RFC 0011. Agents resolve keys from the live set (§4), so a removed key stops verifying within the agent's cache lifetime, and an agent that checks the log rejects every signature by a revoked key regardless of its claimed signing time. Every outstanding signature also expires within 7 days, which bounds what a stolen key can do even against an agent that cannot fetch.

### 4. Verification

An agent that verifies a posting signature MUST, in order:

1. Check `signature.expires_at` is in the future and `validThrough` has not ended (60 seconds' clock tolerance, as in *Validation Procedure*). Reject otherwise, before any network fetch.
2. Canonicalize: take the posting, remove `signature.value` and the members listed in §5, and serialize the result with JCS ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)). The rest of the `signature` object stays in the signed bytes, so `iss`, `signed_at` and `expires_at` cannot be changed.
3. Resolve `kid` in the JWK Set at `{iss}/.well-known/ojcp-keys.json`, with the caching and refetch rules of *JWK Set Discovery*. Check `alg` matches the key.
4. Verify the key's `ojcp_cert` under the current organization identity key per RFC 0010: valid, unexpired, listing `posting`, and with `signed_at` inside its validity period. Reject any key that RFC 0011's log lists as revoked, whatever the signature's `signed_at`.
5. Verify the JWS over the canonical bytes.

A posting that fails any step is treated as unsigned: as content from whoever delivered it, with nothing attributed to `iss`. Agents MAY additionally check the identity key against RFC 0011 inclusion proofs.

This is the canonicalization of *Manifest Signing* — JCS over the object — with one deliberate difference: the manifest procedure removes the whole `signature` member, while a posting removes only `signature.value`. Postings are relayed by third parties, so the signature metadata must be protected too.

### 5. Relays and unsigned fields

Response annotations are not part of the posting and are excluded from the signed bytes: exactly `attribution_ref`, `fit_score` and `fit_rationale`. Any other member present in the posting object is signed. Adding an annotation to this list requires a spec change, so every verifier canonicalizes the same way.

- A relay MUST NOT modify a signed posting, and MUST NOT wrap it in an object that presents its own values for posting members (title, employer, compensation, location, apply paths, URLs, dates). It forwards the posting object intact, and MAY place its own annotations from the list above on it.
- Agents MUST ignore any unsigned value — an annotation, a wrapper member, or a separate summary — that contradicts a signed member of the same posting, and MUST present the signed value.
- `attribution_ref` stays outside the signature on purpose. Under RFC 0007 (Provider-derived attribution) a reference is validated by the provider that issued it, so it needs no signature here, and relays may carry or replace it as *Attribution References* describes without breaking the posting's signature.

### 6. Freshness and replay

- An agent MUST NOT present a signed posting whose `validThrough` has ended or whose signature has expired.
- Where an agent holds more than one verified copy of a posting (same `iss` and `ojcp_id`), it MUST use the one with the greatest `dateModified`, breaking ties by the latest `signed_at`, and MUST discard older copies it receives later.
- Before acting on a relayed posting at the consent boundary, an agent SHOULD fetch the current version from the publisher with `get_job_detail` where the publisher exposes one.

An agent that never saw the newer version can still be shown an older one; the 7-day signature lifetime bounds that window.

### 7. What a signature proves, and display

A verified signature proves that the origin `iss` published this content and that it is unchanged. It does not prove that the job is real, that the employer named in it is who it says, or anything about the relay.

- Agents MUST keep the publisher and the relay distinct. Where a posting came through a relay, the agent MUST NOT present the relay as the publisher, and SHOULD display both ("published by …, found on …").
- Any trust indication shown for the publisher is the publisher's effective trust tier under RFC 0010, with the name RFC 0010 attests for it, never the posting's self-asserted `employer.name`.
- Trust at the consent boundary is always derived for the origin that will receive candidate data — the apply path's target — never for a posting's `iss`. A signed posting from a `verified` publisher whose apply path leads to a relay does not make the relay `verified`.
- Agents MUST NOT describe a posting as verified or genuine on the strength of its signature alone.

### 8. Official job URL

A posting's `official_job_url` (RFC 0002, Official job URL; the spec's *JobPosting* section) is rooted in "the provider that serves it". For a relayed copy that would be the relay. When a relayed posting is signed, an agent roots `official_job_url` in the publisher `iss` instead, and the signature guarantees the URL is the one the publisher set. An unsigned relayed posting's `official_job_url` is rooted only in the relay.

### 9. Example

```json
{
  "ojcp_id": "careers.acme.com:rn-1180",
  "title": "Registered Nurse, ICU",
  "employer": { "name": "Acme Health" },
  "datePosted": "2026-10-01",
  "dateModified": "2026-10-09T14:02:00Z",
  "validThrough": "2026-11-15",
  "official_job_url": "https://careers.acme.com/jobs/rn-1180",
  "attribution_ref": "ar_7Q2x…",
  "signature": {
    "alg": "ES256",
    "kid": "acme-posting-2026-10",
    "iss": "https://careers.acme.com",
    "signed_at": "2026-10-09T14:05:00Z",
    "expires_at": "2026-10-16T14:05:00Z",
    "value": "MEUCIQ…"
  }
}
```

`attribution_ref` and `signature.value` are outside the signed bytes; everything else, including `signature.iss`, `signed_at` and `expires_at`, is inside.

## Security and privacy considerations

- **Stolen posting key.** Bounded by removal from `ojcp-keys.json`, by the 7-day signature lifetime, and by the certificate's `exp`. A compromised identity key is the province of RFC 0010 and RFC 0011.
- **Replay.** `dateModified` and `validThrough` are signed, and agents prefer the newest version and reject expired ones. An agent that saw only an old copy can be shown it for at most 7 days; agents that need certainty fetch from the publisher (§6).
- **Takedown and filled jobs.** A publisher that closes a job early cannot recall signed copies. It stops re-signing them, and they lapse within 7 days. We chose the short lifetime over offline revocation lists because removal and expiry need no infrastructure agents don't already use.
- **Fetch amplification.** Expiry is checked before any fetch (§4), and keys are fetched only from `iss`, so a relay cannot make an agent fetch arbitrary URLs.
- **Privacy.** Postings carry no candidate data. Verifying a relayed posting reveals to the publisher, through the key-set fetch, that some agent behind that IP looked at one of its postings, but not which posting. Agents can avoid even that with cached key sets.

## Affected areas

- *JobPosting* (spec section and `schemas/job-posting.json`): add OPTIONAL `dateModified` (date-time) and OPTIONAL `signature` (object: `alg`, `kid`, `iss`, `signed_at`, `expires_at`, `value`); state that a signed posting MUST carry `dateModified` and `validThrough`; the `official_job_url` rules gain §8.
- *Provider Trust*: a new subsection *Posting Signatures* with §§2–7; *Manifest Signing → Canonicalization* gains a note pointing to the posting variant.
- *JWK Set Discovery* and *Key Rotation*: posting-signing keys, their `posting` certificate (RFC 0010), and the retention rule of §3.
- *Data Freshness*: the newest-version and expiry rules of §6 for relayed postings.
- *search_jobs* and *get_job_detail* responses: signed postings are complete; `attribution_ref`, `fit_score` and `fit_rationale` are unsigned annotations.
- *Attribution References*: note that a handoff carries the signed posting intact, with `attribution_ref` outside the signature.

## Alternatives considered

- **Sign every posting, always.** Adds nothing for direct responses, and makes key rotation more costly for every provider. Optional signatures cost only those who syndicate.
- **Reuse manifest canonicalization unchanged** (remove the whole `signature`). Leaves `expires_at` and `iss` unprotected, which a relay could alter. Rejected.
- **Allow wrapping.** Wrappers can present a field next to the signed one, and agents and models will pick the wrong one. Forbidding it and fixing the unsigned annotations to a closed list is simpler.
- **Long-lived signatures plus revocation lists.** Lets filled jobs survive longer offline but needs a distribution channel agents would have to poll. Short expiry gives the same bound with nothing new.
- **Sign with the identity key directly.** Exposes the long-lived key in high-volume signing. Certified short-lived keys keep it offline.

## Breaking changes

None for conforming 0.3 consumers. `dateModified` and `signature` are new optional members; the JobPosting schema does not forbid additional properties. Consumers that validate JobPosting against their own closed copy of the schema (rejecting unknown members) will reject signed postings until they update. Unsigned postings are unchanged.

## Open questions

1. Should 7 days be the maximum signature lifetime, or should it be shorter for postings with pay or eligibility changes?
2. Should a provider be able to sign only some apply paths, so a relay can add its own apply path without breaking the signature, or is that a wrapper by another name?
3. Should agents be required, rather than recommended, to fetch the current version from the publisher before applying through a relayed posting?

## Interests

Recruitics operates an OJCP provider and a job-distribution business that earns per application, and holds Seat 1 on the steering committee. Signed postings affect how distributed jobs are presented and credited, which bears on that business. The author invites co-sponsors and will recuse from the resolution vote.

## For maintainers — comment period and resolution

