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

The reviews were checked against the following pre-remediation conditions:

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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-001-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-001#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-001#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-001#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-001#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-001."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This decision governs plan-level release or integrity policy rather than one executable product scenario."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-002-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-002#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-002#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-002#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-002#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-002."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "The feature-first decision is enforced by @sir-package-009, which rejects implementation that precedes its admitted analysis, plan, and feature authority."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-003-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-003#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-003#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-003#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-003#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-003."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-004-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-004#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-004#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-004#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-004#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-004."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-005-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-005#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-005#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-005#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-005#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-005."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-006-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-006#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-006#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-006#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-006#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-006."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-007-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-007#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-007#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-007#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-007#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-007."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-008-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-008#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-008#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-008#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-008#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-008."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-009-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-009#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-009#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-009#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-009#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-009."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-010-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-010#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-010#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-010#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-010#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-010."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-011-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-011#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-011#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-011#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-011#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-011."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-012-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-012#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-012#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-012#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-012#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-012."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-013-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-013#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-013#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-013#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-013#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-013."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-014-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-014#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-014#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-014#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-014#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-014."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-015-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-015#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-015#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-015#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-015#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-015."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-016-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-016#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-016#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-016#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-016#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-016."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
}
```

**Workspace validation:** Plain `pnpm test` initially failed with
`spawn UNKNOWN` on the current 24-core Windows host. One- and two-worker runs
passed the original 37 tests, but the expanded governance suite later observed
an unexpected two-worker exit inside `pnpm prove`. A one-worker
run retains complete discovery and avoids that remaining process contention.

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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-017-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-017#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-017#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-017#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-017#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-017."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-018-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-018#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-018#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-018#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-018#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-018."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-019-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-019#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-019#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-019#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-019#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-019."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-020-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-020#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-020#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-020#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-020#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-020."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This decision governs plan-level release or integrity policy rather than one executable product scenario."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-021-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-021#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-021#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-021#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-021#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-021."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-022-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-022#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-022#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-022#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-022#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-022."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This decision governs plan-level release or integrity policy rather than one executable product scenario."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-023-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-023#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-023#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-023#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-023#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-023."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-024-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-024#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-024#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-024#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-024#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-024."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-024-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-024#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-024#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-024#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-024#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The analysis records the admitted direction and integrity constraints for SIR-RA-024."
    ],
    "doesNotProve": [
      "Implementation, executed proof, clean-checkout readiness, or release provenance without downstream gates."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "This decision governs behavior or proof that requires an explicit feature scenario and executed testimony."
  }
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

### SIR-RA-025 — Bootstrap complete remediation-analysis authority in corrected unreleased `v1`

**Sources:** Durable-remediation pipeline review; workspace validation of the
current remediation-governance schema.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-025",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-025-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-025#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-025#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-025#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-025#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Every structurally admitted remediation analysis carries explicit evidence, direction, integrity gain, guards, proof limits, and scenario-coverage policy."
    ],
    "doesNotProve": [
      "A remediation direction is correct merely because all required fields are present."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Remediation admission is executable repository governance and requires an adversarial feature scenario."
  }
}
```

**Workspace validation:** The unreleased
`sir-remediation-analysis.v1.schema.json` requires only identity, status, and
supersession. Evidence, direction, integrity gain, non-degradation, proof
limits, and coverage policy can therefore be absent while the block remains
schema-valid.

**Direction:** Correct the unreleased `v1` contract in place. Require non-empty
closed fields for every integrity assertion, migrate every existing analysis
block, and make the checker resolve each structured reference to its owning
ledger entry.

**Integrity gain:** An incomplete analysis can no longer become plan authority
merely by carrying a valid ID and adopted status.

**Non-degradation guard:** Structural completeness never substitutes for human
validation of the direction. The schema must not infer, default, or repair a
missing claim, and no artificial `v2` history is created for an authority that
has never been released.

### SIR-RA-028 — Classify and enforce analysis-to-scenario coverage

**Sources:** Review finding that four active adopted decisions had no scenario
edge despite a broader documented coverage claim.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-028",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-028-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-028#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-028#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-028#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-028#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Every analysis explicitly declares whether scenario coverage is required, and the graph enforces that declaration."
    ],
    "doesNotProve": [
      "A plan-only classification is semantically justified without review."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Coverage classification changes the static authorization circuit and requires executable governance proof."
  }
}
```

**Workspace validation:** The checker currently requires every scenario to
resolve to an analysis, but it requires an active analysis only to appear in a
plan. It cannot distinguish missing behavioral coverage from a legitimate
plan-only release or governance decision.

**Direction:** Add a closed `scenario-required` or `plan-only` policy to each
analysis. Fail if a required decision has no explicit scenario edge or if a
plan-only decision acquires a manufactured scenario edge. Project the derived
static lifecycle states rather than authoring them.

**Integrity gain:** Coverage claims become equal to enforceable graph
conditions without inventing scenarios for decisions that have no executable
behavior.

**Non-degradation guard:** Classification is explicit and reviewable; it cannot
be inferred from missing edges. Existing role restrictions and the prohibition
against prose-derived edges remain intact.

### SIR-RA-029 — Prevent canonical projection from invalid governance

**Sources:** Review of the remediation-index generator's write-before-failure
behavior.

**Status:** VALID.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-029",
  "status": "VALID",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-029-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-029#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-029#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-029#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-029#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Schema-invalid, graph-invalid, or projection-contract-invalid remediation input cannot replace the canonical generated index."
    ],
    "doesNotProve": [
      "Atomic replacement supplies durability against hardware or operating-system failure outside the filesystem guarantee."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Failure-before-write behavior is an executable repository guarantee."
  }
}
```

**Workspace validation:** Before this correction, the explicit generation
command serialized and wrote a candidate index before reporting graph
violations, and the projection had no closed candidate contract.

**Direction:** Validate all blocks, the complete graph, and the projected
candidate against a closed index contract before constructing a canonical
projection. On GREEN, write a temporary sibling and atomically rename it. On
RED, emit diagnostics and leave the existing index byte-for-byte unchanged.

**Integrity gain:** Invalid governance cannot become the next committed
navigation surface even temporarily through the supported authoring command.

**Non-degradation guard:** Proof remains comparison-only, generation remains an
explicit authoring action, and diagnostic output never becomes authority.

### SIR-RA-030 — Replace textual scenario references with executed-test testimony

**Sources:** Review of the source-corpus scenario-token coverage test.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-030",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-030-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-030#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-030#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-030#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-030#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Every feature scenario has at least one registered, selected, executed, passing, non-skipped test testimony."
    ],
    "doesNotProve": [
      "A passing test is semantically sufficient merely because it cites the scenario."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Executed scenario testimony is itself a package-proof behavior."
  }
}
```

**Workspace validation:** Searching test source proves only that text exists.
It does not establish registration, selection, execution, pass status, or
absence of skipping and filtering.

**Direction:** Derive exact scenario testimony from the test runner's completed
task graph. Require at least one passing execution for every parsed feature
scenario, reject unknown test scenario IDs, and make skipped, filtered, or
failed tasks ineligible to satisfy coverage.

**Integrity gain:** The default test command proves execution coverage rather
than source-level citation coverage.

**Non-degradation guard:** Testimony remains bounded to execution coverage.
Scenario semantics, assertions, and negative-control sufficiency remain subject
to review and their own tests.

### SIR-RA-032 — Require an earned feature-authority checkpoint before implementation

**Sources:** Durable-remediation pipeline review of the authoring-order problem.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-032",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-032-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-032#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-032#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-032#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-032#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "An implementation change set follows a committed checkpoint binding analyses, plans, scenarios, feature bytes, the validated projection, and implementation scope."
    ],
    "doesNotProve": [
      "The checkpointed feature semantics are correct or the later implementation satisfies them."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Authority-before-implementation ordering requires an executable repository-history control."
  }
}
```

**Workspace validation:** A final tree can prove that analysis, plan, feature,
and implementation coexist, but it cannot prove that feature authority preceded
implementation.

**Direction:** Admit a closed authority-checkpoint artifact binding analysis,
plan, scenario, feature digests, the validated remediation-index projection,
authority commit, and implementation scopes. Creation requires a completely
clean committed workspace. Repository-history proof must require that
checkpoint in a parent commit before a covered implementation path changes.
Checkpoint bytes become immutable at creation. Bootstrap establishes this
control prospectively; lifecycle states remain derived facts, never authored
labels.

**Integrity gain:** "Feature first" becomes observable history evidence rather
than an unenforced authoring preference.

**Non-degradation guard:** A checkpoint cannot assert implementation success,
executed proof, clean-checkout readiness, or release provenance. Its scope must
be explicit, and a checkpoint created in the same commit as implementation
cannot authorize that implementation. A checkpoint ID cannot be edited,
deleted, or reused after creation.

## Documentation-authority candidate review

This review evaluates two proposed documentation surfaces without treating
either surface as self-authorizing evidence:

| Source coordinate | Snapshot identity | Authority posture |
| --- | --- | --- |
| `DDAI-ORIGIN` — `docs/durable-documentation-authority-intent-original.md` | raw length `19878` bytes, `sha256:162197a180a93f4c0ce248f525e151347ae0526c4a44c5275d2183a13a021e74` | Untracked supplied origin bytes; not yet admitted or protected from Git text normalization. |
| `DDAI` — `docs/durable-documentation-authority-intent.md` | `sha256:de07b5ff26ff6e29e6081109a2d380aa1ae04f5b4cfae387bba7b5dd19e65b17` | Untracked candidate input; not canonical documentation authority. |
| `COURSE` — `docs/public-course-building-deterministic-systems-with-sir.md` | commit `eda96afaa7e50e0ad4e359a020321f3bddff7d88`, blob `c34aaaa055a90a5018961d73d693c11a51687408`, `sha256:57ed3091fa24481ce4eb32c368fae2db0399b7ac2b3840032499eb70b407eec2` | Tracked public-course candidate whose claims remain bounded by this review. |

The section coordinates in the matrix below are stable review coordinates for
these exact snapshots. They do not claim that a heading or line number alone is
content identity. A changed source digest requires re-analysis under the same
decision IDs where the durable question is unchanged.

### SIR-RA-033 — Treat human and documentary intent as candidate input before authority

**Sources:** `DDAI-001`, `DDAI-010`, and `DDAI-011`.

**Status:** ALREADY SATISFIED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-033",
  "status": "ALREADY_SATISFIED",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-033-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-033#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-033#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-033#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-033#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Proposed documentary intent cannot become implementation authority merely because it exists under docs."
    ],
    "doesNotProve": [
      "A candidate intent is correct, complete, or authorized for implementation."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This decision classifies documentary input before any executable documentation feature is admitted."
  }
}
```

**Workspace validation:** The current remediation circuit already separates
candidate review input from admitted analysis, plan authority, feature
authority, checkpoint, implementation, and executed proof. The `DDAI` opening,
"Wants and desires become reviewable intent," and reusable change-analysis
sections align with that architecture.

**Direction:** Retain the principle that human purpose and documentary proposals
enter as candidate evidence. Admit only atomic, workspace-supported directions
through stable analysis IDs; do not treat either reviewed document as an
implementation instruction.

**Integrity gain:** Preserves human purpose without allowing prose, enthusiasm,
or document placement to bypass the repository's transition gates.

**Non-degradation guard:** Candidate intent remains visible and reviewable; the
classification must not erase the originating purpose or imply that machine
governance replaces human authorization.

### SIR-RA-034 — Limit documentation proof to typed operational declarations and bounded projections

**Sources:** `DDAI-005`, `DDAI-015`, `DDAI-017`, and `DDAI-019`.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-034",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-034-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-034#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-034#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-034#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-034#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Validated typed declarations and deterministic projections embedded in documentation can participate in a proof chain."
    ],
    "doesNotProve": [
      "Surrounding Markdown prose is true or machine-authoritative merely because the file also contains a typed block."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "The analysis narrows a documentation-authority claim; it does not authorize a new documentation runtime."
  }
}
```

**Workspace validation:** The remediation ledger and plan demonstrate the valid
pattern: expressive prose surrounds closed `sir-analysis` and `sir-trace`
blocks, while the checker derives graph facts only from schema-valid blocks and
parsed Gherkin. The checker does not infer authority from arbitrary headings or
nearby language.

**Direction:** Teach that documentation can carry proof inputs, evidence, or
projections only where the exact operational declaration is typed, validated,
consumed, and bounded. Describe ordinary explanatory prose as documentation
about proof, not proof itself.

**Integrity gain:** Reuses the repository's existing typed-block architecture
without creating a second heuristic prose interpreter.

**Non-degradation guard:** Do not award authority to a whole document because
one section is operational, and do not require every human explanation to
become machine syntax.

### SIR-RA-035 — Add source provenance only through repository-resolvable snapshots

**Sources:** `DDAI-006`, `DDAI-007`, `DDAI-008`, and `DDAI-018`.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-035",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-035-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-035#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-035#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-035#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-035#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "A documentation claim can be tied to exact admitted repository source bytes and a stable structured coordinate."
    ],
    "doesNotProve": [
      "The source claim is semantically correct, authorized for publication, or faithfully transformed without a separately reviewed transformation."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This admits a future provenance direction while withholding implementation authority until a dedicated feature and contract exist."
  }
}
```

**Workspace validation:** Exact source revision and byte digests fit the
existing physical-to-logical model. The current registry can declare Markdown
whole-file bodies, but it does not validate document sections, transformations,
conversation identities, or publication provenance. Exact UTF-8 sub-file byte
offset testimony also remains outside the present Step-Zero boundary.

**Direction:** If public teaching claims later require source provenance, first
admit a repository-local source-snapshot contract using exact bytes, a stable
document/section coordinate, and a digest. Add transformation and publication
claims only through separate bounded authorities.

**Integrity gain:** Makes selected teaching claims reproducible from admitted
local evidence without depending on ephemeral external navigation.

**Non-degradation guard:** Do not infer edges from prose, substitute line
numbers for identity, confuse Unicode character offsets with byte offsets, or
claim semantic fidelity from digest agreement alone.

### SIR-RA-036 — Reject raw conversation coordinates as first-class repository authority

**Sources:** `DDAI-006` and `DDAI-007`.

**Status:** NOT ADOPTED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-036",
  "status": "NOT_ADOPTED",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-036-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-036#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-036#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-036#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-036#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "Unresolved conversation IDs, message IDs, timestamps, and character ranges cannot become SIR authority."
    ],
    "doesNotProve": [
      "Conversation material is valueless or may be discarded before admitted purpose is preserved."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This is a guard against an incompatible authority source, not an executable product behavior."
  }
}
```

**Workspace validation:** The repository has no contract, resolver, retention
policy, privacy boundary, or offline proof for conversation and message IDs.
Character ranges are not UTF-8 byte coordinates, and a vendor-local
conversation identifier is not an immutable repository object.

**Direction:** Do not store raw conversation coordinates as canonical SIR
authority. Preserve the admitted purpose in repository-local analysis prose and
snapshot only the minimum source material required by an explicitly governed
provenance contract.

**Integrity gain:** Avoids a non-portable external trust root, privacy and
retention liabilities, and false provenance produced by unresolvable IDs.

**Non-degradation guard:** A future source-capture capability may be proposed
under a new analysis if it has explicit consent, minimization, stable local
bytes, a resolver, and bounded proof.

### SIR-RA-037 — Reject operational consumption as a universal admission rule for durable documents

**Sources:** `DDAI-014`, `DDAI-015`, `DDAI-016`, and `DDAI-020`.

**Status:** NOT ADOPTED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-037",
  "status": "NOT_ADOPTED",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-037-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-037#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-037#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-037#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-037#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "A durable repository document need not be rejected solely because no machine operation consumes it."
    ],
    "doesNotProve": [
      "Unbounded duplicate documentation or unsupported truth surfaces are acceptable."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "The decision bounds repository-document policy and introduces no executable scenario."
  }
}
```

**Workspace validation:** The repository legitimately retains a license,
README, intent narrative, architecture explanation, review evidence, and human
teaching material that are not all extracted into machine operations. Requiring
an execution harness, scanner, or projection for each would increase code,
schemas, tests, and synchronization cost without proportional integrity gain.

**Direction:** Apply operational-consumer requirements only to documents or
sections claiming machine authority. Admit other durable documents when they
have a clear human purpose, ownership, bounded claims, and no conflicting
canonical responsibility.

**Integrity gain:** Prevents documentation sprawl without manufacturing
low-value automation merely to justify necessary human-readable artifacts.

**Non-degradation guard:** Human-only status must not be used to hide an
operational rule in prose or to maintain parallel normative sources for the
same machine decision.

### SIR-RA-038 — Reject direct documentation-governance fields in the current registry and receipt contracts

**Sources:** `DDAI-016`, `DDAI-018`, and `DDAI-019`.

**Status:** NOT ADOPTED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-038",
  "status": "NOT_ADOPTED",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-038-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-038#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-038#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-038#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-038#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The conceptual documentation-authority payload and receipt shown in DDAI are not valid source-integrity-registry 1.0.0 instances."
    ],
    "doesNotProve": [
      "A separately versioned documentation contract would be a bad architectural fit."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This guard prevents an incompatible contract expansion; a future contract requires its own scenario-required analysis."
  }
}
```

