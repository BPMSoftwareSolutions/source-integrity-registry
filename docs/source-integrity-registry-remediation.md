# Source Integrity Registry Pre-Release Remediation

## SIR-RP-000 — Analysis authority

This plan derives from the stable decisions in
[Source Integrity Registry Remediation Analysis](source-integrity-registry-remediation-analysis.md).
Every adopted direction cites one or more `SIR-RA-NNN` IDs from that ledger.
Re-analysis updates the ledger entry; it does not create an independent
instruction in this plan.

Plan coordinates use stable `SIR-RP-NNN` IDs. They are never renumbered or
reused; a renamed section retains its coordinate. The generated remediation
index records whether each analysis citation serves as current `authority`, a
non-degradation `guard`, or explanatory `context`. (`SIR-RA-024`)

The plan admits only integrity-monotonic work:

- close a false green;
- preserve evidence at a trust boundary;
- make authority relations deterministic and testable;
- strengthen proof that source, contracts, and shipped artifacts agree;
- add independent authorization without weakening contract validation.

No slice may broaden invalid acceptance, continue after failed admission,
silently repair authority during proof, invent an unsupported domain rule, or
claim a stronger guarantee than it implements. (`SIR-RA-022`)

## SIR-RP-010 — Status and release decision

The current `1.0.0` schemas are repository candidates. They have not been
published or accepted by an external consumer. Therefore:

- correct the existing `1.0.0` candidates in place;
- regenerate every derived artifact;
- do not create `2.0.0`, a migration, a revocation, or artificial history;
- freeze `1.0.0` only when it crosses an explicit external release or
  acceptance boundary.

An in-repository filename or catalog status does not, by itself, establish that
release boundary. (`SIR-RA-001`)

## SIR-RP-020 — Governing principle

SIR will make invalid declared states unrepresentable in JSON Schema whenever
possible. Runtime code will witness only facts that JSON Schema cannot observe:

- duplicate member names in original JSON text;
- agreement between separate catalog and schema documents;
- digests of exact bytes;
- real filesystem containment;
- observed source-body bytes and observable concurrent change.

The intended division is:

```text
JSON Schema
    governs declared structure

Minimal runtime witnesses
    preserve facts lost during parsing
    prove cross-document identity
    prove byte digests
    prove real filesystem containment

Repository proof
    binds source and generated authority to the packed consumer surface

Release provenance
    proves who authorized the trusted bytes
```

These are cumulative gates. One layer cannot turn another layer's RED result
GREEN. (`SIR-RA-022`)

## SIR-RP-030 — Release blockers

The following conditions block the first release:

1. The canonical feature does not yet authorize all admitted remediation
   obligations. (`SIR-RA-002`, `SIR-RA-003`, `SIR-RA-013`, `SIR-RA-018`)
2. Registry and receipt body identities are array fields rather than structural
   coordinates. (`SIR-RA-004`)
3. Ordinary JSON parsing discards duplicate-member evidence. (`SIR-RA-006`)
4. Catalog validity and loaded-schema identity are not completely admitted
   before payload evaluation. (`SIR-RA-007` through `SIR-RA-010`)
5. Lexical path containment does not bind a coordinate to its real filesystem
   target. (`SIR-RA-011`, `SIR-RA-012`)
6. Canonical ordering remains partly locale- or insertion-order-dependent.
   (`SIR-RA-014`)
7. Plain `pnpm test` is not portable on the current Windows host.
   (`SIR-RA-016`)
8. There is no fresh, idempotent, non-recursive proof command or
   packed-consumer gate. (`SIR-RA-015`, `SIR-RA-017`, `SIR-RA-023`)
9. Release provenance is not yet bound to a concrete authenticated artifact.
   (`SIR-RA-021`)
10. The remediation traceability graph has no generated machine-readable
    projection or committed conformance check. (`SIR-RA-024`)

## SIR-RP-100 — Remediation Slice Zero: reconcile canonical features

No schema or runtime remediation begins until the feature governing that slice
has moved first. (`SIR-RA-002`)

The required sequence is:

```text
validated analysis ID
    ->
feature scenario with stable ID
    ->
schema or witness obligation
    ->
adversarial and positive proof
    ->
receipt or package testimony
```

### Product feature

Revise `features/admit-source-integrity-registry.feature` to:

- rename "Reject a mutated historical schema" to "Reject schema bytes that
  disagree with the admitted digest"; (`SIR-RA-003`)
- distinguish structural body identity from duplicate raw JSON members;
  (`SIR-RA-004`, `SIR-RA-006`)
- admit the catalog contract before consulting catalog entries;
  (`SIR-RA-007`, `SIR-RA-009`)
- bind requested, catalog, and loaded schema identities and dialects;
  (`SIR-RA-008`, `SIR-RA-010`)
- treat schema-root and workspace-root containment as separate obligations;
  (`SIR-RA-011`, `SIR-RA-012`)
- decompose one-body observation, changed-body conformance, containment
  failure, and aggregate drift. (`SIR-RA-013`)

### Package-proof and provenance features

Create separate authorities for:

- `features/prove-source-integrity-registry-package.feature`;
- `features/establish-source-integrity-registry-release-provenance.feature`.

Package mechanics and release authorization must not be placed inside the
product admission feature. (`SIR-RA-018`)

### Stable scenario IDs

Assign Gherkin tags using these namespaces:

- `@sir-admit-NNN`;
- `@sir-package-NNN`;
- `@sir-provenance-NNN`.

Tests cite the governing tag in their name or adjacent comment. A scenario may
have multiple platform vectors, but every scenario has proof and every proof
identifies its governing scenario. (`SIR-RA-019`)

Retain the `SIR-RP-NNN` coordinates assigned to this plan and classify analysis
citations as `authority`, `guard`, or `context` for deterministic projection.
A rejected decision, such as `SIR-RA-005`, may constrain the plan as a guard
but may never appear as current implementation authority. (`SIR-RA-024`)

Add validated structured traceability blocks for those roles and edges. The
generator must not infer authority from surrounding prose or Markdown section
slugs.

### Structured traceability blocks

Each analysis entry carries exactly one metadata block selected by the exact
`sir-analysis` fenced-code info string:

````markdown
```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-024",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```
````

Each plan coordinate carries exactly one trace block selected by the exact
`sir-trace` fenced-code info string:

````markdown
```sir-trace
{
  "traceabilityType": "sir-remediation-trace.v1",
  "planId": "SIR-RP-200",
  "planReferences": [
    {
      "analysisId": "SIR-RA-004",
      "role": "authority"
    },
    {
      "analysisId": "SIR-RA-005",
      "role": "guard"
    }
  ],
  "scenarioMappings": [
    {
      "scenarioId": "@sir-admit-001",
      "analysisReferences": [
        {
          "analysisId": "SIR-RA-004",
          "role": "authority"
        },
        {
          "analysisId": "SIR-RA-005",
          "role": "guard"
        }
      ]
    },
    {
      "scenarioId": "@sir-admit-002",
      "analysisReferences": [
        {
          "analysisId": "SIR-RA-006",
          "role": "authority"
        }
      ]
    }
  ]
}
```
````

The block formats have closed internal schemas. A Markdown parser selects only
the two exact info strings; ordinary JSON examples are never metadata. A
Gherkin parser resolves scenario tags from feature syntax.

Independent `analysisReferences` and `scenarioIds` arrays are forbidden because
their combination would require an inferred Cartesian product.
`scenarioMappings` declares every scenario-to-analysis edge directly. Each
scenario analysis reference must also be admitted by the containing plan's
`planReferences`. (`SIR-RA-024`)

### Slice Zero completion

- Every adopted product direction has a semantically focused scenario.
- Package proof and provenance have separate feature authority.
- No planned implementation behavior lacks a scenario ID.
- No scenario adds the unsupported non-empty-registry or narrower-body-ID
  restrictions rejected by `SIR-RA-005`.
- Analysis, plan, and scenario coordinates are unique and role-classifiable.
- Every analysis and plan coordinate has exactly one schema-valid structured
  block.
- Every scenario-to-analysis edge is explicit; none is inferred from proximity
  or independent arrays.

## SIR-RP-200 — Remediation Slice One: schema-native body identity and authority parsing

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

Govern the object structurally:

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

Remove `bodyId` from each `registryEntry`. Generate a readonly record type and
perform direct key-based traversal. (`SIR-RA-004`)

Do not add `minProperties: 1`, a new 160-character limit, or a leading-letter
rule. Those are unsupported domain restrictions, not validated integrity
improvements. (`SIR-RA-005`)

### Receipt observation representation

Change `observation.entries` to an object keyed by `bodyId`, remove the
redundant `bodyId` value field, and construct observation keys in explicit
code-point order. (`SIR-RA-004`, `SIR-RA-014`)

A body finding uses an RFC 6901 escaped pointer such as:

```text
/entries/semantic-kernel-runtime/source
```

### Canonical authority-document parser

Create one duplicate-aware authority JSON parser and use it for:

- registry payloads;
- catalog payloads;
- loaded JSON Schema documents;
- generation scripts that consume schema authority.

The parser success contract contains:

```typescript
type ParsedAuthorityDocument = Readonly<{
  rawBytes: Uint8Array;
  value: unknown;
  byteDigest: Sha256Digest;
}>;
```

If `rawBytes` is exposed, it is an owned defensive copy or remains
encapsulated. TypeScript `readonly` does not make typed-array elements
immutable.

The parser failure contract is document-neutral and distinguishes:

- invalid UTF-8;
- forbidden UTF-8 BOM;
- invalid JSON grammar or trailing non-whitespace input;
- duplicate member name at any nesting depth;
- containing RFC 6901 pointer;
- duplicate member name;
- byte offset when reliably available.

Registry, catalog, and schema callers translate that structural failure into
their stable SIR finding codes. There is no fallback to `JSON.parse`, no
regular-expression parsing, no coercion, no reserialization before digesting,
and no repair. (`SIR-RA-006`)

### Slice One outcomes

- A duplicate member in registry authority produces
  `REGISTRY_CONTRACT_INVALID` and exit `5`.
- Duplicate catalog or loaded-schema authority prevents schema admission.
- Two logical bodies cannot occupy one parsed structural coordinate.
- Observation contains no first-match lookup.
- Registry and receipt generated declarations use readonly records.
- Equal inputs produce explicitly ordered testimony without dropping findings.

These outcomes close the false greens without narrowing unrelated valid
registries. (`SIR-RA-004`, `SIR-RA-006`, `SIR-RA-014`)

## SIR-RP-300 — Remediation Slice Two: catalog and schema trust admission

### Outcome matrix

Use the following closed behavior: (`SIR-RA-007`)

| Condition | Receipt disposition | CLI exit |
| --- | --- | ---: |
| Invalid registry JSON or structure | `REGISTRY_CONTRACT_INVALID` | 5 |
| Duplicate registry member | `REGISTRY_CONTRACT_INVALID` | 5 |
| Invalid or duplicate-bearing catalog | `SCHEMA_NOT_ADMITTED` | 3 |
| Invalid or duplicate-bearing loaded schema | `SCHEMA_NOT_ADMITTED` | 3 |
| Loaded schema identity disagreement | `SCHEMA_NOT_ADMITTED` | 3 |
| Schema bytes disagree with catalog digest | `SCHEMA_DIGEST_MISMATCH` | 4 |
| Mechanical or unexpected execution failure | no receipt verdict | 6 |

Mechanical failure includes unreadable input, permission failure, parser
defect, or an unexpected internal exception. Do not add `EXECUTION_FAILED` to
the receipt disposition set.

### Catalog bootstrap

Load the packaged catalog schema through the same duplicate-aware parser,
assert its fixed `$id` and dialect, and validate it against the Draft 2020-12
meta-schema. It is bootstrap package authority; the caller catalog cannot
replace it. Then use this exact admission order:

```text
admit packaged catalog schema as bootstrap authority
    ->
duplicate-aware parse caller catalog
    ->
validate complete catalog contract
    ->
enforce unique schemaId witness
    ->
locate exact requested entry
    ->
reject revoked or non-accepted entry
    ->
resolve schema path under real contracts root
    ->
read and digest schema authority
    ->
bind complete loaded identity
    ->
validate Draft 2020-12 meta-schema
    ->
compile registry validator
```

A caller-supplied catalog cannot choose or redefine the schema that validates
that catalog. The catalog remains an array in this remediation; the existing
small uniqueness witness remains required. (`SIR-RA-009`)

### Canonical identity binding

Reuse the anchored exact SIR schema identity parser for the requested ID,
catalog ID, and loaded `$id`. It must reject aliases rather than normalize them:

```text
https://schemas.deterministic.solutions/sir/
  <schema-family>/
  <exact-semantic-version>/
  schema.json
```

No alternate scheme or host, query, fragment, percent-encoded alias, dot
segment, or floating version is admitted. (`SIR-RA-008`)

After digest verification, require:

```text
requested schemaId = catalog schemaId = loaded $id
catalog dialect = loaded $schema = supported dialect
catalog family = family parsed from loaded $id
catalog version = version parsed from loaded $id
```

Retain the existing requirement that an admitted SIR schema is a non-null JSON
object. Require `$id` and `$schema` to be strings before comparing them. Compile
the same in-memory bytes that were digested. (`SIR-RA-010`)

Use specific finding codes without expanding dispositions:

- `SIR_CATALOG_DUPLICATE_MEMBER`;
- `SIR_CATALOG_CONTRACT_INVALID`;
- `SIR_CATALOG_SCHEMA_ID_DUPLICATE`;
- `SIR_SCHEMA_DUPLICATE_MEMBER`;
- `SIR_SCHEMA_ID_MISMATCH`;
- `SIR_SCHEMA_DIALECT_MISMATCH`;
- `SIR_SCHEMA_FAMILY_MISMATCH`;
- `SIR_SCHEMA_VERSION_MISMATCH`.

### Slice Two completion

- Invalid catalog authority is rejected before entry lookup.
- A swapped schema with a recomputed matching digest is not admitted.
- Revoked entries remain not admitted.
- Digest mismatch retains its distinct disposition and exit code.
- No catalog or schema admission RED can fall through to payload evaluation.

## SIR-RP-400 — Remediation Slice Three: real containment under a stable snapshot

### Establish real roots

Retain lexical checks as an early rejection layer. Then resolve filesystem
identity and re-check containment.

For the current package layout, schema paths are relative to `contracts`, not
to the immediate `contracts/catalog` directory. Resolve the real catalog file,
derive its real catalog directory, and then derive the real contracts root from
that established two-level layout. Resolve the workspace root to its real
identity before resolving source coordinates. (`SIR-RA-011`)

If a catalog path symlink is allowed, its real target establishes the root; its
unresolved alias does not.

### Stable-snapshot guarantee

The first release evaluates a stable catalog and workspace snapshot. It does
not claim hostile race-free filesystem security.

For each schema or source target:

1. resolve and stat the target;
2. prove containment under the real root;
3. read the bytes;
4. resolve and stat the target again;
5. reject observable identity or metadata change;
6. digest the bytes that were actually read.

Use specific findings for observable change, such as:

- `SIR_SCHEMA_CHANGED_DURING_ADMISSION`;
- `SIR_BODY_CHANGED_DURING_OBSERVATION`.

A changed or indeterminate target is never reported as admitted or conforming.
Stronger platform-specific no-follow file-handle mechanics remain a future
option. (`SIR-RA-012`)

### Source observation outcomes

Feature and test separate:

- one conforming whole-file source body;
- one changed whole-file source body;
- one path outside the real workspace root;
- aggregate deterministic `SOURCE_BODY_DRIFT`.

Use exact body conformance and finding codes. A containment failure must have a
defined `SOURCE_BODY_DRIFT` outcome rather than an ambiguous "fails closed"
statement. A structurally invalid registry is never observed. (`SIR-RA-013`)

### Slice Three completion

- Current lexical rejections remain rejected.
- A normal contained regular file remains readable.
- Directories are rejected where regular schema files are required.
- A symlink or junction resolving outside its root does not produce admitted or
  conforming testimony.
- Observable concurrent change cannot produce a GREEN result.
- Tests do not claim protection outside the stable-snapshot precondition.

## SIR-RP-500 — Remediation Slice Four: portable, fresh, idempotent package proof

### Default test command

Bound Vitest workers in committed configuration:

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

Plain `pnpm test` remains the documented and proven command. Worker limits must
not alter discovery or assertions. (`SIR-RA-016`)

### One proof command

Add `pnpm prove` as the sole operator-facing pre-release conformance command.
It covers:

1. static typechecking;
2. plain `pnpm test`;
3. comparison-only generated catalog and type checks;
4. comparison-only remediation traceability and index checks;
5. a fresh build;
6. packed-artifact consumer smoke validation.

Proof must not invoke a generation or repair command. Prefer building in a
temporary staging directory and comparing it with committed `dist`. Whether
implemented through staging or a deterministic rebuild, require:

```text
tracked content before pnpm prove
    =
tracked content after pnpm prove
```

for a clean input workspace. (`SIR-RA-015`)

Avoid lifecycle recursion by splitting execution:

```text
prove:core
    typecheck
    + plain tests
    + comparison-only generated checks
    + fresh staged build verification

prepack
    prove:core

prove
    prove:core
    + pack
    + install and smoke-test the tarball
```

`prepack` must not call the outer proof because the outer proof invokes
packaging and therefore triggers `prepack`. The core gate still prevents stale
or untested content from being packed. (`SIR-RA-023`)

### Packed consumer surface

Install the fresh tarball into a temporary consumer and:

- import the public library export;
- invoke the packaged CLI;
- resolve the packaged default catalog;
- validate that every catalog-referenced schema is present.

Run frozen-lockfile and proof gates on Windows and Linux under supported Node
versions. The smoke test consumes only the tarball, never repository source.
(`SIR-RA-017`)

### Machine-readable remediation projection

Generate:

```text
docs/generated/
  source-integrity-registry-remediation-analysis-index.v1.json
```

from the validated Markdown ledger, stable plan coordinates, and feature
scenario tags. The projection records normalized status, role-aware plan
references, scenario IDs, and supersession relationships. It is never
hand-authored as parallel authority.

The projection declares
`analysisLedgerType: "sir-remediation-analysis-index.v1"`. Its graph edges come
from validated structured traceability blocks, not prose inference.

Add a comparison-only traceability check to `prove:core`. It fails on:

- duplicate or unknown analysis, plan, or scenario IDs;
- missing, duplicate, or schema-invalid `sir-analysis` or `sir-trace` blocks;
- unresolved citations;
- a rejected, deferred, or superseded decision used as current authority;
- an ordinary JSON example interpreted as traceability metadata;
- an implicit Cartesian product between plan analysis references and scenarios;
- a scenario analysis reference absent from its containing plan references;
- a supersession cycle;
- an orphaned active decision;
- a scenario without analysis authority;
- committed projection drift.

Use a Markdown parser to locate typed blocks and a Gherkin parser to locate
scenario tags. Do not scrape headings, prose, or feature text with regular
expressions. Human-readable status summaries, if retained, are generated from
`sir-analysis` metadata instead of being independently authored.

Regeneration is an explicit authoring action outside proof. (`SIR-RA-024`)

### Slice Four completion

- Plain `pnpm test` passes on the current Windows host and CI.
- Generated drift fails rather than repairs.
- Fresh compiled output is proven against source.
- Package smoke proves the installed consumer surface.
- Proof leaves tracked authority unchanged.
- A missing export, CLI, catalog, schema, or dependency turns the gate RED.
- The remediation traceability projection is current and every graph edge
  conforms to its permitted role.

## SIR-RP-600 — Remediation Slice Five: release provenance

Internal consistency is not independent authorization. Before external
publication, establish:

```text
signed annotated Git tag
    ->
exact commit SHA
    ->
packed tarball SHA-256
    ->
catalog SHA-256
    ->
schema digest inventory
    ->
release provenance receipt
```

The provenance receipt is separate from registry validation receipts. A
signature cannot turn contract or package proof RED into GREEN.
(`SIR-RA-021`)

## SIR-RP-700 — Feature-to-remediation traceability

Scenario tags are assigned in Slice Zero. The names below are governing
directions; the final feature wording remains semantically focused.

| Obligation | Planned scenario ID | Contract or witness | Negative control | Analysis IDs |
| --- | --- | --- | --- | --- |
| Structural body identity | `@sir-admit-001` | Registry and receipt schemas | Legacy array shape or redundant `bodyId` value | `SIR-RA-004` |
| Registry duplicate detection | `@sir-admit-002` | Authority JSON parser | Duplicate root and nested member | `SIR-RA-006` |
| Accepted exact schema | `@sir-admit-003` | Admission circuit | Non-accepted entry | `SIR-RA-008` through `SIR-RA-010` |
| Unknown schema identity | `@sir-admit-004` | Catalog resolver | Absent exact ID | `SIR-RA-008`, `SIR-RA-009` |
| Catalog contract admission | `@sir-admit-005` | Packaged catalog schema | Malformed custom catalog | `SIR-RA-007`, `SIR-RA-009` |
| Catalog duplicate detection | `@sir-admit-006` | Authority parser and uniqueness witness | Duplicate member or schema ID | `SIR-RA-006`, `SIR-RA-007` |
| Schema digest binding | `@sir-admit-007` | Digest witness | Changed schema bytes | `SIR-RA-003`, `SIR-RA-010` |
| Loaded schema identity | `@sir-admit-008` | Identity witness | Swapped schema bytes | `SIR-RA-008`, `SIR-RA-010` |
| Loaded schema dialect/family/version | `@sir-admit-009` | Identity witness | Contradictory metadata | `SIR-RA-008`, `SIR-RA-010` |
| Schema duplicate detection | `@sir-admit-010` | Authority JSON parser | Duplicate `$id` or nested keyword | `SIR-RA-006`, `SIR-RA-007` |
| Invalid registry structure | `@sir-admit-011` | Registry schema | Invalid revision or responsibility | `SIR-RA-004` |
| Registry byte preservation | `@sir-admit-012` | Parser and validator | Coercion, defaults, rewrite | `SIR-RA-006` |
| Schema real containment | `@sir-admit-013` | Real-path witness | Symlink or junction escape | `SIR-RA-011`, `SIR-RA-012` |
| Source real containment | `@sir-admit-014` | Real-path witness | Workspace link escape | `SIR-RA-011` through `SIR-RA-013` |
| Conforming whole-file body | `@sir-admit-015` | Observation witness | Changed bytes | `SIR-RA-013` |
| Changed whole-file body | `@sir-admit-016` | Observation witness | Digest mismatch | `SIR-RA-013` |
| Deterministic drift aggregation | `@sir-admit-017` | Receipt projection | Multiple unordered RED bodies | `SIR-RA-013`, `SIR-RA-014` |
| Exact repository proof | `@sir-package-001` | Package proof harness | Default-command failure, mutation, or lifecycle recursion | `SIR-RA-015`, `SIR-RA-016`, `SIR-RA-023` |
| Stale generated authority | `@sir-package-002` | Generated drift check | Changed catalog or type | `SIR-RA-015` |
| Packed consumer surface | `@sir-package-003` | Tarball smoke harness | Missing export, CLI, catalog, schema | `SIR-RA-017` |
| Remediation graph conformance | `@sir-package-004` | Generated analysis index and traceability checker | Unknown ID, wrong role, cycle, orphan, or drift | `SIR-RA-019`, `SIR-RA-024` |
| Authenticated release binding | `@sir-provenance-001` | Provenance gate | Unsigned or mismatched release | `SIR-RA-021` |

## SIR-RP-800 — Files and artifacts expected to change

The remediation is expected to touch:

- all applicable files under `features/`; (`SIR-RA-002`, `SIR-RA-018`)
- `contracts/source-integrity-registry/1.0.0/`;
- `contracts/source-integrity-validation-receipt/1.0.0/`;
- `contracts/catalog/1.0.0/` where catalog constraints require correction;
- `contracts/catalog/sir-schema-catalog.v1.json`;
- `contracts/generated/typescript/`;
- authority JSON parsing, registry validation, observation, catalog loading, and
  schema resolution source;
- CLI rendering where new finding codes require it;
- fixtures and all affected tests;
- package proof and packed-consumer smoke scripts;
- remediation-index generation and comparison-only traceability scripts;
- closed internal schemas for `sir-analysis` and `sir-trace` blocks under
  `docs/remediation-governance/`;
- `docs/generated/source-integrity-registry-remediation-analysis-index.v1.json`;
- `vitest.config.ts` and `package.json`;
- CI workflows for Windows and Linux;
- compiled `dist` output;
- README examples and circuit documentation.

All contract identities remain `1.0.0`; their candidate bytes and catalog
digests are regenerated together. (`SIR-RA-001`)

## SIR-RP-900 — Required adversarial matrix

Negative controls include:

- duplicate `entries` at the registry root;
- duplicate nested registry member;
- duplicate catalog member and duplicate catalog schema identity;
- duplicate `$id` and deeply nested schema keyword;
- malformed catalog authority;
- loaded schema ID, dialect, family, and version disagreement;
- query, fragment, percent-encoded, dot-segment, and floating identity aliases;
- revoked catalog entry;
- schema path naming a directory;
- schema and source traversal, symbolic-link escape, and Windows-junction
  escape;
- observable schema or source change during admission or observation;
- case-only Windows containment ambiguity;
- changed whole-file bytes and unresolved sub-file locator;
- body keys containing forbidden `~` or `/`;
- locale-independent observation and finding order;
- packed package missing a catalog-referenced schema;
- packed default catalog resolving differently from repository assumptions;
- proof changing tracked content;
- duplicate or unknown `SIR-RA`, `SIR-RP`, or scenario ID;
- missing, duplicate, or schema-invalid typed traceability block;
- ordinary JSON example mistaken for metadata;
- implicit Cartesian-product scenario edges;
- scenario analysis reference absent from its plan references;
- rejected or deferred analysis used with the `authority` role;
- missing or cyclic supersession target;
- orphaned active analysis decision or scenario;
- manually drifted remediation index.

Positive controls retain:

- valid empty and non-empty keyed registries unless feature authority changes;
- exact accepted schema admission;
- canonical invalid-registry findings;
- authority byte preservation;
- whole-file conformance and drift;
- receipt self-conformance;
- catalog self-conformance;
- digest and compilation from the same in-memory schema bytes;
- current generated declarations and catalog digests;
- ordinary Markdown and JSON examples ignored by traceability projection;
- explicit scenario-to-analysis mappings projected without inferred edges;
- installed tarball library, CLI, and catalog behavior.

Each vector cites its governing scenario ID. (`SIR-RA-019`, `SIR-RA-020`,
`SIR-RA-024`)

## SIR-RP-950 — Completion gates

### Gate 1: authority JSON admission

```text
valid strict UTF-8 JSON
+
no duplicate member names
+
exact bytes preserved and digested without mutation
```

### Gate 2: declared contract conformance

```text
feature authority current
+
registry schema valid
+
body identities structurally unique
+
receipt schema valid
+
canonical deterministic testimony
```

### Gate 3: schema trust admission

```text
catalog contract valid
+
requested entry exactly admitted
+
real path contained under stable-snapshot precondition
+
bytes match digest
+
loaded identity matches catalog authority
+
Draft 2020-12 meta-schema valid
```

### Gate 4: repository release readiness

```text
scenario-to-proof traceability complete
+
typed analysis and trace blocks schema-valid
+
generated remediation index current
+
all remediation graph edges resolve with permitted roles
+
generated artifacts current
+
plain tests pass
+
fresh build proven without repair
+
packed consumer surface passes
+
proof leaves tracked content unchanged
```

All four gates GREEN means:

```text
SIR PRE-RELEASE REMEDIATION COMPLETE
```

Separately:

```text
SIR PRE-RELEASE REMEDIATION COMPLETE
+
authenticated release binding
=
RELEASE-BOUND SIR INTEGRITY
```

No gate can compensate for another failed gate. (`SIR-RA-022`, `SIR-RA-024`)
