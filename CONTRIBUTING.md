# Contributing to OJCP

Thank you for your interest in the Open Job Context Protocol. OJCP is an open specification and we welcome contributions from job boards, ATS vendors, agent platform developers, and employers.

## How to Contribute

### Reporting Issues

Open a GitHub Issue for:

- Ambiguities or gaps in the spec
- Interoperability concerns with MCP, WebMCP, schema.org, or existing job feed formats
- Security or privacy concerns
- Requests for new tools, fields, or apply path types

### Proposing Changes (RFC Process)

All substantive changes to the spec follow an RFC process:

1. **Fork** the repository and create a branch named `rfc/short-description`.
2. **Write your proposal** as a modification to the spec in `spec/ojcp-v0.1.bs` or as a new document in `docs/rfcs/`.
3. **Open a Pull Request** with:
   - A clear title prefixed with `RFC:` (e.g., `RFC: Add interview scheduling tool`)
   - A summary of the motivation and proposed change
   - Any relevant examples or schema changes
4. **Comment period**: RFCs are open for community review for **30 days** from the date the PR is opened.
5. **Resolution**: After the comment period, the steering committee will accept, request revisions, or decline the proposal.

### What Counts as Substantive

Changes that require the RFC process:

- Adding, removing, or modifying tool definitions
- Changes to core data schemas (JobPosting, CandidateContext, AgentDeclaration)
- New apply path types
- Changes to the manifest format
- Security or privacy model changes

Changes that do **not** require an RFC:

- Typo fixes and editorial clarifications
- Adding examples
- Improving documentation
- Fixing JSON Schema validation issues

### Schema and Example Changes

When modifying schemas in `schemas/`:

- Ensure the schema is valid JSON Schema (Draft 2020-12)
- Update corresponding examples in `examples/` to match
- Validate examples against schemas before submitting

## Developer Certificate of Origin (DCO)

All contributions to OJCP require a [Developer Certificate of Origin](https://developercertificate.org/) sign-off. This is a lightweight mechanism (used by the Linux kernel, CNCF, and many open standards) that certifies you have the right to submit your contribution under the project's license.

Add a `Signed-off-by` line to your commit messages:

```
Signed-off-by: Jane Doe <jane@example.com>
```

You can do this automatically with `git commit -s`.

By signing off, you certify that:

1. The contribution was created in whole or in part by you and you have the right to submit it under the **applicable project license** (see below); or
2. The contribution is based upon previous work that, to the best of your knowledge, is covered under an appropriate open-source license compatible with the applicable project license, and you have the right to submit that work with modifications; or
3. The contribution was provided directly to you by some other person who certified (1) or (2) and you have not modified it.

### Applicable project license

OJCP uses two licenses depending on what you're contributing:

| You're modifying… | License you're contributing under |
|-------------------|----------------------------------|
| `spec/`, `schemas/`, `examples/`, `docs/` | **CC BY 4.0** |
| Reference implementations, CI configuration, build tooling | **Apache License 2.0** |

A single pull request that touches both (e.g., a schema change plus a CI update) is contributed under both licenses simultaneously, with each file licensed according to its category. The DCO sign-off applies to whichever license(s) are relevant to your change.

### Patent commitments

OJCP's patent model is **tiered and opt-in** — most contributions require only DCO sign-off, and you may contribute (or hold a steering seat) in your individual capacity without binding an employer. The full tiers, the non-assertion covenant, and the individual-capacity / invited-expert path are defined in **[GOVERNANCE.md § Patent Policy](GOVERNANCE.md#patent-policy)**.

If you become aware of a patent claim (yours, your employer's, or a third party's) that is necessarily infringed by something you're contributing, disclose it in the PR.

## Recognition

Contributors who make substantive contributions (spec review, design feedback, schema improvements, implementations) are acknowledged by name and affiliation in the [Acknowledgements section](spec/ojcp-v0.1.bs) of the specification. This is a permanent part of the published standard.

If you'd like to be listed, include your preferred name and affiliation in your first PR.

## Code of Conduct

Be respectful, constructive, and assume good faith. This is a collaborative effort across competing organizations — focus on what makes the standard better for the ecosystem.

## License

By contributing, you agree that your contributions will be licensed under the applicable project license (see [Applicable project license](#applicable-project-license) above): CC BY 4.0 for specification/schema/example/documentation contributions, or [Apache License 2.0](LICENSE) for code, tooling, and CI contributions.

## Contact

- GitHub Issues: For spec feedback and proposals
- Email: ojcp-discuss@recruitics.com
