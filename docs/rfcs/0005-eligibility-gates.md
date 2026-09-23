---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: An `eligibility` block for the hard gates, where every gate can say "not stated"

- **Author:** [Ilya Strelov, freehire](https://freehire.me)
- **Status:** Draft
- **Created:** 2026-09-23
- **Resolves:** [Issue #19](https://github.com/ojcp-org/ojcp/issues/19), item 4

## Motivation

A candidate who needs visa sponsorship and applies to a role that does not sponsor has not made a mistake. Nobody told them. The posting often *did* say, in a sentence in the description, and the provider often extracted it — but OJCP has nowhere to put it, so the agent filtering on the candidate's behalf never sees it and the application is wasted. Wasting applications is the specific harm OJCP exists to reduce.

Three of these gates are *hard*: they decide whether an application can succeed at all, not whether it is a good fit.

- **Visa sponsorship** — the employer will or will not sponsor.
- **Relocation** — the employer will pay to move you, will not, or requires that you move.
- **Security clearance** — the role requires government vetting the candidate may not hold and cannot quickly obtain.

The softer descriptors a catalogue holds (company size, posting language, English level, education level) do not belong in the core shape. They shape a ranking; they do not decide whether applying is possible. This RFC deliberately covers only the gates.

## Evidence

Measured across **6,064,722 open public postings** in one live catalogue, 2026-09-23. Full population, not a sample.

### Visa sponsorship

| State | Postings |
|---|---|
| Sponsorship offered | 51,765 |
| Sponsorship explicitly **not** offered | 142,200 |
| Not stated | 5,870,757 |

### Relocation

| State | Postings |
|---|---|
| Supported | 31,811 |
| Not supported | 266,205 |
| **Required** | 9,747 |
| Not stated | 5,756,959 |

### Security clearance

| State | Postings |
|---|---|
| Required | 140,360 |
| Explicitly not required | **0** |
| Not stated | 5,924,362 |

## Proposal

An optional `eligibility` object on `JobPosting`, carrying only the hard gates:

```json
"eligibility": {
  "type": "object",
  "description": "Hard eligibility gates: conditions that decide whether an application can succeed at all. Every gate is a closed enum that includes a value for 'the posting did not say'. An absent gate means exactly that value — agents MUST NOT read absence as a negative.",
  "properties": {
    "visa_sponsorship": {
      "type": "string",
      "enum": ["offered", "not_offered", "unspecified"],
      "description": "Whether the employer will sponsor a work visa for this role."
    },
    "relocation": {
      "type": "string",
      "enum": ["offered", "not_offered", "required", "unspecified"],
      "description": "Whether the employer supports relocation. `required` means the role cannot be performed without relocating — a constraint on the candidate, not an offer to them."
    },
    "security_clearance": {
      "type": "string",
      "enum": ["required", "not_required", "unspecified"],
      "description": "Whether the role requires a government security clearance."
    }
  }
}
```

### The one rule that matters

**A gate that is absent, or set to its "not stated" value, MUST NOT be read as a negative.**

Everything else here is vocabulary. This is the requirement.

Collapsing "unknown" into "no" makes the standard assert a restriction the employer never wrote — the same defect as taking the first element of a multi-location `jobLocation`. The numbers above put a size on it. Visa sponsorship is stated as unavailable on **142,200** postings. If an agent treats "not stated" as "not offered", that population becomes **6,012,957** — the standard would be speaking for **5,870,757 employers who said nothing**, making the refusal population **42 times larger than the one employers actually stated**.

The failure is silent and it is not symmetric. The candidate never learns the job existed, and the employer never learns an eligible candidate was filtered away.

### Three findings from the data that shaped the shape

**1. A single shared vocabulary does not fit.** Issue #19 discussed `offered` / `not_offered` / `unspecified` for every gate. That works for sponsorship. It does not survive contact with the other two:

- Relocation has a fourth real state. **9,747 postings require relocation** — the role cannot be done without moving. That is a constraint *on* the candidate, not an offer *to* them, and neither `offered` nor `not_offered` says it. An agent told `not_offered` would conclude "they won't pay to move me" and apply anyway, when the truth is "you must move."
- A clearance is never *offered*. It is demanded. `offered` is not a state this gate has, and including it would invite providers to fill it with something.

So the gates share a **rule**, not a vocabulary: each is a closed enum that always includes a "not stated" member, and absence is never a negative. Forcing one enum across all three would cost accuracy on two of the three to save a line of spec.

**2. Some gates never state the negative, and that is not a bug.** Clearance shows **140,360 required and exactly zero explicitly-not-required**. Postings say "requires an active TS/SCI"; they do not say "no clearance needed". A two-state boolean would therefore read `false` for 5.92M postings that said nothing at all — the tri-state is what keeps 140,360 real assertions from being diluted by six million invented ones.

The zero is worth dwelling on. It is the cleanest available proof that "unknown" and "no" are different populations: for this gate, one of them is empty.

**3. Tri-state is already what a careful provider does.** This is not a theoretical requirement. freehire's clearance signal has been tri-state in production since before Issue #19 was filed, for the reason this RFC argues, and the code says so in as many words:

> Only a positive is asserted: a description the dictionary does not mark yields nil (unknown), never false. The dictionary reports "not stated", and storing that as a false would read as "stated to be unnecessary", which is a different claim and one the catalogue almost never makes.

A provider that has thought about this arrives at tri-state on its own. The value of putting it in the spec is that a provider that *hasn't* thought about it cannot accidentally ship two-state and be silently wrong at six-million scale.

## Affected areas

- [x] Core schemas (JobPosting)
- [x] Spec prose (a new subsection under JobPosting)

## Alternatives considered

**Booleans with field absence carrying "unknown".** Rejected, though it is the tempting one — JSON Schema makes it nearly free. Absence is load-bearing in too many other places to be trusted here: a field can be missing because the provider doesn't implement eligibility at all, because a serializer dropped a null, or because the posting genuinely said nothing. Those are three different facts and a consumer cannot tell them apart. An explicit `unspecified` member makes the provider's silence deliberate and readable. (Absence is still permitted and still means `unspecified` — that is the safe default, not the expressive one.)

**Leave it in `agent_notes`.** Rejected; this is the status quo and it is what freehire ships today. Prose works for a human reading one posting and is useless for the thing OJCP is for: an agent filtering six million of them. Every provider also phrases it differently, so nothing is comparable across catalogues.

**A general-purpose facet bag** (`facets: {}` with provider-defined keys). Rejected. It would carry these three and also company size, posting language and everything else, and an agent could rely on none of it. The hard gates earn named fields precisely because an agent must be able to depend on them; the soft descriptors do not, and belong in an extension.

**Include the softer descriptors** (`company_size`, `posting_language`, `english_level`, `education_level`, `experience_years_min`). Rejected for this RFC, per the discussion in Issue #19. They rank; they do not gate. Coverage is also far thinner and the vocabularies are far less settled — `english_level` alone would import the CEFR scale and the question of self-assessment.

## Breaking changes

None. `eligibility` is optional and additive; every field inside it is optional. A provider that omits it is exactly as conforming as today, and an agent that does not read it behaves as it does today.

The one forward-compatibility note: agents MUST ignore enum members they do not recognise rather than rejecting the posting, per [Schema Extensibility](https://spec.ojcp.dev/#conformance-extensibility). A gate gaining a state later — as relocation already argues it might — must not invalidate existing postings.

## Measurement method

One catalogue's full open-posting population (6,064,722 rows), counted 2026-09-23, not sampled. Gates are derived by curated dictionaries that never guess: where the text does not clearly state something, the value is left unset rather than inferred. That discipline is why the "not stated" counts are large and why they are trustworthy as a floor — the true stated population may be slightly higher, never lower.

The catalogue ingests continuously, so the per-gate queries ran minutes apart and the open-posting total drifted by a few thousand rows between them. Each "not stated" figure above is derived by subtraction from the single total quoted here, so the tables are internally consistent; treat the last three digits of any count as noise.

Counts are from a single provider and should be read as one catalogue being specific, not as an ecosystem survey. The *ratios* are what the argument rests on, and a 41-fold gap does not turn on provider-specific extraction quality.
