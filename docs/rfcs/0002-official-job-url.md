---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Add `url` and `official_job_url` to `job-posting.json` to prevent recruitment fraud and establish trust anchors

- **Author:** [Radu Stoian, Technical Director at Enhance Media](https://www.linkedin.com/in/radustoian/)
- **Status:** Draft
- **Created:** 2026-08-12
- **Resolves:** [Issue #7](https://github.com/ojcp-org/ojcp/issues/7)

## Motivation

The current OJCP protocol focuses heavily on an agentic pipeline, shifting away from standard destination links to direct API submission endpoints via `apply_paths`. However, as recruitment scams and AI-generated phishing listings rise, candidates are losing their primary safety workflow: cross-referencing an agent-found vacancy against the employer's official careers site or Applicant Tracking System (ATS). 

Furthermore, if a direct API endpoint encounters an error, the agent currently has no fallback web resource to hand off to the candidate. Some ATS architectures explicitly struggle with direct API routing. For example, SAP SuccessFactors separates its ATS into RMK (marketing) and RCM (management) modules. The RCM REST API lacks native `job_url` and `apply_url` fields, forcing developers to hack URLs using `jobReqId` or rely on redirect parameters (e.g., `&tcsource=apply`) across different domains. 

By defining explicit URL properties, we require the ATS, job board, or employer to provide definitive public landing pages upfront. This bypasses the complexity of fragmented backend routing and provides candidates with a direct, verifiable fallback.

## Proposal

We propose adding two optional string properties to `schemas/job-posting.json` to handle web fallbacks and establish trust anchors. 

1. **Dual URL Strategy:**
   * **`url` (New field inherited from schema.org/JobPosting):** Retained for broad use. This property should be used to provide a general web link to the job posting. It can point to an aggregator, a third-party job board, or any other listing representing the job.
   * **`official_job_url` (New Field):** A dedicated, unambiguous string property constrained to `format: uri`. This serves exclusively as the definitive canonical source hosted on the employer's official careers site or primary ATS.

2. **Schema Definition for `job-posting.json`:**
   ```json
   "url": {
     "type": "string",
     "format": "uri",
     "description": "A general web URL for the job posting. May point to third-party boards or aggregators."
   },
   "official_job_url": {
     "type": "string",
     "format": "uri",
     "description": "The canonical public web URL of the job description page on the employer's official careers site or ATS. Used as a trust and verification anchor for candidates."
   }

3. **Cryptographic Trust Anchor (RFC 0001 Integration):**
   A bare URL is spoofable on its own. To establish a genuine trust anchor, official_job_url should leverage the origin-binding model introduced in RFC 0001 (Verifiable Agent Identity).
   When an agent recives a job posting, the provider SHOULD verify that the registrable domain of the official_job_url matches (or is a trusted affiliate of) the verified domain established by the provider's HTTP Message Signature (Signature-Agent).
   This ties the canonical URL to the verified domain, transforming a plain link into a cryptographically backed trust anchor that proves the job legitimately originates from the claimed employer.

4. **Affected areas**

- [ ] Tool definitions (request signing applies across all tools)
- [x] Core schemas (`AgentDeclaration` gains `agent_id` binding + optional `user_mandate`)
- [ ] Apply path types
- [ ] Manifest format (`auth.agent_signatures` block)
- [ ] Identity verification (agent + user-authorization identity, composing with candidate identity)
- [x] Security / privacy model (signature, replay, downgrade, origin-binding, delegation, disclosure)
- [ ] Other:

5. **Alternatives considered**

- Relying solely on the schema.org url field: Rejected.
Job boards and third-party aggregators often inject their own URLs into the url property.
We need a dedicated official_job_url field that explicitly guarantees the canonical employer source to establish a proper trust anchor.

- No fallback URL (Status Quo): Rejected. 
Leaving agents with only direct API endpoints creates a single point of failure (if the API errors out) and removes the candidate's ability to manually verify the legitimacy of a listing, increasing exposure to recruitment fraud.

6. **Breaking changes**

None. The addition of both url and official_job_url is strictly optional and additive.

Existing v0.1 providers and consumers will safely ignore the new properties if they do not yet support them.


7. **For maintainers — comment period and resolution**

Comment period opens: 2026-08-13

Comment period closes: 2026-09-13 (30 days)

Resolution:

Decision record:
