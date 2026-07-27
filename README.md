# Source Integrity Registry (SIR)

> Before SIR governs source bodies, SIR proves the contract by which source bodies may be governed.

SIR validates declared physical-to-logical source bindings against an exact,
immutable schema identity resolved from a local trusted catalog. It performs no
network retrieval, never mutates the payloads it validates, and reduces every
run to one authoritative signal plus canonical testimony.

This is **Step Zero**: schema governance and registry contract validation, plus
whole-file physical body observation. Source interpretation (AST inspection,
sub-file locators, responsibility traceability) is deliberately downstream.

## Install

```bash
pnpm install
pnpm build
```

## CLI

```bash
sir validate <registry-path> [--catalog <path>] [--workspace <root>] [--format text|json]
```

| Option | Meaning |
| --- | --- |
| `--catalog` | Trusted schema catalog. Defaults to the packaged catalog. |
| `--workspace` | Workspace root for physical body observation. Omit for a contract check only. |
| `--format` | `text` (default) or `json` (emits the full receipt). |

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | registry valid |
| `2` | invalid command or arguments |
| `3` | schema not admitted |
| `4` | schema digest mismatch |
| `5` | registry contract invalid |
| `6` | execution failure |

Exit codes are part of the published contract. Pipelines branch on them, so
they are as immutable as the schemas.

## Library

```typescript
import { validatesSourceIntegrityRegistry } from "@deterministic-solutions/source-integrity-registry";

const receipt = await validatesSourceIntegrityRegistry({
  registryPath,
  schemaCatalogPath,
  workspaceRoot // optional; enables physical body observation
});

if (receipt.disposition !== "REGISTRY_CONTRACT_VALID") {
  console.error(receipt.findings);
}
```

## The validation circuit

```text
 1. Read payload bytes
 2. Parse authority, preserving duplicate-member evidence
 3. Extract contract.schemaId
 4. Admit the packaged catalog schema as bootstrap authority
 5. Admit the caller catalog under that contract
 6. Enforce the unique schemaId witness
 7. Resolve the schema path under the real contracts root
 8. Read, re-stat, and digest the schema authority
 9. Bind requested, catalog, and loaded identity, dialect, family, and version
10. Validate against the Draft 2020-12 meta-schema and compile
11. Validate the registry payload
12. Canonicalize findings in code-point order
13. Produce the validation receipt
```

Catalog admission, schema admission, and digest verification all precede
payload evaluation and stop the circuit on failure: SIR refuses to evaluate a
payload under a schema it cannot first prove trustworthy. A caller-supplied
catalog can never choose or redefine the contract that establishes its own
validity.

### Dispositions

| Disposition | Meaning |
| --- | --- |
| `REGISTRY_CONTRACT_VALID` | The payload conforms to its declared schema. |
| `REGISTRY_CONTRACT_INVALID` | The payload violates its declared schema, or its raw JSON repeats a member name. |
| `SCHEMA_NOT_ADMITTED` | The catalog or schema authority is invalid, or the declared identity is absent, revoked, floating, aliased, or disagrees with the loaded schema. |
| `SCHEMA_DIGEST_MISMATCH` | The schema bytes on disk disagree with the catalog digest. |
| `SOURCE_BODY_DRIFT` | The contract is valid but observed bodies diverge from declared digests or containment. |

Mechanical failure — unreadable input, permission failure, an unexpected
internal fault — produces **no receipt verdict** and exits `6`. It is never
folded into the disposition set.

`allErrors: true` retains every finding for diagnosis, but the parent circuit
consumes exactly one signal.

## Three identities, kept separate

| Identity | Location | Meaning |
| --- | --- | --- |
| `$schema` | SIR schema document | JSON Schema dialect (Draft 2020-12) |
| `$id` | SIR schema document | Exact immutable identity of that schema |
| `contract.schemaId` | SIR registry payload | Exact schema governing this payload |

The redundancy between the `schemaId` version segment, the `schemaVersion`
field, and the optional `schemaDigest` is deliberate — and any disagreement is
a hard admission failure, checked before the payload is evaluated.

Floating identifiers are structurally forbidden:

```text
Forbidden:  .../source-integrity-registry/latest/schema.json
            .../source-integrity-registry/1.x/schema.json
Required:   .../source-integrity-registry/1.0.0/schema.json
```

## Contracts

```text
contracts/
├── catalog/
│   ├── 1.0.0/sir-schema-catalog.schema.json
│   └── sir-schema-catalog.v1.json          # generated: digests computed from bytes
├── source-integrity-registry/1.0.0/
├── source-integrity-validation-receipt/1.0.0/
└── generated/typescript/                    # generated: compile-time projections
```

Published schemas are immutable. Once `1.0.0` is accepted, its bytes, digest,
and meaning never change — fixing a typo creates a new physical version.

| Change | Version |
| --- | --- |
| Documentation or annotation change with no validation-set change | Patch |
| New optional field or backward-compatible accepted shape | Minor |
| New required field, removed field, narrowed constraint, renamed meaning | Major |

There is no implicit migration. A payload declaring `1.0.0` is validated under
`1.0.0`; the validator never inserts defaults, coerces values, renames fields,
or upgrades versions.

### Regenerating

```bash
pnpm generate:catalog   # recompute catalog digests from schema bytes
pnpm generate:types     # project TypeScript declarations from schemas
pnpm check:generated    # fail if committed artifacts are stale
```

Generated types are compile-time guardrails. They never replace AJV runtime
validation and never become canonical authority.

## Declared truth vs observed truth

The registry carries declared bindings only — no observed status, no
conformance disposition, no timestamps. Observation belongs to receipts.

Body identity is the **member name**, not a value field, so two logical bodies
cannot occupy one structural coordinate:

```json
{
  "entries": {
    "semantic-kernel-runtime": {
      "responsibility": { "kind": "execution" },
      "source": { "relativePath": "src/kernel/semantic-kernel.ts" }
    }
  }
}
```

Receipt observations are keyed the same way and constructed in code-point order,
so equal inputs produce byte-identical testimony. Body findings use RFC 6901
escaped pointers such as `/entries/semantic-kernel-runtime/source`.

Step Zero observes whole-file bytes. A `named-declaration` or `named-export`
locator reports `BODY_LOCATOR_UNRESOLVED` rather than silently comparing the
whole file, because a narrower locator designates a different body.

## Authority parsing

Every authority document — registry, catalog, loaded schema, and the schemas
consumed by the generators — goes through one duplicate-aware parser.

`JSON.parse` silently keeps the last of several duplicate members, so a
document can carry two conflicting declarations while presenting one. SIR
witnesses that instead: a repeated member name is refused with its RFC 6901
pointer. There is no fallback to `JSON.parse`, no coercion, and no repair.

## Containment and the stable-snapshot precondition

Path containment is checked twice: lexically first, then again after the target
is resolved to its real filesystem identity. A symbolic link or Windows
junction inside a root can still resolve to bytes outside it, so lexical
containment alone is not enough.

Each schema and source target is resolved and stat'd, read, then resolved and
stat'd again; observable identity or metadata change is refused.

> SIR detects ordinary concurrent drift under a stable snapshot. It does **not**
> claim race-free security against a hostile filesystem.

## Development

```bash
pnpm typecheck
pnpm test
pnpm prove          # the sole pre-release conformance command
```

`pnpm prove` runs typechecking, the plain test command, comparison-only
generated and traceability checks, a fresh staged build, and a packed-consumer
smoke test. It never repairs anything, and it leaves tracked content unchanged.

`prepack` runs `prove:core` only — the outer proof packs, so making `prepack`
the full proof would recurse.

## Remediation governance

The analysis ledger and remediation plan carry typed `sir-analysis` and
`sir-trace` blocks. A generated projection lives at
[docs/generated/source-integrity-registry-remediation-analysis-index.v1.json](docs/generated/source-integrity-registry-remediation-analysis-index.v1.json)
and is verified — never repaired — by `pnpm check:remediation-index`.

```bash
pnpm generate:remediation-index   # explicit authoring action, outside proof
```

The acceptance scenarios in
[features/admit-source-integrity-registry.feature](features/admit-source-integrity-registry.feature)
are covered one test per scenario in
[tests/admit-registry-contract.test.ts](tests/admit-registry-contract.test.ts).
