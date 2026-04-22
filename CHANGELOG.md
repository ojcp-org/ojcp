# Changelog

All notable changes to the OJCP specification and governance will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `GOVERNANCE.md` — steering committee structure (7 founding seats), bootstrap period, decision-making, conflict-of-interest policy, patent non-assertion covenant, infrastructure succession plan
- `CODE_OF_CONDUCT.md` — adopts Contributor Covenant 2.1; bootstrap-period dual-review enforcement
- `ADOPTERS.md` — public list of adopters across Steering Members / Implementing / Evaluating tiers
- `.github/ISSUE_TEMPLATE/nomination.md` — steering committee nomination template
- `docs/decisions/` — Architecture Decision Record (ADR) directory with template

### Changed

- `CONTRIBUTING.md` — DCO sign-off now distinguishes between CC BY 4.0 (spec/schemas/examples/docs) and Apache 2.0 (code/tooling/CI) contributions
- `CONTRIBUTING.md` — corrected GitHub→GitHub and Pull Request→Pull Request terminology
- `.github/ISSUE_TEMPLATE/rfc-proposal.md` — added comment-period and resolution tracking fields

## [0.1] - 2026-03-06

### Added

- Initial draft specification
- Job Manifest (`/.well-known/ojcp.json`) format
- Core MCP-compatible tools: `search_jobs`, `get_job_detail`, `get_employer_context`, `begin_application`, `check_application_status`
- Data schemas: JobPosting (extends schema.org), CandidateContext, AgentDeclaration
- Apply path taxonomy: `ats_direct`, `provider_hosted`, `platform_native`, `email`, `external_redirect`
- WebMCP integration pattern
- Two-layer feed discovery model (well-known manifest + OJCP Registry)
- Security and privacy considerations
- JSON Schemas for all core data types
- Example manifest, job posting, and search response
