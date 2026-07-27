import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.ts";
import { digestsBytes } from "../src/domain/digest.ts";
import { createsSirSchemaValidator, validatesGuarded } from "../src/validation/ajv-factory.ts";
import { isMainModule } from "./is-main-module.ts";
import {
  repositoryRoot,
  type RemediationIndex
} from "./remediation/build-index.ts";
import { checksCheckpointProjectionBinding } from "./remediation/checkpoint-binding.ts";

const PIPELINE_MARKER =
  "docs/remediation-governance/sir-remediation-pipeline.v1.json";
const CHECKPOINT_DIRECTORY = "docs/remediation-checkpoints";
const REQUIRED_CHECKPOINT_AUTHORITY_FILES = [
  "docs/source-integrity-registry-remediation-analysis.md",
  "docs/source-integrity-registry-remediation.md",
  "docs/generated/source-integrity-registry-remediation-analysis-index.v1.json"
] as const;
const IMPLEMENTATION_PREFIXES = [
  "src/",
  "contracts/",
  "scripts/",
  ".github/",
  "docs/remediation-governance/",
  // Admitted documentation origin and derivation authority. Excluding it would
  // let a commit replace a snapshot and its digest under the same identity
  // with no covering checkpoint.
  "docs/documentation-snapshots/",
  // Tests are the executed testimony scenario coverage is derived from, so a
  // change to them changes what proof actually asserts.
  "tests/"
] as const;
const IMPLEMENTATION_FILES = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "vitest.config.ts",
  // Normalization policy decides whether admitted bytes survive checkout, so
  // it governs the integrity of every digest in the repository.
  ".gitattributes"
]);
const SNAPSHOT_DIRECTORY = "docs/documentation-snapshots";

interface AuthorityCheckpoint {
  readonly checkpointType: "sir-remediation-authority-checkpoint.v1";
  readonly checkpointId: string;
  readonly authorityCommit: string;
  readonly analysisIds: readonly string[];
  readonly planIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly authorityFiles: readonly {
    readonly path: string;
    readonly sha256: string;
  }[];
  readonly implementationScopes: readonly string[];
}

export interface RemediationHistoryViolation {
  readonly code: string;
  readonly message: string;
}

export function isImplementationPath(filePath: string): boolean {
  return (
    IMPLEMENTATION_FILES.has(filePath) ||
    IMPLEMENTATION_PREFIXES.some((prefix) => filePath.startsWith(prefix))
  );
}

export function extractsCheckpointIds(message: string): string[] {
  return [...new Set(message.match(/SIR-RC-[0-9]{3}/gu) ?? [])].sort();
}

export function checksCheckpointCoverage(
  checkpoint: AuthorityCheckpoint,
  changedPaths: readonly string[]
): RemediationHistoryViolation[] {
  return changedPaths
    .filter(isImplementationPath)
    .filter(
      (changedPath) =>
        !checkpoint.implementationScopes.some(
          (scope) =>
            changedPath === scope ||
            (scope.endsWith("/") && changedPath.startsWith(scope))
        )
    )
    .map((changedPath) => ({
      code: "IMPLEMENTATION_PATH_OUTSIDE_CHECKPOINT_SCOPE",
      message: `${changedPath} is outside ${checkpoint.checkpointId}'s implementation scopes.`
    }));
}

export function checksCheckpointRequiredAuthorityFiles(
  checkpoint: AuthorityCheckpoint
): RemediationHistoryViolation[] {
  const paths = new Set(checkpoint.authorityFiles.map((file) => file.path));
  return REQUIRED_CHECKPOINT_AUTHORITY_FILES.filter((filePath) => !paths.has(filePath)).map(
    (filePath) => ({
      code: "CHECKPOINT_REQUIRED_AUTHORITY_FILE_MISSING",
      message: `${checkpoint.checkpointId} does not bind ${filePath}.`
    })
  );
}

export function checksPipelineMarkerContinuity(
  baseHasMarker: boolean,
  headHasMarker: boolean,
  markerChanged: boolean
): RemediationHistoryViolation[] {
  if (!baseHasMarker) {
    return [];
  }
  if (!headHasMarker) {
    return [
      {
        code: "REMEDIATION_PIPELINE_MARKER_REMOVED",
        message: `${PIPELINE_MARKER} exists in the trusted base but is absent from HEAD.`
      }
    ];
  }
  if (markerChanged) {
    return [
      {
        code: "REMEDIATION_PIPELINE_MARKER_CHANGED",
        message: `${PIPELINE_MARKER} changed after prospective enforcement began.`
      }
    ];
  }
  return [];
}

async function checksRemediationHistory(
  baseCommit: string
): Promise<RemediationHistoryViolation[]> {
  // The marker is introduced by the one-time bootstrap. Enforcement starts
  // only when the trusted base already contains it, so the control never
  // pretends to prove its own pre-bootstrap history.
  if (!gitObjectExists(`${baseCommit}:${PIPELINE_MARKER}`)) {
    process.stdout.write(
      "Remediation history bootstrap detected; prospective checkpoint enforcement begins after this marker is committed.\n"
    );
    return [];
  }

  const markerContinuity = checksPipelineMarkerContinuity(
    true,
    gitObjectExists(`HEAD:${PIPELINE_MARKER}`),
    false
  );
  if (markerContinuity.length > 0) {
    return markerContinuity;
  }

  const schemaBytes = await readFile(
    path.join(
      repositoryRoot,
      "docs",
      "remediation-governance",
      "sir-remediation-authority-checkpoint.v1.schema.json"
    )
  );
  const parsedSchema = parsesAuthorityDocument(schemaBytes);
  if (parsedSchema.outcome === "failed") {
    throw new Error(`Checkpoint schema is inadmissible: ${parsedSchema.failure.message}`);
  }
  const compiledCheckpoint = createsSirSchemaValidator().compile(
    parsedSchema.document.value as object
  );
  // Guarded: a validator that throws yields no verdict at all, so authority
  // that cannot be compared must be refused rather than crash the gate.
  const validateCheckpoint = (value: unknown): boolean =>
    validatesGuarded(compiledCheckpoint, value).outcome === "valid";
  const indexSchemaBytes = await readFile(
    path.join(
      repositoryRoot,
      "docs",
      "remediation-governance",
      "sir-remediation-analysis-index.v1.schema.json"
    )
  );
  const parsedIndexSchema = parsesAuthorityDocument(indexSchemaBytes);
  if (parsedIndexSchema.outcome === "failed") {
    throw new Error(
      `Remediation-index schema is inadmissible: ${parsedIndexSchema.failure.message}`
    );
  }
  const compiledIndex = createsSirSchemaValidator().compile(
    parsedIndexSchema.document.value as object
  );
  const validateIndex = (value: unknown): boolean =>
    validatesGuarded(compiledIndex, value).outcome === "valid";

  const commits = git(["rev-list", "--reverse", `${baseCommit}..HEAD`])
    .trim()
    .split(/\r?\n/u)
    .filter((value) => value !== "");
  const violations: RemediationHistoryViolation[] = [];

  for (const commit of commits) {
    const parent = `${commit}^`;
    const changedPaths = [
      ...new Set(
        git([
          "diff-tree",
          "--root",
          "-m",
          "--no-commit-id",
          "--name-only",
          "-r",
          commit
        ])
          .trim()
          .split(/\r?\n/u)
          .filter((value) => value !== "")
      )
    ];
    if (changedPaths.includes(PIPELINE_MARKER)) {
      violations.push(
        ...checksPipelineMarkerContinuity(true, true, true).map((violation) => ({
          ...violation,
          message: `${commit} changes the prospective enforcement marker established by the trusted base.`
        }))
      );
    }
    violations.push(
      ...checksCheckpointTransitions(
        commit,
        parent,
        changedPaths,
        (value) => validateCheckpoint(value),
        (value) => validateIndex(value)
      )
    );
    violations.push(
      ...checksSnapshotImmutability(commit, parent, changedPaths, gitObjectExists)
    );
    const implementationPaths = changedPaths.filter(isImplementationPath);
    if (implementationPaths.length === 0) {
      continue;
    }

    const checkpointIds = extractsCheckpointIds(git(["show", "-s", "--format=%B", commit]));
    if (checkpointIds.length === 0) {
      violations.push({
        code: "IMPLEMENTATION_COMMIT_WITHOUT_CHECKPOINT_REFERENCE",
        message: `${commit} changes governed implementation paths but cites no SIR-RC-NNN checkpoint.`
      });
      continue;
    }

    for (const checkpointId of checkpointIds) {
      const checkpointPath = `${CHECKPOINT_DIRECTORY}/${checkpointId}.json`;
      const rawCheckpoint = gitBytes(["show", `${parent}:${checkpointPath}`], true);
      if (rawCheckpoint === undefined) {
        violations.push({
          code: "CHECKPOINT_NOT_PRESENT_IN_PARENT",
          message: `${commit} cites ${checkpointId}, but ${checkpointPath} is not present in its parent commit.`
        });
        continue;
      }

      const parsed = parsesAuthorityDocument(rawCheckpoint);
      if (parsed.outcome === "failed" || !validateCheckpoint(parsed.document.value)) {
        violations.push({
          code: "CHECKPOINT_INVALID",
          message: `${checkpointId} is not valid checkpoint authority.`
        });
        continue;
      }
      const checkpoint = parsed.document.value as AuthorityCheckpoint;
      if (checkpoint.checkpointId !== checkpointId) {
        violations.push({
          code: "CHECKPOINT_ID_MISMATCH",
          message: `${checkpointPath} declares ${checkpoint.checkpointId}.`
        });
        continue;
      }
      if (!gitIsAncestor(checkpoint.authorityCommit, parent)) {
        violations.push({
          code: "AUTHORITY_COMMIT_NOT_ANCESTOR",
          message: `${checkpoint.authorityCommit} is not an ancestor of ${commit}'s parent.`
        });
      }

      violations.push(...checksCheckpointCoverage(checkpoint, implementationPaths));
      violations.push(...checksCheckpointRequiredAuthorityFiles(checkpoint));
      violations.push(...checksAuthorityFileDigests(checkpoint, parent));
      violations.push(
        ...checksHistoricalCoordinates(checkpoint, (value) => validateIndex(value))
      );
    }
  }

  return violations;
}

/**
 * Enforces immutability of admitted documentation origin snapshots.
 *
 * A snapshot's whole purpose is that exact supplied bytes remain recoverable
 * under a stable identity. Rewriting `SIR-DS-NNN.json` in place would move
 * both the bytes and the digest that attests them, so the change would be
 * self-consistent and invisible. A changed document earns a new snapshot ID;
 * an existing one is never edited or deleted.
 *
 * Derivation declarations may be revised, because they assert a relationship
 * between identities rather than retaining irreplaceable bytes.
 */
export function checksSnapshotImmutability(
  commit: string,
  parent: string,
  changedPaths: readonly string[],
  objectExists: (specifier: string) => boolean
): RemediationHistoryViolation[] {
  const violations: RemediationHistoryViolation[] = [];

  for (const changedPath of changedPaths) {
    const match = /^docs\/documentation-snapshots\/(SIR-DS-[0-9]{3})\.json$/u.exec(changedPath);
    if (match === null) {
      continue;
    }
    if (!objectExists(`${parent}:${changedPath}`)) {
      // First appearance: admitting new origin bytes.
      continue;
    }
    violations.push({
      code: objectExists(`${commit}:${changedPath}`)
        ? "SNAPSHOT_CHANGED_AFTER_ADMISSION"
        : "SNAPSHOT_DELETED_AFTER_ADMISSION",
      message: `${changedPath} is immutable after its admission commit; changed source bytes require a new snapshot identity.`
    });
  }

  return violations;
}

