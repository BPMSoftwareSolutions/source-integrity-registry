import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.ts";
import { digestsBytes } from "../src/domain/digest.ts";
import { createsSirSchemaValidator } from "../src/validation/ajv-factory.ts";
import { isMainModule } from "./is-main-module.ts";
import {
  buildsTraceabilityProjection,
  INDEX_PATH,
  rendersIndexDocument,
  repositoryRoot
} from "./remediation/build-index.ts";
import { checksCheckpointProjectionBinding } from "./remediation/checkpoint-binding.ts";

interface CheckpointArguments {
  readonly checkpointId: string;
  readonly analysisIds: readonly string[];
  readonly planIds: readonly string[];
  readonly scenarioIds: readonly string[];
  readonly featurePaths: readonly string[];
  readonly implementationScopes: readonly string[];
}

export function parsesCheckpointArguments(arguments_: readonly string[]): CheckpointArguments {
  const values = new Map<string, string[]>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (flag === undefined || value === undefined || !flag.startsWith("--")) {
      throw new Error("Checkpoint arguments must be --flag value pairs.");
    }
    const list = values.get(flag) ?? [];
    list.push(value);
    values.set(flag, list);
  }

  const one = (flag: string, pattern: RegExp): string => {
    const list = values.get(flag) ?? [];
    if (list.length !== 1 || !pattern.test(list[0] ?? "")) {
      throw new Error(`${flag} must appear once with a valid value.`);
    }
    return list[0] as string;
  };
  const many = (flag: string, pattern: RegExp): string[] => {
    const list = [...new Set(values.get(flag) ?? [])];
    if (list.length === 0 || list.some((value) => !pattern.test(value))) {
      throw new Error(`${flag} must appear at least once with valid values.`);
    }
    return list.sort();
  };

  const allowed = new Set([
    "--checkpoint",
    "--analysis",
    "--plan",
    "--scenario",
    "--feature",
    "--scope"
  ]);
  for (const flag of values.keys()) {
    if (!allowed.has(flag)) {
      throw new Error(`Unknown checkpoint argument ${flag}.`);
    }
  }

  return {
    checkpointId: one("--checkpoint", /^SIR-RC-[0-9]{3}$/u),
    analysisIds: many("--analysis", /^SIR-RA-[0-9]{3}$/u),
    planIds: many("--plan", /^SIR-RP-[0-9]{3}$/u),
    scenarioIds: many(
      "--scenario",
      /^@sir-(?:admit|package|provenance)-[0-9]{3}$/u
    ),
    featurePaths: many(
      "--feature",
      /^features\/[A-Za-z0-9._/-]+\.feature$/u
    ),
    // Must stay in step with the history gate's implementation paths, or a
    // governed change would be unscopable and therefore unauthorizable.
    implementationScopes: many(
      "--scope",
      /^(?:src\/|contracts\/|scripts\/|tests\/|docs\/remediation-governance\/|docs\/documentation-snapshots\/|package\.json$|pnpm-lock\.yaml$|vitest\.config\.ts$|\.gitattributes$|\.github\/)[A-Za-z0-9._/-]*$/u
    )
  };
}

async function createsCheckpoint(arguments_: CheckpointArguments): Promise<void> {
  const authorityPaths = [
    "docs/source-integrity-registry-remediation-analysis.md",
    "docs/source-integrity-registry-remediation.md",
    "docs/generated/source-integrity-registry-remediation-analysis-index.v1.json",
    ...arguments_.featurePaths
  ];
  const dirty = git(["status", "--porcelain"]).trim();
  if (dirty !== "") {
    throw new Error(
      `Authority checkpoint creation requires a completely clean committed workspace:\n${dirty}`
    );
  }

  const { index, violations } = await buildsTraceabilityProjection();
  if (index === null || violations.length > 0) {
    throw new Error(
      `Authority checkpoint creation requires a GREEN remediation graph:\n${violations
        .map((violation) => `${violation.code}: ${violation.message}`)
        .join("\n")}`
    );
  }

  const currentIndexBytes = await readFile(INDEX_PATH);
  const expectedIndexBytes = Buffer.from(rendersIndexDocument(index), "utf8");
  if (!currentIndexBytes.equals(expectedIndexBytes)) {
    throw new Error(
      "Authority checkpoint creation requires the committed remediation index to match the GREEN in-memory projection."
    );
  }

  const bindingViolations = checksCheckpointProjectionBinding(index, {
    checkpointId: arguments_.checkpointId,
    analysisIds: arguments_.analysisIds,
    planIds: arguments_.planIds,
    scenarioIds: arguments_.scenarioIds,
    authorityFiles: authorityPaths.map((filePath) => ({ path: filePath }))
  });
  if (bindingViolations.length > 0) {
    throw new Error(
      `Authority checkpoint coordinates are not statically authorized:\n${bindingViolations
        .map((violation) => `${violation.code}: ${violation.message}`)
        .join("\n")}`
    );
  }

  const authorityCommit = git(["rev-parse", "HEAD"]).trim();
  const authorityFiles = authorityPaths.map((filePath) => ({
    path: filePath,
    sha256: digestsBytes(gitBytes(["show", `${authorityCommit}:${filePath}`]))
  }));
  const checkpoint = {
    checkpointType: "sir-remediation-authority-checkpoint.v1",
    checkpointId: arguments_.checkpointId,
    authorityCommit,
    analysisIds: arguments_.analysisIds,
    planIds: arguments_.planIds,
    scenarioIds: arguments_.scenarioIds,
    authorityFiles,
    implementationScopes: arguments_.implementationScopes
  };
  const checkpointSchema = parsesAuthorityDocument(
    await readFile(
      path.join(
        repositoryRoot,
        "docs",
        "remediation-governance",
        "sir-remediation-authority-checkpoint.v1.schema.json"
      )
    )
  );
  if (checkpointSchema.outcome === "failed") {
    throw new Error(`Checkpoint schema is inadmissible: ${checkpointSchema.failure.message}`);
  }
  const validateCheckpoint = createsSirSchemaValidator().compile(
    checkpointSchema.document.value as object
  );
  if (!validateCheckpoint(checkpoint)) {
    throw new Error(
      `Generated checkpoint violates its closed contract: ${JSON.stringify(
        validateCheckpoint.errors
      )}`
    );
  }

  const outputPath = path.join(
    repositoryRoot,
    "docs",
    "remediation-checkpoints",
    `${arguments_.checkpointId}.json`
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(checkpoint, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  process.stdout.write(
    `Created ${path.relative(repositoryRoot, outputPath)} from committed authority ${authorityCommit}. Commit this checkpoint before implementation.\n`
  );
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

function gitBytes(arguments_: readonly string[]): Buffer {
  const result = spawnSync("git", arguments_, {
    cwd: repositoryRoot,
    encoding: "buffer"
  });
  if (result.status !== 0) {
    throw new Error(`git ${arguments_.join(" ")} failed.`);
  }
  return result.stdout;
}

if (isMainModule(import.meta.url)) {
  await createsCheckpoint(parsesCheckpointArguments(process.argv.slice(2)));
}
