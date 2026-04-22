# Decision Records

This directory holds Architecture Decision Records (ADRs) for OJCP — durable, dated explanations of decisions that shape the protocol.

## When to add a record

During the **bootstrap period** (per [GOVERNANCE.md](../../GOVERNANCE.md)), every spec-affecting decision must be documented here with rationale. This is the public audit trail for decisions made before the steering committee is fully seated.

After the bootstrap period, decision records are still encouraged for:

- Trade-offs between competing valid approaches
- Decisions that future contributors might reasonably question
- Anything that wasn't obvious in hindsight

## Format

One file per decision, named `NNNN-short-title.md` (e.g., `0001-jws-for-verification-proofs.md`). Number sequentially.

Each record uses this template:

```markdown
# NNNN — <Title>

- **Status:** Proposed | Accepted | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Decided by:** <names / seats>
- **Related RFC / PR:** <link>

## Context

What is the issue? What forces are at play?

## Decision

What did we decide?

## Consequences

What becomes easier or harder as a result? What follow-up is required?

## Alternatives considered

What other options were on the table, and why were they not chosen?
```

## Inspiration

Format adapted from Michael Nygard's [original ADR proposal](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) and the [adr-tools](https://github.com/npryce/adr-tools) convention.