**Workspace validation:** The closed `source-integrity-registry/1.0.0` entry
shape requires `responsibility`, `source`, and `authority`. It has no entry
`kind`, document intent object, structured-block inventory, or operational
consumer array. The receipt contract likewise has no documentation lifecycle
or `DOCUMENT_AUTHORITY_CONFORMS` disposition. Direct adoption would fail the
current schemas or require an integrity-degrading in-place expansion.

**Direction:** Do not paste the conceptual DDAI shapes into the current
registry or receipt. Continue using Markdown whole-file bodies where the
existing contract is truthful. If section-level documentation governance is
later evidenced, design a new contract family or properly versioned extension
after feature authority.

**Integrity gain:** Preserves the closed pre-release contracts and prevents
conceptual examples from masquerading as admitted instances.

**Non-degradation guard:** Do not block truthful whole-file Markdown
registration under the current contract, and do not pre-select a future schema
shape before its requirements and consumers are validated.

### SIR-RA-039 — Retain the course's core Step-Zero architecture and adversarial teaching

**Sources:** `COURSE-002` through `COURSE-008`, `COURSE-M01`, `COURSE-M02`,
`COURSE-M04` through `COURSE-M08`, `COURSE-M10`, `COURSE-M11`, and
`COURSE-011` through `COURSE-014`.

**Status:** ALREADY SATISFIED.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-039",
  "status": "ALREADY_SATISFIED",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-039-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-039#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-039#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-039#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-039#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The identified course sections accurately teach the repository's implemented Step-Zero invariants and bounded remediation model at the reviewed baseline."
    ],
    "doesNotProve": [
      "Every exercise answer, external system design, or future repository revision conforms automatically."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This records alignment of teaching content with existing executable product and governance scenarios."
  }
}
```

**Workspace validation:** The course's exact authority, bootstrap, identity
agreement, duplicate-aware parsing, no-mutation, fail-closed dispositions,
physical observation, canonical testimony, adversarial testing, and remediation
sections match the schemas, source, features, and tests at baseline commit
`1eeb6a92f867ebd4593e98133ba4a852d6b2dcdd`. Its commit-history coordinates
exist. Its research distinctions are also directionally accurate: JSON Schema
distinguishes `$schema` dialect from `$id` resource identity; RFC 8259 warns
that duplicate member behavior is unpredictable; and reproducible builds have
a broader source/environment/instruction boundary than SIR's local build
comparison. See [JSON Schema Draft 2020-12 Core](https://json-schema.org/draft/2020-12/json-schema-core),
[RFC 8259 section 4](https://datatracker.ietf.org/doc/html/rfc8259#section-4),
and the [Reproducible Builds definition](https://reproducible-builds.org/docs/definition/).

**Direction:** Retain these sections as the course backbone. Prefer
counterexamples, explicit input boundaries, single dispositions, and honest
"does not prove" statements over broader product claims.

**Integrity gain:** Teaches the architecture from real false greens and
executable repository evidence rather than a generic governance narrative.

**Non-degradation guard:** Baseline-specific facts must stay labeled with their
baseline, and educational simplification must not broaden SIR's implemented
acceptance set or proof boundary.

### SIR-RA-040 — Correct volatile, publication, portability, and schema-versioning claims before course promotion

**Sources:** `COURSE-001`, `COURSE-M00`, `COURSE-M03`, `COURSE-M04`, and
`COURSE-M09`.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-040",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-040-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-040#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-040#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-040#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-040#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The course identifies a fixed repository baseline and can be corrected to avoid unsupported release, reproducibility, portability, and schema-compatibility claims."
    ],
    "doesNotProve": [
      "The course is externally published, editorially approved, accessible on every platform, or current for a later commit."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This is a publication-disposition and maintenance decision; course changes require a later documentation feature if operational automation is proposed."
  }
}
```

