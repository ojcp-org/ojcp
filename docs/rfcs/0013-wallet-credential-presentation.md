---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc, security, privacy
---

## RFC: Wallet credential presentation — a person proves a fact from their phone, straight to the employer

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0003 (Action-bound user mandates), RFC 0005 (Inline identity verification via MCP Apps), RFC 0008 (Standing mandates), RFC 0009 (Occupation codes and binding actions), RFC 0010 (Decentralized provider trust), RFC 0014 (Hiring credentials and issuer profile)

## Summary

Employers often want to check what an application says: that the person really works where they claim, holds the degree they list, or has an active license. Today that check takes days of phone calls and emails, or the person uploads scans of documents. When an AI assistant fills in the application, the assistant shouldn't be handling those documents at all.

More and more people carry signed digital records in a phone wallet: a driver's license from their state, or a job, degree or license record from an organization that vouches for it (RFC 0014). Nobody can alter these records, and the person decides what to share.

This proposal lets an employer's application system ask for such a record during an application, without the assistant ever touching it:

1. The assistant shows who is asking, why, and exactly which details, along with a short application code such as "7Q4K" and the email address the application uses, partly hidden.
2. The person opens the employer's verification page and confirms that email address with a one-time code. This ties the check to the application.
3. Their wallet shows the request. If they approve, the wallet sends the details **directly to the employer**.
4. If the wallet ran on a different device, it opens a page that asks the person to type in the email address they're applying with. A check started by somebody else can't then be attached to that somebody else's application.
5. The assistant only ever learns "done", "not yet", or "being checked another way".

The assistant won't pass on a wallet request at all from a site whose identity couldn't be confirmed, and it names the company that has been checked, not whatever name the site gives itself.

Using a wallet is never required. Anyone can choose another way to be checked, and that choice gives them the extra time a slower check needs. Employers may not rank or treat people differently based on which way they chose.

Employers may ask only for details the job needs, from a fixed list, and prefer rough versions (the year rather than the exact date). They may never ask for a birth date, a photo, an ID number, an address, or anything about race, religion, health or family.

For example, Maya applies to Acme through an assistant, and Acme asks to confirm her current employer. She opens Acme's page, enters the code sent to her email, and scans a QR code with her phone. Her wallet asks to share her employer's name and her job title. She approves. Her phone then opens an Acme page, she types her email address, and the check is complete. The assistant sees only that the step is done.

## Motivation

The spec's *Identity Verification* section lets a provider require a verification step, including `employment` and `education` steps. Every step assumes a third-party Identity Verifier, and the *Expected Completion Times* table puts those two at 1–3 and 2–7 business days.

