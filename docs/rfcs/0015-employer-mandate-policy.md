---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Employer mandate policy — let each employer on a shared job site decide how agents may apply to it

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-11-16
- **Resolves:** the follow-up recorded in [decision 0008](../decisions/0008-standing-mandates.md), raised by Tom Chevalier (Tink) on [PR #40](https://github.com/ojcp-org/ojcp/pull/40)
- **Related:** RFC 0003 (action-bound user mandates), RFC 0008 (standing mandates), RFC 0009 (binding actions), RFC 0012 (signed job postings)

## Summary

RFC 0008 lets a person give an AI agent a standing permission: "apply to jobs like these, at most two per company, until March." A job site can decide not to accept those permissions, but it decides for every employer it hosts at once. Many employers hire through the same applicant tracking system or job board, and one of them may not want automated applications at all while the others are happy to receive them.

This proposal lets **each employer** set its own rule, and makes the job site enforce it:

- **An employer can turn standing permissions off,** or limit them further than the site does (for example, one application per person instead of three).
- **An employer can ask that a person approve each application themselves.** When it does, the agent must show the person that specific job and get a fresh approval, and the approval must come with proof that a person, not the agent's software, gave it.
- **The rule travels with the job,** so an agent knows before it starts an application, and a job board passing the job along can't quietly drop it.
- **The job site checks the rule itself** when an application starts and again when it's submitted. An agent that ignores the rule gets its application refused.

For example, Globex and Initech both hire through the same ATS. Initech accepts standing permissions. Globex has had a flood of low-quality automated applications and says "a person must approve each one." An agent working under a standing permission skips Globex's jobs, or asks its user "Do you want to apply to this Globex job?" and sends a one-time approval the user confirmed on their own device. Initech's jobs are unaffected.

## Motivation

RFC 0008 §9 puts the standing-mandate policy in the provider's manifest (`auth.user_mandates`). A manifest describes a whole origin. On a multi-tenant ATS or a job board the origin serves many employers, so the manifest can only state the provider's rule, not each employer's.

Tom Chevalier asked on PR #40 that a provider be able to refuse standing mandates "either universally or per employer". The universal case is covered by RFC 0008. The per-employer case was deferred to this RFC because doing it properly needs more than a flag:

1. **The agent must not be the one enforcing it.** A field in a posting only tells a well-behaved agent what to do. The provider has to check the employer's policy from its own records.
2. **The fallback must not be automatable.** The natural fallback when an employer declines standing mandates is a one-time action mandate (RFC 0003). But RFC 0003 lets the provider admit "a user-controlled key", and nothing guarantees that key is held by the person rather than by the agent platform. An agent could mint one action mandate per job and auto-apply anyway. An employer that asks for per-application approval needs evidence that a person approved *this* application.
3. **Some channels are out of reach.** An agent can still scrape an employer's career site and fill in its form like a browser. No protocol prevents that; this RFC covers applications made through OJCP, and says so.

## Proposal

### 1. Terminology

- **Employer mandate policy:** the rules one employer sets for applications made to it under user mandates. It can only be stricter than the provider's policy.
- **Effective policy:** the combination of the provider's policy (`auth.user_mandates` in the manifest) and the employer's policy for the job.
- **User-presence proof:** evidence, verifiable by the provider, that a person approved a specific action on a device they control.

### 2. The employer mandate policy object

An employer mandate policy uses the same members as the provider's `auth.user_mandates` block (RFC 0008 §9), plus one new member:

```json
"user_mandates": {
  "types": ["action"],
  "standing": { "max_per_employer": 1, "max_breadth": "narrow" },
  "action": { "user_presence": "required" },
  "policy_id": "https://ats.example/globex/ojcp/mandate-policy/2026-11"
}
```

- `types`: the mandate types the employer accepts for applications. `["action"]` declines standing mandates.
- `standing.*`: maximums, with the same meaning as the provider's.
- `action.user_presence` (new): `required` or `optional`. When `required`, every action mandate for an application to this employer MUST carry a user-presence proof (§4).
- `policy_id`: OPTIONAL. A URL for the employer's human-readable policy.

### 3. Effective policy: the employer can only tighten

The provider computes the effective policy per job, member by member:

| Member | Effective value |
|---|---|
| `types` | intersection of the provider's and the employer's |
| `standing.max_*` | the lower of the two |
| `standing.max_breadth` | the narrower of the two |
| `required_for`, `action_mandate_required_for` | union of the two |
| `action.user_presence` | `required` if either says `required` |

An employer value that would loosen the provider's policy has no effect. An absent employer policy means the provider's policy applies unchanged, so every existing posting keeps today's behavior.

### 4. User-presence proof

A user-presence proof is a WebAuthn assertion with the *user verified* flag set, whose challenge is the SHA-256 digest of the action statement (RFC 0003 §4) that the mandate binds. The credential is one the provider has bound to the candidate through its own process (*Mandate Admission*), as for RFC 0008's `jkt` candidate binding.

- The agent obtains it by sending the person to the provider's approval page for that application, or by using an embedded approval (RFC 0005's inline rendering) where the provider offers one. The page shows the employer, the job title and the binding actions (RFC 0009) before the person approves.
- The provider MUST verify the assertion against the reconstructed action statement and the candidate's registered credential, and MUST reject an action mandate without a valid proof when the effective `action.user_presence` is `required`.
- An action mandate issued by an issuer affiliated with the agent platform (RFC 0008 §2.3) does not satisfy `required` on its own; the proof is what shows a person approved.

Other proof methods (for example a wallet presentation under RFC 0013) can be added by a later RFC. This RFC defines only WebAuthn because providers already deploy it for account login.

### 5. Where the policy is published

- **In the posting.** JobPosting gains OPTIONAL `employer.user_mandates`, holding the employer mandate policy object. A provider that hosts more than one employer and has an employer policy MUST publish it on that employer's postings.
- **In signed postings.** Under RFC 0012 the member is inside the signature, so a relay can't remove it without breaking the seal.
- **In search.** `search_jobs` gains `filters.accepts_standing_mandates` (boolean). A provider that applies it returns only jobs whose effective `types` includes (or, for `false`, excludes) `standing`.

The posting copy is advisory. §6 is what enforces it.

### 6. Enforcement by the provider

- At `begin_application` and at `submit_application`, the provider MUST compute the effective policy from its own records for the job's employer, not from any copy of the posting the agent holds.
- A request that the effective policy does not allow is refused with `user_mandate_required` and one of these `details.reason` values, which, like RFC 0008's, depend only on published policy:
  - `standing_not_accepted`: the employer declines standing mandates.
  - `user_presence_required`: an action mandate without a valid user-presence proof.
  - `exceeds_provider_policy`: as in RFC 0008, now measured against the effective policy.
- A policy change between `begin_application` and `submit_application` applies at submission. The provider MUST NOT accept a submission that the policy in force at that moment refuses.
- The provider MUST record, in what it delivers to the employer, which mandate type and whether a user-presence proof authorized the application.

### 7. Agent obligations

- An agent acting under a standing mandate MUST NOT start an application to a job whose effective `types` excludes `standing`, where it has the posting's policy.
- It MAY instead ask the person for a one-time approval of that application. It MUST show the person the employer, the job and the binding actions, and MUST NOT batch approvals for several jobs into one request.
- An agent MUST NOT obtain a user-presence proof on the person's behalf, or present the approval in a way that hides which job it is for.

### 8. What this does not cover

This RFC governs applications made through OJCP tools. An agent that fills in an employer's web form like a browser is outside the protocol. Employers that want to restrict that channel need controls on their own form; OJCP's contribution there is that compliant agents identify themselves (RFC 0001) and are credited per agent (RFC 0007), so employers can tell them apart.