**Workspace validation:** The course correctly pins baseline `1eeb6a9`, but
calls itself public without release testimony, calls its local proof record
reproducible even though full reproducible-build equivalence is not established,
and uses POSIX-specific `shasum`, line continuation, and `jq` commands in a
repository that supports Windows. It says the receipt schema is published even
though external publication remains unproven. Its schema-versioning table also
treats accepted-instance-set changes as an automatic SemVer mapping. SemVer
requires a declared public API and forbids modifying a released version, but it
does not itself define JSON Schema compatibility policy; SIR must declare that
policy explicitly. See [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html)
and the [Reproducible Builds definition](https://reproducible-builds.org/docs/definition/).

**Direction:** Before promotion beyond a repository course candidate:

- distinguish "tracked public course candidate" from externally published
  course;
- replace "immutable JSON Schema" with exact version-addressed schema whose
  bytes become immutable after explicit external acceptance;
- call Module 0 a pinned local proof baseline, not a reproducible-build result;
- label POSIX prerequisites or use repository-owned cross-platform commands;
- call the receipt schema packaged or shipped candidate authority until
  publication provenance exists; and
- replace the patch/minor/major table with an explicitly adopted SIR
  schema-compatibility policy or present it as a design exercise.

**Integrity gain:** Removes public teaching false greens while preserving the
course's useful structure and fixed historical laboratory.

**Non-degradation guard:** Do not replace pinned historical facts with floating
"current" counts, weaken the published-byte immutability rule, or add a
documentation generator whose maintenance cost exceeds the drift it closes.

### SIR-RA-041 — Bound fractal, ecosystem, and self-learning language as design patterns

**Sources:** `DDAI-009`, `DDAI-012`, `DDAI-013`, `COURSE-003.1`,
`COURSE-CAPSTONE`, `COURSE-009`, and `COURSE-014`.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-041",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-041-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-041#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-041#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-041#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-041#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "The small fail-closed cell is a reusable architectural pattern when a downstream boundary actually consumes and enforces its result."
    ],
    "doesNotProve": [
      "SIR currently implements a general network aggregator, domain semantics, autonomous learning, distributed consensus, deployment enforcement, or release authorization."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "plan-only",
    "requiresScenarioCoverage": false,
    "rationale": "This constrains teaching language and future architecture intent without asserting an implemented ecosystem feature."
  }
}
```

**Workspace validation:** The current package implements registry validation,
whole-file observation, receipts, repository proof, and remediation history. It
does not implement the course's parent aggregator, runtime deployment gate, or
a documentation-learning system. The course generally states these limits, but
phrases such as "SIR can govern any system," "self-learning," and a
"deterministic network" can be read as present capabilities when separated
from their conditions.

**Direction:** Retain fractal governance as a course-defined pattern and
"self-learning" only as shorthand for human-reviewed, authority-changing
remediation. Every transfer example must name the real consuming gate,
domain-specific authority, representable body types, missing-testimony rule,
and properties SIR does not prove.

**Integrity gain:** Preserves a useful compositional teaching model without
turning architectural analogy into product capability.

**Non-degradation guard:** No parent may convert RED or missing testimony to
GREEN, and no transfer blueprint may relabel byte/declaration integrity as
domain correctness, safety, authorization, or runtime attestation.

### SIR-RA-042 — Preserve exact supplied origin bytes before documentation derivation

**Sources:** `DDAI-ORIGIN`, `DDAI`, the repository `.gitattributes`, and the
observed byte-level difference between the two files.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-042",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-042-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-042#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-042#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-042#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-042#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "An admitted documentation origin remains recoverable as the exact supplied byte sequence, and a declared derived document can be reproduced from that origin and its admitted transformation."
    ],
    "doesNotProve": [
      "A digest can reconstruct missing bytes, the derivation preserves semantic intent, or the supplied document has independently proven authorship, conversation provenance, or publication authority."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Exact-byte retention and deterministic derivation are executable repository guarantees; prose or a recorded digest cannot establish them."
  }
}
```

**Workspace validation:** The supplied
`docs/durable-documentation-authority-intent-original.md` is currently `19878`
raw bytes with
`sha256:162197a180a93f4c0ce248f525e151347ae0526c4a44c5275d2183a13a021e74`.
The reviewed `docs/durable-documentation-authority-intent.md` is `19876` raw
bytes with
`sha256:de07b5ff26ff6e29e6081109a2d380aa1ae04f5b4cfae387bba7b5dd19e65b17`.
The observed content delta is one deleted blank line. The existing review
recorded only the derived candidate digest, so it could detect neither loss of
the supplied origin nor whether the candidate remained reproducible from it.

Both files are untracked. The supplied origin contains `989` CRLF sequences and
no bare LF sequences, while `.gitattributes` applies `text=auto eol=lf`.
Admitting the Markdown file through that text filter would preserve normalized
text, not the exact supplied bytes identified above. A SHA-256 digest is an
identity witness for bytes that remain available; it is not a backup and
cannot regenerate a missing preimage.

**Direction:** Before any derived documentation is treated as durable, admit
the exact supplied byte sequence under an immutable snapshot ID in a
repository representation that is not subject to text or checkout
normalization. Bind that snapshot to its raw byte length and SHA-256 digest.
Keep the readable or edited document separate. A closed derivation declaration
must bind the origin snapshot ID and digest, the transformation artifact and
digest, and the derived path and digest. Verification must reconstruct the
derived output from the stored origin plus transformation in an isolated
temporary location, compare exact output bytes, and never repair either
authority during proof. Changing source bytes creates a new origin snapshot;
it never rewrites an existing snapshot identity.

**Integrity gain:** Makes the supplied document exactly recoverable, exposes
normalization and edit drift, and turns the origin-to-derived relationship into
repeatable evidence instead of narrative reconstruction.

**Non-degradation guard:** Do not claim that a hash reconstructs content, hash
normalized text while calling it the supplied raw file, overwrite the origin
with a derived copy, apply a repository-wide binary policy when a narrow
snapshot rule suffices, mutate the current registry or receipt `1.0.0`
contracts, or claim semantic fidelity from byte reproduction alone.

### SIR-RA-043 — Predeclare the remediation proof subject and earn closure from execution

**Sources:** `SIR-RA-022`, `SIR-RA-023`, `SIR-RA-030`, `SIR-RA-032`,
`SIR-RP-100`, the current remediation checkpoint contract and history checker,
and the current package-proof command surface.

**Status:** VALID WITH REFINEMENT.

```sir-analysis
{
  "analysisMetadataType": "sir-remediation-analysis.v1",
  "analysisId": "SIR-RA-043",
  "status": "VALID_WITH_REFINEMENT",
  "supersededBy": null,
  "evidence": [
    {
      "evidenceId": "SIR-RA-043-E01",
      "kind": "ledger-section",
      "reference": "SIR-RA-043#workspace-validation"
    }
  ],
  "direction": {
    "reference": "SIR-RA-043#direction"
  },
  "integrityGain": {
    "reference": "SIR-RA-043#integrity-gain"
  },
  "nonDegradationGuards": [
    {
      "reference": "SIR-RA-043#non-degradation-guard"
    }
  ],
  "proofBoundary": {
    "proves": [
      "A governed remediation proof subject was declared before implementation and can be closed only by complete generated testimony satisfying the admitted expectations for its exact checkpoint-bound bytes and implementation identity."
    ],
    "doesNotProve": [
      "The declared obligations are sufficient for every unstated risk, an expected adversarial RED became GREEN, an older receipt authorizes a changed subject, external release provenance, or retroactive governance of remediation history created before activation."
    ]
  },
  "scenarioCoveragePolicy": {
    "classification": "scenario-required",
    "requiresScenarioCoverage": true,
    "rationale": "Proof-surface admission, raw-outcome preservation, expectation evaluation, exact-subject binding, and closure eligibility are executable repository guarantees."
  }
}
```

