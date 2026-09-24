---
name: RFC Proposal
about: Propose a substantive change to the OJCP specification
labels: rfc
---

## RFC: Inline identity verification via MCP Apps

- **Authors:** Austin Anderson, Recruitics
- **Status:** Draft
- **Created:** 2026-09-24
- **Builds on:** the Identity Verification model (Verification Step, Verifier Manifest, Verification Proof). Composes with the [MCP Apps extension](https://apps.extensions.modelcontextprotocol.io), which lets a tool return an interactive UI resource that the host renders in a sandboxed iframe.

### Motivation

When a role requires verified human identity, a verification step today returns a `verification_url`. The candidate leaves the conversation, completes the verifier's hosted flow (for example ID.me or Clear), and returns. That redirect is a context switch at the most sensitive moment of the application, and context switches are where candidates drop off.

The verification action is one that only a human can perform. A face scan, a liveness check, or a document upload cannot be delegated to the agent, and the schema already marks these steps `human_required`. So rendering the flow inline does not remove any agent automation. It improves the one step that was always going to be human, and it is the case where an interactive UI clearly beats a link.

MCP Apps give a clean way to do this. A tool can reference a `ui://` resource that the host renders inside the conversation in a sandboxed iframe. A verifier can render its flow there instead of handing back a link, and the candidate completes verification without leaving the chat.

This composes with, rather than weakens, OJCP's privacy model. The verifier's UI runs in the verifier's own origin inside the host's sandbox. Raw PII (the face scan, the document) is handled by the verifier, never by OJCP. Only the existing signed, opaque proof crosses back through the protocol.

### Proposal

Three small, additive changes. Absent all of them, verification behaves exactly as it does today.

**1. Advertise inline rendering in the verifier manifest.**

Add `embedded_app` to `proof_delivery_methods` in `/.well-known/ojcp-verifier.json`, so an agent or host can discover that a verifier supports being rendered inline:

```json
"proof_delivery_methods": ["callback", "redirect", "polling", "embedded_app"]
```

**2. Carry a UI resource on the verification step.**

Add an optional `ui_resource` to `VerificationStep`, a `ui://` URI for an MCP Apps resource the host can render:

```json
{
  "step_id": "vs_1",
  "type": "identity",
  "verifier_id": "id.me",
  "human_required": true,
  "verification_url": "https://verify.id.me/flow/abc123",
  "ui_resource": "ui://id.me/verify/abc123",
  "proof_delivery": "provider_managed",
  "expires_at": "2026-09-25T14:30:00Z"
}
```

**3. Require the link as a fallback.**

`ui_resource` is OPTIONAL. `verification_url` MUST always be present. A host that does not support MCP Apps, or a candidate on a surface that cannot render it, falls back to the link with no loss of function. Providers and verifiers MUST NOT return a step that can only be completed through `ui_resource`.

**Proof delivery is unchanged.** The proof still returns through the existing model. For `provider_managed` steps the verifier delivers the proof to the provider by callback, and the app only drives the candidate interaction. For `agent_submitted` steps the app returns the proof to the host, which supplies it to `submit_application` in `verification_proofs`, exactly as an agent-collected proof does today.

**Obligations:**

- Verifiers that set `embedded_app` MUST serve a `ui://` resource that completes the same verification and yields the same proof as their hosted flow, and MUST keep `verification_url` valid as the fallback.
- Providers MUST treat a step whose proof arrives through the app identically to one completed through the hosted URL. The delivery surface does not change how the proof is validated.
- Hosts render the resource in a sandbox and remain the enforcement point for permissions and for which origins the app may load (CSP), per MCP Apps.

### Openness and portability

The verifier owns and hosts the UI, the same way it owns its hosted flow today. OJCP defines only the advertisement (`embedded_app`) and the fallback contract, not the UI itself. This keeps verifiers interchangeable: an agent that cannot render the app, or a provider that prefers the redirect, is never blocked. The inline path is an enhancement to a flow that already works without it.

### Affected areas

- [ ] Tool definitions
- [x] Core schemas (`VerificationStep` gains optional `ui_resource`; verifier manifest `proof_delivery_methods` gains `embedded_app`)
- [ ] Apply path types
- [ ] Manifest format
- [x] Identity verification (inline rendering as an alternative delivery surface)
- [x] Security / privacy model (verifier UI runs sandboxed in its own origin; no PII through the protocol)
- [ ] Other:

### Alternatives considered

- **Leave it entirely to providers (no spec change).** A verifier could attach a `ui://` resource through MCP Apps today without OJCP saying anything. Rejected as insufficient: an agent or host has no way to *discover* that inline verification is available, and there is no defined fallback contract. Discovery plus fallback is contract, not presentation, which is why it belongs in the spec.
- **Use WebMCP instead.** WebMCP annotates forms on a rendered web page. It fits the provider-hosted apply page, not a verifier flow rendered inside a conversation host. MCP Apps is the conversation-native mechanism for this, and the two do not overlap here.
- **Require the app, drop the link.** Rejected. MCP Apps host support varies and is still stabilizing, so a required app path would break every host that does not support it. The link fallback is mandatory.

### Breaking changes

None. `ui_resource` is optional, `verification_url` remains required, and `embedded_app` is a new optional value in an existing enum. A verifier that does not offer inline rendering, and a host that does not support MCP Apps, behave exactly as in v0.2.

### Open questions

- **Proof return path for `agent_submitted` apps.** The exact channel by which the app hands the proof back to the host (a returned value versus a proxied tool call) should be pinned down against the MCP Apps message dialect.
- **Permissions and CSP.** Whether the verifier manifest should declare the origins and permissions its app needs, so a host can decide up front whether it can render the flow.
- **Extension maturity.** MCP Apps is an extension to core MCP with varying host support. This RFC should track its stabilization and stay optional until support is broad.

---

### For maintainers — comment period and resolution

- **Comment period opens:** 2026-09-24
- **Comment period closes:** 2026-10-24 (30 days)
- **Resolution:** <!-- Accepted / Revisions requested / Declined / Withdrawn -->
- **Decision record:** <!-- link to docs/decisions/NNNN-*.md -->
- **Recusals:** <!-- list any committee members who recused; reason -->
