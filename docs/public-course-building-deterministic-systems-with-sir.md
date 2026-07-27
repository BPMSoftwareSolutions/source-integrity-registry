# Building Deterministic Systems from One Governed Cell

## A public, laboratory-based course using the Source Integrity Registry

> Before SIR governs source bodies, SIR proves the contract by which source
> bodies may be governed.

**Course version:** 0.1  
**Repository baseline:** `main` at `1eeb6a92f867ebd4593e98133ba4a852d6b2dcdd`  
**Research and baseline review:** July 27, 2026  
**Level:** upper-division undergraduate, graduate, or professional  
**Format:** 12 modules plus a capstone  
**License:** the repository's MIT license applies

**Status note:** SIR is a pre-release teaching implementation. Its current
package proof establishes internal consistency, not authenticated release
provenance. The course treats that boundary as part of the lesson.

This course teaches students to build a small deterministic governance circuit,
prove its boundaries, and repeat the same pattern across a network of systems.
The Source Integrity Registry (SIR) is the working laboratory.

The central idea is simple:

> If one small governance cell has exact inputs, admitted authority, a closed
> decision set, canonical testimony, and fail-closed composition, that cell can
> be repeated at every boundary of a larger system.

We call the repetition **fractal governance**. This is an architectural model,
not a claim that software becomes mathematically correct merely by being
self-similar. Every repeated cell must actually enforce the same invariants,
and every parent must refuse to hide a failed child.

---

## 1. What students will be able to do

By the end of the course, students will be able to:

1. State a behavioral obligation in precise, example-based language.
2. give the obligation a stable identity in Gherkin;
3. encode durable, declared structure in an immutable JSON Schema;
4. distinguish a schema's dialect, identity, version, and byte digest;
5. bootstrap a local trusted catalog without letting input select its own judge;
6. preserve evidence that ordinary JSON parsing would destroy;
7. implement a fail-closed admission circuit with one authoritative result;
8. separate declared truth from observed truth;
9. produce stable, machine-consumable receipts;
10. test adversarial states rather than only intended states;
11. govern remediation from analysis through implementation and proof;
12. integrate the cell into a larger ecosystem without overstating what it
    proves; and
13. design a capstone registry for a real system.

---

## 2. The course's precise definition of deterministic

For this course, a validation circuit is deterministic when:

```text
the same validator/package version
+ the same invocation arguments
+ the same registry bytes
+ the same admitted catalog and schema bytes
+ the same stable filesystem snapshot, when observation is requested
= the same disposition and canonically ordered findings
```

We can write that as:

```text
receipt = V(implementation, invocation, registry, catalog, schemas, snapshot)
```

For equal inputs in the stated proof boundary:

```text
V(x) = V(x)
```

This definition does **not** mean that SIR proves:

- the declared business intent is morally, legally, or commercially correct;
- the implementation fulfills the declared responsibility semantically;
- SHA-256 identifies who authorized a file;
- a build is reproducible on every undeclared environment;
- a hostile filesystem cannot win a race;
- a signed release is trustworthy merely because it is signed;
- distributed nodes have reached consensus; or
- a downstream system actually honors a SIR result unless that system makes
  SIR an admission gate.

Determinism is a property of the decision procedure inside a declared boundary.
Correctness, authorization, security, availability, and consensus require
additional evidence.

---

## 3. The smallest governed cell

The course begins with one cell:

```text
+------------------+    +------------------+    +----------------------+
| Intent           |--->| Contract         |--->| Admission            |
| Gherkin scenario |    | exact schema     |    | catalog + identity   |
+------------------+    +------------------+    | + digest             |
        ^                                      +----------------------+
        |                                                   |
        |                                                   v
+------------------+    +------------------+    +----------------------+
| Governed         |<---| Disposition      |<---| Evaluation           |
| remediation     | RED| one signal       |    | declared + observed  |
+------------------+    +------------------+    +----------------------+
                            |
                            | GREEN
                            v
                    +------------------+
                    | Admit to the     |
                    | next cell        |
                    +------------------+
```

The cell is self-governing in a deliberately modest sense:

- its input contract is explicit;
- the contract must itself be admitted;
- evaluation cannot run under unproved authority;
- output has a separate contract;
- failure cannot be converted to success by a later step; and
- changing the cell must pass through an explicit remediation transition.

### 3.1 From one cell to a fractal

```text
System release gate
|
+-- Application gate
|   +-- Source body A
|   `-- Source body B
|
+-- Package gate
|   +-- Generated contracts
|   `-- Packed consumer
|
`-- Operations-policy gate
    +-- Deployment policy
    `-- Runtime configuration  [RED]
```

If runtime configuration is RED, the operations-policy gate, system gate, and
release are RED. A parent may add context, but it may not turn an earlier RED
result GREEN.

SIR currently implements a registry-validation cell and repository proof
cells. It does not yet implement a general network aggregator. Students design
that composition in the capstone.

---

## 4. Eight invariants that make the cell reusable

| Invariant | Meaning | SIR realization |
| --- | --- | --- |
| Exact authority | A durable payload names one exact rule set. | Exact, versioned `contract.schemaId`; no `latest`, ranges, or aliases. |
| Authority before evaluation | Input cannot select or weaken its own judge. | Packaged catalog schema admits the caller catalog before entry lookup. |
| Identity agreement | Independent statements must agree. | Requested identity, catalog entry, loaded `$id`, dialect, family, version, and optional digest are bound. |
| Structural uniqueness | One logical coordinate has one structural location. | Registry and receipt bodies are keyed by `bodyId`. |
| Evidence preservation | A lossy parser cannot erase an ambiguity before judgment. | Duplicate-aware authority parsing precedes evaluation. |
| No silent repair | Validation observes; authoring changes authority. | No defaults, coercion, removal, migration, digest rewrite, or generated repair during proof. |
| Canonical testimony | Equal admitted inputs do not produce order-dependent reports. | Findings and body keys use Unicode code-point order. |
| Integrity-monotonic composition | A later layer can narrow acceptance, never broaden an earlier failure. | Admission gates stop the circuit; proof and signatures cannot reverse a RED result. |

These invariants, rather than a particular programming language or framework,
are what students should carry into other systems.

---

## 5. Research foundation

SIR combines established ideas into one deliberately small circuit:

- JSON Schema Draft 2020-12 separates the dialect named by `$schema` from the
  schema resource identified by `$id`. The root schema is expected to have an
  absolute identifier, and instance evaluation begins at the root schema.
  See the [JSON Schema 2020-12 specification][json-schema].
