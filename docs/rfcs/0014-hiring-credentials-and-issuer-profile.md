---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc, privacy
---

## RFC: Hiring credentials and issuer profile — what an employment or education record in a wallet says, and how to issue one

- **Author:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-10-12
- **Resolves:** —
- **Related:** RFC 0008 (Standing mandates), RFC 0009 (Occupation codes and binding actions), RFC 0010 (Decentralized provider trust), RFC 0013 (Wallet credential presentation)

## Summary

People increasingly keep signed digital records in a phone wallet. An employer, a university or a licensing board can sign a record that says "Maya worked here as a data analyst from 2021" or "Maya holds an active nursing license", and nobody can alter it. RFC 0013 lets Maya show such a record to an employer she's applying to. This RFC defines what those hiring records contain and how an organization issues them.

It defines four kinds of record: a job, a degree, a professional license and a certification. Each has a fixed list of details, and nothing else may be added. The wording follows the HR industry's existing résumé standard, and each record offers rough versions of sensitive details (the year rather than the exact date) so that people can share less.

Each record says plainly who is vouching for it. When a university signs a record about its own graduate, that's the university's word. When HR software signs a record about one of its customers' employees, it's the software company's word about what its customer recorded. The employer receiving the record decides whose word it accepts.

Issuing these records needs no exotic infrastructure. An HR system such as Workday can do it with parts it already runs for single sign-on: a login service, signing keys published on its website, and a list it updates when someone leaves. Organizations that need a higher level of assurance can follow a stricter, existing profile. Former employees can still get a record of their past job after their work account is closed.

For example, Globex uses an HR platform. On Maya's last day, the platform emails her personal address a link to collect a "former employee" record into her wallet. Two years later she can request a fresh copy by confirming that same email address.

This RFC is honest about what works today, too: in October 2026, Apple and Google's built-in wallets hold only government IDs, so these hiring records need a separate wallet app.

## Motivation

RFC 0013 lets a candidate's wallet present a credential directly to an OJCP provider. For that to be useful, issuers and providers need to agree on what a hiring credential says, and issuers need a profile they can actually build.

Three problems need solving:

1. **No shared vocabulary.** Without common types, each provider defines its own claims and no issuer can serve all of them. HR Open's [Learning and Employment Record Resume Standard (LER-RS)](https://www.hropenstandards.org/ler-rs) already names the fields of employment, education, license and certification records, and OJCP should reuse those names.
2. **The obvious profile is too heavy.** The [OpenID4VC High Assurance Interoperability Profile (HAIP) 1.0](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html) requires FAPI 2.0 with PKCE and DPoP (§4), client authentication that in practice means wallet attestation (§4.4.1), and `x5c` certificate chains on every credential and status list (§6.1, §6.1.1). An HR vendor would have to pick which wallet vendors to trust and run a certificate authority for signing keys. Few will do that just to get started.
3. **Who vouches is ambiguous.** When an HR platform signs a record about a customer's employee, the claim is the platform's report of what its customer entered. A verifier has to know that to decide whether the record counts.

## Proposal

### 1. Terms

- **Issuer**: the party that signs a hiring credential and keeps its status current. Issuers need not be OJCP providers.
- **Basis**: what the issuer's statement rests on (§3).
- **Baseline profile** and **High-assurance profile**: the two ways to issue (§4).

### 2. Credential types

#### 2.1 Rules for every type

