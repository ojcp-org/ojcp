---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Key transparency log — a public, tamper-evident history of every employer's signing keys

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0010 (Decentralized provider trust), RFC 0012 (Signed job postings)

## Summary

Employers that take job applications through OJCP prove who they are with digital keys published on their own websites. AI agents check those keys before sending anyone's résumé. The weak spot is that a website only shows the keys it has *today*. If a scammer takes over an employer's web address, for example by re-registering it after it lapses, they can publish keys of their own, and an agent has no way to tell that anything changed.

This proposal adds a public record of key changes, kept by several independent organizations:

- **Every key change is written down publicly.** When an employer creates, replaces or cancels a key, the change goes into a shared record. Each entry is signed with the employer's own key, so no one else can add or alter entries about that employer.
- **The record can't be quietly rewritten.** Independent "witnesses" countersign the record's state regularly, each adding the time it did so. If the record's operator tried to show different versions to different people, the witnesses' countersignatures would expose it.
- **Track records can't be faked or taken over.** How long an employer has held its keys is measured from the witnesses' times, never from a date the employer supplies. A new domain owner can't inherit the old owner's history, because extending it needs the old owner's key.
- **Employers carry their own proof.** An employer attaches proof of its key history to its website, so an agent can check it without asking the record which employers it is looking at.

For example, Acme has published its key in the record since 2024. In 2026 Acme's domain registration lapses and a scammer re-registers it. The scammer can put new keys on the website, but those keys appear in the record as brand new, with no link to Acme's history. Agents see an employer with no track record, and Acme's own monitoring sees the new key within hours. The scammer also can't cancel Acme's real key, because only Acme's keys can do that.

This uses the same design as the public logs that web browsers have relied on for over a decade to catch fake website certificates. It is not a blockchain.

## Motivation

The spec's *Provider Trust* section lets an agent check that a manifest was signed by a key in the origin's `/.well-known/ojcp-keys.json`. It says nothing about the *history* of that key set. Three problems follow.

1. **Takeover is invisible.** The *Threat Model* lists imposter providers and stale or revoked credentials. Whoever controls a domain controls its key set, so a party that takes over a lapsed or hijacked domain publishes its own keys and passes every check in the *Validation Procedure*. Nothing public records that the keys changed.
2. **Tenure has no time source.** The `audited` tier in *Registry Trust Tiers* requires 90 days without abuse reports, measured by the Registry's own clock. RFC 0010 (Decentralized provider trust) replaces registry-assigned tiers with tiers each agent derives from verifiable evidence. It needs a time an agent can verify, which neither the provider nor any single party asserts.
3. **Revocation reaches only live fetchers.** A compromised key is removed from the key set (*Key Rotation*). An agent holding a relayed posting signed by that key (RFC 0012, Signed job postings), or an attester that bound a credential to it (RFC 0010), learns of the compromise only if it happens to re-fetch the key set in time.

