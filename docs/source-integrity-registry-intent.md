# Exactly, SIR SID — this is the corrected **Step Zero**

The first SIR implementation should **not** begin by scanning TypeScript ASTs or interpreting code. It should begin by proving that its own physical-to-logical registry contract is valid and that every submitted registry payload conforms to an exact, immutable version of that contract.

```text
JSON Schema meta-schema
        ↓
validates the SIR schema
        ↓
SIR schema enters the trusted schema catalog
        ↓
SIR payload declares its exact schema identity
        ↓
AJV validates the payload
        ↓
canonical validation receipt
```

That gives us governance before source inspection, semantic resolution, or kernel integration.

## The versioning decision

**Yes: every durable SIR payload must declare the exact schema that governs it.**

But I would not use the instance’s `$schema` property for that purpose. The standard `$schema` keyword identifies the **JSON Schema dialect used to author a schema**, while `$id` identifies that schema itself. JSON Schema recommends explicit, version-specific dialect URIs and a unique `$id` for each schema. ([JSON Schema][1])

Therefore, we keep three identities separate:

| Identity            | Location             | Meaning                                     |
| ------------------- | -------------------- | ------------------------------------------- |
| `$schema`           | SIR schema document  | JSON Schema dialect, such as Draft 2020-12  |
| `$id`               | SIR schema document  | Exact immutable identity of that SIR schema |
| `contract.schemaId` | SIR registry payload | Exact SIR schema that governs this payload  |

## SIR schema identity

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
  "title": "Source Integrity Registry",
  "type": "object"
}
```

Draft 2020-12 has its own AJV implementation class and is not intended to be mixed with earlier JSON Schema drafts in the same AJV instance. For SIR v0.1, we should support **Draft 2020-12 only**. ([Ajv][2])

## Registry payload identity

```json
{
  "contract": {
    "contractType": "source-integrity-registry",
    "schemaId": "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
    "schemaVersion": "1.0.0",
    "schemaDigest": "sha256:..."
  },
  "registryId": "sir-semantic-kernel-main",
  "workspace": {
    "workspaceId": "semantic-kernel",
    "revision": "2704a5909250f7cc56a91d2bf9ddee514c86e871"
  },
  "entries": []
}
```

The redundancy is deliberate.

```text
schemaId URI version
        =
schemaVersion field
        =
schema file version
        =
schemaDigest
```

Any disagreement is a hard admission failure.

---

# Immutable schema catalog

SIR should never retrieve an unknown schema from the network during validation.

AJV can identify and cache schemas by `$id`; a URI-shaped `$id` does not mean AJV automatically downloads that URI. Schemas can be pre-added and retrieved from the local AJV cache. ([Ajv][3])

The trusted catalog would look like this:

```text
contracts/
├── catalog/
│   └── sir-schema-catalog.v1.json
│
├── source-integrity-registry/
│   ├── 1.0.0/
│   │   └── source-integrity-registry.schema.json
│   └── 1.1.0/
│       └── source-integrity-registry.schema.json
│
├── source-integrity-validation-receipt/
│   └── 1.0.0/
│       └── source-integrity-validation-receipt.schema.json
│
└── generated/
    └── typescript/
```

Catalog entry:

```json
{
  "schemaId": "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
  "schemaFamily": "source-integrity-registry",
  "schemaVersion": "1.0.0",
  "dialect": "https://json-schema.org/draft/2020-12/schema",
  "relativePath": "source-integrity-registry/1.0.0/source-integrity-registry.schema.json",
  "sha256": "sha256:...",
  "status": "accepted"
}
```

No floating identifiers:

```text
Forbidden:
source-integrity-registry/latest
source-integrity-registry/1.x
source-integrity-registry/^1.0.0

Required:
source-integrity-registry/1.0.0/schema.json
```

A durable payload must always point to one exact rule set.

---

# The SIR validation circuit

```text
1. Read payload bytes
        ↓
2. Parse JSON without mutation
        ↓
3. Extract contract.schemaId
        ↓
4. Resolve exact schema from local catalog
        ↓
5. Verify catalog schema digest
        ↓
6. Validate schema against Draft 2020-12 meta-schema
        ↓
7. Compile or obtain cached AJV validator
        ↓
8. Validate registry payload
        ↓
9. Canonicalize validation findings
        ↓
10. Produce validation receipt
```

AJV validates schemas against their meta-schema by default when `validateSchema` is enabled, and strict mode is designed to expose ignored, unknown, or ambiguous schema constructions instead of silently accepting them. ([Ajv][4])

## AJV configuration

```typescript
import Ajv2020 from "ajv/dist/2020.js";

export function createsSirSchemaValidator(): Ajv2020 {
  return new Ajv2020({
    strict: true,
    validateSchema: true,
    allErrors: true,

    // Validation must never mutate authority payloads.
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,

    // Ignore inherited object properties.
    ownProperties: true
  });
}
```

`allErrors: true` does not mean SIR creates dozens of independent red signals. The entire structural check remains one transistor:

```text
Transistor:
registry-payload-conforms-to-declared-schema

GREEN:
No AJV findings.

RED:
One or more AJV findings exist.
```

The receipt may retain all findings for diagnosis, but the parent circuit receives one authoritative signal:

```text
REGISTRY_CONTRACT_VALID
or
REGISTRY_CONTRACT_INVALID
```

---

# Schema versioning rules

## Published schemas are immutable

Once `1.0.0` is accepted:

```text
1.0.0 bytes never change.
1.0.0 digest never changes.
1.0.0 meaning never changes.
```

Even fixing a typo creates a new physical version if the source-controlled bytes change.

## Semantic version posture

| Change                                                                  | Version |
| ----------------------------------------------------------------------- | ------- |
| Documentation or annotation change with no validation-set change        | Patch   |
| New optional field or backward-compatible accepted shape                | Minor   |
| New required field, removed field, narrowed constraint, renamed meaning | Major   |

The engine does not automatically reinterpret old payloads using the newest schema.

```text
Payload declares 1.0.0
        ↓
Validate under 1.0.0

Payload declares 2.0.0
        ↓
Validate under 2.0.0
```

## No implicit migration

Migration is a separate deterministic capability:

```text
Old registry payload
        +
declared migration authority
        ↓
migrated registry payload
        +
migration receipt
```

The validator must never silently insert defaults, rename fields, coerce values, or upgrade versions.

---

# The first SIR contract

The registry itself should initially own only **declared physical-to-logical bindings**.

```json
{
  "contract": {
    "contractType": "source-integrity-registry",
    "schemaId": "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
    "schemaVersion": "1.0.0",
    "schemaDigest": "sha256:..."
  },
  "registryId": "sir-semantic-kernel-main",
  "workspace": {
    "workspaceId": "semantic-kernel",
    "revision": "2704a5909250f7cc56a91d2bf9ddee514c86e871"
  },
  "entries": [
    {
      "bodyId": "semantic-kernel-runtime",
      "responsibility": {
        "capabilityId": "semantic-kernel",
        "featureId": "execute-semantic-authority",
        "scenarioId": "execute-one-semantic-model",
        "responsibilityId": "executes-resolved-semantic-model",
        "obligationId": "execute-ordered-authorized-steps",
        "kind": "execution"
      },
      "source": {
        "relativePath": "src/kernel/semantic-kernel.ts",
        "language": "typescript",
        "locator": {
          "kind": "named-declaration",
          "name": "SemanticKernel"
        },
        "hash": {
          "algorithm": "sha256",
          "expected": "sha256:..."
        }
      },
      "authority": {
        "gherkinReference": "features/execute-semantic-authority.feature",
        "semanticAuthorityReference": "semantic-authority/execution/execute-semantic-authority.sej.v1.json"
      }
    }
  ]
}
```

Notice what is not in the registry:

```text
No observed status
No current file hash
No conformance disposition
No validation errors
No timestamps
No guessed taxonomy
```

Those belong in observation and validation receipts.

```text
Registry payload
    = declared truth

Validation receipt
    = observed truth
```

---

# The three Step-Zero schemas

The first implementation needs only three authoritative contracts:

```text
1. sir-schema-catalog.schema.json
   Governs which schemas are trusted.

2. source-integrity-registry.schema.json
   Governs physical-to-logical body declarations.

3. source-integrity-validation-receipt.schema.json
   Governs validation testimony.
```

Generated TypeScript types are downstream projections:

```text
JSON Schema
    ↓
Type projection
    ↓
Generated TypeScript
```

They are useful compile-time guardrails, but they never replace AJV runtime validation and never become canonical authority.

---

# First acceptance scenarios

```gherkin
Feature: Admit a Source Integrity Registry contract

  Scenario: Admit a registry governed by an accepted schema
    Given a registry payload declaring an exact accepted schema identity
    When the registry contract is validated
    Then the payload conforms to the declared schema
    And the validation receipt disposition is REGISTRY_CONTRACT_VALID

  Scenario: Reject an unknown schema identity
    Given a registry payload declaring a schema absent from the trusted catalog
    When the registry contract is validated
    Then validation stops before payload evaluation
    And the receipt disposition is SCHEMA_NOT_ADMITTED

  Scenario: Reject a mutated historical schema
    Given an accepted schema identity whose observed bytes do not match its catalog digest
    When the schema is resolved
    Then schema admission is rejected
    And the receipt disposition is SCHEMA_DIGEST_MISMATCH

  Scenario: Reject a structurally invalid registry
    Given a registry payload governed by an accepted schema
    When the registry contract is validated
    Then canonical validation findings identify the invalid instance paths
    And the receipt disposition is REGISTRY_CONTRACT_INVALID
```

# The corrected SIR sequence

```text
STEP ZERO
Schema governance
    ↓
Registry contract validation
    ↓
Generated compile-time types
    ↓
Physical body observation
    ↓
Hash conformance
    ↓
Responsibility traceability
    ↓
Drift reporting
```

So yes—the payload declares an exact schema URI, but through a dedicated `contract.schemaId`. The schema itself uses `$schema` for the Draft 2020-12 dialect and `$id` for its immutable versioned identity.

That gives SIR the right first principle:

> **Before SIR governs source bodies, SIR proves the contract by which source bodies may be governed.**

[1]: https://json-schema.org/learn/getting-started-step-by-step?utm_source=chatgpt.com "JSON Schema"
[2]: https://ajv.js.org/guide/schema-language?utm_source=chatgpt.com "Choosing schema language | Ajv JSON schema validator"
[3]: https://ajv.js.org/guide/managing-schemas.html?utm_source=chatgpt.com "Managing schemas | Ajv JSON schema validator"
[4]: https://ajv.js.org/options.html?utm_source=chatgpt.com "Ajv options | Ajv JSON schema validator"
