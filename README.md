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
2. Parse JSON without mutation
3. Extract contract.schemaId
4. Resolve exact schema from local catalog
5. Verify catalog schema digest
6. Validate schema against Draft 2020-12 meta-schema
7. Compile or obtain cached AJV validator
8. Validate registry payload
9. Canonicalize validation findings
10. Produce validation receipt
```

Schema admission and digest verification both precede payload evaluation and
stop the circuit on failure: SIR refuses to evaluate a payload under a schema
it cannot first prove trustworthy.

### Dispositions

| Disposition | Meaning |
| --- | --- |
| `REGISTRY_CONTRACT_VALID` | The payload conforms to its declared schema. |
| `REGISTRY_CONTRACT_INVALID` | The payload violates its declared schema. |
| `SCHEMA_NOT_ADMITTED` | The declared identity is absent, revoked, floating, or its restated facts disagree. |
| `SCHEMA_DIGEST_MISMATCH` | The schema bytes on disk disagree with the catalog digest. |
| `SOURCE_BODY_DRIFT` | The contract is valid but observed bodies diverge from declared digests. |

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

Step Zero observes whole-file bytes. A `named-declaration` or `named-export`
locator reports `BODY_LOCATOR_UNRESOLVED` rather than silently comparing the
whole file, because a narrower locator designates a different body.

## Development

```bash
pnpm typecheck
pnpm test
```

The acceptance scenarios in
[features/admit-source-integrity-registry.feature](features/admit-source-integrity-registry.feature)
are covered one test per scenario in
[tests/admit-registry-contract.test.ts](tests/admit-registry-contract.test.ts).