function checksCheckpointTransitions(
  commit: string,
  parent: string,
  changedPaths: readonly string[],
  validateCheckpoint: (value: unknown) => boolean,
  validateIndex: (value: unknown) => boolean
): RemediationHistoryViolation[] {
  const violations: RemediationHistoryViolation[] = [];
  const checkpointPaths = changedPaths.filter((changedPath) =>
    changedPath.startsWith(`${CHECKPOINT_DIRECTORY}/`)
  );

  for (const checkpointPath of checkpointPaths) {
    if (gitObjectExists(`${parent}:${checkpointPath}`)) {
      violations.push({
        code: "CHECKPOINT_CHANGED_AFTER_CREATION",
        message: `${checkpointPath} is immutable after its creation commit.`
      });
      continue;
    }

    const checkpointBytes = gitBytes(["show", `${commit}:${checkpointPath}`], true);
    if (checkpointBytes === undefined) {
      violations.push({
        code: "CHECKPOINT_ADDITION_MISSING_BYTES",
        message: `${checkpointPath} has no bytes in ${commit}.`
      });
      continue;
    }
    const fileNameMatch = /^docs\/remediation-checkpoints\/(SIR-RC-[0-9]{3})\.json$/u.exec(
      checkpointPath
    );
    const parsed = parsesAuthorityDocument(checkpointBytes);
    if (
      fileNameMatch?.[1] === undefined ||
      parsed.outcome === "failed" ||
      !validateCheckpoint(parsed.document.value)
    ) {
      violations.push({
        code: "CHECKPOINT_ADDITION_INVALID",
        message: `${checkpointPath} is not valid checkpoint authority.`
      });
      continue;
    }
    const checkpoint = parsed.document.value as AuthorityCheckpoint;
    if (checkpoint.checkpointId !== fileNameMatch[1]) {
      violations.push({
        code: "CHECKPOINT_ID_MISMATCH",
        message: `${checkpointPath} declares ${checkpoint.checkpointId}.`
      });
      continue;
    }
    if (!gitIsAncestor(checkpoint.authorityCommit, parent)) {
      violations.push({
        code: "AUTHORITY_COMMIT_NOT_ANCESTOR",
        message: `${checkpoint.authorityCommit} is not an ancestor of checkpoint commit ${commit}'s parent.`
      });
    }
    violations.push(...checksCheckpointRequiredAuthorityFiles(checkpoint));
    violations.push(...checksAuthorityFileDigests(checkpoint, parent));
    violations.push(...checksHistoricalCoordinates(checkpoint, validateIndex));
  }
  return violations;
}

function checksAuthorityFileDigests(
  checkpoint: AuthorityCheckpoint,
  implementationParent: string
): RemediationHistoryViolation[] {
  const violations: RemediationHistoryViolation[] = [];
  for (const authorityFile of checkpoint.authorityFiles) {
    const bytes = gitBytes(
      ["show", `${checkpoint.authorityCommit}:${authorityFile.path}`],
      true
    );
    const parentBytes = gitBytes(
      ["show", `${implementationParent}:${authorityFile.path}`],
      true
    );
    if (
      bytes === undefined ||
      parentBytes === undefined ||
      digestsBytes(bytes) !== authorityFile.sha256 ||
      digestsBytes(parentBytes) !== authorityFile.sha256
    ) {
      violations.push({
        code: "CHECKPOINT_AUTHORITY_FILE_DIGEST_MISMATCH",
        message: `${checkpoint.checkpointId} does not bind unchanged ${authorityFile.path} bytes from authority commit through implementation parent.`
      });
    }
  }
  return violations;
}

function checksHistoricalCoordinates(
  checkpoint: AuthorityCheckpoint,
  validateIndex: (value: unknown) => boolean
): RemediationHistoryViolation[] {
  const ledger = gitBytes(
    [
      "show",
      `${checkpoint.authorityCommit}:docs/source-integrity-registry-remediation-analysis.md`
    ],
    true
  )?.toString("utf8");
  const plan = gitBytes(
    ["show", `${checkpoint.authorityCommit}:docs/source-integrity-registry-remediation.md`],
    true
  )?.toString("utf8");
  const features = checkpoint.authorityFiles
    .filter((file) => file.path.startsWith("features/"))
    .map((file) =>
      gitBytes(["show", `${checkpoint.authorityCommit}:${file.path}`], true)?.toString(
        "utf8"
      )
    )
    .filter((value): value is string => value !== undefined)
    .join("\n");
  const violations: RemediationHistoryViolation[] = [];
  const indexBytes = gitBytes(
    [
      "show",
      `${checkpoint.authorityCommit}:docs/generated/source-integrity-registry-remediation-analysis-index.v1.json`
    ],
    true
  );
  const parsedIndex =
    indexBytes === undefined ? undefined : parsesAuthorityDocument(indexBytes);
  const index =
    parsedIndex?.outcome === "parsed" && validateIndex(parsedIndex.document.value)
      ? (parsedIndex.document.value as RemediationIndex)
      : undefined;

  if (index === undefined) {
    violations.push({
      code: "CHECKPOINT_REMEDIATION_INDEX_INVALID",
      message: `${checkpoint.checkpointId} does not bind a valid remediation-index projection.`
    });
  } else {
    violations.push(...checksCheckpointProjectionBinding(index, checkpoint));
  }

  for (const analysisId of checkpoint.analysisIds) {
    if (!ledger?.includes(`"analysisId": "${analysisId}"`)) {
      violations.push({
        code: "CHECKPOINT_ANALYSIS_NOT_IN_AUTHORITY_COMMIT",
        message: `${analysisId} is absent from ${checkpoint.authorityCommit}.`
      });
    }

  }
  for (const planId of checkpoint.planIds) {
    if (!plan?.includes(`"planId": "${planId}"`)) {
      violations.push({
        code: "CHECKPOINT_PLAN_NOT_IN_AUTHORITY_COMMIT",
        message: `${planId} is absent from ${checkpoint.authorityCommit}.`
      });
    }
  }
  for (const scenarioId of checkpoint.scenarioIds) {
    if (!features.includes(scenarioId)) {
      violations.push({
        code: "CHECKPOINT_SCENARIO_NOT_IN_AUTHORITY_COMMIT",
        message: `${scenarioId} is absent from checkpointed feature bytes.`
      });
    }
  }
  return violations;
}

function git(arguments_: readonly string[]): string {
  const result = spawnSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`git ${arguments_.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

function gitBytes(
  arguments_: readonly string[],
  missingIsUndefined = false
): Buffer | undefined {
  const result = spawnSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "buffer"
  });
  if (result.status !== 0) {
    if (missingIsUndefined) {
      return undefined;
    }
    throw new Error(`git ${arguments_.join(" ")} failed.`);
  }
  return result.stdout;
}

function gitObjectExists(specifier: string): boolean {
  return (
    spawnSync("git", ["cat-file", "-e", specifier], {
      cwd: repositoryRoot,
      stdio: "ignore"
    }).status === 0
  );
}

function gitIsAncestor(ancestor: string, descendant: string): boolean {
  return (
    spawnSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: repositoryRoot,
      stdio: "ignore"
    }).status === 0
  );
}

if (isMainModule(import.meta.url)) {
  const configuredBase = process.env["SIR_REMEDIATION_BASE"]?.trim();
  let baseCommit = configuredBase;
  if (baseCommit === undefined || baseCommit === "") {
    try {
      if (gitObjectExists(`HEAD:${PIPELINE_MARKER}`)) {
        const markerCommits = git([
          "log",
          "--diff-filter=A",
          "--format=%H",
          "--",
          PIPELINE_MARKER
        ])
          .trim()
          .split(/\r?\n/u)
          .filter((value) => value !== "");
        baseCommit = markerCommits.at(-1);
      }
      baseCommit ??= git(["rev-parse", "HEAD^"]).trim();
      process.stdout.write(
        `SIR_REMEDIATION_BASE was not supplied; evaluating prospective history from ${baseCommit}.\n`
      );
    } catch {
      baseCommit = git(["rev-parse", "HEAD"]).trim();
    }
  }

  const violations = await checksRemediationHistory(baseCommit);
  if (violations.length > 0) {
    process.stderr.write(
      `Remediation history is RED:\n${violations
        .map((violation) => `  ${violation.code}: ${violation.message}`)
        .join("\n")}\n`
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Remediation history is GREEN.\n");
  }
}
