# Source Integrity Registry Pre-Release Remediation

## Status and release decision

This document defines the remediation required before the first SIR release.

The current `1.0.0` schemas are repository candidates. They have not been
published or accepted by an external consumer. Therefore:

- correct the existing `1.0.0` candidates in place;
- regenerate every derived artifact;
- do not create `2.0.0`, a migration, a revocation, or artificial history;
- freeze `1.0.0` only when it crosses an explicit external release or
  acceptance boundary.

An in-repository filename or catalog status does not, by itself, establish that
release boundary.

## Governing principle

SIR will make invalid declared states unrepresentable in JSON Schema whenever
possible. Runtime code will witness only facts that JSON Schema cannot observe:

- duplicate member names in the original JSON text;
- agreement between separate catalog and schema documents;
- digests of exact bytes;
- real filesystem containment;
- observed source-body bytes.

The intended division is:

```text
JSON Schema
    governs declared structure

Minimal runtime witnesses
    preserve facts lost during parsing
    prove cross-document identity
    prove byte digests
    prove real filesystem containment

Release provenance
    proves who authorized the trusted bytes
```

Release provenance is a distinct layer. It must not be confused with schema
conformance or internal digest agreement.

## Release blockers

The following findings must be corrected before release:

1. Registry entries are stored in an array, so distinct declarations can share
   a `bodyId` and still pass schema validation.
2. Ordinary JSON parsing silently collapses duplicate member names before AJV
   can inspect them.
3. Catalog resolution verifies bytes against a catalog digest without proving
   that the loaded schema's `$id` is the identity requested.
4. A custom catalog is parsed but is not validated against the trusted catalog
   contract before its entries are consulted.
5. Lexical path containment does not prevent escape through symbolic links,
   junctions, or other filesystem indirection.
6. The repository's default `pnpm test` command is not portable on the current
   24-core Windows environment without bounding Vitest workers.
7. The package has no single prepack gate proving that contracts, generated
   files, compiled output, and tests agree.

## Remediation slice 1: schema-native body identity

### Registry representation

Change `entries` from an array containing a `bodyId` field:

```json
{
  "entries": [
    {
      "bodyId": "semantic-kernel-runtime",
      "source": {}
    }
  ]
}
```

to an object whose member name is the body identity:

```json
{
  "entries": {
    "semantic-kernel-runtime": {
      "source": {}
    }
  }
}
```

The registry schema should govern the object structurally:

```json
{
  "entries": {
    "type": "object",
    "propertyNames": {
      "$ref": "#/$defs/identifier"
    },
    "additionalProperties": {
      "$ref": "#/$defs/registryEntry"
    }
  }
}
```

Remove `bodyId` from each `registryEntry`. The key becomes the only body
identity, eliminating key/value disagreement and first-match lookup behavior.

Generated TypeScript should project the structure as a readonly record:

```typescript
type RegistryEntries = Readonly<Record<string, RegistryEntry>>;
```

A branded `BodyId` type may be used by authored TypeScript, but the JSON Schema
identifier definition remains the runtime authority.

### Receipt observation representation

Apply the same structural rule to observed bodies in the receipt contract.
Change `observation.entries` to an object keyed by `bodyId`, and remove the
redundant `bodyId` field from each observed value.

Construct receipt keys in deterministic lexical order. A finding for a body
should use a precise escaped JSON Pointer such as:

```text
/entries/semantic-kernel-runtime/source
```

### Duplicate JSON member names

Object keys are unique after parsing, but raw JSON text can still repeat a
member name. `JSON.parse` normally discards that evidence.

Introduce one authority-JSON parser that rejects duplicate member names before
producing the JavaScript value. Use it for:

- registry payloads;
- catalog payloads;
- loaded JSON Schema documents.

The parser must:

- detect duplicates at every nesting depth;
- report the containing JSON Pointer and duplicated member name;
- preserve the exact original bytes for digesting;
- perform no coercion, defaulting, key rewriting, or mutation;
- reject the document rather than select a first or last value.

Do not attempt duplicate detection with regular expressions over JSON text.

Disposition behavior remains compact:

- a duplicate member in a registry is
  `REGISTRY_CONTRACT_INVALID`, with finding
  `SIR_PAYLOAD_DUPLICATE_MEMBER`;
- a duplicate member in a catalog makes the catalog untrustworthy and produces
  an execution failure;
- a duplicate member in a loaded schema prevents schema admission.

### Acceptance criteria

- Two distinct registry declarations cannot occupy the same `bodyId`.
- No registry, catalog, or schema containing duplicate JSON member names is
  evaluated after parsing.
- Observation performs direct key-based traversal and contains no `findIndex`
  or first-match behavior.
- Generated registry and receipt declarations reflect keyed records.
- Valid receipts still conform to the receipt schema.

## Remediation slice 2: catalog and schema identity admission

### Validate the catalog before lookup

Validate every loaded catalog against the packaged
`sir-schema-catalog/1.0.0` contract before consulting an entry. A caller-supplied
catalog must not select or redefine the schema used to establish its own
trustworthiness.

The current catalog array may remain in this remediation. Its existing
duplicate-`schemaId` loader check is a small, explicit cross-entry witness.
Changing the catalog coordinate system is not required to remove the current
false green.

Catalog admission must verify:

- the full catalog shape and closed properties;
- the catalog contract declaration;
- exact version and schema identity syntax;
- supported dialect;
- relative path syntax;
- digest syntax;
- accepted or revoked status;
- unique catalog `schemaId` values.

### Bind the requested identity to the loaded document

After reading and digesting schema bytes, compare:

```text
requested schemaId
    =
catalog entry schemaId
    =
loaded schema $id
```

Also compare:

```text
catalog dialect
    =
loaded schema $schema
    =
supported Draft 2020-12 dialect

catalog schemaFamily
    =
family parsed from loaded $id

catalog schemaVersion
    =
version parsed from loaded $id
```

Only then may AJV validate the schema against its meta-schema and compile it.

Keep `SCHEMA_NOT_ADMITTED` as the single admission disposition and CLI exit
code `3`. Preserve diagnostic precision through stable finding codes:

- `SIR_SCHEMA_ID_MISMATCH`;
- `SIR_SCHEMA_DIALECT_MISMATCH`;
- `SIR_SCHEMA_FAMILY_MISMATCH`;
- `SIR_SCHEMA_VERSION_MISMATCH`;
- `SIR_CATALOG_CONTRACT_INVALID`.

This preserves the one-signal circuit while making the reason exact.

### Acceptance criteria

- A registry schema identity mapped to receipt-schema bytes is rejected even
  when the catalog digest matches those bytes.
- A malformed custom catalog is rejected before entry lookup.
- A loaded schema with a mismatched `$schema`, family, or version is rejected
  before payload evaluation.
- Catalog or schema admission failure never falls through to registry
  validation.

## Remediation slice 3: real filesystem containment

Retain the current lexical checks as an early rejection layer, then establish
containment using resolved filesystem identities:

```text
real root
    +
real target
    +
relative(real root, real target)
    =
contained or rejected
```

Apply post-resolution containment to:

- schema files resolved from the catalog root;
- source bodies resolved from a workspace root.

The implementation must account for Windows drive letters, UNC paths,
junctions, symbolic links, and platform case behavior. Tests must exercise both
symbolic-link and Windows-junction escape when the host supports them.

For this remediation, real-path containment is mandatory. A stricter policy
that forbids all indirection inside the trusted catalog root may be added later
if release operations require that simpler guarantee.

### Acceptance criteria

- A lexically contained target resolving outside its real root is never read.
- A normal contained regular file remains readable.
- Missing targets retain the existing fail-closed behavior.
- The receipt does not expose bytes from an escaped target.

## Remediation slice 4: portable and complete proof command

Bound Vitest workers in committed configuration so plain `pnpm test` is the
same command used to claim a passing suite:

```typescript
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    minWorkers: 1,
    maxWorkers: 2
  }
});
```

Add one repository proof command and use it from `prepack`. The gate must cover:

1. static typechecking;
2. the exact default test command;
3. generated catalog and type drift;
4. a fresh build;
5. package-surface smoke validation.

The exact script composition may be adjusted to avoid duplicate builds, but a
package must not be produced from stale `dist` output.

### Acceptance criteria

- Plain `pnpm test` passes on the current Windows host.
- The same command runs in CI.
- Generated drift fails the proof command.
- A stale or failed build prevents packaging.
- The packed artifact contains the expected CLI, library, contracts, and
  generated declarations.

## Remediation slice 5: release provenance

Digest agreement proves internal consistency, not independent authorization.
Schema and catalog bytes can be changed together and assigned new matching
digests.

Before external publication, define a release gate binding:

```text
signed release identity
    ->
exact commit
    ->
exact package digest
    ->
exact catalog digest
    ->
exact schema digests
```

This work is deliberately separate from the contract-correction slices.
Registry validation should not claim release provenance, and provenance should
not be required to test an unreleased local candidate.

## Files and artifacts expected to change

The remediation is expected to touch:

- `contracts/source-integrity-registry/1.0.0/`;
- `contracts/source-integrity-validation-receipt/1.0.0/`;
- `contracts/catalog/1.0.0/` if catalog validation constraints need correction;
- `contracts/catalog/sir-schema-catalog.v1.json`;
- `contracts/generated/typescript/`;
- registry validation and observation source;
- catalog loading and schema resolution source;
- CLI and disposition rendering only where new finding codes require it;
- fixtures and all affected tests;
- `vitest.config.ts`;
- `package.json`;
- compiled `dist` output;
- README examples describing registry and receipt shapes.

Because all contracts are unreleased candidates, their identities remain
`1.0.0` while their bytes and catalog digests are regenerated together.

## Required adversarial test matrix

The release gate must include negative controls for:

- repeated `bodyId` member names in raw registry JSON;
- duplicate member names nested elsewhere in a registry;
- duplicate member names in a catalog;
- duplicate JSON Schema keywords or properties;
- malformed catalog payloads;
- duplicate catalog schema identities;
- swapped schema files with catalog digests recomputed to match;
- loaded `$id` mismatch;
- loaded `$schema` mismatch;
- catalog family and version disagreement;
- schema path traversal;
- symbolic-link escape;
- Windows-junction escape;
- source-body hash mismatch;
- unresolved sub-file locator;
- deterministic ordering of keyed observations and findings.

Positive controls must continue to prove:

- an accepted exact schema validates a conforming keyed registry;
- invalid registries produce canonical findings;
- validation never mutates authority bytes;
- whole-file observation distinguishes conformance from drift;
- every emitted receipt conforms to the corrected receipt schema;
- generated declarations and catalog digests are current.

## Completion definition

The pre-release remediation is complete only when the exact repository proof
command establishes:

```text
authority JSON contains no duplicate member names
+
registry structure conforms
+
body identities are structurally unique
+
catalog structure conforms
+
requested schema is admitted
+
schema path remains inside the real trust root
+
schema bytes match the catalog digest
+
loaded identity and dialect match catalog authority
+
schema conforms to the Draft 2020-12 meta-schema
+
generated artifacts and compiled output are current
=
REGISTRY CONTRACT VALIDATED
```

Release-bound integrity remains a second, explicit claim:

```text
REGISTRY CONTRACT VALIDATED
+
catalog and schemas are bound to an authenticated release
=
RELEASE-BOUND SCHEMA INTEGRITY
```