### 9. Conformance

New fixtures for the conformance suite:

| Fixture | Setup | Expected |
|---|---|---|
| `employer_declines_standing` | Provider admits standing; job's employer policy `types: ["action"]`; standing mandate presented | Reject, `standing_not_accepted` |
| `employer_cannot_loosen` | Provider `max_per_employer: 1`; employer says 3; second application | Reject, `exceeds_provider_policy` |
| `employer_policy_from_provider_records` | Agent presents a posting copy with the employer policy removed | Reject as if present |
| `user_presence_required` | Employer `user_presence: required`; action mandate without proof; with a proof over a different action statement; with a valid proof | Reject, reject, accept |
| `policy_changed_mid_session` | Employer switches to `["action"]` after `begin_application` | Reject the standing submission |
| `affiliated_issuer_no_proof` | Action mandate from an affiliated issuer, `user_presence: required`, no proof | Reject |

## Security and privacy considerations

- **Bypass by re-issuing.** Without §4, an agent platform with an affiliated issuer could mint one action mandate per job. The user-presence proof closes that path for employers that require it.
- **Stripping the policy.** Enforcement reads the provider's own records (§6), so removing the field from a relayed posting changes nothing.
- **Disclosure.** An employer's policy is published on its postings. That reveals the employer's stance on automated applications, which is the point. It reveals nothing about candidates.
- **Fingerprinting.** WebAuthn assertions are scoped to the provider's origin and to one credential; they add no identifier the provider doesn't already hold for a candidate it has bound.
- **Off-protocol channels.** §8 states the limit plainly so employers don't rely on this for a channel it doesn't govern.

## Affected areas

- [x] Tool definitions: `search_jobs` `filters.accepts_standing_mandates`; `begin_application` / `submit_application` enforcement (§6); new `details.reason` values.
- [x] Core schemas: JobPosting `employer.user_mandates` (core hook, `schemas/job-posting.json`); `schemas/tools/search-jobs-input.json`.
- [x] Manifest format: unchanged; the employer object reuses `auth.user_mandates` members.
- [x] Security / privacy model: *OJCP Mandates* gains *Employer Mandate Policy* (§§2–4, 6–7); *Mandate Admission* notes that an affiliated issuer does not satisfy `user_presence: required`.
- [x] Other: conformance fixtures (§9).

Placement: normative text in the OJCP Mandates extension; core keeps the JobPosting member and the search filter as hooks.

## Alternatives considered

- **A list of declining employers in the manifest.** Publishes the provider's customer list and grows with every tenant.
- **One origin per employer.** Works where an ATS already gives each employer its own subdomain, but forcing it is a large change for providers that don't.
- **A posting flag that agents honor.** Unenforced; an agent can ignore it.
- **Requiring per-application approval everywhere.** Removes standing mandates for employers that want them.
- **Trusting action mandates without user presence.** Leaves the re-issuing bypass open.

## Breaking changes

None. Every addition is OPTIONAL. Providers with no employer policies behave as under RFC 0008. Agents that predate this RFC are refused, fail-closed, only where an employer has set a stricter policy.

## Open questions

1. Should `user_presence` also be available to providers as a whole, in the manifest, not only per employer?
2. Should a wallet presentation (RFC 0013) count as a user-presence proof from the start?
3. Should employers be able to allow standing mandates only from agents they name (RFC 0004's agent allowlist), rather than all or none?
4. Should the per-employer count window (RFC 0008 open question 5) be settable per employer here?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, and holds Seat 1 on the steering committee. This RFC lets employers reduce applications made under standing mandates, which bears on that revenue. The author invites co-sponsors, particularly from employers, ATS vendors and agent platforms, and will recuse from the resolution vote.

## For maintainers — comment period and resolution

Comment period opens: 2026-11-16

Comment period closes: 2026-12-16 (30 days)

Resolution:

Decision record:
