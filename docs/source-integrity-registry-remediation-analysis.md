# Source Integrity Registry Remediation Analysis

## Purpose

This document validates the two remediation reviews against the current SIR
workspace and records the resulting directions under stable analysis IDs.

It is an analysis ledger, not an implementation log. The remediation plan
references these IDs so that a repeated review updates the existing decision
instead of creating duplicate or conflicting instructions.

The reviewed inputs are:

- **Review A:** remediation-plan verdict and five clarifications;
- **Review B:** feature-first remediation and proposed feature decomposition.

## Stable-ID and idempotence policy

Analysis IDs use the form `SIR-RA-NNN`.

- An ID represents one durable question or decision.
- IDs are never renumbered, recycled, or silently redefined.
- Re-analysis updates the status, evidence, or direction under the same ID.
- A superseded decision remains recorded and points to its replacement.
- The remediation plan cites analysis IDs rather than reproducing independent
  interpretations of the reviews.

The allowed validation statuses are:

- **VALID:** supported by workspace evidence and adopted as directed;
- **VALID WITH REFINEMENT:** the concern is supported, but the proposed
  implementation or guarantee must be narrowed for this workspace;
- **ALREADY SATISFIED:** the workspace already holds the required property,
  which must be retained and regression-tested;
- **DEFERRED:** integrity-improving but intentionally assigned to a later,
  explicit trust layer;
- **NOT ADOPTED:** unsupported, redundant, or integrity-degrading in the
  current authority model.

## Integrity-monotonicity rule

A condition or direction is valid only when it improves integrity without
degrading another established guarantee.

An adopted direction must do at least one of the following:

- close a demonstrated false green;
- preserve evidence currently lost at a boundary;
- make an existing authority relation explicit and testable;
- reduce ambiguity or nondeterminism;
- strengthen the proof that shipped artifacts match declared authority;
- bind internally consistent artifacts to independent authorization.

It must not:

- broaden acceptance of an invalid or untrusted state;
- convert a fail-closed outcome into continued evaluation;
- silently mutate authority or repair drift during proof;
- add an unsupported domain restriction and call it integrity;
- weaken exact identity, digest, containment, or no-mutation guarantees;
- claim protection against a race or attacker outside the implemented proof.

Every adopted ledger entry therefore records both an **integrity gain** and a
**non-degradation guard**.

## Workspace baseline

The reviews were checked against the following current conditions:

- `features/admit-source-integrity-registry.feature` contains five scenarios
  and does not authorize duplicate-member rejection, catalog contract
  admission, loaded-schema identity binding, or real-path containment.
- The feature calls the digest mismatch case a "mutated historical schema"
  even though the `1.0.0` contracts are unreleased candidates.
- The registry schema stores `entries` as an array and requires `bodyId` inside
  each entry.
- The receipt schema stores observed entries as an array and repeats `bodyId`
  inside each observation.
- Registry, catalog, schema, generator, and test loading paths still use
  ordinary `JSON.parse`.
- `parsesSchemaIdentity` already uses an anchored exact-host URI expression,
  but loaded schema `$id` and `$schema` are not bound back to the catalog entry.
- Catalog loading performs partial handwritten shape checks and throws
  `CatalogIntegrityError`; the CLI maps that error to execution exit code `6`.
- Loaded schemas are already required to be non-null JSON objects before
  resolution succeeds.
- Containment uses lexical `path.resolve` and `path.relative`; subsequent
  `readFile` calls follow filesystem indirection.
- Registry findings use locale-sensitive `localeCompare`, and body finding
  coordinates use first-match `findIndex`.
- `check:generated` is already a comparison-only operation and does not
  regenerate committed artifacts.
- `package.json` has no `prove`, package smoke, or `prepack` gate.
- `vitest.config.ts` does not bound workers; plain `pnpm test` fails on the
  current 24-core Windows host while a two-worker run passes all 37 tests.
- There are no committed CI workflows, package-proof feature, provenance
  feature, signed release tag, or release provenance receipt.

## Validated analysis ledger

### SIR-RA-001 — Correct the unreleased `1.0.0` candidates in place

**Sources:** Review A opening verdict; existing remediation release decision.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-001",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** The repository is at its initial implementation
commit, `HEAD` has no release tag, and the user has confirmed that no `1.0.0`
schema was published or externally accepted. Local catalog status does not
create external history.

**Direction:** Keep the three schema identities at `1.0.0`, correct their bytes,
and regenerate the catalog, generated types, fixtures, receipts, documentation,
and compiled output.

**Integrity gain:** Produces one coherent first release rather than preserving a
known false green for an audience that never consumed it.

**Non-degradation guard:** This direction is valid only while external
publication and acceptance remain absent. If that condition changes, the
versioning decision must be re-opened under this same ID.

### SIR-RA-002 — Move canonical features before implementation

**Sources:** Review B feature-first remediation rule and proposed Slice Zero.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-002",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** The current feature lacks the new obligations, while
tests and implementation already contain behaviors not represented one-to-one
by its five scenarios.

**Direction:** Add remediation Slice Zero. Revise the relevant feature before
changing schemas or runtime code, then trace schema, witness, and test work back
to stable scenario IDs.

**Integrity gain:** Prevents implementation from becoming an unauthoritative
source of product intent.

**Non-degradation guard:** Feature revision must authorize only validated
remediation obligations; it must not retroactively bless unrelated behavior.

### SIR-RA-003 — Rename the historical-schema scenario

**Sources:** Review B finding 1.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-003",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** The current scenario at
`features/admit-source-integrity-registry.feature:17` says "mutated historical
schema", but `1.0.0` is an unreleased candidate.

**Direction:** Rename it to "Reject schema bytes that disagree with the admitted
digest." Preserve the existing `SCHEMA_DIGEST_MISMATCH` outcome.

**Integrity gain:** Makes the feature truthful before release while retaining a
scenario that remains correct after release.

**Non-degradation guard:** Wording changes only the lifecycle claim; it must not
weaken byte-for-byte digest enforcement.

### SIR-RA-004 — Make body identity structural in registry and receipt schemas

**Sources:** Review A Slice 1; Review B finding 2.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-004",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** The registry contract uses an array at
`contracts/source-integrity-registry/1.0.0/source-integrity-registry.schema.json:13`
and repeats `bodyId` in each item. The receipt repeats the same pattern for
observations. An adversarial duplicate `bodyId` currently validates.

**Direction:** Key registry entries and receipt observations by `bodyId`, remove
the redundant `bodyId` value field, traverse by exact key, and generate readonly
record types.

**Integrity gain:** Makes one logical body coordinate structurally unique and
removes first-match ambiguity.

**Non-degradation guard:** Raw duplicate JSON member names must also be rejected
under `SIR-RA-006`; ordinary parsing alone would otherwise hide a lower-level
duplicate.

### SIR-RA-005 — Do not invent non-empty registries or a stricter body vocabulary

**Sources:** Review A suggestions for `minProperties: 1` and a narrower
`bodyId` definition.

**Status:** NOT ADOPTED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-005",
  "status": "NOT_ADOPTED",
  "supersededBy": null
}
```

**Workspace validation:** Current intent and schemas allow an empty registry,
and no feature requires at least one entry. The current `bodyId` uses the shared
identifier vocabulary with a 200-character maximum and permits a leading
digit. No reviewed finding demonstrates that those states are integrity
failures.

**Direction:** Key `entries` by the existing identifier definition. Do not add
`minProperties: 1`, a 160-character limit, or a leading-letter rule unless a
future feature explicitly establishes those domain obligations.

**Integrity gain:** Avoids confusing arbitrary schema narrowing with integrity.

**Non-degradation guard:** Structural uniqueness from `SIR-RA-004` remains
mandatory; this decision rejects only unsupported extra restrictions.

### SIR-RA-006 — Define one duplicate-aware authority JSON parser

**Sources:** Review A clarification 2; Review B duplicate-member scenarios.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-006",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** Runtime and generation paths use `JSON.parse`, which
loses duplicate-member evidence. Registry bytes are digested before parsing,
but catalog and loaded-schema parsing do not share a single testimony contract.

**Direction:** Create one parser for registry, catalog, and loaded-schema
authority, and use the same primitive from generators that consume schema
authority. Its success result carries exact raw bytes, parsed value, and a
`Sha256Digest`. Its structural failure reports:

- invalid UTF-8;
- invalid JSON grammar;
- duplicate member;
- containing RFC 6901 pointer;
- duplicated member name;
- byte offset when reliably available.

The parser must use fatal UTF-8 decoding, reject a UTF-8 BOM, reject trailing
non-whitespace input through the JSON grammar, perform no reserialization
before digesting, and detect duplicates at every nesting depth. Callers map the
parser's document-neutral failure to registry, catalog, or schema finding
codes. If raw bytes are returned, they must be an owned defensive copy or
remain encapsulated; a readonly property does not make a JavaScript typed array
immutable.

**Integrity gain:** Preserves byte-level evidence that ordinary object parsing
irreversibly erases.

**Non-degradation guard:** There is no fallback to `JSON.parse`, no regular
expression parsing, no coercion, and no repair. Registry, catalog, and schema
loaders must all fail closed on parser rejection.

### SIR-RA-007 — Treat invalid authority as admission failure, not mechanical failure

**Sources:** Review A clarification 1.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-007",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** The current loader throws `CatalogIntegrityError` for
invalid JSON, malformed entries, duplicate schema identities, and unreadable
files, and the CLI maps all of them to exit `6`. Once the packaged catalog
schema is the bootstrap authority, malformed catalog content can be judged
without consulting that catalog.

**Direction:** Use this outcome matrix:

| Condition | Receipt disposition | CLI exit |
| --- | --- | ---: |
| Invalid registry JSON or structure | `REGISTRY_CONTRACT_INVALID` | 5 |
| Duplicate registry member | `REGISTRY_CONTRACT_INVALID` | 5 |
| Invalid or duplicate-bearing catalog authority | `SCHEMA_NOT_ADMITTED` | 3 |
| Invalid or duplicate-bearing loaded schema authority | `SCHEMA_NOT_ADMITTED` | 3 |
| Loaded schema identity disagreement | `SCHEMA_NOT_ADMITTED` | 3 |
| Schema bytes disagree with catalog digest | `SCHEMA_DIGEST_MISMATCH` | 4 |
| Unreadable input, permission failure, parser defect, or unexpected internal failure | no receipt verdict | 6 |

Add specific catalog and schema finding codes without expanding the closed
disposition set.

**Integrity gain:** Distinguishes a deterministic RED admission verdict from an
inability to execute the circuit.

**Non-degradation guard:** No invalid catalog entry is consulted and no payload
is evaluated after catalog or schema admission fails. Exit `6` remains
available only when the circuit cannot truthfully produce a verdict;
`EXECUTION_FAILED` is not added as a receipt disposition.

### SIR-RA-008 — Reuse the exact canonical SIR schema identity parser

**Sources:** Review A clarification 3 and identity alias adversarial cases.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-008",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** `src/domain/schema-identity.ts` already has an
anchored expression that requires the exact `https` scheme, admitted host,
family syntax, exact semantic version, final `schema.json`, and no query,
fragment, traversal, or percent-encoded family alias.

**Direction:** Retain that exact template as the canonical parser and apply it
to the requested ID, catalog ID, and loaded `$id`. Add negative controls for
query, fragment, percent encoding, dot segments, alternate host/scheme, and
non-canonical semantic versions. Do not replace the anchored rule with a looser
URL path split or a normalizing URL round trip.

**Integrity gain:** Extends an already strong identity grammar across every
document participating in admission.

**Non-degradation guard:** Canonicalization must not normalize an unaccepted
alias into an accepted identity; the original string must itself match the
exact template.

### SIR-RA-009 — Bootstrap catalog validation before entry lookup

**Sources:** Review A Slice 2; Review B finding 3.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-009",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** `loadsSchemaCatalog` currently checks only that
`catalogId` is a string, `entries` is an array, required entry fields are
strings, status is known, and schema IDs are unique. It does not validate the
whole custom catalog contract.

**Direction:** Use the packaged `sir-schema-catalog/1.0.0` schema as bootstrap
authority. Load that bootstrap schema through the duplicate-aware parser,
assert its fixed `$id` and dialect, and validate it against the Draft 2020-12
meta-schema before using it. Duplicate-aware parse the caller catalog, validate
it, enforce the unique-schema-ID witness, and only then locate an accepted
entry. Keep the catalog array in this remediation; its explicit uniqueness
witness remains small and necessary.

**Integrity gain:** Prevents a caller-supplied catalog from choosing or
weakening the contract that establishes its own authority.

**Non-degradation guard:** The bootstrap schema comes from the trusted package,
not from the catalog being evaluated, and catalog rejection stops all schema
lookup. Package provenance remains the independent authority for the bootstrap
bytes; the caller catalog cannot replace it.

### SIR-RA-010 — Bind loaded schema identity and retain the object guard

**Sources:** Review A Slice 2; Review B finding 4.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-010",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** `resolvesSchemaFromCatalog` already rejects scalar,
null, and array schema JSON. It does not compare loaded `$id` or `$schema` with
the requested/catalog identity. A swapped receipt schema with a matching
catalog digest currently resolves as the registry schema.

**Direction:** Retain the object guard. After digest verification, require:

```text
requested schemaId = catalog schemaId = loaded $id
catalog dialect = loaded $schema = supported dialect
catalog family = family parsed from loaded $id
catalog version = version parsed from loaded $id
```

Then validate against the meta-schema and compile the same in-memory bytes that
were digested.

**Integrity gain:** Closes the demonstrated cross-document false green.

**Non-degradation guard:** Digest mismatch remains its distinct earlier
disposition, and no identity mismatch may fall through to AJV payload
evaluation.

### SIR-RA-011 — Establish real roots using the current catalog layout

**Sources:** Review A Slice 3; Review B finding 5.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-011",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** The current catalog lives at
`contracts/catalog/sir-schema-catalog.v1.json`, while entry paths are relative
to `contracts`, not to the immediate `contracts/catalog` directory. The review's
literal `realpath(directory containing catalog file)` formula would therefore
break the existing catalog coordinate system.

**Direction:** Resolve the real catalog file first, then derive the real
contracts root from the established two-level layout:

```text
real catalog file
    -> real catalog directory
    -> real contracts root
```

Resolve `workspaceRoot` to its real identity before resolving source
coordinates. Apply lexical rejection first and post-resolution containment
second. Decide and test whether a catalog path symlink is accepted; if accepted,
the trust root is derived from its real target, not its unresolved alias.

**Integrity gain:** Binds catalog and source coordinates to actual filesystem
objects without changing their established relative-path semantics.

**Non-degradation guard:** A real-path check must not broaden any path rejected
by the current lexical rules, and platform case, drive, UNC, junction, and
symbolic-link behavior must fail closed.

### SIR-RA-012 — State a stable-snapshot precondition and detect observable change

**Sources:** Review A clarification 4 and race adversarial cases.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-012",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** A `realpath` check followed by `readFile` has a
time-of-check/time-of-use window. Node's current path-based reads cannot prove
that hostile concurrent replacement never caused escaped bytes to be opened.
Schema digest and compilation already use one in-memory buffer, so mutation
after that read cannot swap compilation to different bytes.

**Direction:** For the first release, explicitly require a stable workspace and
catalog snapshot during one validation run. Resolve and stat the target before
the read, then resolve and stat it again after the read. Reject observable
identity or metadata change with a specific finding such as
`SIR_SCHEMA_CHANGED_DURING_ADMISSION` or
`SIR_BODY_CHANGED_DURING_OBSERVATION`.

**Integrity gain:** Detects ordinary concurrent drift and makes the actual
guarantee honest.

**Non-degradation guard:** Do not claim race-free hostile-filesystem security.
A changed or indeterminate target is never reported as conforming. Stronger
no-follow file-handle mechanics remain a future option.

### SIR-RA-013 — Decompose source observation obligations

**Sources:** Review B finding 6 and proposed corrected feature.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-013",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** The current feature's one drift scenario mixes
per-body observation, conformance, aggregation, and receipt disposition.

**Direction:** Define separate scenarios for:

- one conforming whole-file observation;
- one changed whole-file observation;
- one source path escaping the workspace;
- deterministic aggregation into `SOURCE_BODY_DRIFT`.

Use exact domain conformance values rather than only abstract GREEN/RED terms.
Define source escape as `SOURCE_BODY_DRIFT` with a specific body-level
containment finding; do not leave "fails closed" operationally ambiguous.

**Integrity gain:** Gives each observation transistor one testable obligation
and makes aggregation independently provable.

**Non-degradation guard:** Decomposition must preserve the rule that a
structurally invalid registry is never observed and that any nonconforming body
prevents a valid disposition.

### SIR-RA-014 — Make canonical ordering runtime-independent

**Sources:** Review A Slice 1 and adversarial ordering guidance.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-014",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** Findings currently use `localeCompare`, whose
ordering can depend on runtime locale. Keyed observations will otherwise retain
input insertion order.

**Direction:** Use an explicit code-point comparator for body keys, findings,
and catalog findings. Build keyed observation objects in that order and use RFC
6901 escaping for all generated pointers.

Receipt hashing is not currently part of the workspace. If added later, define
a canonical JSON serialization rather than assuming ordinary `JSON.stringify`
is a cryptographic canonicalization format.

**Integrity gain:** Makes equal authority inputs produce equal ordered testimony
across supported environments.

**Non-degradation guard:** Sorting changes presentation only; it must not drop,
deduplicate, or merge distinct findings.

### SIR-RA-015 — Make `pnpm prove` fresh, comparison-only, and idempotent

**Sources:** Review A clarification 5.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-015",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** `check:generated` already computes expected bytes and
compares them without writing. `package.json` has no aggregate proof or prepack
gate, and the normal build writes tracked `dist` output.

**Direction:** Add `pnpm prove` as the sole operator-facing pre-release
conformance command. It must typecheck, run plain tests, check generated
authority without repair, prove a fresh build, and smoke-test a packed consumer
surface. Use the non-recursive lifecycle defined by `SIR-RA-023`.

Prefer a temporary or staged build that is compared with committed `dist`, so
proof does not repair source or generated authority. At minimum, require:

```text
tracked content before prove = tracked content after prove
```

for both success and handled failure paths. `prepack` invokes `pnpm prove`.

**Integrity gain:** Binds declared source and generated authority to the package
surface without allowing the proof operation to conceal drift.

**Non-degradation guard:** No generate command runs inside proof, stale
artifacts fail instead of being rewritten, and package smoke never substitutes
repository source for the packed artifact.

### SIR-RA-016 — Bound Vitest workers in committed authority

**Sources:** Review A Slice 4; existing remediation.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-016",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** Plain `pnpm test` reproducibly fails with
`spawn UNKNOWN` on the current 24-core Windows host. Runs with one or two
workers pass all 37 tests.

**Direction:** Commit deterministic `minWorkers` and `maxWorkers` values in
`vitest.config.ts`, then use unmodified `pnpm test` in proof and CI.

**Integrity gain:** Makes the documented proof command equal the command that
actually establishes GREEN.

**Non-degradation guard:** Worker bounding changes execution scheduling only;
it must not skip tests, narrow test discovery, or weaken assertions.

### SIR-RA-017 — Prove the packed consumer surface on Windows and Linux

**Sources:** Review A Slice 4 and packed-package smoke guidance.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-017",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** The repository has no CI workflow or package smoke
script. `npm pack --dry-run` confirms the current file list but does not import
the installed tarball or exercise its default catalog path.

**Direction:** In a temporary consumer, install the freshly packed tarball,
import the public library export, invoke the CLI, and validate packaged default
catalog resolution. Run frozen-lockfile and proof gates on Windows and Linux
under supported Node versions.

**Integrity gain:** Tests the artifact consumers receive rather than assuming
repository-relative behavior survives packaging.

**Non-degradation guard:** The smoke test must consume only the tarball and must
fail if a catalog-referenced schema, export, CLI file, or runtime dependency is
missing.

### SIR-RA-018 — Separate product, package-proof, and provenance features

**Sources:** Review B repository-proof separation.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-018",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** Only the product admission feature currently exists.
Worker policy, prepack behavior, and release signatures are different
authorities from registry admission.

**Direction:** Maintain three focused feature authorities:

- `admit-source-integrity-registry.feature`;
- `prove-source-integrity-registry-package.feature`;
- `establish-source-integrity-registry-release-provenance.feature`.

Create or revise each feature before implementing its governed slice.

**Integrity gain:** Prevents delivery mechanics and authorization claims from
being smuggled into the product-validation contract.

**Non-degradation guard:** A separate feature is not a weaker gate; completion
requires every applicable feature to be GREEN.

### SIR-RA-019 — Give scenarios stable IDs and trace implementation one-to-one

**Sources:** Review B traceability matrix and completion gate.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-019",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** Existing tests describe the feature textually, but
scenario names are the only identifiers and the feature/test relationship is
not mechanically stable.

**Direction:** Add stable Gherkin tags such as `@sir-admit-001`,
`@sir-package-001`, and `@sir-provenance-001`. Record those IDs in test names or
adjacent comments and in the remediation traceability matrix.

One scenario may require multiple platform vectors, but every scenario must
have at least one proof and every proof must identify the scenario it serves.

**Integrity gain:** Makes authority-to-proof coverage reviewable and resistant
to scenario renaming.

**Non-degradation guard:** Trace tags supplement meaningful scenario language;
they must not encourage one overloaded scenario or one superficial test per
tag.

### SIR-RA-020 — Expand adversarial controls selectively

**Sources:** Review A adversarial matrix additions; Review B traceability
matrix.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-020",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** Current tests cover lexical traversal, digest
mismatch, unknown identity, structural invalidity, drift, and receipt
conformance. They do not cover raw duplicate keys, canonical URI aliases,
reparse-point escape, catalog contract invalidity, packed installation, or
proof idempotence.

**Direction:** Add the reviewed negative controls, with these workspace-specific
interpretations:

- `~` and `/` body keys should prove rejection by the existing identifier
  vocabulary;
- schema digest and compilation must continue using the same parsed byte
  buffer, which is already structurally satisfied;
- directories must be rejected where regular schema files are required;
- revoked catalog entries must remain not admitted;
- source mutation tests operate under the stable-snapshot contract;
- proof must leave tracked content unchanged;
- packed catalog resolution must be tested from the installed tarball.

**Integrity gain:** Attacks every known place where current happy-path tests
could conceal a false green.

**Non-degradation guard:** Negative controls must assert fail-closed outcomes
and specific findings; they must not encode platform flakiness as expected
behavior.

### SIR-RA-021 — Bind release authority concretely and separately

**Sources:** Review A Slice 5.

**Status:** DEFERRED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-021",
  "status": "DEFERRED",
  "supersededBy": null
}
```