**Workspace validation:** The current `sir-remediation-authority-checkpoint.v1`
contract and repository-history checker establish that analysis, plan,
scenario, projection, and feature bytes preceded a scoped implementation
change. `SIR-RA-032` correctly limits that checkpoint: it does not assert that
the implementation succeeded or satisfied its scenarios. Executed-scenario
coverage proves that each feature tag has passing test testimony, while
`pnpm prove` evaluates the current repository and returns an ephemeral command
result.

The workspace has no closed authority that predeclares the exact observations,
expected raw outcomes, finding codes, cardinality, environment boundary, or
artifact identities required to close one remediation. It has no generated
receipt binding those observations to a checkpoint, implementation commit,
tree, and inspected bytes. Consequently, a later narrative can call a slice
"closed" without a durable, replayable subject-specific proof chain; a stale
GREEN, an expected adversarial RED, an unexpected RED, and a mechanical crash
are not represented as distinct remediation-closure facts.

**Direction:** Add a closed `sir-remediation-proof-surface.v1` contract and a
closed `sir-remediation-closure-receipt.v1` contract, and extend the unreleased
checkpoint candidate in place. A proof surface uses a stable `SIR-PS-NNN`
identity and declares governing analysis, plan, and scenario coordinates;
proof boundary; deterministic environment profiles; exact observation
identities and cardinality; command definitions; expected raw outcomes and
finding codes; inspected artifact bindings; continuation behavior; and the
canonical fields of the proof-subject projection. It contains neither its own
digest nor a future checkpoint reference.

The authority commit contains the proof-surface bytes. An existing `SIR-RC-NNN`
checkpoint observes and binds the surface identity, path, digest, authority
commit, and implementation scope. The checkpoint must be an ancestor of the
implementation subject, and the executed surface bytes must equal the
checkpoint-bound bytes. An admitted surface ID is append-only: changed
obligations, commands, expectations, environment boundaries, or proof limits
require a new surface identity and checkpoint.

A deterministic runner preserves the raw observation vocabulary `GREEN`,
`RED`, and `NO_VERDICT`; separately derives `SATISFIED`, `UNSATISFIED`, or
`NOT_EVALUATED` by comparing each observation with its declared expectation;
and generates a stable `SIR-CR-NNN` closure receipt. An expected
negative-control `RED` may satisfy an expectation but remains raw `RED`.
Mechanical failure produces `NO_VERDICT` and cannot earn closure. Continuation
policy responds to unexpected outcomes or no verdict, never to raw `RED`
merely because it is RED.

The receipt binds the proof-surface and checkpoint identities,
checkpoint-bound surface digest, authority commit, implementation commit and
tree, governed scope, clean-workspace observation, environment profile and
relevant toolchain versions, normalized command observations, inspected
artifact hashes, pre/post tracked-tree identities where mutation is possible,
raw outcomes, finding codes, expectation evaluations, cardinality, and the
deterministically computed proof-subject identity. Closure evaluation derives
`EARNED`, `NOT_EARNED`, or `REPROOF_REQUIRED`; no human-authored lifecycle
label can substitute. A previous receipt remains valid historical testimony
for its exact subject but is inapplicable after the subject-defining inputs
change.

Activation is prospective. The existing checkpoint process authorizes this
proof system's implementation because the system cannot honestly preexist its
own bootstrap. After implementation is proven by the existing gates, an
immutable `SIR-RC` checkpoint activates proof-surface enforcement for later
governed remediation checkpoints. The activation is represented inside the
extended checkpoint contract and is enforced continuously from its checkpoint
commit. Earlier history receives no synthetic surface or receipt.

**Integrity gain:** Converts remediation closure from an agent-authored report
into a deterministic evidence transition; tells an implementing agent exactly
which positive, adversarial, environmental, and byte-identity observations
will be inspected; preserves historical testimony while preventing stale
testimony from authorizing a changed subject; and closes the gap between
feature-first authority and proof-earned completion.

**Non-degradation guard:** Reuse `SIR-RC-NNN` rather than creating a competing
checkpoint or generalized provenance platform. Do not place a self-digest or
future checkpoint hash inside a proof surface, launder expected `RED` into
`GREEN`, infer success from a process exit alone, treat missing observations
or mechanical failure as evaluated proof, mutate an admitted surface or
receipt under the same identity, write tracked receipts during the default
non-mutating proof command, capture volatile machine noise without a
claim-specific reason, or retroactively condemn earlier remediation history.
Checkpoint binding and semantic evaluation must establish traceability; schema
validity alone proves only structure. The activation transition must be
immutable and continuity checked from its declared checkpoint so deleting an
activation artifact cannot silently disable enforcement.

## Documentation-authority section disposition matrix

The matrix is exhaustive at the durable teaching-section level. `ALIGNED`
means the section describes an existing architecture property.
`GOOD FIT — REFINE` means the direction can increase integrity only under the
cited guard. `DEGRADING / BAD FIT` means direct adoption would broaden claims,
create an incompatible contract, or impose maintenance without proportional
integrity gain.

| Source section coordinate | Disposition | Analysis | Durable condition |
| --- | --- | --- | --- |
| `DDAI-001` — opening intent circuit | ALIGNED | `SIR-RA-033` | Intent remains candidate until admitted. |
| `DDAI-002` — Integrity produces fidelity | GOOD FIT — REFINE | `SIR-RA-033`, `SIR-RA-041` | Treat fidelity as an evaluated correspondence, not a guaranteed equation. |
| `DDAI-003` — Every change must justify integrity gain | ALIGNED | `SIR-RA-033` | Preservation against evidenced risk also qualifies; necessary neutral work retains cost posture. |
| `DDAI-004` — Cost belongs in the integrity equation | ALIGNED | `SIR-RA-033`, `SIR-RA-037` | Maintenance surface is an explicit non-degradation concern. |
| `DDAI-005` — Documentation is part of proof | GOOD FIT — REFINE | `SIR-RA-034` | Only typed, validated, consumed declarations or bounded projections participate. |
| `DDAI-006` — Conversation-derived authority | DEGRADING / BAD FIT as written | `SIR-RA-035`, `SIR-RA-036` | Use minimized admitted local snapshots; raw conversation IDs are not authority. |
| `DDAI-007` — Do not rely on line numbers | GOOD FIT — REFINE | `SIR-RA-035`, `SIR-RA-036` | Exact bytes plus structured coordinates; no character/byte conflation. |
| `DDAI-008` — Documentation circuit | GOOD FIT — REFINE | `SIR-RA-034`, `SIR-RA-035` | Future feature and contract required; publication is independent authority. |
| `DDAI-009` — Self-learning without uncontrolled mutation | GOOD FIT — REFINE | `SIR-RA-041` | Human-reviewed remediation, not autonomous learning. |
| `DDAI-010` — Wants and desires become reviewable intent | ALIGNED | `SIR-RA-033` | Human purpose is preserved before admission. |
| `DDAI-011` — Reusable integrity-change contract | GOOD FIT — REFINE | `SIR-RA-033`, `SIR-RA-035` | Existing analysis v1 remains canonical; add no parallel contract without evidence. |
| `DDAI-012` — Complete fidelity equation | GOOD FIT — REFINE | `SIR-RA-041` | Several terms are future gates, not current earned facts. |
| `DDAI-013` — Course-level teaching statement | GOOD FIT — REFINE | `SIR-RA-039`, `SIR-RA-041` | Teach only claims supported at the pinned baseline. |
| `DDAI-014` — Documentation must do work | DEGRADING / BAD FIT as universal rule | `SIR-RA-037` | Apply operationality only to machine-authoritative claims. |
| `DDAI-015` — Remediation documents as reference pattern | ALIGNED | `SIR-RA-034` | Typed operational declarations are the reference pattern. |
| `DDAI-016` — Same model for all documentation | DEGRADING / BAD FIT as mandatory scope | `SIR-RA-037`, `SIR-RA-038` | Architecture, course, standards, and runbooks need separate evidenced consumers. |
| `DDAI-017` — Documentation becomes registered authority | GOOD FIT — REFINE | `SIR-RA-034`, `SIR-RA-038` | Whole-file Markdown already fits; proposed fields do not fit v1. |
| `DDAI-018` — Extraction must be governed | ALIGNED for operational extraction | `SIR-RA-034`, `SIR-RA-035` | Typed selector and closed contract required. |
| `DDAI-019` — Four documentation relationships and receipt | GOOD FIT — REFINE | `SIR-RA-035`, `SIR-RA-038` | Future contract family; current SIR proves none automatically. |
| `DDAI-020` — Document lifecycle and strongest rule | DEGRADING / BAD FIT as universal rule | `SIR-RA-034`, `SIR-RA-037` | Derived lifecycle only for governed authority documents. |
| `COURSE-001` — title, status, outcomes | GOOD FIT — REFINE | `SIR-RA-040` | Candidate/publication distinction and version-addressed schema wording. |
| `COURSE-002` — deterministic boundary | ALIGNED | `SIR-RA-039` | Retain explicit equal-input boundary and exclusions. |
| `COURSE-003` — smallest governed cell | ALIGNED | `SIR-RA-039` | Matches current fail-closed circuit. |
| `COURSE-003.1` — fractal composition | GOOD FIT — REFINE | `SIR-RA-041` | Pattern only; general aggregator is not implemented. |
| `COURSE-004` — eight invariants | ALIGNED | `SIR-RA-039` | Matches current contracts and runtime. |
| `COURSE-005` — research foundation | GOOD FIT — REFINE | `SIR-RA-039`, `SIR-RA-040` | Distinguish external standards from SIR-specific policy. |
| `COURSE-006` — repository map | ALIGNED at baseline | `SIR-RA-039` | Keep baseline-pinned. |
| `COURSE-007` — repository evolution | ALIGNED at baseline | `SIR-RA-039` | Commit coordinates exist; counts are historical, not floating. |
| `COURSE-008` — schedule | ALIGNED | `SIR-RA-039` | Curriculum structure adds no runtime claim. |
| `COURSE-M00` — establish laboratory | GOOD FIT — REFINE | `SIR-RA-040` | Local pinned proof, not clean-checkout or reproducible-build testimony. |
| `COURSE-M01` — deterministic cell | ALIGNED | `SIR-RA-039` | Dispositions and exit boundary match source. |
| `COURSE-M02` — intent before implementation | ALIGNED | `SIR-RA-039` | Scenario identity and bounded example fit. |
| `COURSE-M03` — schema backbone/versioning | GOOD FIT — REFINE | `SIR-RA-039`, `SIR-RA-040` | Published-byte immutability retained; compatibility policy must be explicit. |
| `COURSE-M04` — authority bootstrap | GOOD FIT — REFINE | `SIR-RA-039`, `SIR-RA-040` | Architecture aligns; label POSIX-only lab commands or replace them. |
| `COURSE-M05` — preserve raw evidence | ALIGNED | `SIR-RA-039` | Duplicate-aware parser matches implementation. |
| `COURSE-M06` — fail-closed circuit | ALIGNED | `SIR-RA-039` | Order, dispositions, and exits match implementation. |
| `COURSE-M07` — logical-to-physical binding | ALIGNED | `SIR-RA-039` | Current boundary is honestly stated. |
| `COURSE-M08` — observe without mutation | ALIGNED | `SIR-RA-039` | Containment and stable-snapshot limits match implementation. |
| `COURSE-M09` — stable composable testimony | GOOD FIT — REFINE | `SIR-RA-039`, `SIR-RA-040`, `SIR-RA-041` | Receipt is packaged candidate; parent composition remains capstone design. |
| `COURSE-M10` — adversarial proof | ALIGNED | `SIR-RA-039` | Threat matrix matches closed false greens. |
| `COURSE-M11` — remediation and release | ALIGNED at baseline | `SIR-RA-039` | Preserve package-proof/release-provenance separation. |
| `COURSE-CAPSTONE` — ecosystem integration | GOOD FIT — REFINE | `SIR-RA-041` | Requires real consuming gate and domain authority. |
| `COURSE-009` — transfer blueprints | GOOD FIT — REFINE | `SIR-RA-041` | Bound by current language/locator contract and external authorities. |
| `COURSE-010` — adoption checklist | GOOD FIT — REFINE | `SIR-RA-041` | A design review checklist, not a current SIR verdict. |
| `COURSE-011` — instructor guidance | ALIGNED | `SIR-RA-039` | Counterexamples and proof boundaries reinforce integrity. |
| `COURSE-012` — glossary | GOOD FIT — REFINE | `SIR-RA-039`, `SIR-RA-041` | Course-defined terms must not imply implemented capability. |
| `COURSE-013` — primary reading list | ALIGNED with source review | `SIR-RA-039`, `SIR-RA-040` | Primary sources support the bounded distinctions; SIR policy remains explicit. |
| `COURSE-014` — closing principle | GOOD FIT — REFINE | `SIR-RA-041` | Architectural direction, not proof of an existing deterministic network. |

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
| Durable remediation: complete analysis admission | `SIR-RA-025` |
| Durable remediation: explicit scenario policy | `SIR-RA-028` |
| Durable remediation: fail-before-write generation | `SIR-RA-029` |
| Durable remediation: executed scenario testimony | `SIR-RA-030` |
| Durable remediation: feature-authority checkpoint | `SIR-RA-032` |
| Documentation review: intent remains candidate input | `SIR-RA-033` |
| Documentation review: typed operational documentation | `SIR-RA-034` |
| Documentation review: repository-resolvable source provenance | `SIR-RA-035` |
| Documentation review: raw conversation authority rejected | `SIR-RA-036` |
| Documentation review: universal operationality rejected | `SIR-RA-037` |
| Documentation review: incompatible v1 document fields rejected | `SIR-RA-038` |
| Public-course review: core architecture aligned | `SIR-RA-039` |
| Public-course review: factual and portability refinements | `SIR-RA-040` |
| Public-course review: ecosystem language bounded | `SIR-RA-041` |
| Documentation integrity correction: exact origin recovery and derivation | `SIR-RA-042` |
| Remediation closure: predeclared proof subject and generated testimony | `SIR-RA-043` |

## Analysis conclusion

The reviewed directions are sound, but they are not adopted verbatim.
Workspace validation produced twenty-two important refinements:

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
7. Remediation-governance `v1` is an unreleased candidate and is corrected in
   place rather than replaced by artificial `v2` history.
8. Analysis completeness is schema-enforced but does not mechanically prove the
   correctness of the direction.
9. Scenario coverage follows an explicit policy; plan-only decisions do not
   receive manufactured feature edges.
10. Scenario execution coverage comes from completed runner tasks, not token
    presence in source.
11. Feature-first ordering is enforced prospectively through a checkpoint in a
    parent commit, with bootstrap limits stated rather than concealed.
12. Human desire and documentary prose remain candidate input until admitted
    through atomic analysis and plan authority.
13. Documentation participates in proof only through its typed, validated,
    consumed declarations or deterministic bounded projections.
14. Repository-resolvable source snapshots are a good provenance direction;
    unresolvable raw conversation coordinates are not.
15. Character ranges and line numbers are navigation, not exact UTF-8 byte
    identity.
16. Machine consumption is required for machine-authoritative declarations,
    not for every durable human document.
17. The conceptual documentation fields and dispositions do not fit the closed
    current registry and receipt contracts.
18. The public course's core Step-Zero and adversarial architecture aligns with
    the pinned repository baseline.
19. Publication, reproducibility, cross-platform laboratory, and JSON Schema
    compatibility claims require explicit correction or policy before course
    promotion.
20. Fractal governance, ecosystem composition, and self-learning remain
    bounded design patterns until real consuming gates and proof exist.
21. A source digest is an identity witness, not recoverable storage; exact
    supplied bytes must be retained outside text normalization and every
    derived document must be reproducible from those bytes plus an admitted
    transformation.
22. Remediation closure requires a checkpoint-bound proof surface declared
    before implementation and a generated receipt for the exact proof subject;
    expected adversarial RED remains RED, stale receipts remain historical but
    inapplicable, and activation is prospective rather than retroactive.

With those refinements, every adopted direction is integrity-monotonic: it
closes a false green, preserves boundary evidence, strengthens deterministic
proof, or adds independent release authorization without weakening an existing
fail-closed guarantee.
