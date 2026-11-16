# 0015 — Core specification and optional extensions

- **Status:** Accepted
- **Date:** 2026-11-12
- **Decided by:** Austin Anderson (Recruitics, Seat 1), as maintainer. Editorial: no normative requirement is added, removed or changed.
- **Related RFC / PR:** RFCs [0008](../rfcs/0008-standing-mandates.md)–[0014](../rfcs/0014-hiring-credentials-and-issuer-profile.md), whose placement this sets

## Context

The specification was one document. Provider Trust, User Mandates and Identity Verification were
840 of its 2,538 lines (33%); Identity Verification alone was longer than all six job tools.
All three were already optional, or applied only when a provider required them, but nothing in the
document's shape said so, and a reader met trust and verification machinery before the conformance
section told them it wasn't required. RFCs 0008 and 0010–0014 are another 2,148 lines of RFC text,
mostly trust and verification, so folding them into the single document would make OJCP read as a
verification protocol rather than a job protocol.

## Decision

The specification is published as **core** plus three **optional extensions**, all in this
repository, under one RFC process and one version number:

| Document | Source | Published at | Contents, and RFCs that land there |
|---|---|---|---|
| OJCP (core) | `spec/ojcp.bs` | `spec.ojcp.dev/` | Manifest, tools, schemas, apply paths, attribution, resume upload, agent identity, WebMCP, discovery. RFCs 0001, 0002, 0004, 0006, 0007, 0009 |
| OJCP Trust | `spec/ojcp-trust.bs` | `spec.ojcp.dev/trust/` | Manifest signing, JWK Set discovery, trust tiers, agent obligations. RFCs 0010, 0011, 0012 |
| OJCP Mandates | `spec/ojcp-mandates.bs` | `spec.ojcp.dev/mandates/` | User mandates. RFCs 0003, 0008 |
| OJCP Candidate Verification | `spec/ojcp-verification.bs` | `spec.ojcp.dev/verification/` | Identity verification and its security considerations. RFCs 0005, 0013, 0014 |

- The three parts moved verbatim. Cross-references between documents are rewritten as links; no
  requirement text changed.
- Agent identity (RFC 0001) stays in core: visibility (RFC 0004), attribution (RFC 0007), rate
  limiting and blocking an agent depend on it. RFC 0009 stays in core: occupation codes and binding
  actions are job and application data every agent reads.
- The Trust agent obligations remain binding on every agent that transmits Candidate Context. Core
  says so in its Provider Trust stub and its new *Conformance → Extensions* section.
- Core keeps every former anchor (`#provider-trust`, `#trust-tiers`, `#user-mandates`,
  `#mandate-action`, `#identity-verification`, `#security-verification` and each subsection), each
  linking to its new location, so existing links still resolve.
- Schemas and their `$id`s do not move. The VerificationStep, VerificationProof and
  VerifierManifest schema sections stay in core's Data Schemas.
- `spec/ojcp-v0.1.bs` is renamed `spec/ojcp.bs`: the version is in `VERSION`, not the file name.
  Release snapshots (`/0.1/` to `/0.3/`) keep building from their own tags.

## Consequences

- An implementer reads core to build a provider or agent, and opts into extensions explicitly.
- Each extension's RFCs define its own conformance fixtures; the conformance suite tests an
  extension only when a provider claims it.
- `scripts/build-spec.sh` builds all four documents for CI, the Pages deploy and `make spec`, with
  Bikeshed warnings treated as errors.
- Follow-up: the "Implement RFC" PRs for 0008–0014 target the document their decision record names;
  the conformance suite gains a per-extension option; ojcp.dev links the extensions.

## Alternatives considered

- **Keep one document with "optional" labels.** Rejected: readers still page through every
  extension, and the 0.4 RFCs would push the optional parts past half of the document.
- **Separate repositories per extension.** Rejected: four RFC processes and version lines, and
  cross-document changes (such as RFC 0008, which touches core tools and mandates) would span
  repositories.
- **Move agent identity to the Trust extension.** Rejected: core features that are not optional
  depend on it.
