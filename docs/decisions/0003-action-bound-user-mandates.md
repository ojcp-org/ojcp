# 0003 — Action-bound user mandates

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decided by:** OJCP Steering Committee, after the close of the 30-day comment period (recorded by Austin Anderson, Seat 1). No blocking comments were raised during the window.
- **Related RFC / PR:** [RFC 0003](../rfcs/0003-action-bound-user-mandates.md); PR #9 (RFC); conformance fixtures in [ojcp-org/conformance#2](https://github.com/ojcp-org/conformance/pull/2)

## Context

RFC 0001 separated platform identity (an RFC 9421 request signature) from user authorization, and
added an optional `AgentDeclaration.user_mandate` as an SD-JWT VC, but deferred its claim set and
verification rules to a later consent RFC. An opaque string alone does not say which action the
user authorized, which agent key may exercise it, whether it has been revoked, or whether it has
already been used. Providers that wanted to require a user mandate for `application_prefill` or
`submit_application` had no interoperable way to reject a mandate replayed for a second
submission, copied to a different job or employer, exercised by a different agent, or used after
revocation.

The RFC was opened on 2026-08-14 (PR #9, merged 2026-08-25), with a comment period from
2026-08-14 to 2026-09-13. The only review was the maintainer's, which raised three follow-ups:
which identifier a mandate binds to on a multi-tenant ATS, how `cnf.jkt` interacts with agent key
rotation, and wiring the negative cases into the conformance suite. The author addressed all three
on 2026-08-21, and the final RFC text reflects them.

## Decision

RFC 0003 is **accepted**. The spec gains a User Mandates section defining the minimum security
profile of `user_mandate`:

- Platform identity, candidate identity and user authorization are three independent decisions; a
  provider never promotes success in one to success in another.
- Mandate acceptance is a provider policy decision: cryptographic validity alone is not sufficient,
  and a credential signed only by the agent platform's key is never user authority.
- A mandate conveys `iss`, `cnf.jkt` (the exact agent signing key), `aud` (the consuming resource
  server), validity times, a unique `jti`, an OJCP version, a canonical `ojcp_action` statement, and
  a revocation or status mechanism unless it is short-lived and single-use.
- The action statement binds the resource server, the employer on a multi-tenant ATS, the tool,
  job, agent and agent key, and for `submit_application` the application, a digest of the
  submitted candidate data, and a provider-issued single-use `mandate_nonce`.
- Providers verify mandates in a fixed order, fail closed, consume `jti` and `mandate_nonce`
  atomically, and invalidate the session on revocation or expiry.

The schema changes are additive: an optional `mandate_nonce` on the `begin_application` response,
a new `user_mandate_required` error code, and an updated `user_mandate` description.

## Consequences

- Providers that require user authorization can verify it interoperably, and reject replayed,
  re-targeted, re-keyed, expired or revoked mandates.
- On a multi-tenant ATS a mandate for one employer cannot be reused for another employer on the
  same endpoint.
- Key rotation does not carry a mandate to a new key: agents must keep the mandated key published
  until the mandate expires, or have the user reissue it.
- A single wire error code covers both a missing mandate and a failed one, so responses do not
  reveal which check failed.
- Nothing changes for providers that do not require a user mandate, or for agents that send none.
- Follow-up: (1) the companion consent specification, to define the credential's media type and
  exact claim profile, a JSON Schema and registry for the action statement, and the manifest
  `auth.user_mandates` signalling block; (2) promoting the experimental `USER_MANDATE_FIXTURES`
  in the conformance suite out of experimental status.

## Alternatives considered

Treating the platform signature as user authorization (rejected: it proves control of the
platform key, not the user's authority), treating any signed credential as sufficient (rejected:
an issuer cannot authorize itself to a relying provider), deferring all semantics to
provider-specific OAuth flows (rejected as the only path: no portable delegation), and
standardizing a full delegation protocol now (deferred). Each is detailed in RFC 0003's
*Alternatives considered*.

## Recusal note

The RFC author (Mathieu Colla, independent contributor) does not hold a steering-committee seat,
so no seated member recused. The decision was recorded after the close of the public comment
period per the bootstrap-period process in [GOVERNANCE.md](../../GOVERNANCE.md).