Wallets can now do this in minutes, using final standards: [OpenID4VP 1.0](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html) (July 2025), [HAIP 1.0](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) (December 2025), and the [W3C Digital Credentials API](https://www.w3.org/TR/digital-credentials/) (Working Draft, 4 September 2026). [Chrome 141 enables that API by default](https://developer.chrome.com/blog/digital-credentials-api-shipped), and Safari 26 supports it for ISO mdocs ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). RFC 0014 defines the hiring credentials and how to issue them.

Doing this inside OJCP raises problems that a single verifier website doesn't have:

1. **The agent sits in the middle.** It must be able to start the check but must never see the credential. It also must not be able to aim the check at the wrong application or the wrong site.
2. **Cross-device flows can be hijacked.** Whoever starts an application can show its QR code to someone else. [OpenID4VP §14.2](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-14.2) notes that its session-fixation defense "is not applicable to cross-device scenarios".
3. **Not everyone has a wallet.** A wallet-only step would exclude people, so the alternative has to work within the spec's deadlines.

## Proposal

### 1. Roles

| Role | Who | Does |
|---|---|---|
| **Issuer** | An employer, HR platform, university, licensing board, verification service or government | Signs credentials and keeps their status current (RFC 0014). Issuers need not be OJCP providers. |
| **Holder** | The candidate's wallet | Presents a credential only with the candidate's approval. |
| **Provider** | The OJCP provider receiving the application | Asks for a presentation, receives it directly, checks it, and acts as its own Identity Verifier for the step. |
| **Agent** | The AI assistant or other OJCP agent | Checks the provider's trust tier, shows the request, and sends the candidate to `verification_url`. It never builds a wallet request, never receives a presentation, and never stores one. |

### 2. Wallet steps

#### 2.1 Field rules

A wallet step is a *VerificationStep* carrying a new `wallet_request` object. The existing fields apply as follows:

| Field | Rule |
|---|---|
| `type` | `employment`, `education` or `identity`, or one of two new values: `professional_license`, `certification`. |
| `verifier_id` | The provider's manifest host. It MUST be listed in `apply_path.accepted_verifiers`. |
| `verification_url` | REQUIRED. A page on the provider's origin, and the only way into the wallet flow (§4). |
| `human_required` | `true`. |
| `proof_delivery` | `provider_managed`. The wallet sends the presentation to the provider, and `submit_application` carries no `verification_proofs` for the step. |
| `ui_resource` | OPTIONAL, under §4.3. The `embedded_app` precondition of *Inline Rendering via MCP Apps* doesn't apply, because the provider is the verifier and publishes no VerifierManifest. |
| `estimated_completion_minutes` | 1–5. |

```json
// schemas/verification-step.json, properties
"wallet_request": {
  "type": "object",
  "required": ["purpose", "application_ref", "dcql_query", "alternative"],
  "properties": {
    "purpose": { "type": "string", "maxLength": 500, "description": "The provider's own statement of why it asks, naming the employer and job, what is checked and how long it is kept." },
    "application_ref": { "type": "string", "pattern": "^[A-Z0-9]{4,6}$", "description": "Short reference shown at every stage of the flow." },
    "masked_contact": { "type": "string", "description": "The application's contact, partly hidden (m•••@example.com). Present once the provider knows it." },
    "dcql_query": { "type": "object", "description": "What the wallet will be asked for, as a DCQL query (for org-iso-mdoc, the DCQL equivalent of the ItemsRequest), for display and checking. Claim paths only, never values." },
    "alternative": { "type": "string", "enum": ["post_submission", "verifier"], "description": "What choosing not to use a wallet does (§7)." }
  }
}
```

#### 2.2 States the agent sees

The agent learns about a wallet step only through `check_application_status`, and the step is always in one of three states:

- **pending**: not yet complete, including while a failed attempt can still be retried;
- **completed**: a presentation was validated and bound to this application (§§3, 6);
- **deferred**: the candidate chose the alternative of §7, and submission may go ahead.

`verification_status` gains `deferred_steps`. The response gains an OPTIONAL `verification_deadline`, so that agents learn of the extension of §7. The provider never tells the agent which claims were disclosed, their values, the issuer, whether an attempt failed, or why. It explains failures to the candidate on its own page. A completed step means only that the record is authentic and bound to the application. Job rules ("employed in a data role within three years") are applied in screening, with human review, and never complete, fail or delay a step.

### 3. Binding the presentation to the application

A real wallet approval must never end up attached to someone else's application. The provider applies the cross-device security BCP's Authenticate-then-Initiate and out-of-band binding measures ([draft-ietf-oauth-cross-device-security-16 §§6.1.15–6.1.17](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-cross-device-security-16#section-6.1.15)):

1. **Contact first.** Before showing or releasing any wallet request, `verification_url` verifies the application's contact. That contact is `candidate_context.email` if the agent sent it in `begin_application`, otherwise one the candidate enters. The provider sends a one-time code to it, and the candidate enters the code on the page. That browser session becomes the application's **bound session**. A candidate binding disclosed under RFC 0008 §2.3, or the candidate signing in to an existing account with the provider, MAY take the place of the code.
2. **Reference and contact everywhere.** `application_ref` and `masked_contact` appear in the step, on `verification_url` and on the confirmation page of item 4. Where the request protocol carries a statement the wallet may show (an OpenID4VP `verifier_info` entry, for example), the provider includes them there too. Agents MUST display them.
3. **Bound or unbound.** A presentation is **bound** when it returns to the bound session: a Digital Credentials API call made from that page (including cross-device presentation over CTAP, which also checks proximity), or a same-device redirect that comes back to the same session ([HAIP §5.1](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-5.1)). Every other presentation is **unbound**, for example a QR code scanned into a wallet that posts to `response_uri`, or a redirect into a different browser.
4. **Confirmation on the wallet device.** For an unbound presentation, `response_uri` answers with a `redirect_uri` ([OpenID4VP §8.2](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-8.2)) to a provider page on the wallet's device. That page shows the job, `application_ref` and `masked_contact`, and asks the candidate to **type** the email address or phone number they are applying with. The provider compares a hash of the entry with the verified contact. Only a match completes the step. On a mismatch the page says that the check belongs to an application with a different contact, and how to report it.
5. **Unconfirmed never counts.** An unbound presentation that isn't confirmed never satisfies a step, required or optional. It is deleted after 24 hours.
6. **Submission must match.** At `submit_application`, the application's contact MUST equal the verified contact, after the normalization of RFC 0008 §2.3. If it doesn't, the step returns to pending.
7. **Names are optional.** A provider MAY also request `given_name` and `family_name` to compare with the application. It keeps only a match or mismatch result, deletes the names at once, and shows reviewers neither the names nor the result. A mismatch never rejects an application on its own. The candidate is privately offered the alternative of §7, so a credential that carries a former name doesn't expose it.

**What the Digital Credentials API does and doesn't do.** It authenticates the requesting origin to the wallet and binds the response to that origin ([OpenID4VP Appendix A.4](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#appendix-A.4)). It doesn't bind the response to an application. An agent that opens another application's `verification_url` reaches the genuine origin, so `expected_origins` passes. The binding to the application comes from the contact verification of item 1.

### 4. Channels

`verification_url` is the single entry point. The provider's page, not the agent, works out what the candidate's browser supports and offers:

| Channel | When the page offers it | Bound? |
|---|---|---|
| Digital Credentials API, `openid4vp-v1-signed` or `-unsigned` ([OpenID4VP Appendix A](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#appendix-A)) | `DigitalCredential.userAgentAllowsProtocol` is true, for SD-JWT VC, W3C formats, or mdoc on Android | Yes |
| Digital Credentials API, `org-iso-mdoc` (ISO/IEC 18013-7 Annex C) | For mdocs, including Safari and iOS, which support only this protocol | Yes |
| QR code for OpenID4VP cross-device ([§3.2](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-3.2)) | No suitable API, or the candidate picks "use my phone" | No, so it needs confirmation |
| Same-device wallet link | Mobile browser without the API | Yes if it returns to the same session, otherwise confirmation |

The QR code and the wallet link are generated on demand, only inside the bound session. They are never put in the step. Each request URI works for at most 10 minutes and 5 fetches, and a new one can always be generated.

#### 4.1 Agent obligations

Before relaying a wallet step, the agent:

1. **Checks trust.** It derives the provider's effective trust tier from source (a) of RFC 0010 §5.4, or during migration from source (b), an index its operator pinned. It relays a wallet step only at `verified` or `audited`. At `unverified` it relays nothing. It tells the candidate that the site's identity couldn't be confirmed, and it doesn't pass on `verification_url`.
2. **Shows who is asking** as RFC 0010 §5.5 requires: the attested `legal_name` and the host in A-label form, never `verifier_name` or `provider.name` alone. For a hosted origin it names both parties: "ExampleATS Inc., verified, on behalf of Acme Corporation, confirmed" or "…, not confirmed". This covers ATS tenants on subdomains and providers that host many employers under one origin.
3. **Shows what is asked**: `purpose`, labeled as the provider's statement; the claims in `dcql_query`; `application_ref`; and `masked_contact`. It tells the candidate that the wallet's own screen is authoritative.
4. **Checks the claims.** It refuses to relay a step whose `dcql_query` asks for a claim outside the permitted list of §5.
5. **Only links.** It opens `verification_url` or shows it as a link. It never builds, alters or forwards a wallet request, never calls the Digital Credentials API on the provider's behalf, and never asks the candidate for a credential, a screenshot or the one-time code.

#### 4.2 What the provider names in the request

The provider signs every redirect or QR request with the `x509_hash` Client Identifier Prefix (HAIP §5) under a certificate whose `dNSName` SAN is the manifest host, where the CA's certificate profile allows it. `response_uri` is on that host. Ecosystems that require their own request credentials get them as well: a ReaderAuth certificate from Apple Business Connect to request from Apple Wallet ([Apple](https://developer.apple.com/documentation/identitydocumentservices/requesting-a-mobile-document-on-the-web)), a Google-signed certificate to request from Google Wallet ([Google](https://developers.google.com/wallet/identity/verify/accepting-ids-from-wallet-online)), and, from 24 December 2026, an EU wallet-relying-party access certificate with registered attributes ([Implementing Regulation (EU) 2025/848](https://eur-lex.europa.eu/eli/reg_impl/2025/848/oj/eng), Arts. 7–8). The purpose text names an employer only by the legal name in an RFC 0010 `hosted-employer` attestation the provider holds. Otherwise it reads "an employer hiring through ExampleATS Inc.".

#### 4.3 Inline rendering

An MCP Apps host fetches a view's HTML through `resources/read` and renders it in a sandbox on an origin the host chooses ([MCP Apps 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)). The host can read and rewrite it, and the sandbox can't use the Digital Credentials API, because the extension grants only camera, microphone, geolocation and clipboard permissions. Inline rendering is therefore exactly as trustworthy as the agent. A wallet step's `ui_resource` shows what §4.1 item 3 lists and an "Open verification page" button (`ui/open-link` to `verification_url`). It never shows a QR code or a wallet link. Spec *Inline Rendering via MCP Apps* says the UI "runs in the verifier's own origin". That is corrected to the host-chosen sandbox origin, for every inline step.

### 5. What a provider may request

Every wallet step requests only what the job needs, from a **closed list**, and always with an explicit `claims` array. Without `claims`, an SD-JWT wallet returns only mandatory claims ([OpenID4VP §6.4.1](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-6.4.1)), while a format without selective disclosure returns everything.

| Credential | Permitted claims |
|---|---|
| RFC 0014 types | The claims of RFC 0014 §2.2. Prefer the coarse claims (`start_year`, `tenure_years`, `degree_level`, `degree_year`). Request exact dates, degree dates or titles only when the job rule needs them. |
| mDL (`org.iso.18013.5.1.mDL`) and EU PID (`eu.europa.ec.eudi.pid.1`) | `given_name`, `family_name`, and at most one `age_over_NN` (mDL only), where NN is a minimum age the law sets for the job and is under 40. |
| Externally defined types (§6.1) | The claims the provider's issuer policy lists for that type, minus the prohibited ones below. For a format without selective disclosure, the provider may request the type only if **every** claim it can carry is permitted. Entra `VerifiedEmployee`, whose fixed claims include `photo` ([Microsoft](https://learn.microsoft.com/en-us/entra/verified-id/how-to-use-quickstart-verifiedemployee)), is therefore excluded. |

**Never requested, and discarded if received:** birth date, `age_in_years`, `age_birth_year`, or more than one age threshold; portraits and biometrics; government ID or document numbers (a professional license number is allowed); home address; nationality, citizenship or immigration status; race, ethnicity, religion, sex, gender identity, sexual orientation, pregnancy, marital or family status, disability or health; veteran status; compensation history, ratings, discipline or reasons for leaving; criminal or credit history. Voluntary EEO data travels only in `application_data.eeo`, never through a wallet step.

Wallets SHOULD warn the holder when a request falls outside these lists, using the hook in [OpenID4VP §15.3](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#section-15.3). In the EU, where a Member State issues relying-party registration certificates, wallets must also tell users when a relying party asks for data it didn't register (2025/848, Art. 8(2)(d)).

### 6. Issuer trust and validation

#### 6.1 Which issuers a provider accepts

Who may vouch for a fact is a separate question from whether the provider can be trusted. Each provider publishes an issuer policy at `wallet_presentation.accepted_issuers_uri` (§6.3), on its own origin. For each step type, the policy lists:

- the accepted formats and types (`vct`, mdoc doctype, or W3C `type`);
- the accepted RFC 0014 profiles (`baseline`, `high_assurance`) and `basis` values;
- the accepted issuers, each with **pinned keys**, using RFC 0010 §3.3's rules: RFC 7638 thumbprints with the RFC 0014 signing windows, or X.509 anchors paired with the SAN URI the leaf must carry. For mDLs the anchors are issuing-authority (IACA) certificates. For EU credentials they come from ETSI TS 119 612 trusted lists. Key material comes from the list, a staple or issuer metadata, matched against the pin, and never from a DID document (RFC 0010 §2.1). An unknown `kid` makes the provider refresh its lists and its pins. It never makes the provider accept a key that isn't pinned;
- optionally, trust lists in the format of RFC 0010 §4.1, pinned by publisher key, carrying hiring types in each entry's `vct`, with distrust on any configured list taking effect;
- for externally defined types, the permitted claims (§5), the claims that hold the holder's name (`givenName` → `given_name`), and whether bearer credentials are accepted (§6.2).

No issuer is accepted by default, and OJCP names none. For `own_records` credentials, one accepted issuer is the organization's own word. For `customer_records` and `source_check`, the provider is deciding whether to trust a platform's or service's report (RFC 0014 §3), and it decides that per issuer.

#### 6.2 Validation

The provider:

1. decrypts the response and matches it to a live request from this application's bound session (§3). A response that fails validation does **not** use up the request: failures are logged and rate-limited, so junk posted first can't block the candidate's real response;
2. resolves the issuer key against the pins (§6.1), checks the RFC 0014 signing window (`iat` no later than `ojcp_sign_until`, current time within `ojcp_sign_until` plus the type's maximum lifetime, or a currently valid `x5c` chain), and checks that the issuer, type, profile and `basis` are accepted;
3. checks `nbf` and `exp` with 60 seconds of skew, and the type's lifetime cap;
4. checks holder binding and status for the format, as below;
5. drops any disclosure not requested, unread;
6. applies the binding of §3 before marking the step completed.

| Format | Holder binding | Status |
|---|---|---|
| `dc+sd-jwt` | A KB-JWT signed by the `cnf` key, with `nonce` equal to the request nonce, `aud` equal to the `client_id` (or `origin:` plus the origin over the API), `iat` within 5 minutes, and a matching `sd_hash` ([Appendix B.3.6](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#appendix-B.3.6)) | Token Status List: VALID |
| `mso_mdoc` | DeviceAuth over the SessionTranscript of ISO/IEC 18013-7 Annex C, or of OpenID4VP's handover ([Appendix B.2](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#appendix-B.2)) | MSO `validUntil` not passed, and MSO status VALID where present. ISO/IEC 18013-5:2021 mdocs carry no status mechanism ([HAIP §5.3.1](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-5.3.1) refers to the second edition), so the policy MAY accept validity alone for an issuer, if the MSO was signed within a stated maximum age |
| `jwt_vc_json` | The presentation JWT's `nonce` and `aud` as for SD-JWT ([Appendix B.1.3.1.5](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#appendix-B.1.3)), signed by the credential's holder key: `cnf`, or a `did:jwk` or `did:key` subject, which carry the key themselves | `BitstringStatusListEntry` ([W3C Recommendation](https://www.w3.org/TR/vc-bitstring-status-list/)) or `StatusList2021Entry` |
| `ldp_vc` | The presentation proof's `challenge` equals the nonce and its `domain` equals the `client_id` or origin (Appendix B.1.3.2.5), signed by the holder key as above | As for `jwt_vc_json` |
| Bearer W3C credentials (no holder key, for example Open Badges 3.0) | Only if the policy allows bearer credentials for the type, and the credential's hashed email identifier matches the verified contact under Open Badges 3.0's recipient check ([Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0)) | As for `jwt_vc_json` |

**Status without revealing the candidate.** The provider refreshes every list its accepted issuers enumerate (RFC 0014 §6) on a schedule that doesn't depend on presentations. It fetches a list it hasn't cached only through an [Oblivious HTTP](https://www.rfc-editor.org/rfc/rfc9458) relay, never directly. The step stays pending until status is established, which may take up to 24 hours, separately from the 5-minute life of the request.

#### 6.3 Manifest signalling

```json
"wallet_presentation": {
  "accepts": [
    { "verification_type": "employment", "format": "dc+sd-jwt",
      "types": ["https://spec.ojcp.dev/vct/employment/v1"], "profiles": ["baseline", "high_assurance"] },
    { "verification_type": "identity", "format": "mso_mdoc", "types": ["org.iso.18013.5.1.mDL"] }
  ],
  "accepted_issuers_uri": "https://careers.acme.example/ojcp/accepted-issuers.json"
}
```

`accepted_issuers_uri` MUST be on the manifest's origin. The document is public, so candidates and issuers can see in advance whether a credential would be accepted.

### 7. Choosing not to use a wallet

**Always offered.** Every wallet step has an alternative, which `verification_url` offers and `instructions` mentions. The step declares which kind it is in `alternative`. Choosing it is a defined state transition:

- **`post_submission`**: the step becomes **deferred**, and submission proceeds now. The employer checks the fact after submission by its own means, such as a reference call or a conventional verifier. That check can't make the application expire, because the deadline no longer applies to this step.
- **`verifier`**: the provider replaces the step with a conventional Identity Verifier step (new `step_id`, Slow tier). It sets `verification_deadline` to at least 14 days after the choice, and reports the new value through `check_application_status`.

**Spec changes this needs.**

- *Verification Deadline*: the default for a wallet step is 72 hours, so that a weekend fits, and only the `verifier` transition may extend it.
- *Resumption* ("Providers MUST NOT extend an existing verification_deadline retroactively") gains an exception for that one extension, made before expiry.
- *Abandonment Semantics*: the Fast-tier one-hour inactivity rule doesn't apply to wallet steps or deferred steps, which end only at the deadline.
- *Polling Cadence*: wallet steps use the active-phase cadence. Deferred steps need no polling.

**No penalty.** Providers MUST NOT rank, score, filter, delay or route an application by which path completed a step, or by whether an optional wallet step was offered, attempted or declined. Reviewers see whether a step is complete or deferred, never which path completed it. A `required` wallet step, a failed name match (§3) and an unestablished status all leave the alternative open.

**Accessibility.** A wallet flow can screen out candidates with disabilities, for example where a wallet app doesn't work with assistive technology. Under the ADA, employers must make reasonable accommodations and must not use selection criteria that screen out people with disabilities, unless the criteria are job-related ([42 U.S.C. § 12112(b)(5)–(7)](https://www.law.cornell.edu/uscode/text/42/12112)). The alternative path, and accommodation requests made through `verification_url`, are how providers meet that duty in this flow.

**Agents acting alone.** Wallet steps are `human_required`. An agent acting under an RFC 0008 standing mandate stops and notifies the candidate. The 72-hour deadline and the alternative both still apply.

### 8. Privacy and retention

- **Only the provider receives claims**, directly from the wallet. Nothing passes through OJCP, the agent, its host or the model's context. *No PII Through OJCP* still holds for the protocol.
- **Delete the presentation.** The raw presentation is deleted within 24 hours. The provider keeps the validated claims it requested, the issuer, the type, the result and a SHA-256 digest of the presentation. It doesn't keep the status index or URI, `cnf`, the issuer signature, or names used only for matching.
- **One application only.** Validated claims belong to this application's record and follow its retention, including the 30-day purge under *Abandonment Semantics*. They are never reused for other applications, talent pools or model training without separate, specific consent.
- **No status watching.** Status is never checked again after the hiring decision, and the index needed to do so isn't kept.
- **Same company on both sides.** A provider run by the same company as an issuer MUST NOT join presentations with that issuer's issuance records, and its purpose text says that the operator also issues credentials. Wallets SHOULD use a different credential from a batch for each verifier operator.
- **What the agent learns:** the three states of §2.2, and nothing else.

### 9. Consumer reporting and RFC 0009

RFC 0009's `background_check_authorization` covers "employment or education verification" obtained from a third party. A provider MUST list that binding action, and follow its disclosure and adverse-action process, before showing a wallet step whose policy accepts any issuer with `consumer_reporting_agency: true` (RFC 0014 §7). The same applies when the step's `verifier` alternative uses a consumer reporting agency. Steps that accept only `own_records` issuers don't need it. This isn't legal advice, and RFC 0014 §7 explains the open question.

### 10. Relationship to other RFCs

- **RFC 0003 and RFC 0008 (mandates).** Mandates are authorization. Credentials are facts that someone else attests. A mandate never completes a wallet step, and a hiring credential is never user authority. Providers match `vct` exactly. RFC 0008's candidate binding may stand in for the contact code (§3).
- **RFC 0005.** Reused for inline rendering, with the corrected trust statement (§4.3).
- **RFC 0009.** Wallet steps record no assent. §9 says when RFC 0009's background-check authorization is needed.
- **RFC 0010.** Effective tiers and display rules gate relaying (§4.1). Its key-pinning rules, list format and DID-document rule govern issuer trust (§6.1).
- **RFC 0014.** It defines the types, `basis`, the profiles, signing windows and issuer metadata.

### 11. Worked example

Maya's assistant calls `begin_application` with `candidate_context.email` set (consent scope `application_prefill`). Acme's provider is `verified`, so the assistant may relay. Acme responds:

```json
{
  "ojcp_version": "0.4",
  "application_id": "app_5b0e2c8e-9a41-4f7e-b1d2-6c3f0a9d7e11",
  "status": "pending_verification",
  "apply_path": { "type": "provider_hosted", "supports_agent_submission": true,
                  "requires_verification": true, "accepted_verifiers": ["careers.acme.example"] },
  "binding_actions": [],
  "verification_deadline": "2026-10-15T15:20:00Z",
  "verification_steps": [
    {
      "step_id": "vs_emp_1",
      "type": "employment",
      "verifier_id": "careers.acme.example",
      "verifier_name": "Acme Corporation",
      "verification_url": "https://careers.acme.example/ojcp/verify/vs_emp_1",
      "ui_resource": "ui://careers.acme.example/verify/vs_emp_1",
      "required": true,
      "human_required": true,
      "proof_delivery": "provider_managed",
      "estimated_completion_minutes": 3,
      "instructions": "Acme checks your current or most recent employer and job title. Use your wallet, or choose 'Verify another way' on the page.",
      "wallet_request": {
        "purpose": "Acme Corporation checks your current or most recent employer and job title for Senior Data Analyst (acme-2026-0412). Kept with this application only.",
        "application_ref": "7Q4K",
        "masked_contact": "m•••@proton.example",
        "alternative": "post_submission",
        "dcql_query": { "…": "below" }
      }
    }
  ]
}
```

The assistant shows: "Acme Corporation (verified, careers.acme.example) asks to check your current or most recent employer and job title. Application 7Q4K, m•••@proton.example. Your wallet's screen is authoritative." It also shows an "Open verification page" button.

The DCQL query asks for no names and no exact dates. A current job discloses `current` and its titles. A past job also discloses `end_year`:

```json
{
  "credentials": [
    {
      "id": "employment",
      "format": "dc+sd-jwt",
      "meta": { "vct_values": ["https://spec.ojcp.dev/vct/employment/v1"] },
      "claims": [
        { "id": "org", "path": ["organization", "name"] },
        { "id": "current", "path": ["current"] },
        { "id": "end_year", "path": ["end_year"] },
        { "id": "title", "path": ["positionHistories", null, "title"] }
      ],
      "claim_sets": [ ["org", "current", "title"], ["org", "current", "end_year", "title"] ]
    }
  ]
}
```

Maya opens the page on her laptop and enters the code sent to her email. The browser has no Digital Credentials API, so the page shows a QR code. Her wallet shows Acme's certificate identity and the four claims, and she approves. The presentation is unbound, so her phone opens Acme's confirmation page: "Application 7Q4K, Senior Data Analyst, m•••@proton.example. Type the email you're applying with." She types it, and it matches. Acme then records, internally:

```json
{
  "application_id": "app_5b0e2c8e-9a41-4f7e-b1d2-6c3f0a9d7e11",
  "step_id": "vs_emp_1",
  "result": "completed",
  "binding": "unbound_confirmed",
  "credential": { "format": "dc+sd-jwt", "vct": "https://spec.ojcp.dev/vct/employment/v1",
                  "issuer": "https://credentials.globex.example", "basis": "own_records",
                  "status": "VALID" },
  "claims": { "organization": { "name": "Globex Corporation" }, "current": true,
              "positionHistories": [ { "title": "Data Analyst" } ] },
  "presentation_sha256": "2b7f…",
  "validated_at": "2026-10-12T15:24:10Z"
}
```

The assistant polls and sees only:

```json
{
  "ojcp_version": "0.4",
  "application_id": "app_5b0e2c8e-9a41-4f7e-b1d2-6c3f0a9d7e11",
  "status": "pending_submission",
  "updated_at": "2026-10-12T15:24:10Z",
  "verification_status": { "steps_total": 1, "steps_completed": 1, "completed_steps": ["vs_emp_1"],
                           "pending_steps": [], "deferred_steps": [] }
}
```

It submits with `application_data` containing the same email, so §3 item 6 passes.

### 12. Conformance fixtures

- **Binding:** a QR presentation without confirmation (never completes); a confirmation with the wrong contact (pending, with a report option); a presentation from another application's session; a contact changed at submission (step back to pending); a Digital Credentials API presentation from the bound session (completes); a mobile redirect into a different browser (confirmation required).
- **Agent:** a provider at `unverified` (no relay); a display using `verifier_name` instead of the attested name; a hosted origin without employer confirmation; a step requesting `birth_date` or `portrait` (no relay); `wallet_link` or QR shown inline (fails).
- **Validation:** junk posted before the real response (the real one still succeeds); `iat` after `ojcp_sign_until`; a key outside the pins; a key taken from a DID document; a `jwt_vc_json` presentation with the wrong `aud`; a bearer badge with a non-matching hashed email; StatusList2021 revoked; an mdoc without status under a policy that requires it.
- **Fallback:** the alternative chosen at hour 71 (deferred, submittable); `verifier` alternative (deadline extended to at least 14 days); identical scoring of the two paths; no Fast-tier abandonment after an hour of inactivity.
- **Privacy:** an agent status response carrying any claim, issuer or failure detail; status index retained; a direct fetch of an uncached list.

## Security and privacy considerations

- **Application swap.** Contact verification before any request, the contact typed on the wallet device, and the contact check at submission bind each presentation to the person who controls the application's contact. A fake recruiter who shows Maya his application's QR code gets a confirmation page asking for her email, which won't match his. A malicious agent that shows her another application's `verification_url` can't get past the one-time code. What remains: a candidate who is talked into typing someone else's address, or who reads her one-time code to an attacker. The BCP notes the same limit for out-of-band data (§6.1.17).
- **Lookalike and scam providers.** Agents don't relay wallet steps for `unverified` providers, and they show attested names (§4.1). The wallet shows the certificate identity, and the request is bound to the provider's origin. A provider can still lie in its purpose text, so that text is labeled as its statement.
- **Inline host and agent tampering.** The inline view and the agent show only information, plus a link to `verification_url`. The request itself is fetched by the wallet from the provider, in a session the agent doesn't hold.
- **Replay.** Single-use nonces, holder binding for every format, and origin or `client_id` audiences (OpenID4VP §14.1). Bearer credentials need the contact match.
- **Junk responses.** Failed responses don't use up the request, and request URIs exist only inside the bound session.
- **Issuer keys.** Pinned keys, signing windows and distrust lists (§6.1, RFC 0014 §5.1). Nothing is resolved from DID documents.
- **Status privacy.** Scheduled refresh and Oblivious HTTP keep an issuer, possibly the candidate's current employer, from learning that someone is applying somewhere (§6.2).
- **Linkability.** An SD-JWT VC's signature, salts, holder key and status index are unique to it. The same credential presented twice is linkable by whoever receives both, and an issuer that kept the signature can link its credentials to presentations. Batches with one credential per verifier operator limit linking between providers, and coarse claims limit what each provider learns. Zero-knowledge presentation, such as proofs over ECDSA mdocs or BBS with per-verifier pseudonyms, is left to a later RFC.
- **Exclusion.** The alternative path, the no-penalty rule and the deadline changes keep the wallet from becoming a filter on who can apply (§7).

## Affected areas

- [x] *Identity Verification → Overview* and *Flow*: wallet steps as provider-managed steps where the provider is the verifier.
- [x] New *Identity Verification → Wallet Presentation*: §§2–9.
- [x] *Session Initiation* ("Providers MUST use the application_id or a derivative") and *Identity Verification Security* ("nonce claim matches the expected application_id"): scoped to Verification Proofs. Wallet requests use fresh random nonces the agent never sees.
- [x] *Provider Claim Validation*, *Proof Reuse* and *Key Rotation* (refetch on an unknown `kid`): apply to Verification Proofs, not to wallet steps, which use pinned keys (§6).
- [x] *No PII Through OJCP*: requested claims go from the wallet directly to the provider, never through OJCP.
- [x] *Inline Rendering via MCP Apps*: correct the origin statement for all inline steps. No `embedded_app` precondition for wallet steps (§4.3).
- [x] *Expected Completion Times*, *Verification Deadline*, *Abandonment Semantics*, *Resumption*, *Polling Cadence*: as §7.
- [x] *Provider Trust → Agent Obligations*: wallet steps are relayed only at `verified` or `audited` (§4.1).
- [x] *VerificationStep* and `schemas/verification-step.json`: `wallet_request`; `type` gains `professional_license` and `certification`.
- [x] `schemas/responses/application-status.json`: `verification_status.deferred_steps`, an OPTIONAL top-level `verification_deadline`, `"0.4"` in `ojcp_version` when that release lands, and a description of `verification_status` that covers wallet and deferred steps.
- [x] *Job Manifest → Format* and `schemas/manifest.json`: `wallet_presentation`.
- [x] *Interoperability*: rows for OpenID4VP 1.0, the Digital Credentials API, ISO/IEC 18013-7 and HAIP 1.0.
- [ ] `begin-application-input.json`: unchanged. The contact comes from `candidate_context.email`.
- [ ] VerificationProof, VerifierManifest: unchanged.

## Alternatives considered

- **The agent carries the presentation (`agent_submitted`).** Rejected. Personal data would pass through the agent and the model.
- **Putting a wallet link in the step.** Rejected. Anyone holding it could fetch the request, start a flow outside any bound session, or post junk responses first.
- **Binding by name alone.** Rejected. An attacker types the victim's name, and names can expose a former name.
- **A wallet-only step with a short deadline.** Rejected as exclusionary.
- **`openid4vp-v1-signed` only.** It would shut out Safari and iOS, where only `org-iso-mdoc` works.
- **A central OJCP issuer registry or verifier CA.** Rejected. It would recreate the single gatekeeper that RFC 0010 removes.
- **Reporting failed attempts to the agent.** Rejected. "Not verified" right after presenting a license reveals a suspension.

## Breaking changes

- **Closed enums.** `VerificationStep.type` gains `professional_license` and `certification`, so 0.3 consumers that validate against the closed enum reject steps using them. Providers use the new values only in 0.4 responses, and agents treat an unknown type as an opaque, human-required step completed through `verification_url`. VerificationProof and VerifierManifest enums are unchanged.
- **Changed rules.** Session Initiation's `application_id` nonce rule no longer covers wallet steps, and *Resumption* gains one exception (§7).
- Everything else is additive and OPTIONAL.

## Open questions

1. **Purpose display.** OpenID4VP 1.0 has no purpose parameter. Should OJCP ask the OpenID Foundation for a shared one, so that wallets show the reference and the masked contact on their own screen?
2. **Request certificates.** Should the request-signing key be certified by the provider's RFC 0010 identity key, so that the wallet's "who is asking" traces to the attested organization?
3. **Confirmation friction.** Is typing the contact on the wallet device acceptable, or is a passkey for the provider account better where one exists?
4. **Bearer credentials.** Is a hashed-email match strong enough for Open Badges, or should bearer credentials count only toward optional steps?
5. **Status delay.** Is up to 24 hours to establish status acceptable to employers?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, so it has a commercial interest in how applications are verified and how quickly they complete. Recruitics holds Seat 1 on the OJCP steering committee. The author invites co-sponsors from other organizations, particularly wallet providers, issuers and candidate-advocacy groups, and will recuse from the vote that resolves this RFC.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes:

Resolution:

Decision record:
