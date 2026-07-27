import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  buildsTraceabilityProjection,
  rendersIndexDocument,
  INDEX_PATH,
  repositoryRoot
} from "./remediation/build-index.ts";
import { checksRemediationIndexCandidate } from "./generate-remediation-index.ts";

/**
 * Comparison-only traceability gate.
 *
 * This never writes. A stale or hand-edited projection fails here rather than
 * being silently repaired, so drift stays visible instead of being absorbed by
 * the command that is supposed to detect it.
 */
const { index, violations } = await buildsTraceabilityProjection();

const problems: string[] = violations.map(
  (violation) => `${violation.code}: ${violation.message}`
);
if (index !== null) {
  problems.push(
    ...(await checksRemediationIndexCandidate(index)).map(
      (violation) => `${violation.code}: ${violation.message}`
    )
  );
}

const expected = index === null ? null : rendersIndexDocument(index);
let actual = "";
try {
  actual = (await readFile(INDEX_PATH)).toString("utf8");
} catch {
  problems.push(
    `COMMITTED_PROJECTION_MISSING: ${path.relative(repositoryRoot, INDEX_PATH)} does not exist.`
  );
}

if (expected !== null && actual !== "" && actual !== expected) {
  problems.push(
    `COMMITTED_PROJECTION_DRIFT: ${path.relative(
      repositoryRoot,
      INDEX_PATH
    )} does not match deterministic regeneration.`
  );
}

if (problems.length > 0) {
  process.stderr.write(
    `Remediation traceability is not conformant:\n${problems
      .map((problem) => `  ${problem}`)
      .join("\n")}\n\nRun "pnpm generate:remediation-index" after correcting the graph.\n`
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Remediation traceability is conformant: ${index?.analyses.length ?? 0} analyses, ${index?.plans.length ?? 0} plans, ${index?.scenarios.length ?? 0} scenarios.\n`
  );
}
