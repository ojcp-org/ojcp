---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Occupation codes and binding actions — say what a job is, and what an application would sign

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0003 (action-bound user mandates), RFC 0008 (standing mandates), RFC 0012 (signed job postings)

## Summary

This proposal fixes two gaps that matter once AI agents look for jobs and apply on people's behalf.

**What kind of job is this?** Job titles vary widely. "Associate", "Rockstar" and "Team Member" tell a computer almost nothing, and "Remote" doesn't say which countries the employer will hire from. Today an agent has to guess from the wording. Under this proposal each job can carry a code from the U.S. Department of Labor's public list of occupations, together with the edition of the list it comes from. Countries and states are written as standard international codes. When the job board isn't sure which occupation a job is, it leaves the code out rather than guess.

**What would this application sign?** Some application forms include legal commitments as well as questions: agreeing to settle disputes in private arbitration rather than in court, authorizing a background check, or swearing that every answer is true. To an agent these look like any other question with a "yes" box. Under this proposal the job board must list, before anything is submitted, every commitment the application would record. An empty list means there are none. If the list is missing, or names something the agent doesn't recognize, the agent has to treat it as a legal commitment. Only the person can make that decision, for that application.

*Example.* Maria asks her agent to apply to registered-nurse jobs near Chicago. The agent can find them reliably because each posting carries the registered-nurse code. One hospital's form contains an arbitration agreement and a background-check authorization, and the job board lists both. The agent stops and shows Maria each document separately, the background-check notice on its own, and submits only after she decides. A form that lists nothing can be completed without stopping, if Maria has allowed that.

## Motivation

### Occupation

OJCP's JobPosting extends [schema.org's JobPosting](https://schema.org/JobPosting), which already has [`occupationalCategory`](https://schema.org/occupationalCategory): "a category describing the job, preferably using a term from a taxonomy such as BLS O\*NET-SOC, ISCO-08 or similar … Ideally the taxonomy should be identified, and both the textual label and formal code for the category should be provided." OJCP does not define the property, so agents classify jobs themselves from `title` and `description`. Every agent ends up with its own heuristic, and two agents disagree about the same posting.

That is tolerable for ranking. It is not tolerable once a classification decides something. RFC 0008 (standing mandates) lets a person authorize applications within a scope such as "registered-nurse jobs". A provider can only enforce that scope against a code it publishes. It cannot enforce it against a model's reading of a title. schema.org also says that "any textual label and formal code provided as a literal may be assumed to be from O\*NET-SOC", so a bare string names no taxonomy edition and can't be compared safely across editions.

### Location

schema.org [recommends](https://schema.org/addressCountry) ISO 3166-1 alpha-2 for `addressCountry` but allows alpha-3 codes and full country names, and gives `addressRegion` as free text ("California"). The spec's own multi-location example expresses remote work as `addressLocality: "Remote"`. A consumer can't reliably tell whether a remote job accepts candidates in the United States, and it can't compare a region it receives with one it already holds.

### Binding actions

The `begin_application` response returns `screening_questions`, `required_fields` and `optional_fields`. Nothing distinguishes "Do you hold an active RN license?" from "I agree to the Mutual Arbitration Agreement" or "I authorize a background check". An agent that answers every question gives all of these assents, and the candidate may never see the documents behind them.

The spec already handles one category of this: EEO self-identification may be sent only "when the candidate has explicitly chosen to disclose it for this specific application" (*EEOData*). Legal assents have no equivalent rule. The *Action Statement*'s `candidate_data_digest` binds the agent's "yes" to a mandate, but not the text that "yes" agreed to.

Background checks show what is at stake. Under the Fair Credit Reporting Act, a person generally may not procure a consumer report for employment purposes unless "a clear and conspicuous disclosure has been made in writing to the consumer … in a document that consists solely of the disclosure" and "the consumer has authorized in writing (which authorization may be made on the document referred to in clause (i))" ([15 U.S.C. § 1681b(b)(2)(A)](https://www.law.cornell.edu/uscode/text/15/1681b)). An agent that merges that disclosure into a chat summary with other terms, or answers the authorization question itself, can leave an employer holding an authorization the candidate never saw.

A signal that providers may omit fails open: an absent list looks the same as an empty one. The signal has to be required where it decides something, and its absence has to mean "unknown".

## Proposal

### 1. Occupation codes

#### 1.1 The field

`occupationalCategory` is added to JobPosting and to each job in the `search_jobs` response. Its OJCP form is an array of one to three schema.org [`CategoryCode`](https://schema.org/CategoryCode) objects:

```json
"occupationalCategory": [
  {
    "@type": "CategoryCode",
    "codeValue": "29-1141.00",
    "inCodeSet": "https://www.onetcenter.org/taxonomy/2019/list.html",
    "name": "Registered Nurses"
  }
]
```

- `codeValue` (REQUIRED): a code from the code set.
- `inCodeSet` (REQUIRED): the code set and its edition. schema.org allows a URL here. Consumers compare it as an exact string.
- `name` (OPTIONAL): the code's title in that code set, for display.

This is the shape schema.org asks for, with the property repeated per value, the taxonomy identified, and both label and code given. `CategoryCode` carries `codeValue` and `inCodeSet`, and its documentation lists `JobPosting` among the types whose `occupationalCategory` takes it.

**Code set.** This RFC defines one code set, the **O\*NET-SOC 2019 taxonomy**, identified by the exact string `https://www.onetcenter.org/taxonomy/2019/list.html`. That is the taxonomy authority's own listing for this edition; it publishes earlier editions' listings at parallel paths. [O\*NET-SOC 2019](https://www.onetcenter.org/taxonomy.html) is aligned to the 2018 Standard Occupational Classification and has 1,016 occupational titles. Its codes take the form `NN-NNNN.NN`. A code ending in `.00` is a 2018 SOC detailed occupation (`15-1252.00`, Software Developers). Other suffixes name more specific O\*NET occupations within one (`15-1299.04`, Penetration Testers). The O\*NET database is published under [CC BY 4.0](https://www.onetcenter.org/license_db.html).

- A `codeValue` in this code set MUST be a code listed in that taxonomy.
- A consumer MUST ignore an entry whose `inCodeSet` it does not recognize. A later RFC adds a new identifier for a later edition. The SOC itself is under review for a [possible 2028 revision](https://www.federalregister.gov/documents/2024/06/12/2024-12825/statistical-policy-directive-no-10-standard-occupational-classification-soc-request-for-comments-on).

**Primary code.** The first entry is the posting's **primary** classification: the occupation the posting hires into. Further entries are allowed only when the one requisition hires into each listed occupation, for example a posting open to registered nurses or licensed practical nurses (`29-1141.00`, `29-2061.00`). They MUST NOT be added to widen the posting's reach. Entries MUST be unique. A consumer that needs one classification, such as RFC 0008's scope check, uses only the primary entry.

**Absent means unclassified.** The field is OPTIONAL. A posting without it, or whose primary entry is in a code set the consumer doesn't recognize, is unclassified for that consumer. RFC 0008 relies on the primary code, so an unclassified job cannot fall within a standing mandate's occupation scope.

**String form.** schema.org also allows a text literal. Providers MUST NOT emit one in OJCP responses. A consumer that receives one MAY display it, but MUST NOT treat it as a classification, because it names no edition.

#### 1.2 Classifying a posting

Providers classify. These rules keep classification honest and cheap.

1. **Classify the work, not the title.** Use the duties and requirements in the posting. Where the title and the description disagree, the description wins.
2. **Prefer the most authoritative source.** In order: a code the employer assigned, if it is listed in the code set and consistent with the duties; a mapping from the employer's or ATS's job profile, maintained by the provider or the employer; an automated coder. O\*NET publishes the taxonomy, 56,495 job and alternate titles, and machine-readable taxonomy files ([taxonomy page](https://www.onetcenter.org/taxonomy.html)), which mappings and coders can build on.
3. **No guessing.** If the provider cannot place the posting in one occupation with the confidence its documented policy requires, it MUST omit the field. It MUST NOT emit a default code, a code derived from the title alone, or a residual code as a fallback.
4. **Residual codes.** Codes whose taxonomy title ends in "All Other" (for example `15-1299.00`, Computer Occupations, All Other) are residual categories. A provider MAY use one only when it has determined that the work belongs to that group and to none of the group's listed occupations.
5. **Corrections.** Providers SHOULD let employers see and correct the assigned code. A changed code is a change to the posting, and the posting's `dateModified` advances (RFC 0012).
6. **Never as a lever.** A provider MUST NOT choose, add or change a code to alter who finds the posting or which mandates cover it.

**Cost.** The field is optional, and leaving it out is always conformant. A provider can start with postings whose employer already supplies a code or whose job profile already maps to one, and leave the rest unclassified. An unclassified job is never penalized in search. It is only outside occupation filters (§1.3) and outside standing-mandate occupation scopes.

#### 1.3 Filtering in `search_jobs`

`search_jobs` gains `filters.occupational_category`: an array of codes, each either an O\*NET-SOC 2019 code (`29-1141.00`) or a 2018 SOC group code at any level (major `29-0000`, minor `29-1000`, broad `29-1140`, detailed `29-1141`). A job matches when any of its codes in this code set equals a filter code or falls under it in the 2018 SOC structure, as published with the taxonomy ([structure](https://www.onetcenter.org/taxonomy/2019/structure.html)).

A provider that applies the filter returns only matching jobs. The filter is an explicit narrowing the agent asked for. It is not an eligibility gate, and an agent that also wants unclassified jobs searches without it. A provider that doesn't implement the filter ignores it (*Schema Extensibility*), so agents check the codes on the results rather than assume the filter was applied.

Beyond filtering, codes let agents deduplicate the same role across boards, compare pay within an occupation, and match a candidate's past roles to openings, all without each agent building its own classifier.

### 2. Location codes

These rules apply to every `Place` in `jobLocation`, in JobPosting and in `search_jobs` results.

- `addressCountry` MUST be an [ISO 3166-1](https://www.iso.org/iso-3166-country-codes.html) alpha-2 code in upper case (`US`, `CA`). This is the form schema.org already recommends. The alpha-3 codes and full names it tolerates are no longer conformant OJCP output.
- `addressRegion` SHOULD be the subdivision part of an ISO 3166-2 code: the characters after the hyphen, as in `IL` for `US-IL`. ISO 3166-2 codes are the country's alpha-2 code followed by a hyphen and up to three characters ([ISO](https://www.iso.org/iso-3166-country-codes.html)). A Place that carries `addressRegion` MUST carry `addressCountry`. The full code is `addressCountry` + `-` + `addressRegion`. Writing only the subdivision part keeps the spec's existing example (`"addressRegion": "IL"`) and common schema.org markup valid.
- The `location.country` and `location.state` inputs of `search_jobs` use the same codes.

Consumers MUST NOT reject a posting whose values are not codes. They MAY display such values, and MAY normalize an unambiguous ISO 3166-1 alpha-3 code. Any other non-code value MUST be treated as unstated for every decision that narrows results or authorizes an action. Consumers compare codes by exact equality and never infer a code from a name.

**Remote work.** For a job whose `remote_policy` is `remote`, each `jobLocation` entry names an area where the employee may live and work: a country, or a country and region. `addressLocality` is omitted. A value such as `"Remote"` in `addressLocality` is display text with no meaning. A remote job that names no country has an **unstated** country. Agents MUST NOT read it as open to any country, and providers SHOULD state the countries rather than leave them out. For `on_site` and `hybrid` jobs, `jobLocation` names the workplaces.

```json
"remote_policy": "remote",
"jobLocation": [
  { "@type": "Place", "address": { "addressCountry": "US" } },
  { "@type": "Place", "address": { "addressCountry": "CA", "addressRegion": "ON" } }
]
```

### 3. Binding actions

#### 3.1 Definition

A **binding action** is an assent that an application records and that has legal or contractual effect beyond the application itself. It covers agreeing to terms, authorizing someone to act, and certifying a statement. Supplying information (an answer, a résumé, a phone number) is not a binding action. Giving a permission or making a promise is.

#### 3.2 The field

The `begin_application` response gains `binding_actions`: an array that names **every** binding action the submission would record.

| Member | Requirement | Meaning |
|---|---|---|
| `id` | REQUIRED | Unique within the application session. |
| `type` | REQUIRED | A value from the vocabulary (§3.3). Open: see §3.4. |
| `title` | REQUIRED | Short label, as the employer names it. |
| `statement` | REQUIRED | The exact words of the assent as the form presents them. |
| `required` | REQUIRED | `true` if the application cannot be submitted without this assent. |
| `question_ids` | OPTIONAL | The `screening_questions` whose answers record this assent. |
| `fields` | OPTIONAL | The `required_fields`, `optional_fields` or `custom_fields` names that record it. |
| `documents` | OPTIONAL | The documents the assent refers to (below). |

An entry with neither `question_ids` nor `fields` is recorded by the act of submitting ("By submitting, you agree to…"). Such an entry MUST have `required: true`, because there is no way to decline it except by not applying.

Each `documents` entry has:

- `uri` (REQUIRED): an `https` URL.
- `digest` (REQUIRED): `sha256:` followed by the base64url encoding, without padding, of the SHA-256 hash of the response body served at `uri`, after any content coding is removed.
- `media_type` (REQUIRED), and `title`.
- `standalone` (default `false`): when `true`, the document MUST be presented by itself, not merged with any other text.

Providers SHOULD serve documents from their own origin or the employer's, so that fetching them does not reveal the candidate's application to a third party.

#### 3.3 Vocabulary

| `type` | Covers |
|---|---|
| `arbitration_agreement` | An agreement to resolve disputes by arbitration, including any waiver of court, jury, class or collective proceedings in it. |
| `background_check_authorization` | Authorization for the employer or a third party to obtain information about the candidate, including consumer and investigative consumer reports, criminal, credit, driving and drug screening, and employment or education verification, together with the disclosures that accompany it (§3.7). |
| `truthfulness_attestation` | A certification that the application is true and complete, usually with an acknowledgment of the consequences if it isn't. |
| `terms_of_service` | Acceptance of terms governing the application service or an account created to apply. |
| `contact_consent` | Permission to be contacted by a channel or for a purpose beyond processing this application, such as automated calls or text messages, marketing, or a talent community. |
| `data_use_consent` | Permission to collect or use personal data beyond what processing this application needs, such as retention in a talent pool, sharing with affiliates or third parties, cross-border transfer, recording or automated analysis of interviews or assessments, or biometric data. |
| `employment_terms` | Acknowledgment or acceptance of terms of a prospective employment relationship, such as an at-will statement, a confidentiality agreement, or a restrictive covenant. |
| `other` | Any recorded assent the types above don't cover. |

A provider MUST use the most specific type that applies. An assent that fits two types is listed once, under the more protective one (in table order).

#### 3.4 Semantics

- **Empty means none.** `binding_actions: []` is the provider's assertion that the submission records no binding action.
- **Absent means unknown.** An agent MUST treat an absent `binding_actions` as if it listed at least one required binding action of unknown type.
- **Unknown type means binding.** `type` is an open string. An agent MUST NOT drop an entry whose type it doesn't recognize, and MUST handle it as a binding action, presenting its `title`, `statement` and `documents`.
- **When required.** A provider that admits standing mandates (RFC 0008) for `submit_application` MUST include `binding_actions` in every `begin_application` response. Every other provider SHOULD include it.
- **Complete.** When present, the list MUST name every binding action the submission would record, however it is recorded: by a screening question, a field, the act of submitting, or the employer's ATS on the provider's behalf. Every screening question and field that records an assent MUST appear in some entry's `question_ids` or `fields`.
- **Unlisted assents are not recorded.** A provider MUST NOT record, forward or represent to an employer any assent that the session's `binding_actions` did not list. Under-listing therefore costs the provider and employer the assent, and never costs the candidate a commitment they didn't see.
- **Fixed for the session.** `binding_actions` and the bytes of every listed document MUST NOT change during the application session. If terms change, the provider ends the session (`session_expired`) and the agent begins again.
- **In-protocol only.** For `email` and `external_redirect` paths the candidate completes the employer's own form. The list covers only what an OJCP submission records.

#### 3.5 Agent obligations

1. An agent MUST NOT answer a question or fill a field that a binding action references, and MUST NOT submit while `binding_actions` is non-empty or absent, unless the candidate has decided **for this application**: on each listed binding action, or, when the list is absent, to proceed without knowing what the submission records. The candidate decides either while present, or through an action mandate (RFC 0003, spec *User Mandates*) for this submission, whose action statement binds the binding-actions digest when the list is non-empty (§3.6). A stored preference such as "always accept arbitration" is not a decision. RFC 0008 adds that a standing mandate never covers a submission whose list is non-empty or absent.
2. Before the candidate decides, the agent MUST present each binding action separately: its `title`, its `statement`, whether it is required, and each document. A document marked `standalone` MUST be shown by itself. The agent MAY add a summary but MUST NOT show a summary instead of the document. It MUST NOT pre-select assent, and declining an optional action MUST be as easy as accepting it. An agent that cannot present a document in its interface (voice, for example) MUST NOT record the assent.
3. The agent SHOULD fetch each document and verify its `digest`. On a mismatch it MUST NOT record the assent and SHOULD begin a new session.
4. An agent that recognizes a question or field as an assent (wording such as "I agree", "I authorize", "I certify") that no entry references MUST treat it as a binding action of unknown type.
5. Declining a required binding action means not submitting.

#### 3.6 Binding the terms

`binding_actions_digest` is `sha256:` followed by the base64url encoding, without padding, of the SHA-256 hash of the JCS serialization ([RFC 8785](https://www.rfc-editor.org/rfc/rfc8785)) of the `binding_actions` array exactly as returned. Every document entry carries its own digest, so this one value binds the exact text of every listed term.

- **Action statement.** The spec's *Action Statement* gains `binding_actions_digest`, REQUIRED for `submit_application` when the session's `binding_actions` is non-empty. The provider reconstructs it from session state; a mismatch fails verification like any other field (`user_mandate_required`). The candidate's answers to the assent questions are already covered by `candidate_data_digest`. When the session's `binding_actions` was absent, the action statement carries no digest, and the provider MUST NOT treat the mandate as evidence of assent to any terms.
- **Submission.** `submit_application` gains an input `binding_actions_digest`. An agent MUST send it whenever the session's list is non-empty. Sending it states that the agent presented the list under §3.5. If the list is non-empty and the input is missing or doesn't match, the provider MUST NOT record any listed assent. When any listed action is `required`, it MUST reject the call with `missing_required_field` and `details.field` `binding_actions_digest`. An agent that never read the list therefore cannot commit a candidate to terms, with or without a mandate.

#### 3.7 Background-check authorizations

For a `background_check_authorization`, the disclosure MUST be its own document with `standalone: true`. Under the statute quoted above, the authorization may appear on that document. Any other notices, such as a summary of rights or state-law notices, are separate documents in the same entry. [15 U.S.C. § 1681b(b)(2)(B)](https://www.law.cornell.edu/uscode/text/15/1681b) provides a different procedure (notice and consent by oral, written or electronic means) only for positions within the Secretary of Transportation's authority under 49 U.S.C. § 31502, or subject to safety regulation by a state transportation agency, and only where the candidate's only interaction with the employer has been by mail, telephone, computer or similar means (§ 1681b(b)(2)(C)). OJCP does not rely on that exception.

OJCP does not decide whether any employer's process complies with the FCRA or any other law, and nothing in this RFC is legal advice. Nor does it decide whether a decision a candidate records through an agent satisfies a legal requirement for a writing or signature; that question belongs to the employer and its counsel. The design aims only to keep the protocol from making a compliant process non-compliant. The disclosure stays a document of its own, the candidate sees it, and the candidate's own decision for that application is what gets recorded.

#### 3.8 Per-submission consent and EEO

Binding actions apply the spec's EEO principle (consent for this specific application, never from a stored profile) to legal assents. They do not replace it.

- **EEO self-identification is not a binding action.** It is a voluntary disclosure, not an assent. Providers MUST NOT list it in `binding_actions` and MUST NOT make it a required screening question; the spec already forbids requiring any EEO field. An empty `binding_actions` says nothing about EEO. The *EEOData* rules apply unchanged, and RFC 0008 adds that a standing mandate never carries `application_data.eeo`.
- **Consent scope is not assent.** `consent_scope` governs which candidate data an agent may send. A `full_profile` scope does not authorize any binding action.

### 4. Schemas

```json
// schemas/job-posting.json — properties (search-jobs.json jobs[].properties identical);
// add CategoryCode to $defs of both
"occupationalCategory": {
  "description": "Occupation of the role. Array form: one to three CategoryCode entries; the first is the primary classification. Absent means unclassified; providers MUST NOT guess. The string form is schema.org's literal: display only, never a classification. See spec § JobPosting.",
  "oneOf": [
    { "type": "array", "items": { "$ref": "#/$defs/CategoryCode" }, "minItems": 1, "maxItems": 3, "uniqueItems": true },
    { "type": "string" }
  ]
}

"CategoryCode": {
  "type": "object",
  "required": ["@type", "codeValue", "inCodeSet"],
  "properties": {
    "@type": { "type": "string", "const": "CategoryCode" },
    "codeValue": { "type": "string", "description": "A code listed in the code set, e.g. 29-1141.00." },
    "inCodeSet": { "type": "string", "format": "uri", "description": "Code set and edition, compared as an exact string. O*NET-SOC 2019: https://www.onetcenter.org/taxonomy/2019/list.html. Ignore entries from unrecognized code sets." },
    "name": { "type": "string", "description": "The code's title in the code set." }
  }
}

// schemas/job-posting.json and search-jobs.json — $defs/Place/properties/address/properties
"addressRegion": { "type": "string", "description": "Subdivision part of the ISO 3166-2 code (IL for US-IL). Requires addressCountry. Non-code values are display only." },
"addressCountry": { "type": "string", "description": "ISO 3166-1 alpha-2, upper case. Non-code values are display only. For remote_policy remote, each Place names where the employee may live and work; a remote job naming no country has an unstated country." }

// schemas/tools/search-jobs-input.json — filters.properties
"occupational_category": {
  "type": "array",
  "items": { "type": "string", "pattern": "^\\d{2}-\\d{4}(\\.\\d{2})?$" },
  "description": "O*NET-SOC 2019 codes or 2018 SOC group codes. Returns only jobs with a code equal to or under one of them."
}

// schemas/responses/begin-application.json — properties
"binding_actions": {
  "type": "array",
  "description": "Every binding action the submission would record. Empty: none. Absent: unknown, treat as binding. REQUIRED for providers that admit standing mandates for submit_application. See spec § begin_application.",
  "items": {
    "type": "object",
    "required": ["id", "type", "title", "statement", "required"],
    "properties": {
      "id": { "type": "string", "minLength": 1 },
      "type": { "type": "string", "minLength": 1, "description": "Standard values: arbitration_agreement, background_check_authorization, truthfulness_attestation, terms_of_service, contact_consent, data_use_consent, employment_terms, other. Open: an unrecognized value MUST be treated as binding." },
      "title": { "type": "string" },
      "statement": { "type": "string" },
      "required": { "type": "boolean" },
      "question_ids": { "type": "array", "items": { "type": "string" } },
      "fields": { "type": "array", "items": { "type": "string" } },
      "documents": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["uri", "digest", "media_type"],
          "properties": {
            "uri": { "type": "string", "format": "uri", "pattern": "^https://" },
            "digest": { "type": "string", "pattern": "^sha256:[A-Za-z0-9_-]{43}$" },
            "media_type": { "type": "string" },
            "title": { "type": "string" },
            "standalone": { "type": "boolean", "default": false }
          }
        }
      }
    }
  }
}

// schemas/tools/submit-application-input.json — properties
"binding_actions_digest": {
  "type": "string",
  "pattern": "^sha256:[A-Za-z0-9_-]{43}$",
  "description": "Digest of the session's binding_actions (JCS, SHA-256). REQUIRED when that list is non-empty."
}
```

### 5. Examples

A `begin_application` response excerpt for a hospital whose form records three binding actions. Document digests are illustrative. `binding_actions_digest` is computed over the array exactly as shown.

```json
{
  "application_id": "app_7Qm2",
  "status": "pending_submission",
  "mandate_nonce": "mn_E4b4-7LpLJEvm78r",
  "screening_questions": [
    { "question_id": "q_license", "question_text": "Do you hold an active Illinois RN license?", "answer_type": "boolean", "required": true },
    { "question_id": "q_bg", "question_text": "I have read the Background Check Disclosure and I authorize Acme Health to obtain a consumer report about me for employment purposes.", "answer_type": "boolean", "required": true },
    { "question_id": "q_arb", "question_text": "I agree to the Mutual Arbitration Agreement.", "answer_type": "boolean", "required": true }
  ],
  "binding_actions": [
    {
      "id": "ba_bg",
      "type": "background_check_authorization",
      "title": "Background Check Disclosure and Authorization",
      "statement": "I have read the Background Check Disclosure and I authorize Acme Health to obtain a consumer report about me for employment purposes.",
      "required": true,
      "question_ids": ["q_bg"],
      "documents": [
        {
          "uri": "https://careers.acmehealth.example/legal/bg-disclosure-2026-07.pdf",
          "digest": "sha256:Fej-qZwIbXVKKFjV0Qs7_Th828noSPRa94DGdSJQ1co",
          "media_type": "application/pdf",
          "title": "Background Check Disclosure",
          "standalone": true
        }
      ]
    },
    {
      "id": "ba_arb",
      "type": "arbitration_agreement",
      "title": "Mutual Arbitration Agreement",
      "statement": "I agree to the Mutual Arbitration Agreement.",
      "required": true,
      "question_ids": ["q_arb"],
      "documents": [
        {
          "uri": "https://careers.acmehealth.example/legal/arbitration-2026-01.html",
          "digest": "sha256:5J9XEMjT5mgh8ODuHD7VdN8_C0jiplxMNXtlT6EO9AI",
          "media_type": "text/html",
          "title": "Mutual Arbitration Agreement"
        }
      ]
    },
    {
      "id": "ba_cert",
      "type": "truthfulness_attestation",
      "title": "Certification of application",
      "statement": "I certify that the information in this application is true and complete. I understand that false or misleading information may result in rejection or dismissal.",
      "required": true
    }
  ]
}
```

`q_license` asks for information and references no binding action. `ba_cert` is recorded by the act of submitting. The candidate decides; the agent then sends, alongside the answers:

```json
"binding_actions_digest": "sha256:fEx0fEYNnGzsDSJVN1-eBRyxeJHQ3on7FwmqbW-llJg"
```

and, when it acts under an action mandate, adds the same value to the action statement:

```json
{
  "resource_server": "https://careers.acmehealth.example",
  "tool": "submit_application",
  "job_id": "careers.acmehealth.example:rn-4471",
  "application_id": "app_7Qm2",
  "agent_id": "ai.northstar.assistant",
  "agent_key_thumbprint": "tKwHslziExQ7dQgDX2HX8q9EuvAYmS_A3SKfjNHpdX8",
  "candidate_data_digest": "sha256:E4b4-7LpLJEvm78rXpXW_zvMCALvYhuP-MtvsLcdxsQ",
  "mandate_nonce": "mn_E4b4-7LpLJEvm78r",
  "binding_actions_digest": "sha256:fEx0fEYNnGzsDSJVN1-eBRyxeJHQ3on7FwmqbW-llJg"
}
```

A form that records nothing returns `"binding_actions": []`. Within RFC 0008's other limits, that submission can proceed under a standing mandate.

## Security and privacy considerations

- **Failing closed.** An absent list, an unknown type, and an assent the agent recognizes but the list omits are all treated as binding. A provider cannot make a commitment disappear by leaving a field out.
- **Under-listing.** An agent cannot see assents hidden in the employer's back end. The rule that unlisted assents are not recorded, and the conformance fixtures below, put that risk on the party that controls the form. The trade-off is deliberate: an employer that under-lists loses an assent it could have obtained, rather than the candidate gaining a commitment they never saw.
- **Over-listing.** A provider that lists trivial items stops autonomous applications to its jobs. That is the conservative failure, and it is visible to the employer.
- **Silent 0.3 agents.** An agent that predates this RFC doesn't send `binding_actions_digest`, so a provider records none of its listed assents and rejects the submission when any of them is required (§3.6). Old agents fail loudly on flows with legal terms instead of agreeing on the candidate's behalf.
- **Document substitution.** Each document digest is fixed for the session and bound by `binding_actions_digest`, so terms cannot be swapped between presentation and submission.
- **Classification as a lever.** A distributor that wants a posting inside more scopes could add codes or pick a residual one. Mitigations: at most three codes, the primary-only rule for scope checks, the residual-code rule, and the "never as a lever" rule. RFC 0012's signatures make the code attributable to the party that published it.
- **Privacy.** Occupation codes and location codes describe jobs, not candidates. An occupation filter reveals no more about a candidate's interests than the query text already does. Fetching a binding-action document tells its host that someone is applying, which is why documents should be served by the provider or the employer.

## Affected areas

Specification:

- **JobPosting**: add `occupationalCategory` (§1.1) and the classification rules (§1.2); add the location-code rules and remote rule (§2); replace the multi-location example's `addressLocality: "Remote"` entries with country-only Places.
- **`search_jobs`**: add `filters.occupational_category` (§1.3); state the code format of `location.country` and `location.state`; add `occupationalCategory` to the response's job summary.
- **`get_job_detail`**: no text change; it returns JobPosting.
- **`begin_application`**: add `binding_actions` to the response and its semantics (§3.2–§3.5, §3.7).
- **`submit_application`**: add the `binding_actions_digest` input and the provider rule (§3.6); note that answers referenced by a binding action follow §3.5.
- **Action Statement**: add the `binding_actions_digest` row (§3.6).
- **EEOData**: add that EEO self-identification is not a binding action and is never listed as one (§3.8).
- **Conforming Agent**: add "treat an absent `binding_actions`, and any unrecognized binding-action type, as binding".
- **Interoperability**: the schema.org row notes `occupationalCategory` with `CategoryCode`; add an ISO 3166 row.

Schemas: `schemas/job-posting.json`, `schemas/responses/search-jobs.json`, `schemas/tools/search-jobs-input.json`, `schemas/responses/begin-application.json`, `schemas/tools/submit-application-input.json`. `schemas/responses/job-detail.json` inherits the change through its `$ref`.

Examples: `examples/job-posting.json` and `examples/responses/search-response.json` (country codes, remote locations, an `occupationalCategory`).

Conformance suite ([ojcp-org/conformance](https://github.com/ojcp-org/conformance)), new fixtures:

- a provider that admits standing mandates and omits `binding_actions` (fails);
- a flow with an FCRA authorization question not referenced by any entry (fails);
- a document whose bytes don't match its digest;
- a submission without `binding_actions_digest` against a non-empty list (provider must reject when an action is required, and must not record any assent);
- an agent that answers a referenced question without a decision (fails);
- an agent that drops an unknown `type` (fails);
- a posting with a string `occupationalCategory` used as a classification (fails);
- a remote job with no country treated as open everywhere (fails).

## Alternatives considered

- **Flag screening questions instead of listing actions.** Rejected as the sole mechanism. Assents also arrive through fields and through the act of submitting, and only a list can be bound as a whole by one digest. The list links to questions through `question_ids`.
- **An optional signal.** Rejected, because it fails open: absence would look like "none".
- **Inline document text.** Rejected. Legal documents are long and often HTML or PDF. A URI with a digest gives the same integrity without bloating every response.
- **ISCO-08 as the code set.** schema.org names both O\*NET-SOC and [ISCO-08](https://www.ilo.org/public/english/bureau/stat/isco/isco08/). O\*NET-SOC is published under CC BY 4.0, and it is the taxonomy schema.org's literal form already assumes. ISCO-08 can be added as a second code set later (Open question 2).
- **Allow SOC group codes in postings.** Rejected for now. One list to validate against and one comparison rule keep scope checks simple. Groups remain available for filtering (§1.3).
- **schema.org `applicantLocationRequirements` for remote areas.** Rejected. It adds a second location list, and the examples in [Google's published guidance](https://developers.google.com/search/docs/appearance/structured-data/job-posting) give it country names (`"USA"`), not codes. OJCP's existing example already expresses remote areas through `jobLocation`.
- **Full ISO 3166-2 codes in `addressRegion` (`US-IL`).** Self-describing, but existing postings in the common form, including the spec's own example and Google's published examples (`"MI"`), would become non-conformant. The subdivision part plus the required country carries the same information.

## Breaking changes

- **Closed enums.** All new members are additive, and schemas permit unknown properties, so a 0.3 validator accepts the new fields. A validator pinned to the 0.3 schemas still rejects any `ojcp_version` value outside its `["0.1", "0.2", "0.3"]` enum. That is a property of the version that adopts this RFC, not of these fields. `binding_actions[].type` is deliberately an open string so that adding a type later breaks no validator. Agents that hard-code the vocabulary stay safe because unknown types are binding.
- **Location values.** No schema pattern is added. Providers that emit country names or alpha-3 codes stop being conformant and must switch to alpha-2. Consumers that matched on names lose those matches, because non-code values count as unstated. Agents that read `addressLocality: "Remote"` as meaningful must use `remote_policy`.
- **`occupationalCategory` form.** Consumers that expect only an array must accept the string form and treat it as display text.
- **Submissions from older agents.** On flows with a non-empty `binding_actions` and a required action, providers reject submissions that lack `binding_actions_digest`. Agents that predate this RFC can't apply through those flows until they are updated. This is intended (see Security and privacy considerations).
- **Providers that admit standing mandates** must return `binding_actions` on every `begin_application`. Standing mandates are new in RFC 0008, so no existing deployment is affected.

## Open questions

1. Should postings be allowed to carry SOC group codes when the detailed occupation is uncertain, instead of omitting the field?
2. Should ISCO-08 (or ESCO) be defined as a second code set for postings outside the United States, and how does a consumer choose between them?
3. How should a posting express "remote, any country", and, for `flexible` jobs, which `jobLocation` entries are workplaces and which are remote areas?
4. Should providers disclose how a code was assigned (employer, mapping, automated coder), so consumers can weigh it?
5. Should the agent return a record of how each binding action was presented (which documents were shown, and when), for the employer's files?
6. How are new binding-action types added: by RFC only, or through a registry the steering committee maintains?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, and holds Seat 1 on the steering committee. Occupation codes make jobs easier for agents to find and filter, which may increase applications. The binding-action rules restrict when an application can be submitted without the candidate. The author invites co-sponsors, particularly from employer, ATS and candidate-side seats, and will recuse from the resolution vote under the Conflict of Interest rules in GOVERNANCE.md.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes:

Resolution:

Decision record:
