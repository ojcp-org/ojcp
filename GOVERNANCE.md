# OJCP Governance

## Mission

The Open Job Context Protocol (OJCP) exists to create a vendor-neutral, openly-governed standard for agent-consumable job data. No single company owns or controls the specification.

OJCP is a community standard. Its long-term value depends on broad adoption across the ecosystem — job boards, ATS vendors, agent developers, and employers — and that adoption is only possible if no single party can unilaterally change the spec to its advantage.

## Steering Committee

The OJCP Steering Committee is the body responsible for ratifying spec changes, accepting new conformance criteria, and stewarding the long-term direction of the protocol.

The committee is composed of **nine (9) founding seats**. Seats are not assigned to fixed ecosystem categories — the committee represents the OJCP ecosystem as a whole, not specific market segments. All initial seat-holders are designated **founding contributors** of OJCP and share equal authority and equal responsibility for the protocol's trajectory.

| Seat | Current Holder |
|------|----------------|
| 1 | Austin Anderson, Recruitics (specification author) |
| 2 | Hamed Nilforoshan, Hiring.cafe |
| 3 | Bryan Hughes, CrossCountry Healthcare |
| 4 | David Stevens, Workday |
| 5 | Peter Utekal, aiApply |
| 6 | Balaji Kummari, scale.jobs |
| 7 | Tom Chevalier, Tink |
| 8 | Lucas Simopoulos, LoopCV |
| 9 | _Invited — confirmation pending_ |

**Note on committee size.** The founding committee was sized at seven seats and is
seated here at nine. This is initial seating during the bootstrap period, not an
expansion of an already-seated committee: no seats had been publicly ratified prior
to this table being published, so the RFC-and-supermajority process under "Adding
seats" — which governs expansion of a *seated* committee — does not apply
retroactively. Nine preserves the odd-number requirement and remains below the
eleven-seat cap. Any expansion beyond nine follows the documented process.

_Seat table last reviewed: 2026-07-28. Seat-holders are listed only once they have
confirmed public listing; organizations that have contributed requirements and
feedback without holding a seat are listed as contributors on ojcp.dev._

**Diversity constraint:** The committee SHOULD reflect the breadth of the OJCP ecosystem — ATS vendors, job boards, auto-apply tools, agent platforms, staffing agencies, and independents. No more than two seats may be held by organizations in the same market segment. This is enforced during nomination review, not by pre-assigning categories to seats.

The Recruitics seat is held because Austin Anderson authored the v0.1 specification. It carries no additional authority beyond any other seat.

**Bootstrap-period note on composition:** During the initial seating, the founding contributor SHOULD prioritize ecosystem diversity when selecting seat-holders — ensuring representation across ATS vendors, job boards, auto-apply / candidate-side tools, agent platforms, and independent voices. This guidance is non-binding once the committee reaches steady state; at that point the seated members collectively decide what composition best serves the protocol.

**Bootstrap-period rule:** Until a majority of seats (5 of 9) are filled by ratified appointees, all spec-affecting decisions require a public RFC with a minimum 30-day comment window and resolution by the seated members with documented rationale. Every decision made in this period is recorded in `docs/decisions/` and may be revisited once the committee is fully seated.

**Target seating date:** All seats will be opened for nomination by **2026-05-01**, with confirmed appointees by **2026-06-01**. If this timeline slips, the slip is publicly acknowledged in this document.

### How seats are filled

**Bootstrap period (initial seating, seats 2–7):**

1. Nominations are submitted via GitHub issue using the [`nomination` template](.github/ISSUE_TEMPLATE/nomination.md). Self-nominations are welcome; Recruitics may also directly invite candidates, who then file the nomination as a self-nomination noting that they were invited.
2. A 30-day public comment period follows each nomination.
3. **Recruitics selects** the founding holder for each seat from the publicly-nominated candidates, with selection rationale documented in `docs/decisions/`.
4. Appointments are for **two-year terms, renewable indefinitely**. Each renewal requires re-confirmation: a public 30-day comment window followed by a simple-majority vote of the other eight seated members. The Recruitics seat is renewable on the same terms — there is no permanent status for any seat.
5. No two seats may be held by the same company simultaneously.

This bootstrap authority is **scoped solely to seating the initial committee** — it does not extend to spec-affecting decisions, which still follow the RFC process throughout the bootstrap period.

**Steady state (after all 9 seats are filled):**

1. Nominations are submitted via GitHub issue using the [`nomination` template](.github/ISSUE_TEMPLATE/nomination.md).
2. A 30-day public comment period follows each nomination.
3. **Existing committee members vote** (simple majority). Recruitics no longer holds selection authority — its seat is one vote among nine.
4. Appointments are for **two-year terms, renewable indefinitely**. Each renewal requires re-confirmation: a public 30-day comment window followed by a simple-majority vote of the other eight seated members. The Recruitics seat is renewable on the same terms — there is no permanent status for any seat.
5. No two seats may be held by the same company simultaneously.

### Removal

A seat may be vacated by:
- **Voluntary resignation.**
- **Sustained inactivity.** No recorded contributions or votes for 90 consecutive days, *and* the member has been notified in writing at least 14 days before vacancy is declared, *and* has not provided notice of legitimate absence (medical leave, sabbatical, etc.). Members may pre-declare planned absences of any length without penalty.
- **Vote of the remaining committee.** Supermajority — 80% of remaining seated members, rounded up — with a hard floor of **at least 3 affirmative votes**. This floor prevents single-member or two-member removals during the bootstrap period when seats are sparse. Removal votes require a 14-day discussion period before the vote opens, and the member subject to removal must be given an opportunity to respond.

### Expanding the committee

The committee may expand beyond the founding 9 seats as the ecosystem matures. Expansion is bounded and deliberate:

- **Maximum size:** 11 seats. The committee must remain an odd number to avoid deadlock. Beyond 11, governance overhead outweighs representational benefit; if more voices are needed, it's a signal to form working groups (see below) rather than enlarge the committee.
- **When to expand:** A new seat may be proposed when a distinct ecosystem segment is materially underrepresented and at least one organization in that segment is actively contributing to OJCP. Examples that *could* warrant a new seat in the future: regulators or labor-market policy bodies, candidate-rights / privacy advocacy, identity verifier providers, or a regional / non-US perspective.
- **Process:**
  1. Any committee member opens an RFC proposing the new seat, naming the ecosystem role it represents and why existing seats don't cover it.
  2. 60-day public comment period.
  3. Supermajority vote of the existing committee (80%, rounded up — e.g., 8 of 9).
  4. If approved, the new seat opens for nominations following the steady-state process above.

### Working groups

For deep work that doesn't require steering-committee-level authority — conformance test development, language-specific reference implementations, sector-specific extensions (healthcare staffing, gig economy, etc.) — the committee may charter **working groups**. Working groups are open to any contributor, run their own meetings, and report back to the committee. Working groups make recommendations; the committee ratifies. This keeps the committee small and decisive while letting participation scale.

## Decision-Making

### RFC process

All substantive changes to the spec follow the RFC process documented in [CONTRIBUTING.md](CONTRIBUTING.md#proposing-changes-rfc-process).

Substantive changes include:
- Tool definitions (additions, removals, signature changes)
- Core schema changes (`JobPosting`, `CandidateContext`, `AgentDeclaration`, etc.)
- New apply path types
- Manifest format changes
- Security / privacy model changes
- Conformance test changes

Non-substantive changes (typos, examples, doc clarifications) do not require an RFC and may be merged by any maintainer.

### Voting

- **Lazy consensus** is the default. After the comment window closes, if no committee member has objected, the change is accepted.
- If objections exist, the committee votes. **Simple majority** of votes cast carries, subject to quorum.
- **Quorum** is a majority of seated members (e.g., 5 of 9 when fully seated; 2 of 3 during early bootstrap). Votes that fail to meet quorum are re-opened for an additional 14 days.
- No seat has veto power. Each seat is one vote among nine (or however many seats are seated).
- Tie votes (possible when an even number of seats vote) are resolved by deferring the decision and re-opening for additional public comment.

### Maintainers

A **maintainer** is a contributor with merge access to the OJCP repository. Maintainers handle day-to-day operations: triaging issues, reviewing pull requests, merging non-substantive changes, and coordinating releases.

- Initial maintainers are appointed by the steering committee. The bootstrap-period maintainer is Austin Anderson.
- New maintainers are nominated by an existing maintainer or steering committee member, and confirmed by simple-majority vote of the steering committee.
- Maintainer status is independent of steering committee seats — a maintainer is not necessarily a committee member, and vice versa.
- Maintainers may merge non-substantive changes (typos, examples, doc clarifications) directly. Substantive changes still require the RFC process.
- Maintainer status may be removed by simple-majority steering committee vote, with the same notification and discussion requirements as seat removal.

### Conflict of Interest

Disclosed conflicts (per the [nomination template](.github/ISSUE_TEMPLATE/nomination.md)) are not automatic disqualifiers, but they are operationally binding:

- A committee member with a direct commercial conflict on a specific RFC (e.g., the RFC affects a product their employer sells) MUST recuse themselves from the vote on that RFC. Recusal is recorded publicly.
- Recusal does not reduce the quorum — the quorum threshold continues to be calculated against total seated members, not voting members. If recusals make a vote impossible to pass, the RFC is deferred and the conflict is escalated for committee discussion.
- Members who fail to disclose a material conflict and are later found to have one are subject to the standard removal process.
- The steering committee may require additional disclosures from time to time as new conflict categories emerge.

## Intellectual Property

| Asset | License |
|-------|---------|
| Specification (`spec/`, `schemas/`, `examples/`) | CC BY 4.0 |
| Reference implementations and tooling | Apache License 2.0 |
| Logos and trademarks | Reserved by the OJCP project; usage guidelines TBD |

All contributions are accepted under the [Developer Certificate of Origin (DCO)](CONTRIBUTING.md#developer-certificate-of-origin-dco). No copyright assignment to Recruitics or any other party is required or accepted.

### Patent Policy

OJCP uses a **tiered, opt-in patent model** modeled on the [W3C Patent Policy](https://www.w3.org/Consortium/Patent-Policy/). Patent commitments scale with the level of participation, and contributors may participate in their **individual capacity** without binding an employer.

**Code and tooling (Apache License 2.0).** Patent rights for code contributions are granted by the [Apache 2.0 patent clause](https://www.apache.org/licenses/LICENSE-2.0#patent) itself. No additional commitment is required for code contributions beyond the standard Apache 2.0 grant.

**Specification, schemas, and examples (CC BY 4.0).** Spec contributions are tiered:

| Contribution type | Patent commitment |
|-------------------|-------------------|
| Editorial fixes (typos, formatting, link repair, example clarifications) | None — DCO sign-off is sufficient |
| Schema additions, normative text changes, RFC sponsorship | Non-assertion covenant for the contributed material, scoped to the contributor's personal patent claims |
| Steering committee membership | Non-assertion covenant for the OJCP-related claims the member personally owns. A member MAY serve in **individual capacity** (personal claims only) or, with employer sign-off, extend the covenant to their employer's OJCP-related claims. Employer sign-off is encouraged but **not required** to hold a seat. |

**Non-assertion covenant.** When a covenant applies, the contributor agrees not to assert patent claims that are *necessarily infringed* by a conformant implementation of the *specific material they contributed*. The covenant:

- Is scoped to the contributed material, not the entire specification
- Runs with the contribution and binds the contributor's successors-in-interest
- Does not bind unrelated third parties or claims arising from material the contributor did not author
- Aligns with the [W3C Royalty-Free patent commitment](https://www.w3.org/Consortium/Patent-Policy/#sec-Requirements) for working-group participants

**Individual capacity.** Contributors may declare in their PR or nomination that they are participating in **individual capacity** rather than on behalf of an employer. Individual-capacity contributions:

- Bind only the contributor's personal patent claims
- Do not require employer sign-off
- Are still accepted under DCO and the relevant license

This is the **invited expert** path. It exists so that contributors whose employers have not signed off (or whose employers are not OJCP participants) can still meaningfully contribute — and hold a steering committee seat — without legal exposure beyond their own personal IP.

**Disclosure.** Contributors who become aware of a patent claim — their own, their employer's, or a third party's — that is necessarily infringed by a contribution they are submitting MUST disclose it in the PR. The committee then evaluates whether to proceed, modify the contribution to avoid the claim, or decline the contribution.

**Patent retaliation.** Any party that asserts a patent claim against a conformant OJCP implementation forfeits any patent rights they hold under the OJCP non-assertion covenants for the duration of that assertion. This mirrors the patent retaliation clause in Apache 2.0.

A formal patent policy document, modeled on the W3C Patent Policy and informed by community feedback, will be drafted before v1.0. The above is the bootstrap-period commitment and is binding during this period.

## Recruitics's Role

Recruitics employs the author of the v0.1 specification (Austin Anderson) and operates the reference implementation at https://ojcp.dev. To be explicit about what this means and what it does not:

**Recruitics contributes:**
- The initial specification draft (v0.1), authored by Austin Anderson
- The reference implementation and demo provider at https://ojcp.dev
- One steering committee seat — equal to every other seat
- Operational support during the bootstrap period: hosting the spec site, maintaining CI/CD, triaging issues

**Recruitics does NOT have:**
- Veto power over spec changes
- Special licensing terms or proprietary extensions
- Any ownership interest in the OJCP trademark or specification beyond what any other contributor has
- The ability to relicense the spec or change governance unilaterally
- Privileged review access or pre-publication preview rights

### Relationship to the Open Agent Jobs Initiative (OAJI)

The **Open Agent Jobs Initiative (OAJI)** is a related but distinct industry coalition that supports the adoption of open standards for agent-accessible job data. OJCP is the first such standard.

**What OAJI does:**
- Coordinates adoption across enterprise employers, ATS vendors, job boards, staffing agencies, and AI agent platforms
- Hosts business-side discussions, events, and outreach
- Publishes adopter case studies and ecosystem reports
- Operates the marketing surface at https://ojcp.dev

**What OAJI does NOT do (during the bootstrap period):**
- Govern the OJCP specification (the steering committee defined in this document does that)
- Hold authority over RFC acceptance, seat selection, or technical roadmap
- Set OJCP's IP terms or override its governance

OAJI was founded by Recruitics and is currently operated by Recruitics. Like OJCP, it is in an early phase. OAJI may itself evolve into the neutral fiscal entity that hosts OJCP infrastructure (per the Infrastructure Succession plan below), or that role may go to an established foundation — that decision is part of the pre-v1.0 succession process and is not predetermined.

Until that decision is made, **OJCP governance is independent of OAJI**. The two share founders and a website, but the OJCP steering committee answers to its own bylaws (this document), not to OAJI.

### Infrastructure Succession

A standard governed by one company is only as durable as that company. To address this:

**Bootstrap period — current state.** Recruitics hosts and operates:
- The GitHub repository (`github.com/ojcp-org/ojcp`)
- The rendered specification at `https://spec.ojcp.dev/`
- The reference implementation at `https://ojcp.dev/`
- Project email aliases (`ojcp-discuss@recruitics.com`, `ojcp-steering@recruitics.com`, `ojcp-conduct@recruitics.com`)

**Commitment to transferability.** All OJCP infrastructure is operated under terms that permit transfer to a neutral entity. Specifically:
- Domain names (`ojcp.dev`, `spec.ojcp.dev`) are registered such that they can be transferred to a successor entity at any time by steering committee resolution.
- The repository content is mirrored publicly and may be forked by any party at any time under its existing licenses.
- Email aliases will be redirected to a successor entity within 30 days of a transfer resolution.

**Triggering succession.** A transfer of operational control may be initiated by:
- A unanimous vote of the steering committee (excluding the Recruitics seat for this specific vote, to remove conflict of interest), OR
- A formal notification from Recruitics that it can no longer host the project (e.g., dissolution, acquisition with incompatible terms, business pivot).

**Succession candidates.** The steering committee is responsible for identifying and ratifying a successor entity if needed. Likely candidates include established neutral foundations (e.g., the Linux Foundation, OpenJS Foundation, Apache Software Foundation, or a purpose-formed nonprofit). The committee SHOULD evaluate at least three candidate hosts before ratifying.

**Pre-v1.0 commitment.** Before declaring v1.0, the steering committee will either: (a) execute a transfer to a neutral entity, or (b) document a binding succession agreement with at least one candidate entity that takes effect automatically if Recruitics ceases to host. This is a hard prerequisite for the v1.0 stamp.

## Amendments to This Document

Changes to `GOVERNANCE.md` itself require:
- A 60-day public comment period (longer than the standard RFC window)
- A supermajority vote (80%, rounded up) of the steering committee, OR — during the bootstrap period — sign-off from all currently-seated members plus a documented public-comment summary

**Bootstrap-period guardrail.** While the steering committee is being seated, governance amendments are constrained to: (a) error corrections (typos, broken links, mathematical inconsistencies), (b) clarifications that do not change the substantive meaning of any rule, or (c) changes that have been publicly proposed and not objected to during the 60-day window. Substantive policy changes that *expand* Recruitics's authority — including but not limited to: extending the bootstrap period, adding selection authority over additional seats, or changing the IP regime — are explicitly out of scope until the committee reaches at least 5 of 9 seated members.

This higher bar is intentional. Governance should be stable and predictable.

## Document Versioning

This document is versioned alongside the specification. Material changes are recorded in `CHANGELOG.md` with a date and reference to the resolving RFC or decision record. The version of `GOVERNANCE.md` in effect at the time of any committee decision is the version committed to the default branch as of that decision's date — verifiable via `git log GOVERNANCE.md`.

## Contact

- **Discussion:** GitHub issues on this repository
- **Email:** ojcp-discuss@recruitics.com
- **Steering committee inquiries:** ojcp-steering@recruitics.com
