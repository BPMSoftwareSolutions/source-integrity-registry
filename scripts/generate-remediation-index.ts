import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildsTraceabilityProjection,
  rendersIndexDocument,
  INDEX_PATH,
  repositoryRoot
} from "./remediation/build-index.ts";
import { isMainModule } from "./is-main-module.ts";

/**
 * Regenerating is an explicit authoring action, deliberately outside proof.
 *
 * Violations are reported but do not block writing: an author fixing the graph
 * needs to see the projection they are correcting. Proof runs the
 * comparison-only checker instead, which does block.
 */
if (isMainModule(import.meta.url)) {
  const { index, violations } = await buildsTraceabilityProjection();

  await mkdir(path.dirname(INDEX_PATH), { recursive: true });
  await writeFile(INDEX_PATH, rendersIndexDocument(index), "utf8");

  process.stdout.write(`Wrote ${path.relative(repositoryRoot, INDEX_PATH)}\n`);

  if (violations.length > 0) {
    process.stderr.write(
      `\nThe remediation graph has ${violations.length} violation(s):\n${violations
        .map((violation) => `  ${violation.code}: ${violation.message}`)
        .join("\n")}\n`
    );
    process.exitCode = 1;
  }
}