**Workspace validation:** The current commit is unsigned and untagged. Catalog
and schema digests establish internal consistency but can be regenerated
together.

**Direction:** Before external release, bind a signed annotated Git tag to the
exact commit, packed tarball SHA-256, catalog SHA-256, schema digest inventory,
and a separate release provenance receipt.

**Integrity gain:** Adds independent authorization to internally consistent
bytes.

**Non-degradation guard:** Provenance does not alter registry validation
dispositions and is never claimed before signature verification succeeds.

### SIR-RA-022 — Complete remediation through four monotonic gates

**Sources:** Review A revised completion equation; Review B completion gate.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-022",
  "status": "VALID",
  "supersededBy": null
}
```

**Workspace validation:** The current remediation completion equation combines
several layers but does not explicitly require feature authority, proof
idempotence, or packed consumer validation.

**Direction:** Completion requires all four gates:

1. authority JSON admission;
2. declared contract conformance;
3. schema trust admission;
4. repository release readiness.

Feature authority and scenario-to-proof traceability are prerequisites across
the four gates. Release provenance remains the separate authorization gate.

**Integrity gain:** Prevents a technically green patch from being called
complete while intent, packaging, or proof coverage remains red.

**Non-degradation guard:** No gate can compensate for another failed gate, and
release provenance cannot turn a contract-validation failure green.

### SIR-RA-023 — Prevent proof and prepack lifecycle recursion

**Sources:** Workspace validation of Review A clarification 5.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-023",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** The reviewed script sketch sets `prepack` to the full
proof command while the full proof includes packed-artifact smoke validation.
If that smoke validation invokes `pnpm pack`, the package lifecycle invokes
`prepack` again and recursively re-enters the full proof.

**Direction:** Split the lifecycle without creating two release claims:

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
    + install tarball in temporary consumer
    + packed-surface smoke
```