OJCP defines four types as [SD-JWT VCs](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-13) under `https://spec.ojcp.dev/vct/<name>/v1`, a site served by the ojcp-org spec repository and governed by the steering committee. SD-JWT VC and the IETF Token Status List are still drafts, so implementations follow the versions [HAIP 1.0 §9.4](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-9.4) pins, [SD-JWT VC draft-13](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-13) and [Token Status List draft-14](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14), until the final RFCs are published. SD-JWT itself is [RFC 9901](https://www.rfc-editor.org/rfc/rfc9901).

Every OJCP hiring credential:

- carries `iss`, `vct`, `vct#integrity`, `iat`, `exp`, `cnf.jwk`, `status.status_list` and `basis`, none of them selectively disclosable;
- rounds `iat` down to the start of the day, as [OpenID4VCI §15.4.1](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-15.4.1) recommends;
- has `exp` no later than `iat` plus the type's maximum lifetime (§2.2);
- makes every other claim selectively disclosable, each on its own, so that a verifier can request just one;
- MAY carry the holder's name as `given_name` and `family_name`, the registered JWT claims;
- carries **only** the claims its type defines. A credential with any other claim is invalid.

`vct#integrity` is the [SRI](https://www.w3.org/TR/SRI/) hash of the type's Type Metadata ([SD-JWT VC §7](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-13#section-7)), as RFC 0008 also requires. Wallets then render consent from metadata that can't be changed after issuance. Each `v1` metadata document is immutable. Any copy whose hash matches is as good as the original, so it can be mirrored, and wallets SHOULD bundle it rather than fetch it at presentation time. The Type Metadata lists exactly the claims of §2.2, and verifiers use that list as the type's closed set of permitted claims (RFC 0013).

#### 2.2 The types

| Type (`vct` under `https://spec.ojcp.dev/vct/`) | Claims | Coarse claims | Maximum lifetime |
|---|---|---|---|
| `employment/v1` | `organization` {`name`, `id`}; `current` (boolean); `start`; `end` (when `current` is false); `positionHistories[]` {`title`, `start`, `end`} | `start_year`; `end_year`; `tenure_years` (whole years, rounded down, as of `iat`) | 90 days when `current` is true, otherwise 2 years |
| `education/v1` | `institution` {`name`, `id`}; `educationDegrees[]` {`name`, `degreeGrantedStatus`, `date`}; `programs[]` | `degree_level` (ISCED 2011 level, `0`–`8`); `degree_year` | 2 years |
| `professional-license/v1` | `license` {`name`, `id`, `issuingAuthority` {`name`, `id`}, `status`, `effectiveTimePeriod` {`validFrom`, `validTo`}, `restrictions[]`} | none | 2 years, and never later than `validTo` |
| `certification/v1` | `certification` {`name`, `id`, `issuingAuthority` {`name`, `id`}, `status`, `issued`, `effectiveTimePeriod` {`validFrom`, `validTo`}} | none | 2 years, and never later than `validTo` |

- Dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
- `degreeGrantedStatus` is one of `Granted`, `InProgress`, `Postponed` or `NotGranted`. `license.status` and `certification.status` are one of `active`, `expired`, `pending` or `suspended`.
- `organization.id`, `institution.id` and `issuingAuthority.id` identify the organization: `lei:` followed by an ISO 17442 LEI, `did:web:` followed by a host (as RFC 0010 §2.1 derives it), or `reg:` followed by an ISO 3166 code, a colon and a business-registry number.
- Records sit inside a named object (`license`, `certification`), so `name` and `status` never appear at the top level. At the top level, `name` is the registered JWT claim for the holder's full name, and `status` is reserved for the status list, which HAIP §6.1 requires to contain `status_list`.
- The coarse claims let verifiers ask for a year or a level instead of an exact date (RFC 0013). Issuers MUST include them whenever the exact values exist.
- New types, and new claims in existing types, are added by RFC.

#### 2.3 Mapping to LER-RS

The claim names come from the HR Open Standards 4.5 release (build 2026-02-05, [standards page](https://www.hropenstandards.org/standards)). Its file `recruiting/json/LER-RSType.json` declares `"version": "4.4"`, and HR Open now presents the 4.5 work as the Trusted Career Profile. The mapping:

| OJCP | LER-RS 4.5 source | Conversion |
|---|---|---|
| `employment/v1` | `employmentHistories[]` (`common/json/profile/EmployerHistoryType.json`) | `organization`, `positionHistories[].title` unchanged. `start` and `end` are LER-RS `FormattedDateTimeType`, which allows a year, a year-month or a date: kept, with any time removed. `current` is the LER-RS `current` indicator. |
| `education/v1` | `educationAndLearnings[]` (`EducationAttendanceType.json`) | `institution`, `programs` and `educationDegrees[].name`, `.date` and `.degreeGrantedStatus` are unchanged. `degree_level` is `educationDegrees[].iscedEducationLevelCode`. |
| `professional-license/v1` | `licenses[]` (`LicenseType.json`, which extends `CertificationType.json`) | Nested under `license`. `effectiveTimePeriod.validFrom` and `.validTo` are LER-RS `DateTimeType`, reduced to a date. |
| `certification/v1` | `certifications[]` (`CertificationType.json`) | Nested under `certification`. Dates as for licenses. |
| `given_name`, `family_name` | `person.name.given`, `person.name.family` (`PersonNameType`) | Renamed. |

No other LER-RS `person` field has an OJCP counterpart. `birthDate`, `gender`, `ethnicity`, `citizenship` and `militaryStatus` are left out on purpose.

#### 2.4 ISO mdoc encoding

An issuer MAY also issue a type as an ISO mdoc, so that wallets which hold only mdocs can carry it. The doctype and the namespace are both `dev.ojcp.spec.<name>.1` (for example `dev.ojcp.spec.employment.1`), the reverse-DNS form of the governed `spec.ojcp.dev` site. Each top-level claim of §2.2 becomes a data element with the same identifier, with objects as CBOR maps and arrays as CBOR arrays. mdoc discloses whole data elements, so `positionHistories` is disclosed or withheld as a unit. Status uses the Mobile Security Object's `status` with a Token Status List ([TSL §6.3.2](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14#section-6.3.2)). The lifetime caps of §2.2 apply to the MSO's `validUntil`.

#### 2.5 Credentials defined elsewhere

OJCP doesn't redefine credentials that other bodies define, such as government IDs (mDL, EU PID), Open Badges 3.0 and CLR 2.0 achievements, LER-RS credentials in W3C format, or Microsoft Entra `VerifiedEmployee`. RFC 0013 says how a provider accepts them, with per-format validation and an explicit list of permitted claims.

### 3. Who vouches: the `basis` claim

An issuer always signs in its own name, and `basis` says what its statement rests on:

| `basis` | Meaning | Example |
|---|---|---|
| `own_records` | `iss` is the organization the record is about, attesting its own relationship with the holder. | A university about its graduate. A licensing board about its licensee. An employer's issuer at `https://credentials.globex.example`, even when its HR vendor runs it for Globex on Globex's domain. |
| `customer_records` | `iss` is a platform reporting what a customer organization recorded in it. | "HR Platform Inc. reports that Globex's records on the platform show Maya as a data analyst since 2021." |
| `source_check` | `iss` is a service reporting what it confirmed with the organization. | A verification service that contacted Globex's HR department. |

For `customer_records` and `source_check`, the record's organization `id` (§2.2) is REQUIRED, and the issuer's practice statement (§6) MUST say how it established that the customer, or the source it contacted, really is that organization. A `customer_records` credential is the platform's word about what its customer entered. It is not the customer's own signature, and verifiers decide whether that platform's customer checks are good enough (RFC 0013).

### 4. Issuer profiles

#### 4.1 Baseline profile

A Workday-class vendor can stand this up from parts it already runs:

1. **An [OpenID4VCI 1.0](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html) Credential Issuer**, with Credential Issuer Metadata at `/.well-known/openid-credential-issuer` ([§12.2.2](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-12.2.2)), a Credential Endpoint and a Nonce Endpoint ([§7](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-7)), and one `dc+sd-jwt` configuration per type ([Appendix A.3](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#appendix-A.3)). It sits behind the OAuth authorization server the vendor already runs for single sign-on. Issuance uses the authorization code flow (the employee signs in as usual), the Pre-Authorized Code Flow ([§3.5](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-3.5)), or both. Refresh tokens are RECOMMENDED, so that wallets can renew short-lived credentials without asking the holder ([§14.5](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-14.5)).
2. **Signing keys published over HTTPS** as [JWT VC Issuer Metadata](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-sd-jwt-vc-13#section-5) at `/.well-known/jwt-vc-issuer` on the `iss` origin: a JWK Set, `ES256`. This is the practice the vendor already follows for OpenID Connect, which publishes ID-token keys at its [`jwks_uri`](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderMetadata). No CA certificate is needed. The credential key MUST be separate from the single sign-on keys.
3. **A Token Status List**, run under the rules of §5.2.
4. **Batch issuance** ([§3.3.2](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-3.3.2)) where the wallet supports it. Issuers SHOULD allow batches of at least 10, each credential with its own key, salts, signature and status index, and SHOULD discard signatures and holder keys after issuance ([§15.4.1](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-15.4.1)).

FAPI 2.0, DPoP, PAR, wallet attestation, key attestation and `x5c` are **not** required at baseline. Wallets that accept only HAIP credentials may refuse baseline credentials, because they carry no `x5c`.

#### 4.2 High-assurance profile

The High-assurance profile is HAIP 1.0 for issuance: [§4](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-4) (authorization code flow, FAPI 2.0 with PKCE S256 and DPoP, wallet attestation, key attestation) and [§6.1](https://openid.net/specs/openid4vc-high-assurance-interoperability-profile-1_0.html#section-6.1) (`x5c` chains, not self-signed, on credentials and on Status List Tokens). The issuer has to decide which wallet providers' attestations it trusts. Outside regulated ecosystems such as the EU's, no common trust framework for that exists yet.

#### 4.3 Profile declaration and verifier choice

The issuer declares its profile in its metadata (§6). Verifiers choose which profiles they accept for each type (RFC 0013). A verifier that wants the assurance of wallet attestation for licenses, but accepts baseline credentials for past employment, can say so.

#### 4.4 What is OJCP-specific

Beyond standard OpenID4VCI and SD-JWT VC, an issuer takes on these duties: the type definitions and `basis` (§§2–3), the lifetime caps (§2.2), signing windows (§5.1), status timing, list size and enumeration (§5.2), `iat` rounding (§2.1), the former-employee routes (§5.3) and the `ojcp_issuer` metadata (§6).

### 5. Keys, status and former employees

#### 5.1 Keys and signing windows

- Each baseline key in JWT VC Issuer Metadata carries an OJCP JWK member `ojcp_sign_until` (NumericDate). The issuer signs nothing with the key after that time. A value, once published, may be brought forward but never pushed back. A verifier or list publisher that sees it pushed back treats the key as distrusted. For `x5c` keys the window is the leaf certificate's validity.
- A verifier rejects a credential whose `iat` falls after the day of `ojcp_sign_until`. It also rejects any credential once the current time passes `ojcp_sign_until` plus the type's maximum lifetime. So a retired key that leaks later can't mint credentials that outlive that bound, whatever `iat` the thief writes. For `x5c`, the chain must be valid at the time of verification.
- A key is announced in the metadata at least 14 days before its first use, so that the list publishers and providers who pin keys (RFC 0013) can add it.
- If a key is compromised, the issuer sets its `ojcp_sign_until` to the time of compromise, marks every credential signed after that time INVALID, and notifies list publishers so they can distrust the key by thumbprint (RFC 0010 §4.1). Issuer keys aren't logged under RFC 0011. Revocation rests on status lists, distrust and the lifetime bound above.
- Verifiers never take an issuer key from a DID document. RFC 0010 §2.1 forbids that for any OJCP purpose.

#### 5.2 Status lists

- Status List Tokens are `statuslist+jwt` ([TSL §5.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14#section-5.1)), signed with the same key resolution as the credentials they cover ([TSL §11.3](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14#section-11.3)). They use VALID, INVALID and SUSPENDED ([§7.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14#section-7.1)), carry `exp`, and carry a `ttl` of no more than 12 hours.
- Every list has at least 10,000 indexes, with unused indexes set to VALID as decoys. A platform shares its lists across all its customers. Lists are never per organization or per person, so a list URI reveals nothing about who the holder works for. Each credential gets its own unpredictable index (HAIP §6.1).
- Every status list URI the issuer uses is listed in `ojcp_issuer.status_lists` (§6) and served from the `iss` origin. Verifiers can then refresh all of them on a schedule, instead of fetching one at the moment a candidate presents (RFC 0013).
- **Timing.** The issuer sets a credential's status within 7 days of recording the change that ends it: the employment ending, a degree rescinded, a license suspended or lapsed. That's a batch job an HRIS can run off events it already records. For current employment, the 90-day lifetime limits how long a status update can be missed.

#### 5.3 Former employees

Job hunting often starts the day a work account is closed. Issuers of `employment/v1` MUST support at least one of the following, and SHOULD support the first:

1. **At offboarding.** The issuer sends a Credential Offer with a pre-authorized code ([OpenID4VCI §4.1](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-4.1)) for a `current: false` credential to a personal email address or phone number captured at exit. A transaction code (`tx_code`) goes by a separate channel, as OpenID4VCI recommends. OpenID4VCI's own Appendix H.2 describes this kind of employer-initiated offer.
2. **Alumni access.** The authorization server keeps an alumni login that can obtain credentials and do nothing else.
3. **Verified-email retrieval.** A former employee asks for a fresh credential by entering the personal contact on record. The issuer sends a new offer to that contact, and never to one typed into the request.

When an issuer marks a `current: true` credential INVALID because employment ended, it SHOULD at the same time offer a `current: false` credential through one of these routes.

### 6. Issuer metadata

Add an `ojcp_issuer` object to the OpenID4VCI Credential Issuer Metadata, which permits additional parameters ([§12.2.4](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-12.2.4)):

```json
"ojcp_issuer": {
  "profile": "baseline",
  "policy_uri": "https://credentials.hrplatform.example/practice",
  "status_lists": [
    "https://credentials.hrplatform.example/status/1",
    "https://credentials.hrplatform.example/status/2"
  ],
  "consumer_reporting_agency": true
}
```

- `profile`: `baseline` or `high_assurance`.
- `policy_uri`: a practice statement covering, for each type and `basis`, what the issuer checks before issuing, how it vets customers or sources (§3), its status timing, and how holders get help after losing a device.
- `status_lists`: every status list URI in use (§5.2).
- `consumer_reporting_agency`: whether the issuer treats itself as a consumer reporting agency for these credentials (§7). It is REQUIRED for `customer_records` and `source_check` issuers.

### 7. Legal roles

This section isn't legal advice. It flags obligations that the design has to leave room for.

- **Consumer reporting (US).** FTC staff state that "an employment screening service that provides education verifications, employment verifications, and reference checks for employers is a CRA" ([40 Years of Experience with the FCRA](https://www.ftc.gov/reports/40-years-experience-fair-credit-reporting-act-ftc-staff-report-summary-interpretations), 2011). A `customer_records` or `source_check` issuer that sells or provides these credentials so that prospective employers can verify people may therefore be a consumer reporting agency. If it is, a provider must give the candidate the standalone disclosure, obtain written authorization, and follow the adverse-action steps ([15 U.S.C. § 1681b(b)(2)–(3)](https://www.law.cornell.edu/uscode/text/15/1681b)), and the agency must obtain the provider's certification before furnishing a report (§ 1681b(b)(1)). Such issuers set `consumer_reporting_agency: true` unless counsel has concluded otherwise, and their practice statement says how providers certify. RFC 0013 ties this to RFC 0009's `background_check_authorization`. An `own_records` issuer reports only its own dealings with the holder, which the FCRA's first-hand exclusion ([§ 1681a(d)(2)(A)(i)](https://www.law.cornell.edu/uscode/text/15/1681a)) may cover. Whether a report that the consumer carries from issuer to employer counts as "furnished" by the issuer is unsettled.
- **Data protection (EU).** An issuer that signs in its own name decides why and how the holder's data is processed. A platform that does this with data it otherwise processes for a customer becomes a controller for that processing ([GDPR Art. 28(10)](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)). It then needs its own lawful basis under Art. 6 and its own notices to holders, and its customer contract has to allow the use.

### 8. Ecosystem status (October 2026, non-normative)

As of 12 October 2026:

- **Apple.** Safari 26 supports the W3C Digital Credentials API using ISO/IEC 18013-7 Annex C, protocol `org-iso-mdoc` ([WebKit](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)). Third-party iOS apps can act as identity document providers, but only for ISO/IEC 18013-5 mdocs, and only for document types listed in an Apple-granted entitlement ([Apple](https://developer.apple.com/documentation/identitydocumentservices/implenting-as-an-identity-document-provider)). Requests to Apple Wallet need a ReaderAuth certificate from Apple Business Connect ([Apple](https://developer.apple.com/documentation/identitydocumentservices/requesting-a-mobile-document-on-the-web)). We couldn't confirm that Apple grants entitlements for non-government doctypes such as §2.4's. In practice, an SD-JWT hiring credential on an iPhone lives in a separate wallet app reached by QR code or link.
- **Google.** Google Wallet documents only ISO mdoc identity documents (mobile driver's licenses from listed US states, ID passes, and so on), requested over OpenID4VP 1.0. Verifiers register with Google, which signs their certificate ([Google](https://developers.google.com/wallet/identity/verify/accepting-ids-from-wallet-online)). We found no documented way for a non-government issuer to put an SD-JWT credential into Google Wallet. Android's Credential Manager does let third-party wallet apps register SD-JWT VC and mdoc credentials for the Digital Credentials API ([Android](https://developer.android.com/identity/digital-credentials/credential-holder)).
- **Microsoft Entra Verified ID** lists W3C VC Data Model 1.1 credentials as JWTs, `did:web`, SIOPv2, DIF Presentation Exchange v2.0.0, OpenID4VCI (linked to draft 11) and the 2023 W3C Status List draft. It lists no SD-JWT VC, mdoc or DCQL ([standards page](https://learn.microsoft.com/en-us/entra/verified-id/verifiable-credentials-standards), updated March 2026). Its `VerifiedEmployee` credential has a fixed claim set that includes `photo` ([Microsoft](https://learn.microsoft.com/en-us/entra/verified-id/how-to-use-quickstart-verifiedemployee)). LinkedIn shows Entra workplace verifications for "participating companies" inside its mobile app, and doesn't display the credential ([LinkedIn](https://www.linkedin.com/help/linkedin/answer/a1453679)). A Microsoft moderator wrote in April 2025 that onboarding of new organizations was paused ([Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/2247498/)). We found no later announcement that it has resumed.
- **EU Digital Identity Wallets.** Member States must provide wallets within 24 months of the implementing acts entering into force ([Regulation (EU) 2024/1183, Art. 5a(1)](https://eur-lex.europa.eu/eli/reg/2024/1183/oj/eng)). The first of those acts were published on 4 December 2024, which by our reading puts the deadline at about December 2026. The rules for registering relying parties apply from 24 December 2026. Where a Member State issues registration certificates, wallets must tell users when a relying party asks for data it didn't register ([Implementing Regulation (EU) 2025/848](https://eur-lex.europa.eu/eli/reg_impl/2025/848/oj/eng), Arts. 8 and 11). The PID Rulebook removed its age attributes in version 1.1 ([rulebook](https://github.com/eu-digital-identity-wallet/eudi-doc-attestation-rulebooks-catalog/blob/main/rulebooks/pid/pid-rulebook.md)).
- **Open Badges 3.0 and CLR 2.0** use W3C credentials with JWT or Data Integrity proofs, Bitstring Status List, and hashed recipient identifiers ([Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0), [CLR 2.0](https://www.imsglobal.org/spec/clr/v2p0)). We couldn't confirm wallets that present them over OpenID4VP.

So the credentials of this RFC work today with EUDI-style and third-party wallets on Android, and with third-party wallets reached by QR code or link on iOS. Government mDLs work through both platforms' built-in wallets.

### 9. Conformance fixtures

For the [OJCP conformance suite](https://github.com/ojcp-org/conformance):

- **Types:** a claim outside the type (invalid); `name` or `status` at the top level (invalid); `exp` beyond the lifetime cap; `vct#integrity` mismatch; `basis` missing; `customer_records` without an organization `id`; coarse claims missing where exact values exist.
- **Keys:** `iat` after `ojcp_sign_until` (rejected); a credential checked after `ojcp_sign_until` plus the lifetime (rejected); a credential issued on the day of `ojcp_sign_until` (accepted); `ojcp_sign_until` pushed back (key distrusted); an expired `x5c` leaf (rejected).
- **Status:** a list without `exp`, or with `ttl` above 12 hours; a status URI not in `status_lists`; fewer than 10,000 indexes.
- **Metadata:** `ojcp_issuer` missing `consumer_reporting_agency` for a `customer_records` issuer.

## Security and privacy considerations

- **Backdating with retired keys.** Signing windows bound how long a leaked key stays useful (§5.1). Without them, a key retired years ago could mint "past employment" whenever it leaked.
- **Platform customers.** A fraudulent customer of an HR platform can load fake employees. `basis: customer_records` and the organization `id` make that risk visible, and the practice statement says what the platform checks. Verifiers decide. Nothing here makes a platform's word equal to the employer's.
- **Type metadata.** `vct#integrity` and immutable `v1` documents keep whoever operates `spec.ojcp.dev` from changing what wallets show at consent. Bundled metadata means wallets don't contact that site when someone presents.
- **Linkability.** Batch issuance stops providers from linking presentations to each other only if wallets use a fresh credential per verifier. Issuers can link if they keep signatures, which §4.1 asks them not to. Coarse claims disclose less, but a name and an employer identify a person anyway.
- **Status lists.** Large lists shared across customers, published in advance, give herd privacy ([TSL §12.1](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-status-list-14#section-12.1)). Per-employer lists would reveal the candidate's employer to anyone watching fetches.
- **Former-employee retrieval.** Offers go only to contacts on record, with the `tx_code` sent by a separate channel, so an attacker can't redirect a former employee's credential to themselves.
- **What isn't covered.** Work-authorization claims (see Alternatives), protected characteristics, and dates of birth are not part of any type.

## Affected areas

- [x] New normative text: the four types, their Type Metadata and mdoc doctypes under the `spec.ojcp.dev` namespace; `basis`; the issuer profiles; signing windows (`ojcp_sign_until`); status-list rules; former-employee routes; `ojcp_issuer` metadata.
- [x] *Interoperability*: rows for OpenID4VCI 1.0, HAIP 1.0 and HR Open LER-RS; the SD-JWT VC row extended to hiring credentials.
- [x] *Scope*: issuer practices beyond this profile stay outside OJCP.
- [ ] Spec sections and schemas for verification steps, manifests and tools: changed by RFC 0013, not here.

## Alternatives considered

- **Issuing on an employer's behalf with the employer's key.** This would let a platform sign "Globex attests". But it requires every former employer to run identity keys, logs and attestations, and HAIP wallets wouldn't accept it as specified. Left as an open question.
- **A work-authorization pre-screen type.** Excluded. Employers may use Form I-9 information only for immigration enforcement ([8 U.S.C. § 1324a(b)(5)](https://www.law.cornell.edu/uscode/text/8/1324a)), and E-Verify warns that requiring proof of work authorization before hire "may constitute a violation" of the anti-discrimination provision ([E-Verify](https://www.e-verify.gov/employers-0)). That leaves no lawful mainstream issuer.
- **LER-RS W3C credentials as the baseline.** LER-RS's credential wrapper is a JSON-LD W3C VC, which HAIP doesn't profile and current platform wallets don't hold. We reuse its names and accept its credentials through RFC 0013.
- **Keys resolved live from metadata, unpinned.** Simpler for verifiers, but anyone who takes over the issuer's domain could then forge credentials. Verifiers pin keys (RFC 0013), and issuers keep the single sign-on practice of publishing keys.
- **HAIP only.** It sets a bar most HR vendors can't clear quickly. HAIP is the optional High-assurance profile instead.
- **Exact dates only.** Simpler, but it forces over-disclosure, and exact dates can act as age proxies.

## Breaking changes

None. This RFC adds types and an issuer profile. It changes no existing schema or behavior.

## Open questions

1. **Issuing on an employer's behalf.** Should a later RFC let an organization authorize a platform to sign in the organization's own name (for example through a CA key the organization controls, so HAIP wallets accept it), and what would former employers need to run for that?
2. **mdoc entitlements.** Will Apple grant identity-document-provider entitlements for the doctypes of §2.4?
3. **Lifetimes.** Are 90 days for current employment and 2 years otherwise right, given that wallets refresh with refresh tokens?
4. **Status timing.** Is 7 days achievable for every HRIS, and is it short enough?
5. **Consumer reporting.** Does a report that the consumer relays count as furnished by the issuer? This needs counsel and possibly regulator guidance.
6. **More types.** Should references, security clearances or union cards follow, and under what minimization rules?

## Interests

Recruitics, the author's employer, operates an OJCP provider and a job-distribution business that earns revenue per application, so it has a commercial interest in how applications are verified. Recruitics holds Seat 1 on the OJCP steering committee, which governs `spec.ojcp.dev`. Hosting of that site falls under the *Infrastructure Succession* plan in `GOVERNANCE.md`, and `vct#integrity` means no host can change the type definitions anyway. The author invites co-sponsors from other organizations, particularly HR system vendors, universities, licensing bodies and wallet providers, and will recuse from the vote that resolves this RFC.

## For maintainers — comment period and resolution

Comment period opens:

Comment period closes:

Resolution:

Decision record:
