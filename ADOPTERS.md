# OJCP Adopters

This file tracks organizations that have adopted, are implementing, or are evaluating the Open Job Context Protocol.

If your organization is using OJCP at any tier, please open a PR to add yourself. We accept additions in good faith — no formal verification is required, but please only list your own organization.

## Tiers

- **Steering Member** — Holds a seat on the OJCP Steering Committee (see [GOVERNANCE.md](GOVERNANCE.md))
- **Implementing** — Has shipped or is actively building an OJCP-compliant provider, agent, or tool
- **Evaluating** — Has reviewed the spec and is assessing it for adoption

---

## Steering Members

| Organization | Seat | Representative |
|--------------|------|----------------|
| Recruitics | 1 (specification author) | Austin Anderson |
| Hiring.cafe | 2 | Hamed Nilforoshan |
| CrossCountry Healthcare | 3 | Bryan Hughes |
| Workday | 4 | David Stevens |
| aiApply | 5 | Peter Utekal |
| scale.jobs | 6 | Balaji Kummari |
| Tink | 7 | Tom Chevalier |
| LoopCV | 8 | Lucas Simopoulos |
| Invited expert (WebMCP co-creator) | 9 | Andrew Nolan |

The authoritative seat table, terms, and nomination process are in [GOVERNANCE.md](GOVERNANCE.md).

## Implementing

| Organization | Implementation | Status | Since |
|--------------|----------------|--------|-------|
| Recruitics | Reference provider at https://ojcp.dev | Live | 2026-02 |
| FoundRole | Anonymous read-only provider at https://www.foundrole.com/ojcp/mcp | Live | 2026-08 |
| freehire | Anonymous read provider over REST and MCP at https://freehire.me/.well-known/ojcp.json | Live | 2026-09 |
| _Add yours via PR_ | | | |

## Evaluating

| Organization | Notes | Contact (optional) | Since |
|--------------|-------|--------------------|-------|
| reqspace.ai | AI recruiting and job seeker platform. Evaluating a provider manifest over customer career pages, and AgentDeclaration for our candidate-side auto-apply agent. | mike@reqspace.ai | 2026-09 |
| _Add yours via PR_ | | | |

---

## How to add your organization

1. Fork this repository
2. Add your organization to the appropriate tier
3. Open a PR titled `Add <Organization> as <tier> adopter`
4. We aim to merge within one week

You can move between tiers as your engagement deepens. Removing yourself is also welcome at any time — just open a PR.

## Why list publicly?

Public adopter lists are how open standards build credibility. A signed-off `ADOPTERS.md` entry is a low-commitment way to signal interest, encourage other adopters, and help the steering committee understand the ecosystem.
