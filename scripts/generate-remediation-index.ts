import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.ts";
import { createsSirSchemaValidator } from "../src/validation/ajv-factory.ts";
import {
  buildsTraceabilityProjection,
  rendersIndexDocument,
  INDEX_PATH,
  repositoryRoot,
  type RemediationIndex,
  type TraceabilityProjection
} from "./remediation/build-index.ts";
import { isMainModule } from "./is-main-module.ts";

/**
 * Regenerating is an explicit authoring action, deliberately outside proof.
 *
 * Invalid governance never replaces the canonical projection. A complete
 * candidate is serialized to a temporary sibling and atomically renamed only
 * after the entire graph is GREEN.
 */
export interface RemediationIndexGenerationResult {
  readonly written: boolean;
  readonly violations: TraceabilityProjection["violations"];
}

export async function writesRemediationIndexAtomically(
  index: RemediationIndex,
  indexPath: string
): Promise<void> {
  await mkdir(path.dirname(indexPath), { recursive: true });
  const temporaryPath = `${indexPath}.${process.pid}.${Date.now()}.tmp`;

  try {
    await writeFile(temporaryPath, rendersIndexDocument(index), {
      encoding: "utf8",
      flag: "wx"
    });
    await rename(temporaryPath, indexPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function generatesRemediationIndex(
  options: Readonly<{
    indexPath?: string;
    evaluate?: () => Promise<TraceabilityProjection>;
  }> = {}
): Promise<RemediationIndexGenerationResult> {
  const indexPath = options.indexPath ?? INDEX_PATH;
  const { index, violations } = await (options.evaluate ?? buildsTraceabilityProjection)();

  if (index === null || violations.length > 0) {
    return { written: false, violations };
  }

  const candidateViolations = await checksRemediationIndexCandidate(index);
  if (candidateViolations.length > 0) {
    return { written: false, violations: candidateViolations };
  }

  await writesRemediationIndexAtomically(index, indexPath);
  return { written: true, violations };
}

export async function checksRemediationIndexCandidate(
  index: RemediationIndex
): Promise<TraceabilityProjection["violations"]> {
  const schemaPath = path.join(
    repositoryRoot,
    "docs",
    "remediation-governance",
    "sir-remediation-analysis-index.v1.schema.json"
  );
  const parsed = parsesAuthorityDocument(await readFile(schemaPath));
  if (parsed.outcome === "failed") {
    return [
      {
        code: "REMEDIATION_INDEX_SCHEMA_INADMISSIBLE",
        message: parsed.failure.message
      }
    ];
  }

  const validate = createsSirSchemaValidator().compile(
    parsed.document.value as object
  );
  if (!validate(index)) {
    return [
      {
        code: "REMEDIATION_INDEX_CANDIDATE_INVALID",
        message: JSON.stringify(validate.errors)
      }
    ];
  }
  return [];
}

if (isMainModule(import.meta.url)) {
  const result = await generatesRemediationIndex();

  if (!result.written) {
    process.stderr.write(
      `The remediation graph has ${result.violations.length} violation(s); the committed projection was not changed:\n${result.violations
        .map((violation) => `  ${violation.code}: ${violation.message}`)
        .join("\n")}\n`
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(`Wrote ${path.relative(repositoryRoot, INDEX_PATH)}\n`);
  }
}
