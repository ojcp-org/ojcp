# OJCP JSON Schemas

JSON Schema (Draft 2020-12) definitions for the OJCP data model: the provider manifest, job postings, candidate context, agent declarations, and every tool's input and response shape.

## Schema identifiers

Each schema declares a stable `$id` under a versioned URL:

```
https://ojcp.dev/schemas/v0.1/<path>
```

where `<path>` mirrors this directory. For example:

| File | `$id` |
| --- | --- |
| `manifest.json` | `https://ojcp.dev/schemas/v0.1/manifest.json` |
| `job-posting.json` | `https://ojcp.dev/schemas/v0.1/job-posting.json` |
| `responses/search-jobs.json` | `https://ojcp.dev/schemas/v0.1/responses/search-jobs.json` |
| `tools/search-jobs-input.json` | `https://ojcp.dev/schemas/v0.1/tools/search-jobs-input.json` |

Cross-schema references use these same absolute URLs (for example, `responses/search-jobs.json` refers to a job by `$ref: https://ojcp.dev/schemas/v0.1/job-posting.json`).

The `v0.1` segment is the spec version, not a directory in this repo. On the published site these URLs resolve directly, so a validator that fetches `$ref` targets over the network works with no extra setup.

## Validating offline

For CI or air-gapped validation you will want to resolve references against the local files instead of the network. Note that the file layout drops the `v0.1` segment: `$id` `https://ojcp.dev/schemas/v0.1/responses/search-jobs.json` lives at `schemas/responses/search-jobs.json`.

The simplest approach is to load every schema and let your validator index them by their embedded `$id`. Cross-references then resolve in memory, and no URL-to-path mapping is needed. With [ajv](https://ajv.js.org):

```ts
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { globSync } from "glob";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// Register every schema; ajv keys each by its own $id.
for (const file of globSync("schemas/**/*.json")) {
  ajv.addSchema(JSON.parse(readFileSync(file, "utf8")));
}

// Retrieve a validator by $id; $refs resolve from the registry above.
const validate = ajv.getSchema(
  "https://ojcp.dev/schemas/v0.1/responses/search-jobs.json"
)!;

if (!validate(response)) console.error(validate.errors);
```

Validators that resolve `$ref` lazily instead of from a preloaded registry need a resolver that maps the `https://ojcp.dev/schemas/v0.1/` prefix to this directory.

For a ready-made harness that already does this, see the [conformance suite](https://github.com/ojcp-org/conformance).