- JSON object member names should be unique. RFC 8259 warns that behavior for
  repeated names is unpredictable across implementations. A validator that
  first uses an ordinary last-value-wins parse can therefore lose authority
  evidence before validation begins. See [RFC 8259, section 4][rfc-8259].
- JSON Pointer supplies a standard coordinate syntax for findings. The tokens
  `~` and `/` require escaping. See [RFC 6901][rfc-6901].
- SHA-256 digests can detect changed bytes. A digest alone does not establish
  authorship or authorization. See [NIST FIPS 180-4][fips-180-4].
- Semantic Versioning says released contents must not be modified in place.
  SIR applies that immutability rule to published schema bytes. See
  [Semantic Versioning 2.0.0][semver].
- Gherkin scenarios are concrete examples that serve as both specification
  and documentation and can be connected to executable tests. See the
  [Cucumber Gherkin reference][gherkin].
- Economy of mechanism, fail-safe defaults, and complete mediation are classic
  protection principles. SIR's small, deny-by-default admission circuit is
  consistent with those principles. See Saltzer and Schroeder's
  [Protection of Information in Computer Systems][saltzer-schroeder].
- A reproducible build requires the same source, build environment, and build
  instructions to produce bit-for-bit identical artifacts. SIR's deterministic
  receipts are related to, but narrower than, full reproducible builds. See the
  [Reproducible Builds definition][reproducible-builds].
- SLSA provenance records where, when, and how an artifact was produced.
  in-toto verifies that supply-chain steps were performed as planned by
  authorized parties. These are complementary to SIR's source-binding and
  admission contracts. See [SLSA provenance][slsa] and
  [in-toto's model][in-toto].

### 5.1 A useful comparison

| System or standard | Primary question |
| --- | --- |
| JSON Schema | Does this value conform to these declared structural rules? |
| SIR | May these declared source bindings be admitted under this exact local authority, and do observed whole-file bytes still match? |
| Git | Which content-addressed objects and history does this revision name? |
| Reproducible Builds | Can independent parties recreate bit-identical artifacts from declared inputs and environment? |
| SLSA provenance | Where, when, and how was this artifact produced? |
| in-toto | Were supply-chain steps performed as laid out by authorized functionaries? |

These mechanisms reinforce one another, but none should be relabeled as
another.

---

## 6. Repository map

```text
source-integrity-registry/
|-- features/                         intent and acceptance authority
|-- contracts/
|   |-- catalog/                      catalog schema and admitted catalog
|   |-- source-integrity-registry/    declared-truth contract
|   |-- source-integrity-validation-receipt/
|   `-- generated/typescript/         compile-time projections
|-- src/
|   |-- authority/                    evidence-preserving JSON parser
|   |-- catalog/                      catalog and schema admission
|   |-- domain/                       identity, digest, ordering, containment
|   |-- observation/                  whole-file physical observation
|   |-- validation/                   the validation circuit
|   `-- cli/                          stable command and exit-code surface
|-- tests/                            positive and adversarial proof
|-- docs/remediation-governance/      schemas for changing the system
|-- docs/generated/                   deterministic remediation projection
`-- scripts/                          generation, checks, proof, and checkpoints
```

Students should keep these authority roles distinct:

```text
                         +----------------------+
                         | Feature scenarios    |
                         | behavioral intent    |
                         +----------+-----------+
                                    |
               +--------------------+--------------------+
               |                    |                    |
               v                    v                    v
     +------------------+  +------------------+  +------------------+
     | JSON Schemas     |  | Executable tests |  | Remediation graph|
     | declared shape   |  | test testimony   |  | change authority |
     +--------+---------+  +------------------+  +--------+---------+
              |                                           |
       +------+-------+                                   v
       |              |                         +-------------------+
       v              v                         | History checkpoint|
+-------------+  +----------------+              | transition proof  |
| Generated   |  | Trusted catalog|              +-------------------+
| TypeScript  |  | admission auth |
| projection  |  +-------+--------+
+-------------+          |
                         v
                 +----------------+
                 | Runtime        |
                 | validator      |
                 +-------+--------+
                         |
                         v
                 +----------------+
                 | Validation     |
                 | receipt        |
                 +----------------+
```

Generated types are useful, but they are not runtime authority. Tests are
testimony, but their prose does not replace the feature. A receipt reports what
one circuit observed; it does not rewrite declared truth.

---

## 7. The repository's evolution: a case study in closing false greens

The commit history is part of the curriculum. Use `git show` and `git diff`;
students do not need to move their working tree to study an earlier state.

| Commit | Evolution | Teaching lesson |
| --- | --- | --- |
| `ac04c57` | Created Step Zero: three schemas, offline catalog resolution, schema digest binding, whole-file observation, CLI, and 37 tests. | Start with a small contract and an executable vertical slice. |
| `c4d5954` | Added a remediation plan without changing code. | Diagnose and bound the transition before implementing it. |
| `8180680` | Added 23 stable analysis decisions with evidence, direction, integrity gain, and non-degradation guards. Rejected unsupported restrictions as well as adopting fixes. | Governance must record why a change is legitimate and what it must not weaken. |
| `8747853` | Added stable plan coordinates and role-aware `authority`, `guard`, and `context` edges. | A list of documents is not yet a resolvable governance graph. |
| `6d191f8` | Replaced prose scraping with typed fenced blocks, closed schemas, and real Markdown/Gherkin parsing. | Machine governance needs typed authority, not inferred relationships. |
| `7af36df` | Reconciled the features and implemented five remediation slices, closing duplicate-member, structural-identity, swapped-schema, real-path, ordering, fresh-build, and packed-consumer false greens. The commit records 116 passing tests. | Adversarial examples reveal where apparently deterministic code silently broadens acceptance. A combined authority-and-implementation commit still cannot prove temporal precedence. |
| `1eeb6a9` | Turned remediation traceability into a transition-governing pipeline: complete analysis admission, derived lifecycle, executed-scenario testimony, fail-before-write projection, and feature-before-implementation history checkpoints. The commit records 129 tests and 27 covered scenarios. | Traceability says what is related; transition governance constrains what may happen next. |

### 7.1 The most instructive before-and-after

The initial registry represented bodies as an array:

```json
{
  "entries": [
    {
      "bodyId": "pricing-policy",
      "source": {}
    }
  ]
}
```

That representation required a separate uniqueness witness. Two array items
could claim the same identity and still occupy different structural positions.
The remediated contract makes identity the coordinate:

```json
{
  "entries": {
    "pricing-policy": {
      "source": {}
    }
  }
}
```

Within parsed JSON, one member name now has one location. Raw duplicate member
names must still be rejected before parsing erases them.

### 7.2 History laboratory

```bash
# Read the original five scenarios.
git show ac04c57:features/admit-source-integrity-registry.feature

# See how the product authority expanded from 5 to 17 scenarios.
git diff ac04c57 7af36df -- features/admit-source-integrity-registry.feature

# See the array-to-keyed-object contract transition.
git diff ac04c57 7af36df -- \
  contracts/source-integrity-registry/1.0.0/source-integrity-registry.schema.json

# See traceability become transition governance.
git diff 7af36df 1eeb6a9 -- \
  features/prove-source-integrity-registry-package.feature \
  docs/remediation-governance \
  scripts/remediation
```

**Discussion:** For each change, identify:

1. the false GREEN;
2. the evidence that demonstrated it;
3. the new intent scenario;
4. the narrowest mechanism that closed it;
5. the new adversarial test; and
6. the proof boundary that remained intentionally unclaimed.

---

## 8. Course schedule

| Module | Theme | Primary artifact |
| --- | --- | --- |
| 0 | Establish the laboratory | A reproducible baseline report |
| 1 | Define the deterministic cell | An invariant and boundary map |
| 2 | Put intent before implementation | A tagged Gherkin feature |
| 3 | Use schema as the durable backbone | A closed, versioned JSON Schema |
| 4 | Admit the authority before the subject | A trusted catalog entry |
| 5 | Preserve raw authority evidence | Duplicate-aware parser tests |
| 6 | Build the fail-closed circuit | A disposition transition table |
| 7 | Bind logical responsibility to physical bytes | A valid registry payload |
| 8 | Observe without mutating | A body-observation receipt |
| 9 | Make testimony stable and composable | Canonical findings and a parent gate |
| 10 | Prove adversarially | A threat and negative-test matrix |
| 11 | Govern remediation and release | Analysis, plan, scenario, checkpoint, proof |
| Capstone | Integrate a real system | A complete governed ecosystem cell |

---

# Module 0 — Establish the laboratory

## Learning objective

Establish a known baseline and distinguish a proof failure from a product
disposition.

## Prerequisites

- Git
- Node.js `>=20.11.0`
- pnpm 10, matching the repository's CI workflow
- a case-sensitive understanding of byte identity

The repository currently does not declare a `packageManager` field. For this
course, use the pnpm major version pinned by `.github/workflows/prove.yml`.

## Baseline

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm prove
git status --short
```

A valid baseline has:

- exit status `0`;
- all selected tests passing;
- all current scenario IDs carrying executed passing testimony;
- generated catalog, declarations, and remediation index matching
  deterministic regeneration;
- a fresh staged build matching the normal build;
- a packed package that works from a temporary consumer; and
- no tracked change after proof.

`pnpm prove` is comparison-only. It is not allowed to repair stale authority.

## Laboratory record

Students submit:

```text
commit:
node version:
pnpm version:
test count:
scenario count:
proof exit status:
working-tree status after proof:
```

## Checkpoint question

Why is “the validator returned RED” different from “the validator could not
execute”?

An invalid payload has a meaningful governed disposition. An unreadable input
or unexpected internal fault means the circuit could not truthfully produce a
verdict.

---

# Module 1 — Define the deterministic cell

## Learning objective

Turn the word “deterministic” into explicit inputs, outputs, and exclusions.

## Read

- `README.md`, “The validation circuit”
- `src/domain/dispositions.ts`
- `src/validation/validate-registry.ts`

## The transistor model

SIR preserves many findings for diagnosis but emits one parent-facing signal:

```text
many facts in
     |
     v
one closed disposition out
```

The current disposition set is:

| Disposition | Meaning |
| --- | --- |
| `REGISTRY_CONTRACT_VALID` | The declared contract is valid and any requested observation conforms. |
| `REGISTRY_CONTRACT_INVALID` | The payload violates its schema or repeats a raw JSON member. |
| `SCHEMA_NOT_ADMITTED` | The catalog/schema authority or exact identity is not admissible. |
| `SCHEMA_DIGEST_MISMATCH` | Loaded schema bytes disagree with the admitted digest. |
| `SOURCE_BODY_DRIFT` | The registry is structurally valid, but requested physical observation disagrees. |

Mechanical execution failure is outside this set and maps to CLI exit `6`.

## Exercise

Draw the circuit for a configuration service with these inputs:

- a versioned policy schema;
- a policy document;
- a trusted catalog;
- the deployed policy file; and
- a stable validator version.

Name every point at which the circuit must stop. Then state three things the
circuit cannot prove.

## Mastery check

A good answer can name the complete deterministic input boundary without
saying “same code” or “same data” vaguely.

---

# Module 2 — Put intent before implementation

## Learning objective

Express an obligation in language that domain experts, implementers, and tests
can share.

## Read

- `features/admit-source-integrity-registry.feature`
- `features/prove-source-integrity-registry-package.feature`
- `features/establish-source-integrity-registry-release-provenance.feature`

## Intent grammar

Use each scenario to identify:

```text
Given  = admitted starting facts
When   = the transition or observation
Then   = externally observable obligation
And    = additional testimony, not a hidden new behavior
```

Prefer one rule per scenario and three to five steps when practical. Give every
durable scenario a stable tag. The human-readable name can improve; the
coordinate should not be silently reused for a different rule.

## Example: payment-pricing integrity

```gherkin
Feature: Admit card-present pricing authority
  A checkout may use a pricing policy only when the declared policy bytes
  remain bound to the exact reviewed revision.

  @pricing-admit-001
  Scenario: Refuse an unreviewed pricing-policy change
    Given an admitted registry declaring the reviewed pricing-policy digest
    When the deployed pricing-policy body is observed
    Then the body conformance is BODY_HASH_MISMATCH
    And the parent deployment gate remains RED
```

Notice what this scenario does not say. It does not say the prices are fair,
legal, profitable, or correct. It says a changed body cannot masquerade as the
reviewed body.

## Intent-to-evidence matrix

| Scenario clause | Contract fact | Runtime witness | Testimony |
| --- | --- | --- | --- |
| “admitted registry” | exact registry schema identity | schema catalog admission | `schemaAdmission.admitted` |
| “reviewed digest” | `source.hash.expected` | SHA-256 comparison | expected and observed hashes |
| “body is observed” | `relativePath`, `whole-file` locator | real containment and stable read | observation entry |
| “gate remains RED” | closed disposition set | fail-closed aggregation | `SOURCE_BODY_DRIFT` |

## Exercise

Write one positive scenario and three adversarial scenarios for a real system
you know. At least one adversarial scenario must concern authority, not merely
malformed data.

---

# Module 3 — Use schema as the durable backbone

## Learning objective

Design a schema that makes invalid declared states unrepresentable where
possible.

## Read

- `contracts/source-integrity-registry/1.0.0/source-integrity-registry.schema.json`
- `contracts/catalog/1.0.0/sir-schema-catalog.schema.json`
- `contracts/source-integrity-validation-receipt/1.0.0/source-integrity-validation-receipt.schema.json`

## Keep the three identities separate

| Identity | Location | Meaning |
| --- | --- | --- |
| `$schema` | schema document | the JSON Schema dialect |
| `$id` | schema document | the exact identity of that schema resource |
| `contract.schemaId` | registry payload | the exact schema requested to govern the payload |

Example:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
  "type": "object",
  "additionalProperties": false
}
```

The URI is an identity. SIR does not interpret it as permission to fetch code
or rules from the network.

## Redundancy as a witness

```text
schemaId version segment
          =
schemaVersion
          =
catalog schemaVersion
          =
loaded schema identity version
```

If `schemaDigest` is present:

```text
declared schemaDigest = catalog digest = observed schema digest
```

Redundancy is useful only when disagreement is refused.

## Closed-world schema design

SIR uses:

- `additionalProperties: false`;
- exact enums and constants;
- anchored identity patterns;
- exact three-part semantic versions;
- exact 40-character lowercase Git revisions;
- relative-path constraints;
- object keys as body identities; and
- descriptions that state proof boundaries.

The general rule is:

> Put declared structure in the schema. Use runtime witnesses only for facts
> the schema cannot observe.

Runtime witnesses are still needed for:

- duplicate names in the original JSON text;
- agreement across separate documents;
- digests of exact bytes;
- real filesystem containment; and
- observable change during a read.

## Versioning laboratory

Classify each change:

| Change | Course answer |
| --- | --- |
| Improve a description without changing the accepted instance set | Patch |
| Add `"yaml"` to an accepted source-language enum | Minor |
| Make an optional authority field required | Major |
| Edit already released `1.0.0` bytes in place | Forbidden |

The repository's `1.0.0` schemas are currently unreleased candidates. The
history deliberately corrected them in place before an external release
boundary. After publication, new bytes require a new version.

---

# Module 4 — Admit authority before consulting it

## Learning objective

Break the self-selection loop in which untrusted input chooses the rules used
to validate itself.

## Read

- `src/catalog/schema-catalog.ts`
- `src/validation/ajv-factory.ts`
- `contracts/catalog/sir-schema-catalog.v1.json`

## The bootstrap problem

```text
Registry     Validator      Packaged       Caller          Loaded
payload                     catalog schema catalog         schema
   |             |               |             |              |
   |--schemaId-->|               |             |              |
   |             |--load-------->|             |              |
   |             |  bootstrap    |             |              |
   |             |               |--validate-->|              |
   |             |               |  complete   |              |
   |             |               |  contract   |              |
   |             |               |             | [check unique |
   |             |               |             |  schema IDs]  |
   |             |               |             |--resolve---->|
   |             |               |             |              |
   |             |               |             |   contain +  |
   |             |               |             |   re-stat +  |
   |             |               |             |   digest +   |
   |             |               |             |   bind IDs   |
   |             |<-----------------------------compile-------|
   |<--evaluate--|               |             |              |
   |  only now   |               |             |              |
```

The caller catalog cannot name a weaker catalog schema and use it to establish
its own validity. Bootstrap authority comes from the installed package.

This ends one regress, but it creates an explicit trust root:

```text
trusted package bytes
        |
        v
packaged catalog schema
        |
        v
caller catalog
        |
        v
registry schema
        |
        v
registry payload
```

The current package proof checks internal agreement and the packed consumer
surface. Independent authorization of released package bytes remains deferred.

## Digest laboratory

```bash
shasum -a 256 \
  contracts/source-integrity-registry/1.0.0/source-integrity-registry.schema.json

jq -r '.entries[]
  | select(.schemaFamily == "source-integrity-registry")
  | .sha256' \
  contracts/catalog/sir-schema-catalog.v1.json
```

The hexadecimal values should agree after accounting for the catalog's
`sha256:` prefix.

## Adversarial question

An attacker swaps in a different schema and updates the catalog digest to
match. Why is a digest comparison insufficient?

Because the bytes may be internally consistent while declaring a different
`$id`, dialect, family, or version. Admission must bind all independent
identity statements.

---

# Module 5 — Preserve raw authority evidence

## Learning objective

Recognize information that is lost at a parsing boundary and preserve it before
making a decision.

## Read

- `src/authority/parse-authority-document.ts`
- `tests/authority-parser.test.ts`

## The duplicate-member problem

This text carries two incompatible declarations:

```json
{
  "status": "accepted",
  "status": "revoked"
}
```

Many JSON parsers retain only the last value. Others reject the document or
expose all pairs. If the first admission step is lossy, later schema validation
cannot prove that the original authority was unambiguous.

SIR therefore:

1. copies and digests the exact bytes;
2. rejects a UTF-8 byte-order mark;
3. decodes UTF-8 fatally;
4. walks the JSON grammar;
5. rejects duplicate members at any depth;
6. records the containing RFC 6901 pointer; and
7. never falls back to `JSON.parse`.

The same parser is used for registry, catalog, schema, and generated-authority
inputs.

## JSON Pointer example

For a body identity `a/b~c`, the pointer token is:

```text
a~1b~0c
```

So its source coordinate is:

```text
/entries/a~1b~0c/source
```

## Laboratory

```bash
pnpm exec vitest run tests/authority-parser.test.ts
```

Then explain why validating the already-parsed object is too late to detect a
duplicate member in the original bytes.

---

# Module 6 — Build the fail-closed circuit

## Learning objective

Implement gates in an order that prevents evaluation under untrusted
authority.

## Read

- `src/validation/validate-registry.ts`
- `src/domain/dispositions.ts`
- `src/cli/run-cli.ts`

## Circuit order

```text
 1. Read registry bytes.
 2. Parse authority while preserving duplicate-member evidence.
 3. Extract and parse the exact contract.schemaId.
 4. Admit the packaged catalog schema as bootstrap authority.
 5. Admit the complete caller catalog under that contract.
 6. Enforce the unique schemaId witness.
 7. Resolve the schema under the real contracts root.
 8. Read, re-stat, and digest schema authority.
 9. Bind requested, catalog, and loaded identity, dialect, family, and version.
10. Validate the schema against the Draft 2020-12 meta-schema and compile it.
11. Validate the registry payload.
12. If requested, observe declared whole-file bodies.
13. Canonically order findings and construct the receipt.
```

```text
+-----------------------------+
| Read + parse registry bytes |
+--------------+--------------+
               |
               v
       Exact schema identity?
          | No        | Yes
          v           v
 SCHEMA_NOT_ADMITTED  Catalog admitted?
                         | No        | Yes
                         v           v
                SCHEMA_NOT_ADMITTED  Schema contained, stable,
                                     matching, and admitted?
                                      | digest mismatch
                                      +--> SCHEMA_DIGEST_MISMATCH
                                      |
                                      | other admission failure
                                      +--> SCHEMA_NOT_ADMITTED
                                      |
                                      | Yes
                                      v
                               Payload conforms?
                                  | No       | Yes
                                  v          v
                    REGISTRY_CONTRACT_       Observation requested?
                    INVALID                    | No      | Yes
                                               v         v
                                      REGISTRY_CONTRACT_ Bodies conform?
                                      VALID                | No      | Yes
                                                           v         v
                                                  SOURCE_BODY_  REGISTRY_CONTRACT_
                                                  DRIFT        VALID
```

No branch rejoins on GREEN after reaching a RED disposition.

## Exit-code contract

| Exit | Meaning |
| ---: | --- |
| `0` | registry valid |
| `2` | invalid CLI command or arguments |
| `3` | schema not admitted |
| `4` | schema digest mismatch |
| `5` | registry contract invalid or source body drift |
| `6` | execution failure; no truthful verdict |

Pipelines branch on exit codes, so changing their meaning is a contract change.

## Exercise

Create a transition table with:

```text
current stage | input fact | next stage | disposition | later stages allowed?
```

Every authority failure must prevent payload evaluation.

---

# Module 7 — Bind logical responsibility to physical bytes

## Learning objective

Create a registry that connects intent, responsibility, source location, and
expected byte identity without mixing declaration with observation.

## Declared truth versus observed truth

```text
registry payload = what authority declares should be true
validation receipt = what one circuit observed
```

The registry contains no observed timestamp, current hash, status, or
conformance result. The validator never rewrites the registry to match what it
finds.

## Worked example: card-present pricing policy

The example below is structurally representative of the current SIR `1.0.0`
contract. The all-zero Git revision and digest are teaching placeholders.
Replace them with the exact revision and SHA-256 digest in a real registry.

```json
{
  "contract": {
    "contractType": "source-integrity-registry",
    "schemaId": "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json",
    "schemaVersion": "1.0.0"
  },
  "registryId": "sir-checkout-pricing",
  "workspace": {
    "workspaceId": "checkout-service",
    "revision": "0000000000000000000000000000000000000000"
  },
  "entries": {
    "card-present-pricing-policy": {
      "responsibility": {
        "capabilityId": "checkout-pricing",
        "featureId": "admit-card-present-pricing",
        "scenarioId": "refuse-unreviewed-policy-change",
        "responsibilityId": "supplies-approved-card-prices",
        "obligationId": "preserve-reviewed-policy-bytes",
        "kind": "admission"
      },
      "source": {
        "relativePath": "policy/card-present-pricing.json",
        "language": "json",
        "locator": {
          "kind": "whole-file",
          "name": "card-present-pricing.json"
        },
        "hash": {
          "algorithm": "sha256",
          "expected": "sha256:0000000000000000000000000000000000000000000000000000000000000000"
        }
      },
      "authority": {
        "gherkinReference": "features/admit-card-present-pricing.feature",
        "semanticAuthorityReference": "semantic-authority/pricing/card-present-pricing.v1.json"
      }
    }
  }
}
```

## What each coordinate contributes

| Coordinate | Purpose |
| --- | --- |
| `registryId` | names the registry |
| `workspace.revision` | refuses a floating branch or tag |
| entry member name | makes body identity structural |
| `responsibility` | declares the logical obligation discharged by the body |
| `source.relativePath` | locates the physical file under a supplied workspace root |
| `source.locator` | says which body within the file is intended |
| `source.hash.expected` | declares the reviewed byte identity |
| `authority` | points toward the language and semantic authority |

## Current boundary

SIR validates the shape of `gherkinReference` and
`semanticAuthorityReference`, but the current observation layer does not prove
that those referenced files exist, conform, or semantically authorize the
source body. That is a downstream traceability capability, not a present
Step-Zero guarantee.

## Laboratory

1. Copy `buildsValidRegistry()` from `tests/support/fixtures.ts` into a
   temporary registry authoring tool or test fixture.
2. Replace its domain names with a system you know.
3. Keep exactly one body.
4. Prove structural conformance without `--workspace`.
5. Add a real whole-file body and its digest.
6. validate again with `--workspace`.
7. change one byte in a disposable copy and observe `SOURCE_BODY_DRIFT`.

Never update the declared digest merely to make the test pass. First determine
whether the changed bytes are authorized.

---

# Module 8 — Observe without mutating

## Learning objective

Compare declared and physical truth while respecting containment and snapshot
limits.

## Read

- `src/domain/containment.ts`
- `src/observation/observe-source-bodies.ts`
- `tests/observe-source-bodies.test.ts`
- containment cases in `tests/adversarial-admission.test.ts`

## Two-layer containment

```text
declared relative path
        |
        v
lexical containment
        |
        v
realpath resolution
        |
        v
real-root containment
        |
        v
file type + initial stat
        |
        v
read exact bytes
        |
        v
second realpath/stat comparison
```

Lexical containment rejects absolute paths, parent traversal, backslashes, and
NUL. Real containment catches a symbolic link or junction that begins inside
the root but resolves outside it.

## Stable-snapshot boundary

SIR compares real path, device, inode, size, and modification time before and
after reading. Observable change is RED.

This detects ordinary concurrent drift. It is not a claim of race-free
security against a hostile filesystem. A stronger guarantee would need a
stronger operating-system primitive and a separately stated proof boundary.

## Whole-file honesty

Step Zero knows how to hash a whole file. It does not interpret an AST.

If a registry declares `named-declaration` or `named-export`, SIR reports
`BODY_LOCATOR_UNRESOLVED`. It does not silently widen the locator to the whole
file, because that would compare a different body than the one declared.

## Body conformance set

| Conformance | Meaning |
| --- | --- |
| `BODY_CONFORMS` | observed whole-file bytes match |
| `BODY_HASH_MISMATCH` | bytes differ |
| `BODY_NOT_FOUND` | declared target is absent or unreadable |
| `BODY_LOCATOR_UNRESOLVED` | locator requires downstream interpretation |
| `BODY_NOT_CONTAINED` | lexical or real target escapes the root or has the wrong type |
| `BODY_CHANGED_DURING_OBSERVATION` | target changed observably during the read |

## Laboratory

```bash
pnpm exec vitest run \
  tests/observe-source-bodies.test.ts \
  tests/adversarial-admission.test.ts
```

Find the symlink-escape tests. Explain why checking only
`path.resolve(root, relativePath)` creates a false GREEN.

---

# Module 9 — Make testimony stable and composable

## Learning objective

Produce a receipt that another deterministic cell can consume.

## Read

- the receipt schema
- `src/domain/ordering.ts`
- `tests/receipt-self-conformance.test.ts`

## One signal, complete diagnosis

```json
{
  "disposition": "SOURCE_BODY_DRIFT",
  "findings": [
    {
      "code": "SIR_BODY_HASH_MISMATCH",
      "instancePath": "/entries/card-present-pricing-policy/source",
      "message": "Body \"card-present-pricing-policy\" at policy/card-present-pricing.json: Declared digest does not match observed bytes."
    }
  ]
}
```

The parent consumes `disposition`. Humans and diagnostic systems consume
`findings`. Multiple findings do not become multiple competing top-level
signals.

The receipt schema is published, and representative emitted receipts are
checked against it in the test suite. The current runtime constructs receipts
directly; it does not recursively validate every receipt before returning it.

## Canonical ordering

Locale-sensitive sorting can vary by host. SIR orders:

1. body keys by Unicode code point; and
2. findings by instance path, schema path, code, and message, also by code
   point.

It does not drop or merge findings during sorting.

## Parent composition rule

For a parent with child dispositions:

```text
parent is GREEN iff every required child is GREEN
```

An example parent policy:

| Child result | Parent result |
| --- | --- |
| all required children valid | GREEN |
| any child RED | RED |
| any required child absent | RED |
| any child cannot execute | circuit failure; never report GREEN |

This aggregation policy is a capstone design, not a current SIR package
feature.

## Exercise

Design a canonical parent receipt for three services. Include:

- stable child coordinates;
- exact child receipt digests;
- code-point ordering;
- one parent disposition;
- a rule for missing testimony; and
- a statement of what the parent does not prove.

---

# Module 10 — Prove adversarially

## Learning objective

Find states that a happy-path test would accidentally admit.

## Threat matrix

| Adversarial state | False GREEN if ignored | SIR control |
| --- | --- | --- |
| `latest` schema alias | meaning can drift without payload change | exact version URI parser and schema pattern |
| duplicate registry member | parser silently chooses a declaration | duplicate-aware authority parser |
| duplicate catalog identity | lookup result depends on ordering | explicit uniqueness witness |
| caller selects catalog contract | untrusted input weakens its judge | packaged bootstrap schema |
| schema swapped and digest recomputed | internally consistent wrong authority | loaded `$id`, dialect, family, version binding |
| body IDs repeated in array values | logical identity is ambiguous | identity as object member coordinate |
| symlink escapes a trusted root | lexical path appears contained | realpath containment |
| file changes during read | receipt names an unstable body | pre/post identity and metadata comparison |
| locale-dependent sorting | equal inputs serialize differently | code-point comparator |
| validator inserts defaults | validated authority differs from submitted authority | mutation options disabled |
| proof regenerates stale files | drift is hidden by the proof itself | generation and comparison commands separated |
| repository tests pass, package is broken | source-only imports hide missing shipped files | packed-consumer smoke test |

## Laboratory

```bash
pnpm exec vitest run tests/adversarial-admission.test.ts
```

For three tests, write a counterexample in this form:

```text
Given:
If the guard were absent:
The circuit would incorrectly report:
The smallest closing mechanism is:
The mechanism still does not prove:
```

## Design principle

The objective is not to add every imaginable restriction. The remediation
analysis rejected unsupported rules such as requiring at least one registry
entry. An empty registry can be structurally valid. Integrity improves when a
demonstrated false GREEN is closed without inventing domain policy.

---

# Module 11 — Govern remediation and release

## Learning objective

Make the transition from RED to a new authorized state deterministic.

## Read

- `docs/source-integrity-registry-remediation-analysis.md`
- `docs/source-integrity-registry-remediation.md`
- `docs/generated/source-integrity-registry-remediation-analysis-index.v1.json`
- `docs/remediation-governance/*.schema.json`
- `features/prove-source-integrity-registry-package.feature`
- `scripts/check-remediation-history.ts`

## Traceability is not enough

A traceability graph can say:

```text
analysis --> plan --> scenario --> test
```

Transition governance must also constrain time and authorization:

```text
+-------------+    +----------+    +----------+    +----------+
| Substantive |--->| Admitted |--->| Bound    |--->| Feature  |
| evidence    |    | analysis |    | plan     |    | scenario |
+-------------+    +----------+    +----------+    +-----+----+
                                                          |
                                                          v
+-------------+    +----------+    +----------+    +-------------+
| Projection  |<---| Executed |<---| Descendant|<---| Committed   |
| + proof     |    | testimony|    | implement.|    | checkpoint  |
+-------------+    +----------+    +----------+    +-------------+
```

The current remediation pipeline requires:

- stable `SIR-RA-NNN`, `SIR-RP-NNN`, scenario, and checkpoint IDs;
- typed `sir-analysis` and `sir-trace` blocks;
- evidence, direction, integrity gain, non-degradation guards, proof limits,
  and scenario-coverage policy;
- role-aware `authority`, `guard`, and `context` edges;
- real Markdown and Gherkin parsing;
- a generated, schema-valid, deterministically ordered projection;
- fail-before-write generation;
- executed, selected, passing scenario testimony;
- feature bytes and scope bound into a checkpoint; and
- a checkpoint in a parent commit before governed implementation.

Lifecycle state is derived from evidence. Authors cannot declare a convenient
state merely to bypass a missing predecessor.

## Authoring versus checking

```text
generate:*  = an explicit authoring action
check:*     = comparison-only proof
prove       = checks; never repairs
```

If inputs are invalid, generation must report diagnostics before replacing the
canonical projection.

## Remediation loop

When body drift is legitimate:

1. keep the RED receipt;
2. identify the intended behavior change;
3. admit evidence into an analysis coordinate;
4. bind a plan coordinate;
5. move or add the feature scenario first;
6. commit the authority state;
7. create and commit the scoped checkpoint;
8. implement in a descendant commit;
9. update the declared digest through an explicit authoring action;
10. run adversarial and positive proof; and
11. preserve the new testimony.

Do not update a hash merely because a build is RED. A digest change records
different bytes; it does not authorize them.

## Package proof versus release provenance

The package proof establishes internal consistency:

- types and tests pass;
- generated authority is current;
- remediation governance is conformant;
- a fresh staged build agrees;
- a packed consumer can use the shipped artifact; and
- proof does not mutate tracked content.

The repository explicitly keeps release provenance separate and deferred.
A future release layer is expected to bind a signed annotated tag, exact
commit, packed tarball digest, catalog digest, and schema digest inventory.

A signature may establish who signed some bytes. It may not turn a failed
contract, drifted body, or broken package GREEN.

---

# Capstone — Bring a real system into the ecosystem

## Objective

Integrate one real system with SIR and demonstrate that integrity is enforced at
an actual admission boundary.

The phrase “SIR can govern any system” has a condition:

> The system must expose governable bodies as exact bytes, declare them under
> an admitted contract, and refuse progression when the SIR gate is not GREEN.

Without enforcement at the consuming boundary, a receipt is informative, not
controlling.

## Capstone architecture

```text
+-------------------------------+
| Domain intent                 |<----------------------------+
+---------------+---------------+                             |
                |                                             |
                v                                             |
+-------------------------------+                             |
| Gherkin authority             |                             |
+---------------+---------------+                             |
                |                                             |
                v                                             |
+-------------------------------+                             |
| Versioned schema + catalog    |                             |
+---------------+---------------+                             |
                |                                             |
                v                                             |
+-------------------------------+                             |
| Registry: physical/logical    |                             |
| bindings                      |                             |
+---------------+---------------+                             |
                |                                             |
                v                                             |
+-------------------------------+       +-------------------+ |
| SIR validation + observation  |------>| Canonical receipt | |
+---------------+---------------+       | store             | |
                |                       +---------+---------+ |
                v                                 |           |
       Required disposition?                      v           |
          | GREEN       | RED             +-----------------+ |
          v             v                 | Parent ecosystem| |
+----------------+  +------------------+  | gate            | |
| Build, deploy, |  | Governed         |  +-----------------+ |
| or execute     |  | remediation      |----------------------+
+----------------+  +------------------+
```

## Required deliverables

1. **System boundary**
   - What exact transition is being gated?
   - Who or what consumes the result?

2. **Intent**
   - One feature with a stable ID.
   - At least one positive and three adversarial scenarios.

3. **Contract**
   - An exact schema identity.
   - A versioning policy.
   - A no-implicit-migration rule.

4. **Registry**
   - At least three structural body coordinates.
   - Exact Git revision and whole-file digests.
   - Responsibility and authority mappings.

5. **Admission**
   - A catalog entry.
   - Offline resolution.
   - Identity and digest agreement.

6. **Observation**
   - A conforming run.
   - A drifted run.
   - A containment or unavailable-body run.

7. **Testimony**
   - Stable receipt ordering.
   - A parent-facing disposition.
   - Stored evidence for all runs.

8. **Remediation**
   - An analysis entry.
   - A plan-to-scenario edge.
   - Evidence that intent preceded implementation.

9. **Boundary statement**
   - At least five facts the capstone does not prove.

## Evaluation rubric

| Criterion | Weight |
| --- | ---: |
| Intent is understandable, stable, and executable | 15% |
| Schema makes invalid declarations unrepresentable | 15% |
| Authority admission is exact and fail-closed | 15% |
| Registry binds logical responsibility to exact bytes | 15% |
| Adversarial proof demonstrates real false-green resistance | 15% |
| Receipts are stable and consumed at an actual gate | 10% |
| Remediation transition is governed | 10% |
| Proof boundaries are honest | 5% |

---

## 9. Real-world transfer blueprints

These examples show how to transfer the pattern without claiming domain
correctness that SIR does not establish.

### 9.1 Payment pricing

**Bodies**

- reviewed pricing JSON;
- tax-rounding TypeScript module;
- checkout eligibility rules.

**Gate**

The deployment pipeline runs SIR before promoting the checkout service.

**SIR can establish**

- the registry uses an admitted exact schema;
- reviewed whole-file bodies still match their declared digests;
- bodies have unique coordinates; and
- drift produces a stable RED disposition.

**Additional authority required**

- legal and finance approval;
- semantic tests of price calculations;
- signed release provenance; and
- runtime deployment attestation.

### 9.2 Medication-dosing support

**Bodies**

- a versioned JSON dosing table;
- an interaction-rule module;
- human-readable clinical authority notes.

**Gate**

The clinical application build refuses to package a changed table or rule body
without governed review.

**SIR can establish**

Byte and declaration integrity inside its proof boundary.

**SIR does not establish**

Clinical safety, regulatory approval, patient suitability, or correctness of
the medical rule. Those require qualified independent authorities and domain
validation. In a safety-critical system, SIR is one gate, never the entire
assurance case.

### 9.3 Machine-learning inference policy

**Bodies**

- inference-policy JSON;
- model-card Markdown;
- TypeScript feature-normalization code.

**Gate**

An inference deployment requires all registered policy and wrapper bodies to
conform.

**Extension**

The current schema's language enum does not include a binary model format. An
adopter must either register a supported JSON manifest that names the model
artifact or introduce a properly versioned contract that can represent binary
artifacts. It must not label binary data as JSON merely to satisfy `1.0.0`.

**Additional authority required**

Model evaluation, data lineage, bias and safety review, model-artifact
provenance, and runtime monitoring.

### 9.4 Infrastructure policy

**Bodies**

- JSON deployment policy;
- JavaScript admission hook;
- Markdown runbook.

**Gate**

Promotion to an environment requires a GREEN SIR receipt, followed by the
platform's own plan and policy checks.

**Additional authority required**

Cloud identity, state inspection, provider-specific plan evaluation, secrets
management, and deployment provenance.

### 9.5 Firmware or embedded control

The current registry schema does not admit C, Rust, VHDL, or Verilog in its
language enum. Supporting one of these languages expands the accepted instance
set and therefore requires a new schema version and regenerated catalog/types.
Whole-file hashing may work mechanically, but the declaration must not lie
about its language.

This is an important ecosystem lesson:

> Universal architecture does not mean one frozen schema can truthfully
> represent every domain.

The invariant pattern transfers. Domain contracts still evolve explicitly.

---

## 10. Adoption checklist for any new node

Before a system enters the ecosystem, answer:

### Authority

- What human-readable scenario authorizes the behavior?
- What stable ID names it?
- What exact schema version governs the registry?
- What package or external root authorizes that schema?

### Identity

- What are the exact bytes?
- What immutable source revision contains them?
- Is logical identity structural?
- Do all restated identity facts agree?

### Evaluation

- Can validation run without network retrieval?
- Can it mutate any authority input?
- What is the complete disposition set?
- Which failures stop later evaluation?

### Testimony

- Is there one parent-facing signal?
- Are all findings retained and canonically ordered?
- Does the receipt have its own contract?
- Where is the receipt stored and who consumes it?

### Composition

- Is SIR required at a real build, deploy, or execution boundary?
- Can a parent ever ignore, overwrite, or reinterpret RED as GREEN?
- What happens when testimony is missing?

### Remediation

- Is evidence recorded before the plan?
- Does intent move before implementation?
- Is the authority state committed before the implementation state?
- Does proof compare rather than repair?

### Limits

- What semantic, security, authorization, provenance, and runtime properties
  remain outside the cell?

If any answer is implicit, the node is not ready to become part of a
deterministic governance network.

---

## 11. Instructor guidance

### Teach the counterexamples

The strongest lessons in this repository are not the happy path. They are the
states that once looked GREEN:

- duplicate body identities in arrays;
- duplicate raw JSON members;
- a caller catalog that was not first validated by packaged authority;
- swapped schema bytes with a recomputed digest;
- symlink escape after lexical containment;
- locale-dependent ordering;
- generated repair inside proof;
- package tests that never exercised the installed tarball; and
- traceability that did not prove feature authority preceded implementation.

Ask students to demonstrate the false GREEN before discussing the fix.

### Grade proof boundaries

Deduct for inflated claims even when code passes. Reward students who say:

```text
This proves X under conditions Y.
It does not prove Z.
The next authority needed for Z is Q.
```

### Separate authoring from proof

Generation is a legitimate explicit authoring action. It is not legitimate for
a proof command to regenerate stale authority and then announce success.

### Keep the first cell small

Begin with one whole-file JSON or TypeScript body. Do not start with AST
resolution, distributed consensus, signatures, runtime policy, and deployment
attestation all at once. Each can become a downstream governed cell after the
Step-Zero cell is understood.

---

## 12. Glossary

**Admission**  
A fail-closed decision that authority or a subject is eligible for the next
stage.

**Authority**  
The rule set or evidence permitted to govern a decision.

**Body**  
The physical source bytes declared to discharge a logical responsibility.

**Canonical testimony**  
Receipt data whose construction and ordering are stable inside the declared
input boundary.

**Declared truth**  
What an authority payload says should be true.

**Deterministic circuit**  
A bounded procedure that produces the same closed result and ordered testimony
for the same complete inputs.

**Disposition**  
The circuit's single authoritative result.

**False GREEN**  
A success result produced even though an unproved, ambiguous, drifted, or
unauthorized state was admitted.

**Fractal governance**  
The architectural repetition of the same small admission invariants at nested
system boundaries.

**Integrity-monotonic**  
A change or downstream gate may preserve or narrow acceptance but may not turn
an earlier failure into success.

**Observed truth**  
What a particular circuit saw during a particular execution.

**Projection**  
A generated representation derived from canonical authority. It is not a new
independent authority.

**Receipt**  
Contract-governed testimony naming the subject, authority admission, findings,
observation, and disposition.

**Remediation**  
The governed transition from demonstrated failure or insufficiency to new
authorized intent, implementation, and proof.

**Step Zero**  
Schema governance, registry contract validation, and whole-file physical body
observation before semantic source interpretation.

---

## 13. Primary reading list

1. [JSON Schema Draft 2020-12 Core][json-schema]
2. [JSON Schema Draft 2020-12 overview and meta-schema][json-schema-overview]
3. [Ajv options: strict validation and non-mutating defaults][ajv-options]
4. [RFC 8259: The JavaScript Object Notation Data Interchange Format][rfc-8259]
5. [RFC 6901: JSON Pointer][rfc-6901]
6. [NIST FIPS 180-4: Secure Hash Standard][fips-180-4]
7. [Semantic Versioning 2.0.0][semver]
8. [Cucumber Gherkin reference][gherkin]
9. [Saltzer and Schroeder: The Protection of Information in Computer Systems][saltzer-schroeder]
10. [Reproducible Builds: definition][reproducible-builds]
11. [SLSA 1.2 provenance][slsa]
12. [in-toto: getting started and trust model][in-toto]
13. [Git internals: content-addressed objects][git-objects]

---

## 14. Closing principle

The durable lesson is not “put hashes in a JSON file.” It is the complete
chain:

```text
precise language
    |
    v
stable intent identity
    |
    v
exact structural contract
    |
    v
admitted local authority
    |
    v
evidence-preserving evaluation
    |
    v
one canonical disposition
    |
    v
fail-closed composition
    |
    v
governed remediation
```

Build one honest cell. Make its boundaries explicit. Prove its adversarial
states. Then repeat the same invariants at the next boundary.

That is how a small deterministic circuit becomes the foundation of a
deterministic network of systems.

[json-schema]: https://json-schema.org/draft/2020-12/json-schema-core.html
[json-schema-overview]: https://json-schema.org/draft/2020-12
[ajv-options]: https://ajv.js.org/options.html
[rfc-8259]: https://www.rfc-editor.org/rfc/rfc8259.html
[rfc-6901]: https://www.rfc-editor.org/rfc/rfc6901.html
[fips-180-4]: https://csrc.nist.gov/pubs/fips/180-4/upd1/final
[semver]: https://semver.org/
[gherkin]: https://cucumber.io/docs/gherkin/reference/
[saltzer-schroeder]: https://www.cs.virginia.edu/~evans/cs551/saltzer/
[reproducible-builds]: https://reproducible-builds.org/docs/definition/
[slsa]: https://slsa.dev/spec/v1.2/provenance
[in-toto]: https://in-toto.io/docs/getting-started/
[git-objects]: https://git-scm.com/book/en/v2/Git-Internals-Git-Objects