`pnpm prove` remains the sole operator-facing release-readiness claim. The
`prepack` hook is an internal guard that deliberately excludes the operation
that would pack again.

**Integrity gain:** Preserves automatic package gating while ensuring the proof
terminates and actually reaches consumer-surface validation.

**Non-degradation guard:** `prove:core` must contain every prerequisite needed
to prevent a stale or untested package, and the outer proof must fail if either
the inner prepack gate or packed-consumer smoke fails.

### SIR-RA-024 — Generate and verify a machine-readable remediation index

**Sources:** Follow-up review, "One remaining improvement I would make."

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-024",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null
}
```

**Workspace validation:** Before this decision, the Markdown ledger defined 23
stable analysis IDs, and the remediation plan cited all of them and assigned
planned scenario IDs. Those relationships were checked with an ad hoc command,
but there was no committed deterministic projection or conformance checker.
Plan sections also had human headings rather than stable plan coordinates.

**Direction:** Keep the Markdown analysis ledger as human-readable authority
and generate a machine-readable navigation projection from validated ledger,
plan, and feature structures. Introduce stable `SIR-RP-NNN` plan coordinates
and preserve the existing stable scenario tags.

Each projected analysis entry records:

- normalized analysis status;
- stable plan references;
- a reference role of `authority`, `guard`, or `context`;
- scenario IDs;
- `supersededBy`, when applicable.

Do not infer roles or graph edges from prose. Add uniquely typed, validated
structured blocks as the generator input; Markdown citations remain
human-readable navigation.

Each analysis ledger entry carries one `sir-analysis` block:

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

Each plan coordinate carries one `sir-trace` block. Scenario-to-analysis edges
are explicit rather than inferred by combining independent arrays:

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

The block formats are governed by closed internal schemas. A Markdown parser
selects code blocks by their exact `sir-analysis` or `sir-trace` info string; it
does not inspect ordinary JSON examples. A Gherkin parser resolves scenario
tags from feature syntax.

Generate the projection at
`docs/generated/source-integrity-registry-remediation-analysis-index.v1.json`.
Do not hand-author it independently. Add a comparison-only conformance check to
`prove:core` that establishes:

- every analysis, plan, and scenario ID is uniquely defined;
- every citation resolves;
- every plan coordinate has exactly one trace block;
- every analysis coordinate has exactly one metadata block;
- only adopted decisions are used as current `authority`;
- `NOT_ADOPTED`, `DEFERRED`, or superseded decisions appear only in permitted
  roles;
- every scenario-to-analysis edge is explicitly declared;
- no plan-level and scenario-level arrays are combined into an inferred
  Cartesian product;
- every scenario analysis reference is also admitted by its containing plan
  references;
- supersession references exist and form no cycles;
- every scenario resolves to one or more analysis decisions;
- every active adopted decision has required plan and scenario coverage;
- no unknown ID or orphaned active decision exists;
- the committed projection exactly matches deterministic regeneration.

**Integrity gain:** Converts the existing human traceability graph into a
reproducible proof surface, making missing, unknown, retired, or contradictory
edges visible drift.

**Non-degradation guard:** The projection never becomes an independent source
of authority, the proof command never repairs it, heading slugs are not treated
as stable coordinates, ordinary code examples are never parsed as metadata,
and reference roles prevent a rejected decision cited as a guard from being
mistaken for active implementation authority. Human-readable status summaries,
if retained, are generated from the `sir-analysis` block rather than maintained
as a second status value.

## Review-to-analysis coverage

This table ensures repeated review remains idempotent and no reviewed point is
silently lost.

| Review point | Analysis IDs |
| --- | --- |
| Review A: unreleased `1.0.0` decision | `SIR-RA-001` |
| Review A clarification 1: catalog disposition | `SIR-RA-007` |
| Review A clarification 2: authority parser | `SIR-RA-006` |
| Review A clarification 3: exact identity URI | `SIR-RA-008`, `SIR-RA-010` |
| Review A clarification 4: filesystem race | `SIR-RA-011`, `SIR-RA-012` |
| Review A clarification 5: non-mutating proof | `SIR-RA-015`, `SIR-RA-023` |
| Review A Slice 1 | `SIR-RA-004`, `SIR-RA-005`, `SIR-RA-014` |
| Review A Slice 2 | `SIR-RA-007`, `SIR-RA-009`, `SIR-RA-010` |
| Review A Slice 3 | `SIR-RA-011`, `SIR-RA-012` |
| Review A Slice 4 | `SIR-RA-015` through `SIR-RA-017`, `SIR-RA-023` |
| Review A Slice 5 | `SIR-RA-021` |
| Review A adversarial additions | `SIR-RA-020` |
| Review A four completion gates | `SIR-RA-022` |
| Review B feature-first rule | `SIR-RA-002` |
| Review B finding 1: historical wording | `SIR-RA-003` |
| Review B finding 2: duplicate identity | `SIR-RA-004`, `SIR-RA-006` |
| Review B finding 3: catalog admission | `SIR-RA-007`, `SIR-RA-009` |
| Review B finding 4: schema identity | `SIR-RA-008`, `SIR-RA-010` |
| Review B finding 5: containment | `SIR-RA-011`, `SIR-RA-012` |
| Review B finding 6: drift decomposition | `SIR-RA-013` |
| Review B corrected product feature | `SIR-RA-002` through `SIR-RA-014` as applicable |
| Review B separate proof/provenance features | `SIR-RA-018`, `SIR-RA-021` |
| Review B traceability matrix | `SIR-RA-019`, `SIR-RA-020` |
| Review B completion gate | `SIR-RA-022` |
| Follow-up: machine-readable analysis index | `SIR-RA-024` |

## Analysis conclusion

The two reviews are directionally sound, but they are not adopted verbatim.
Workspace validation produced six important refinements:

1. Mechanical execution failures produce no receipt verdict; they do not add an
   `EXECUTION_FAILED` disposition.
2. The existing exact identity expression should be reused, not replaced by a
   potentially normalizing URI parser.
3. The real catalog root must preserve the current `contracts`-relative layout,
   and containment claims must acknowledge the stable-snapshot precondition.
4. `minProperties: 1` and a narrower `bodyId` vocabulary are not integrity
   improvements without feature authority.
5. The outer packed-artifact proof cannot also be the `prepack` hook without
   creating package lifecycle recursion.
6. A machine-readable index improves integrity only as a generated,
   role-aware projection over stable coordinates, never as a second authority.

With those refinements, every adopted direction is integrity-monotonic: it
closes a false green, preserves boundary evidence, strengthens deterministic
proof, or adds independent release authorization without weakening an existing
fail-closed guarantee.