Certificate Transparency addressed the same class of problem for the Web PKI: an append-only public log in which domain owners and others can see every certificate issued for a name ([RFC 9162 §1](https://www.rfc-editor.org/rfc/rfc9162#section-1)). The C2SP transparency-log specifications generalize that design to arbitrary entries, with independent witnesses so that clients can verify proofs offline. This RFC applies them to OJCP organization keys. It defines only the entry format, the acceptance and validity rules, and what agents, providers and monitors do with the results. It adds no new cryptography or transport.

## Proposal

### 1. Terminology

- **Organization identifier**, **organization identity key**, **key certificate** (`ojcp_cert`): as defined by RFC 0010. The identity key is the JWK in `ojcp-keys.json` marked `"ojcp_role": "identity"`. Other OJCP signing keys carry an `ojcp_cert` signed by it.
- **Log**: an append-only Merkle-tree log of key events, run by a **log operator** (§2).
- **Checkpoint**, **cosignature**, **witness**: as in C2SP (§2). A **monitor** reads the whole log and checks it.
- **Key event**: one log entry (§3).
- **Identity lineage**: a chain of identity keys for one organization identifier, starting at one genesis entry and extended only by logged rotations (§4). Its last key is the **head**.
- **Recovery key**: an offline key whose thumbprint an identity key commits to, able to sign one successor for it (§4).
- **Authenticated first-seen time**: the time by which a quorum of witnesses attests that an entry was in the log (§6).
- **Lineage tenure**: the time since the authenticated first-seen time of a lineage's genesis entry (§6).
- **Witness policy**: the logs, witnesses and quorum an agent accepts (§7).
- **Transparency bundle**: stapled entries and proofs that a provider serves in `ojcp-keys.json` (§9).

### 2. What is reused, and what is not

- **Merkle tree and proofs.** The tree hash, inclusion proofs and consistency proofs are those of [RFC 9162 §2.1](https://www.rfc-editor.org/rfc/rfc9162#section-2.1) (§§2.1.3 and 2.1.4 for the proofs), with SHA-256. This is the same construction as RFC 6962 §2.1, which the C2SP specifications reference. RFC 9162 is an Experimental RFC. Its certificate-specific parts are not used: submission of certificate chains, `TransItem`, SCTs, signed tree heads, the TLS extension and its acceptance criteria (§4.2). Like any RFC 9162 log, an OJCP log proves that an entry is present. It can't prove that one is absent.
- **Checkpoints.** Logs sign checkpoints per [C2SP tlog-checkpoint v1.1.0](https://c2sp.org/tlog-checkpoint@v1.1.0), with no extension lines. A log's own signature carries no time: the specification notes that Ed25519 log signatures do not include a timestamp. OJCP never uses a log's own time.
- **Cosignatures and witnesses.** Witnesses cosign checkpoints per [C2SP tlog-cosignature v1.1.0](https://c2sp.org/tlog-cosignature@v1.1.0) and are reached through [C2SP tlog-witness v1.1.0](https://c2sp.org/tlog-witness@v1.1.0). A checkpoint cosignature signs the time at which it was generated, and states that the cosigned tree is consistent with every view of the log the witness has seen. Witness and log keys are configured as [C2SP signed-note](https://c2sp.org/signed-note@v1.1.0) verifier keys (vkeys).
- **Read API.** Logs serve [C2SP tlog-tiles v1.0.0](https://c2sp.org/tlog-tiles@v1.0.0). Its entry bundles carry entries with a 16-bit length prefix, so the 8 KiB cap of §3 fits easily.
- **Not reused:** CT's SCTs and maximum-merge-delay promises, RFC 9162's log client messages (tlog-tiles replaces them), and C2SP subtree cosignatures. OJCP defines only its own submission endpoint (§5).

The C2SP documents are versioned community specifications, not IETF standards. This RFC pins the versions above. Later versions apply only when OJCP adopts them.

### 3. Key events

Each log entry is the ASCII bytes of one compact JWS ([RFC 7515](https://www.rfc-editor.org/rfc/rfc7515)), at most 8 KiB. `alg` MUST be one the spec's *Manifest Signing* section allows. The entry is one of two kinds.

**Identity events** have `typ` `ojcp-key-event+jwt`. The protected header MUST carry `jwk`, the public key that made the signature ([RFC 7515 §4.1.3](https://www.rfc-editor.org/rfc/rfc7515#section-4.1.3)). The payload is:

```json
{
  "sub": "did:web:careers.acme.com",
  "event": "identity_rotated",
  "prev": "NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs",
  "jwk": { "kty": "EC", "crv": "P-256", "x": "…", "y": "…" },
  "recovery_jkt": "3sQ1aZ…",
  "iat": 1791763200
}
```

- `sub`: the organization identifier, in the canonical form RFC 0010 defines.
- `event`: one of
  - `identity_published`: the start of a new lineage, with the identity key in `jwk`;
  - `identity_rotated`: a successor, with the new identity key in `jwk` and its predecessor's [RFC 7638](https://www.rfc-editor.org/rfc/rfc7638) thumbprint in `prev`;
  - `key_revoked`: the revoked key's thumbprint in `jkt`, and, for identity keys only, an OPTIONAL `effective_from` (§4).
- `recovery_jkt` (OPTIONAL, on `identity_published` and `identity_rotated`): the thumbprint of a recovery key for the new identity key. It is RECOMMENDED. The recovery key SHOULD be generated and stored offline, separately from the identity key.
- `iat`: when the entry was signed. Logs use it only to reject stale submissions (§5). It is never an event time.
- `jwk` in the payload contains public members only.

**Certification events** (`key_certified`) are an `ojcp_cert` exactly as RFC 0010 defines it (`typ` `ojcp-key-cert+jwt`, signed by the identity key, with the identity key's thumbprint as `kid`). The certificate is logged byte for byte, so the log entry and the certificate an agent finds in `ojcp-keys.json` are the same object.

Entries contain organization identifiers, public keys and thumbprints only. They never contain candidate data, names of people, or anything the provider has not already published in `ojcp-keys.json`.

### 4. Identity lineage

Validity is evaluated per log, in log order. Monitors and full evaluators apply every rule below. Logs apply them at acceptance (§5). Agents verifying a bundle offline apply them to the entries they are given (§10). *W*, the contest window, is 30 days, measured in authenticated first-seen times (§6).

1. **Genesis.** `identity_published` MUST be signed by the key in its payload `jwk`. It starts a new lineage whose head is that key. A subject may have several lineages. They never merge, and each has its own tenure. A key that already appears in any lineage can't start another.
2. **Rotation.** An `identity_rotated` with predecessor *P* is valid only if *P* is the head of a lineage with the same `sub`, and the entry is signed by either
   - *P* itself, provided *P* has not been revoked; or
   - *P*'s recovery key (the header `jwk` has the thumbprint *P*'s entry committed in `recovery_jkt`). This is also valid if *P* stopped being head, or was revoked, no more than *W* earlier. A recovery rotation replaces any other successor of *P*: that branch and everything after it leave the lineage. Each recovery key can sign one rotation.

   A rotation never changes `sub`. Lineage, and therefore tenure, can't move to another domain.
3. **Certification.** A `key_certified` entry is valid only if it verifies under the head of a lineage whose `sub` equals the certificate's `sub`.
4. **Revocation.** A `key_revoked` for key *X* is valid only if it is signed by
   - *X* itself;
   - the head of *X*'s lineage, when *X* is a certified key, or when *X* is an earlier identity key that the head descends from; or
   - *X*'s recovery key, when *X* is an identity key.

   Its effects are:
   - **A certified key** is revoked outright. Agents MUST reject every signature by it, whatever signing time the signature claims. `effective_from` MUST be absent.
   - **An identity key** can sign nothing valid after the revocation's position in the log. With `effective_from` *E*, entries signed by *X* whose authenticated first-seen time is at or after *E* are also void. A voided rotation removes its branch from the lineage. *E* MUST NOT be earlier than *W* before the revocation's own authenticated first-seen time; evaluators clamp an earlier value to that bound. A revocation signed by a descendant of *X* MUST NOT void the rotation it descends through, so its *E* is clamped to after that rotation.

The rules aim for one property: **only a key in a lineage can change that lineage.** A party that takes over a domain without the keys can start a new lineage, which has no tenure. It can't rotate, certify, revoke or contest anything in the owner's lineage, and nothing it does survives the owner regaining the domain.

Stolen keys are bounded too:

- **A former identity key** is useless to a thief. It is no longer head, so it can't rotate or certify. Its revocation reaches back at most *W*.
- **The current identity key** lets a thief race the owner. Whichever rotation is logged first becomes the successor. Within *W*, the other key holder can void that rotation by revoking the predecessor with an earlier `effective_from`. A contested lineage then ends at the predecessor, and neither side keeps the tenure. That is the conservative outcome. An owner that committed a recovery key settles the contest: its recovery rotation can't be voided by anything signed with the stolen key.
- **Both the identity key and its recovery key** stolen together defeat these rules. The defences are offline key storage, monitors (§8) and attester suspension under RFC 0010.

### 5. Log acceptance

Every entry is authenticated by its signature, and nothing else. A log MUST NOT accept an entry because the subject's origin happens to serve a matching key. A log MUST process a submission in this order, and stop at the first failure:

1. Size of at most 8 KiB, and a well-formed compact JWS with a known `typ`.
2. A valid signature under the header `jwk` (identity events), or under the identity key named by `kid` (certification events), and `iat` within one hour of the log's clock.
3. Validity under §4 against the log's current state. Where §4 depends on authenticated times, the log uses its own clock as an approximation and rejects clear violations. Agents and monitors re-evaluate with authenticated times.
4. For `identity_published` only: one HTTPS fetch of `https://<host>/.well-known/ojcp-keys.json` for the `sub`'s host. The fetch uses the hardening of *Agent Identity → Key Discovery* (no IP-literal hosts, no cross-host redirects, a re-validated address, a response limit of 64 KiB, and timeouts). The new key MUST be present and marked `"ojcp_role": "identity"`. This check keeps the log free of lineages for domains the submitter doesn't control. It is spam control, not a security property: agents always check the live key set themselves.

No other event causes any fetch. A log therefore makes at most one outbound request per *validly self-signed* genesis, only to the named subject's host. It MUST cache a failed domain check for a subject for at least one hour. Logs MUST also:

- treat a resubmitted identical entry as a no-op, returning its existing index;
- limit each subject to 32 accepted entries per 24 hours, and to one `identity_published` per 24 hours. Only a party holding the domain or a lineage key can use up these limits;
- publish their acceptance policy, rate limits and retention policy, and apply them to every subject alike;
- include every accepted entry in a checkpoint cosigned by their witnesses within 24 hours, and SHOULD do so within 10 minutes.

**Submission endpoint.** `POST <submission prefix>/ojcp/add-key-event`, with the compact JWS as the body (`Content-Type: application/jose`). The response is `200` with `{"index": <leaf index>}` once sequenced, `400` for a malformed entry, `403` for a signature or authority failure, `422` for an entry that is invalid under §4, and `429` with `Retry-After` when rate limited. The submitter then reads the inclusion proof and checkpoint through tlog-tiles. It MUST retain the first cosigned checkpoint covering its entry, since that checkpoint is its evidence of first-seen time (§6). Logs serve only their latest checkpoint.

Providers SHOULD submit every key event to at least two logs run by different operators. RFC 0010's migration thresholds assume at least two such logs exist.

### 6. Authenticated first-seen time and lineage tenure

A checkpoint cosignature at time *t* from a witness says that, at *t*, the witness had verified a tree of that size. Every entry with an index below the size was therefore in the log by *t*.

For an entry at index *i* in log *L*, under a witness policy with quorum *q*: take checkpoints of *L* whose size is greater than *i*, that carry a valid log signature, and that are consistent with the checkpoint used for inclusion (RFC 9162 §2.1.4). For each configured witness, take its earliest valid cosignature on those checkpoints. Cosignatures timestamped more than 60 seconds in the future are discarded, the same skew the *Validation Procedure* allows. The **authenticated first-seen time** is the *q*-th earliest of those per-witness times.

With fewer than *q* dishonest witnesses, at least one of the *q* earliest is honest. The result is therefore no earlier than a time an honest witness attested to, and backdating needs *q* colluding witnesses. Neither the submitter's `iat` nor the log contributes to the time.

**Lineage tenure** of identity key *K* is the current time minus the authenticated first-seen time of the genesis entry of the lineage whose head is *K*. It requires an unbroken chain of valid rotations from that genesis to *K* (§4). Consequences:

- A new genesis starts at zero. This covers a new key after a domain takeover, an owner that lost both its identity and recovery keys, and a contested rotation.
- Tenure never transfers to a new domain owner, because the new owner can't extend the old lineage.
- Tenure never crosses domains, because `sub` can't change.
- A domain transfer between different legal entities MUST start a new lineage. Handing identity keys to a buyer violates this RFC. Cryptography can't detect it, but RFC 0010's attesters re-check registration and suspend on transfer.

When a policy requires proofs from several logs, tenure is the smallest of the per-log values. RFC 0010 uses lineage tenure for the `audited` tier.

### 7. Witness policy

An agent accepts a log's checkpoints only under a witness policy:

```json
{
  "logs": [ { "origin": "keys.log-operator-a.example/ojcp", "key": "keys.log-operator-a.example/ojcp+…", "prefixes": ["https://keys.log-operator-a.example/ojcp/"] } ],
  "witnesses": [
    { "name": "witness-1.example", "key": "witness-1.example+…" },
    { "name": "witness-2.example", "key": "witness-2.example+…" },
    { "name": "witness-3.example", "key": "witness-3.example+…" }
  ],
  "witness_quorum": 2
}
```

- `logs` are the **log trust anchors**. `origin` is the checkpoint origin line, `key` is the log's vkey, and `prefixes` (OPTIONAL) are its tlog-tiles URL prefixes.
- `witnesses` are the **witness trust anchors**, as (cosigner name, vkey). Two witnesses run by the same operator MUST NOT appear in one policy.
- `witness_quorum` MUST be a strict majority of `witnesses` and at least 2. With a strict majority, two inconsistent checkpoints can't both reach quorum unless some witness cosigned both. That pair of cosignatures is itself transferable proof of the witness's misbehaviour.
- A policy comes from the agent operator's configuration or from a trust list the operator configured (RFC 0010 carries these members in its trust-list format). Agents MUST NOT merge witness sets from different sources. Each log is evaluated under exactly one policy, so adding a source can never lower a quorum.

### 8. Monitoring and checkpoint gossip

Witnessing stops a log from showing a split view to anyone who requires a quorum. It doesn't stop a log from showing agents a view that monitors never see. C2SP tlog-witness notes that clients and monitors must not be partitioned, and that monitors may need more cosignatures than clients. RFC 9162 §11.3 leaves gossip undefined. OJCP sets these minimum expectations:

- **Witnesses** used in OJCP policies MUST serve the tlog-witness monitor retrieval endpoint (`GET <monitoring prefix>/<origin hash>/checkpoint`) for every log they cosign, updated within one hour. tlog-witness makes this a SHOULD. OJCP makes it a MUST.
- **Monitors** MUST verify consistency between successive checkpoints. At least every 24 hours they MUST fetch the latest checkpoint from *every* witness in their policy, not just a quorum, and verify its consistency with their own view. Two log-signed checkpoints for one origin that are inconsistent are **equivocation evidence**. A monitor MUST publish it and send it to the publishers of trust lists that name the log. A list publisher holding verified evidence SHOULD remove the log.
- **Agents** SHOULD forward each distinct checkpoint they verify in a bundle to a monitor run or chosen by their own operator. They SHOULD batch the forwards and separate them from the provider they came from, since a checkpoint is shared by all entries in the log. A fork shown only to agents therefore still reaches a monitor.
- **Who monitors.** Employers SHOULD monitor their own `sub`. Attesters watch the subjects they attest, because RFC 0010 requires them to suspend attestations on key events that break the attested key's lineage. List publishers watch the logs they list. A monitor watching a subject alerts on any `identity_published` for a subject that already has a live lineage, on rotations, certifications and revocations the owner didn't make, and on contests.

Monitors read the whole log through tiles, so they never reveal which subjects interest them.

The guarantee is limited, and this RFC says so: **transparency protects only agents whose trust policy requires it.** An agent that accepts unlogged keys gets none of these properties.

### 9. Stapled proofs: `ojcp_transparency`

A provider serves its transparency bundle as a top-level member of its JWK Set at `/.well-known/ojcp-keys.json`. [RFC 7517 §5](https://www.rfc-editor.org/rfc/rfc7517#section-5) permits extra members and requires implementations that don't understand them to ignore them.

```json
{
  "keys": [ … ],
  "ojcp_transparency": [
    {
      "log": "keys.log-operator-a.example/ojcp",
      "checkpoint": "keys.log-operator-a.example/ojcp\n48211\nCsUYapGG…=\n\n— keys.log-operator-a.example/ojcp …\n— witness-1.example …\n— witness-2.example …\n",
      "entries": [
        { "index": 1042, "entry": "eyJhbGciOiJFUzI1NiIs…", "inclusion": ["PlRNCrwH…=", "jrJZDmY8…="] }
      ],
      "first_seen": [
        { "index": 1042, "checkpoint": "keys.log-operator-a.example/ojcp\n1050\n…", "consistency": ["5+pKlUdi…="] }
      ]
    }
  ]
}
```

Per log:

- `checkpoint` is a recent cosigned checkpoint, the **head checkpoint**. At least `witness_quorum` of its cosignatures MUST be timestamped within the last 7 days. Providers SHOULD refresh it daily.
- `entries` MUST include every entry of the current identity key's lineage (genesis and each rotation), the `key_certified` entry of each certified key in `keys`, and the `key_revoked` entries for every revoked key whose certificate has not yet expired and every identity key revoked within *W*. Each carries an inclusion proof against the head checkpoint. Hashes use standard base64 with padding, the C2SP convention.
- `first_seen` gives, for at least the genesis entry, an earlier cosigned checkpoint covering it and a consistency proof from that checkpoint to the head checkpoint. The proof is empty when the two are the same.

The bundle is self-authenticating: entries are signed, and checkpoints are signed and cosigned. It needs no signature of its own and no trust in the server delivering it.

### 10. Agent verification

An agent whose trust policy requires transparency MUST verify the following before using the provider's lineage tenure, or counting a signing key as logged. It uses only the bundle and its configured witness policy, and never contacts the log.

1. The head checkpoint is signed by a configured log key and carries at least `witness_quorum` valid cosignatures from the configured witnesses, fresh as §9 requires.
2. Each entry's inclusion proof verifies against the head checkpoint's root.
3. The entries form a lineage valid under §4. `sub` equals the organization identifier of the origin being evaluated, and the head equals the identity key in the live `ojcp-keys.json` the agent fetched.
4. Each signing key the agent relies on (manifest or posting) has a valid `key_certified` entry from that head.
5. The authenticated first-seen time of the genesis comes from `first_seen` (§6), with its consistency proof verified.
6. No key the agent relies on has a valid `key_revoked` entry in the bundle, or anywhere else the agent has seen one.

If a step fails, the agent treats the lineage as having no tenure and the keys as unlogged. Under RFC 0010 it then derives a tier that does not depend on them. Failure never raises a tier.

### 11. What revocation can and can't do

A Merkle log can't prove that no revocation exists, so no offline agent can be shown that a key is *still* good. Revocation therefore reaches agents through four channels, and this RFC relies on all of them:

1. **The live key set.** Agents fetch `ojcp-keys.json` before sending candidate data (*When to Validate*), and a revoked key is no longer in it.
2. **Stapled revocations.** The bundle carries authenticated `key_revoked` entries (§9). An agent that cached a key, or holds a posting relayed under RFC 0012, rejects that key's signatures whatever signing time they claim.
3. **Attestation status.** Attesters monitor their subjects and suspend attestations on revocations and contests (RFC 0010). The agent learns of the suspension through status checks it already makes.
4. **Full evaluation.** An agent operator MAY mirror whole logs through tiles and apply §4 in full. This gives it revocations and contests without revealing to the log which providers it evaluates.

A party that takes over a domain controls channel 1 for as long as it holds the domain. It can't create a valid revocation in the owner's lineage (§4), so when the owner recovers the domain, nothing the attacker did persists.

### 12. Retention and erasure

Entries hold domain names, public keys and thumbprints. For a sole trader, the domain may be personal data, and erasure rights such as [GDPR Article 17](https://eur-lex.europa.eu/eli/reg/2016/679/oj) may apply. Leaf hashes can't be removed without breaking every later proof, but they reveal nothing on their own. Logs MAY honour an erasure request for the entries of a lineage that is no longer live, by refusing to serve their content. tlog-tiles recommends this denial-based approach for pruning, rather than deletion. Entries of a live lineage remain available while the provider keeps publishing the keys they describe, because the provider published that information itself. Each log MUST state its retention policy, as tlog-tiles requires before any pruning. Withheld entries can no longer be monitored, which is acceptable only once nothing relies on them.

### 13. Why not a blockchain

The requirement is an append-only, publicly verifiable history that no single operator can rewrite or fork undetected, with proofs that clients can check offline. Merkle logs with independent witnesses meet it and are proven at scale by Certificate Transparency. They need no token, fees or consensus protocol, and depend on no chain's governance. A small number of accountable log and witness operators is easier to configure, audit and replace than miners or validators. A replicated ledger would also make every entry permanent on every node, which rules out the erasure handling of §12.

### 14. Conformance fixtures

The conformance suite gains fixtures for:

- **Inclusion:** a valid bundle; a tampered entry; a wrong tree size; an inclusion proof against another root.
- **Witnesses:** a head checkpoint one cosignature short of quorum; cosignatures from unconfigured witnesses; a stale head checkpoint; a future-dated cosignature; a policy whose quorum is not a strict majority (rejected).
- **Time:** a backdated `iat` (ignored for time, and rejected by the log beyond one hour); first-seen at 89 and 91 days; one backdated witness among *q*.
- **Lineage:** a valid rotation chain; a rotation signed by a non-head key; a recovery rotation replacing a predecessor-signed one; a recovery rotation after *W*; a genesis for an existing key; a `sub` change.
- **Revocation:** revocation by a key outside the lineage (rejected); `effective_from` beyond *W* (clamped); a descendant revocation that would void its own rotation (clamped); a relayed signature by a revoked posting key with an earlier `signed_at` (rejected).
- **Acceptance:** an unsigned or wrongly signed entry triggers no fetch; a genesis for an IP-literal host is rejected.

## Security and privacy considerations

- **Split views.** A log could show agents a fork containing an attacker's key and show monitors a fork without it. Under a strict-majority quorum, both forks reach quorum only if some witness cosigns both, which is provable misbehaviour. Monitors collect from every witness, and agents forward the checkpoints they see (§8). What remains is collusion between the log and a quorum of witnesses that also stays hidden from monitors. Requiring several logs bounds it.
- **Forged entries.** Every entry is signed by a key with authority under §4. A malicious log can refuse or delay entries but can't fabricate them. An entry that fails §4 is ignored by every evaluator, wherever it appears.
- **Backdated tenure.** Neither the submitter's `iat` nor the log's clock counts. Backdating needs *q* colluding witnesses (§6).
- **Domain takeover without keys.** A new lineage is visible and starts with zero tenure. It can't touch the owner's lineage, and RFC 0010 attestations, bound to the owner's identity key, don't apply to it.
- **Identity key theft.** This is bounded by §4: contests within *W*, recovery keys, monitors and attester suspension. Theft of both the identity key and the recovery key is not defended against beyond monitoring.
- **Domain sale with keys.** This is prohibited but cryptographically undetectable (§6). RFC 0010's registration re-checks are the backstop.
- **Stale bundles.** Requiring a fresh head checkpoint limits replay to 7 days. A replayed bundle still has to match the live identity key.
- **Log abuse and amplification.** Signatures are checked before any fetch. Only `identity_published` fetches, at most once per subject per hour, and only from the subject's host. Per-subject limits can be used up only by holders of the domain or a lineage key (§5).
- **Equivocation as tracking.** A log could issue unique checkpoints to tag readers. Agents receive checkpoints from providers, not logs, and forward them only to their own operator's monitor, so a log never sees agent traffic.
- **Privacy.** Agents verify offline (§10), and monitors read whole logs, so no party learns which providers an agent evaluates. Logs hold organization identifiers and public keys only. No candidate data appears anywhere in this RFC. Erasure is handled as described in §12, with the trade-off stated there: an erased lineage can no longer be monitored.

## Affected areas

- [x] *JWK Set Discovery*: defines the `ojcp_transparency` top-level member of `ojcp-keys.json` (§9).
- [x] *Key Rotation*: identity keys rotate only through a logged `identity_rotated` (§4). Certified keys are logged as `key_certified`. Compromised keys are revoked with `key_revoked`, in addition to removal from the set.
- [x] *Validation Procedure* and *When to Validate*: an added step for agents whose trust policy requires transparency (§10).
- [x] *Threat Model*: item 3 (stale or revoked credentials) gains logged revocation (§11).
- [x] *Registry Trust Tiers*: the `audited` 90-day condition is measured as lineage tenure (§6), applied through RFC 0010.
- [x] *Security and Privacy*: a new "Key Transparency" subsection carrying the considerations above.
- [x] *Conformance*: new roles of conforming log, witness and monitor (§§5, 7, 8), and the fixtures of §14.
- [x] *IANA Considerations*: register the media type `application/ojcp-key-event+jwt` when the specification reaches stable status. No new well-known URI.
- [x] Schemas: new `schemas/key-event.json` (identity event payload) and `schemas/key-transparency-bundle.json` (§9). No existing schema changes.
- [ ] Manifest, tool definitions, JobPosting, CandidateContext, AgentDeclaration, VerifierManifest: unchanged.

## Alternatives considered

- **Third-party submission with live checks.** In this model anyone can submit an entry, and the log confirms it against the subject's live key set, as CT logs accept any chain to a trusted root. Rejected. The log's check is an unsigned, point-in-time observation that no one can verify later. A malicious log could append entries it never checked, and each submission would make the log fetch an arbitrary host. Signed entries make content self-authenticating, and limit fetches to self-signed genesis entries (§5).
- **Rely on Certificate Transparency.** CT logs record TLS certificates, not OJCP keys. A domain taker gets a valid certificate, and CT shows that a certificate was issued, not that the OJCP keys changed.
- **[`did:webvh`](https://identity.foundation/didwebvh/v1.0/).** This method adds a hash-chained, optionally witnessed history (`did.jsonl`) to `did:web`, with pre-rotation key hashes. It is close in spirit, and the recovery key of §4 serves a similar purpose. Rejected as the mechanism for now. It keeps history per DID on the domain itself, so there is no shared log for monitors to watch. It uses Data Integrity proofs beside OJCP's JOSE stack, and RFC 0010 keeps keys in `ojcp-keys.json`.
- **Verifiable maps with non-membership proofs.** The IETF KEYTRANS working group's [Key Transparency Protocol](https://datatracker.ietf.org/doc/draft-ietf-keytrans-protocol/) (an Internet-Draft) adds a prefix tree, which can prove a key's latest state and would let offline agents verify the absence of a revocation. Deferred as an open question. The draft is still in progress, and it needs a different log structure from tlog-tiles.
- **A blockchain or ledger.** Rejected (§13).
- **No recovery key.** This is simpler, but an organization that loses its identity key loses its tenure, and a thief racing the owner leaves the lineage contested with no way to settle it. The recovery key is OPTIONAL, so organizations that don't want one aren't burdened.

## Breaking changes

None. Every addition is OPTIONAL for providers. It is required of agents only when their own trust policy requires transparency. `ojcp_transparency` is a top-level JWK Set member, which RFC 7517 §5 requires implementations to ignore if they don't understand it. No existing schema, field or enum value changes, so 0.3 consumers that validate against the published closed enums are unaffected. A consumer that validates `ojcp-keys.json` against a private schema forbidding extra members would reject a set carrying the bundle. That consumer is already outside RFC 7517.

## Open questions

1. **The contest window.** Is 30 days right for *W*? It must be long enough for an owner to notice a stolen key, and short enough that a thief of an old key can do little.
2. **Domain renames.** An organization moving from `acme-careers.com` to `careers.acme.com` starts at zero tenure. Should a rotation signed by both lineages carry tenure across, and how would that resist domain takeovers?
3. **Proof of non-revocation.** Should a later version add a verifiable map (as in KEYTRANS) so offline agents can verify a key's current state?
4. **Attestation transparency.** Should attestation digests be logged, so that RFC 0010's distrust cutoffs have independent evidence? This would require logs to resolve attester keys.
5. **Bootstrapping logs and witnesses.** Can OJCP policies reuse witnesses that already cosign other C2SP logs, and who runs the first two logs?
6. **Signature algorithms.** C2SP recommends ML-DSA-44 for cosignatures. Should OJCP require it of witnesses from the start, and plan a post-quantum algorithm for identity keys?
7. **Freshness.** Is 7 days the right maximum age for a head checkpoint, given that providers must refresh their bundle on a schedule?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, so it has a commercial interest in how providers are trusted. Recruitics holds Seat 1 on the OJCP steering committee. This RFC gives no log, witness or monitor operator, including any Recruitics might run, a privileged role. The author invites co-sponsors from other organizations and will recuse from the vote that resolves this RFC.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes:

Resolution:

Decision record:
