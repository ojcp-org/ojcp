---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc, security, privacy
---

## RFC: SMS one-time passcodes as a user-presence method

- **Author:** Tom Chevalier, Tink
- **Status:** Draft
- **Created:** 2026-11-17
- **Resolves:** the provision in RFC 0015 §4 for user-presence proof methods beyond WebAuthn
- **Depends on:** RFC 0015 (employer mandate policy, [#57](https://github.com/ojcp-org/ojcp/pull/57))
- **Related:** RFC 0003 (action-bound user mandates), RFC 0005 (inline rendering via MCP Apps), RFC 0008 (standing mandates), RFC 0009 (binding actions)

## Summary

RFC 0015 lets an employer require that a person approve each application an agent makes on their behalf, and defines one way to prove it: a WebAuthn assertion. This proposal adds a second, co-equal method: a **one-time passcode sent by SMS** to the candidate's mobile number and entered on the provider's own approval page.

- **Either method satisfies `user_presence: required`.** A provider, or a specific employer on that provider, chooses which methods it accepts: WebAuthn, SMS passcodes, or both.
- **The provider runs it.** The provider sends the code, shows the person what they are approving, checks the code, and records the approval. The agent never sees the code.
- **One code, one application.** A code approves exactly one application with exactly the content the person approved. Any change voids it.
- **SMS only, not email.** Email passcodes do not count, because agents commonly have access to, or operate, the inbox.

For example, Globex hires through a shared ATS and requires a person to approve each application. Jordan, a home-health aide, has never set up a passkey. Her agent sends her to Globex's approval page on the ATS. The page shows "Globex – Home Health Aide (Tampa)" and texts a code to her phone. She enters it, and the agent submits. Globex's record shows the application was approved by SMS passcode.

## Motivation

RFC 0015 closes a real gap: without proof of presence, an agent platform can mint one action mandate per job and auto-apply to employers that asked for human approval. But its only accepted proof is WebAuthn, and that limits who can apply.

1. **Most job seekers don't use passkeys.** Passkeys and platform authenticators are still unfamiliar to most job seekers, especially hourly, healthcare and frontline workers, many of whom apply from older phones. A WebAuthn proof also requires a credential the provider has already bound to the candidate, which means the candidate must have created an account and a passkey on *that* provider before applying. Candidates applying across many ATSs would have to do this on each one.
2. **SMS passcodes are already familiar.** Job seekers use SMS codes for banking, healthcare portals and existing ATS logins. A presence requirement they can complete keeps employers' applicant pools intact.
3. **The risk RFC 0015 addresses is cost, not cryptography.** The bypass works because minting an action mandate is free for an agent platform. Real mobile numbers are costly to acquire and maintain at the scale needed to approve an agent's own applications, so an approval delivered to the candidate's mobile number and entered on the provider's page restores the same barrier for the cases that matter.
4. **Employers should choose.** Some employers will want the widest possible reach; others will want WebAuthn only. The protocol should let each provider, and each employer on a shared provider, make that choice.

## Proposal

### 1. Terminology

- **Presence method:** a way of producing a user-presence proof (RFC 0015 §1). This RFC defines two: `webauthn` (RFC 0015 §4) and `otp_sms` (§4 below).
- **Approval page:** a page served by the provider, on the provider's origin, where the candidate reviews and approves one application.
- **Approval record:** the provider's stored record that a presence method succeeded for one application and one action statement.

### 2. `presence_methods`

The `action` member of a mandate policy (the provider's `auth.user_mandates`, and the employer mandate policy of RFC 0015 §2) gains `presence_methods`: an array of presence-method tokens.

```json
"action": {
  "user_presence": "required",
  "presence_methods": ["webauthn", "otp_sms"]
}
```

- An absent `presence_methods` means `["webauthn"]`, so every policy written under RFC 0015 keeps its meaning.
- Agents and providers MUST ignore tokens they do not recognize.

The provider declares the methods it can run in its manifest:

```json
"auth": {
  "user_mandates": {
    "action": {
      "user_presence": "optional",
      "presence_methods_supported": ["webauthn", "otp_sms"],
      "presence_methods": ["webauthn", "otp_sms"]
    }
  }
}
```

### 3. Where it is set, and the effective methods

`presence_methods` can be set at two levels:

- **Provider-wide**, in the manifest, for every employer the provider hosts.
- **Per employer**, in the employer mandate policy on that employer's postings (RFC 0015 §5), implemented and enforced by the provider on the employer's behalf.

The provider computes the effective methods per job:

| Employer policy | Effective `presence_methods` |
|---|---|
| Sets `presence_methods` | The employer's list, restricted to the provider's `presence_methods_supported` |
| Absent | The provider's `presence_methods` |

`user_presence` itself keeps RFC 0015's rule: it is `required` if either the provider or the employer says so.

The two methods are co-equal: neither is stronger for the purposes of this policy. So choosing among methods is not treated as tightening or loosening, and an employer may select any supported method regardless of the provider's default. An employer cannot use a method the provider does not support. If the effective list would be empty, the provider MUST use its own `presence_methods`.

### 4. The SMS passcode method (`otp_sms`)

An `otp_sms` approval is a valid user-presence proof only when all of the following hold.

**4.1 Binding to one application.**

- The code is bound to one `application_id` and to the digest of the action statement it approves (RFC 0003, as extended by RFC 0015 §4).
- It is single use.

**4.2 The candidate's mobile number.**

- The provider sends the code to the candidate's mobile number, which the candidate enters or confirms on the approval page.
- At `submit_application`, that number, normalized to E.164, MUST equal the mobile number in the application's contact data. A submission whose contact number differs from the approved number does not match the approval record.

**4.3 The message names the action - suggested.** The SMS states the agent's name, the employer, the job title, whether the application includes binding actions (RFC 0009), and a link or reply keyword to stop the application. For example:

> [Northstar] wants to submit your application to Globex – Home Health Aide (Tampa). It includes a background-check authorization. Code: 482913. Enter it only on the Globex application page. Not you? Reply STOP.

**4.4 Entered on the provider's page.** The candidate enters the code on the approval page, or on a provider-rendered inline surface (RFC 0005, `ui_resource`). Before the code is entered, the page MUST show the employer, the job title and each binding action. The code MUST NOT be accepted through any OJCP tool call.

**4.5 Provider checks.** Providers SHOULD treat these as automation signals and MAY refuse the approval:

- a code entered within a few seconds of being sent;
- rapid sequences of approvals for the same number;
- more passcode approvals per number per day than the provider's published limit.

**4.6 Records.** Providers MUST NOT log codes. The approval record stores the `application_id`, the action-statement digest, the method, the normalized number (or a keyed hash of it) and the time.

### 5. Flow

1. The agent calls `begin_application`. When the effective `user_presence` is `required`, the response includes:

   ```json
   "user_presence": {
     "required": true,
     "methods": ["webauthn", "otp_sms"],
     "approval_url": "https://apply.example-ats.com/approve/app_7f3a",
     "ui_resource": "ui://apply.example-ats.com/approve/app_7f3a"
   }
   ```

   `approval_url` is REQUIRED; `ui_resource` is OPTIONAL.
2. The agent prepares the final application and computes the action statement for `submit_application`.
3. The agent sends the person to `approval_url`, appending the action-statement digest as the `action` query parameter, or renders `ui_resource`.
4. The person reviews the employer, the job and the binding actions, chooses a method if more than one is offered, and completes it:
   - `webauthn`, as in RFC 0015 §4;
   - `otp_sms`, as in §4 above.
5. The provider writes an approval record.
6. The agent calls `submit_application` with its action mandate. The provider reconstructs the action statement from the request and its session state, as it already must. The `user_presence` requirement is satisfied when either:
   - the mandate carries a valid WebAuthn proof (RFC 0015 §4); or
   - the provider holds an `otp_sms` approval record for this `application_id` whose digest equals the reconstructed action statement and whose number equals the submitted contact number.
7. Per RFC 0015 §6, what the provider delivers to the employer records which presence method approved the application.

Because the provider checks its own code and keeps the record, `otp_sms` needs no new credential format and adds nothing to `user_mandate`.

### 6. Errors

A submission that fails the presence requirement is refused with `user_mandate_required` and `details.reason` `user_presence_required` (RFC 0015 §6). As there, the reason depends only on published policy and does not reveal which check failed.

### 7. Agent obligations

- An agent MUST pass `approval_url` to the person unmodified, apart from adding the `action` parameter, and MUST NOT host, proxy or frame the approval page in a way that alters what it shows.
- An agent MUST NOT ask the person for the code, read it, relay it, or fill it in, by any means, including access to the person's messages.
- An agent MUST NOT request approval for more than one application at a time.

### 8. Email passcodes are not a presence method

Email passcodes MUST NOT be accepted as a user-presence proof. Email is the weak point for exactly the bypass RFC 0015 closes:

- Agent platforms routinely ask for access to a candidate's mailbox, so an agent can read the code itself.
- An agent platform can create or operate its own email addresses at no cost and relay messages to the candidate's real inbox, so the "candidate's" address is actually the agent's.
- Forwarding rules make an inbox trivially automatable.

### 9. Conformance

New fixtures for the conformance suite:

| Fixture | Setup | Expected |
|---|---|---|
| `otp_wrong_action` | Approval recorded for a different `application_id`, or for a different action digest of the same application | Reject |
| `otp_changed_application` | Application data changed after approval | Reject |
| `otp_expired_or_reused` | Code entered after 10 minutes; code used twice | Reject |
| `otp_number_mismatch` | Approved number differs from the submitted contact number | Reject |
| `otp_via_tool_call` | Code supplied in an OJCP tool call instead of on the approval page | Reject |
| `otp_method_not_accepted` | Effective methods `["webauthn"]`; `otp_sms` approval presented | Reject, `user_presence_required` |
| `webauthn_method_not_accepted` | Effective methods `["otp_sms"]`; WebAuthn proof presented | Reject, `user_presence_required` |
| `employer_selects_otp` | Provider default `["webauthn"]`, supports both; employer selects `["otp_sms"]`; valid SMS approval | Accept |
| `employer_selects_unsupported` | Provider supports only `webauthn`; employer selects `["otp_sms"]` | Effective methods fall back to the provider's; SMS approval rejected |
| `otp_valid` | `otp_sms` permitted; valid, matching approval | Accept |

## Security and privacy considerations

- **Agent-controlled phone.** An SMS passcode proves that someone with access to the candidate's mobile number approved this application on the provider's page. An agent that controls the candidate's phone or its messages can defeat it; §7 forbids that, and §4.5 helps providers detect it.
- **Number interception.** SIM swapping and SMS interception are known attacks on SMS codes. Binding each code to one application and one action, a 10-minute lifetime, and single use limit what an intercepted code can do.
- **Relay through the agent.** Requiring entry on the provider's page, and refusing codes in tool calls, keeps the code out of the agent's channel.
- **Disclosure to the employer.** Recording the method lets employers see how each application was approved. It reveals nothing about the candidate beyond what the application contains.
- **Phone numbers.** The provider learns the candidate's mobile number at approval, which it would receive in the application anyway. Approval records store the number or a keyed hash, and providers MUST NOT log codes.
- **Email.** §8 excludes email passcodes for the reasons given there.

## Affected areas

- [x] Tool definitions: `begin_application` response gains `user_presence` (`required`, `methods`, `approval_url`, `ui_resource`); `submit_application` presence check (§5).
- [x] Core schemas: none beyond the `begin_application` response.
- [x] Manifest format: `auth.user_mandates.action` gains `presence_methods` and `presence_methods_supported`.
- [x] Security / privacy model: *OJCP Mandates → Employer Mandate Policy* gains the `otp_sms` method (§4), effective methods (§3), agent obligations (§7) and the exclusion of email (§8).
- [x] Other: conformance fixtures (§9).

Placement: normative text in the OJCP Mandates extension, alongside RFC 0015.

## Alternatives considered

- **WebAuthn only (RFC 0015 as drafted).** Excludes candidates without passkeys, and requires a passkey on each provider before applying.
- **Email passcodes.** Readable or operated by agents (§8).
- **Wallet presentations (RFC 0013).** Wallets are not yet widely held for hiring, and a wallet distributed by the agent platform could sign approvals without the person; better addressed by a later RFC with wallet-independence requirements.
- **Authenticator-app codes (TOTP).** Require enrollment per provider, with adoption no better than passkeys.
- **Making SMS a weaker tier below WebAuthn.** Adds a ranking employers must interpret, when the purpose of both methods is the same: evidence that the person approved this application.

## Breaking changes

None. Every addition is OPTIONAL. An absent `presence_methods` means `["webauthn"]`, so providers, employers and agents written to RFC 0015 behave as before.

## Open questions

1. Should providers be required to reject non-mobile (VoIP) numbers using a carrier line-type lookup?
2. Should voice-call delivery of the same code be accepted for candidates who cannot receive SMS?
3. Should the provider publish its daily cap on passcode approvals per number (§4.5) in the manifest?
4. Should `presence_methods` also apply to action mandates on providers that do not require `user_presence`, so an agent can show an approval step candidates recognize?

## Interests

The author's company works with job candidates and employers and has an interest in approval methods candidates can complete. The author holds Seat 7 on the steering committee and will follow the conflict-of-interest rules in GOVERNANCE.md if a vote is held.

## For maintainers — comment period and resolution

Comment period opens: November 17, 2026

Comment period closes: (30 days)

Resolution:

Decision record:
