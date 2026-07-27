import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.ts";
import { digestsBytes, digestsMatch } from "../src/domain/digest.ts";
import {
  isDocumentationDerivation,
  isDocumentationSnapshot,
  recoversOriginBytes,
  reproducesDerivedDocument,
  type DocumentationDerivation,
  type DocumentationSnapshot
} from "../src/documentation/documentation-snapshot.ts";
import { createsSirSchemaValidator } from "../src/validation/ajv-factory.ts";
import { isMainModule } from "./is-main-module.ts";
import { repositoryRoot } from "./remediation/build-index.ts";

const SNAPSHOT_DIRECTORY = path.join(repositoryRoot, "docs", "documentation-snapshots");
const GOVERNANCE_DIRECTORY = path.join(repositoryRoot, "docs", "remediation-governance");

export interface DocumentationViolation {
  readonly code: string;
  readonly message: string;
}

async function loadsGoverningSchema(fileName: string): Promise<object> {
  const parsed = parsesAuthorityDocument(await readFile(path.join(GOVERNANCE_DIRECTORY, fileName)));
  if (parsed.outcome === "failed") {
    throw new Error(`${fileName} is inadmissible: ${parsed.failure.message}`);
  }
  return parsed.document.value as object;
}

/**
 * Verifies admitted documentation origins and their declared derivations.
 *
 * Reconstruction happens in a temporary directory. Tracked authority is only
 * ever read, so a RED result can never be masked by proof repairing the very
 * bytes it was meant to check.
 */
export async function checksDocumentationSnapshots(): Promise<DocumentationViolation[]> {
  const violations: DocumentationViolation[] = [];
  const validator = createsSirSchemaValidator();
  const validateSnapshot = validator.compile(
    await loadsGoverningSchema("sir-documentation-snapshot.v1.schema.json")
  );
  const validateDerivation = validator.compile(
    await loadsGoverningSchema("sir-documentation-derivation.v1.schema.json")
  );

  const snapshots = new Map<string, DocumentationSnapshot>();
  const derivations: DocumentationDerivation[] = [];

  for (const entry of await readsSnapshotDirectory()) {
    const fullPath = path.join(SNAPSHOT_DIRECTORY, entry);
    const parsed = parsesAuthorityDocument(await readFile(fullPath));
    if (parsed.outcome === "failed") {
      violations.push({
        code: "DOCUMENTATION_AUTHORITY_INADMISSIBLE",
        message: `${entry} is not admissible authority: ${parsed.failure.message}`
      });
      continue;
    }

    const value = parsed.document.value;
    if (entry.startsWith("SIR-DS-")) {
      if (!validateSnapshot(value) || !isDocumentationSnapshot(value)) {
        violations.push({
          code: "SNAPSHOT_CONTRACT_INVALID",
          message: `${entry} violates the documentation-snapshot contract: ${JSON.stringify(
            validateSnapshot.errors
          )}`
        });
        continue;
      }
      if (`${value.snapshotId}.json` !== entry) {
        violations.push({
          code: "SNAPSHOT_ID_MISMATCH",
          message: `${entry} declares ${value.snapshotId}.`
        });
        continue;
      }
      snapshots.set(value.snapshotId, value);
      continue;
    }

    if (entry.startsWith("SIR-DD-")) {
      if (!validateDerivation(value) || !isDocumentationDerivation(value)) {
        violations.push({
          code: "DERIVATION_CONTRACT_INVALID",
          message: `${entry} violates the documentation-derivation contract: ${JSON.stringify(
            validateDerivation.errors
          )}`
        });
        continue;
      }
      if (`${value.derivationId}.json` !== entry) {
        violations.push({
          code: "DERIVATION_ID_MISMATCH",
          message: `${entry} declares ${value.derivationId}.`
        });
        continue;
      }
      derivations.push(value);
      continue;
    }

    violations.push({
      code: "DOCUMENTATION_AUTHORITY_UNRECOGNIZED",
      message: `${entry} is not a recognized SIR-DS or SIR-DD authority file.`
    });
  }

  if (snapshots.size === 0) {
    violations.push({
      code: "DOCUMENTATION_ORIGIN_ABSENT",
      message: "No documentation origin snapshot is admitted."
    });
  }

  // @sir-package-010: the exact supplied bytes must still be recoverable.
  for (const snapshot of snapshots.values()) {
    const recovery = recoversOriginBytes(snapshot);
    if (recovery.outcome === "failed") {
      violations.push({
        code: recovery.failure.kind,
        message: recovery.failure.message
      });
      continue;
    }

    // Git text normalization would rewrite CRLF on commit and checkout. If the
    // snapshot ever lost that immunity, the recovered bytes would silently stop
    // matching the admitted identity, so the comparison is made explicitly.
    if (!digestsMatch(recovery.digest, snapshot.sha256)) {
      violations.push({
        code: "SNAPSHOT_DIGEST_MISMATCH",
        message: `${snapshot.snapshotId} no longer recovers its admitted bytes.`
      });
    }
  }

  // @sir-package-011: each derived document must be reproducible from origin.
  const staging = await mkdtemp(path.join(tmpdir(), "sir-doc-"));
  try {
    for (const derivation of derivations) {
      const snapshot = snapshots.get(derivation.originSnapshotId);
      if (snapshot === undefined) {
        violations.push({
          code: "DERIVATION_ORIGIN_ABSENT",
          message: `${derivation.derivationId} names unknown origin ${derivation.originSnapshotId}.`
        });
        continue;
      }

      const reproduction = reproducesDerivedDocument(snapshot, derivation);
      if (reproduction.outcome === "failed") {
        violations.push({
          code: reproduction.failure.kind,
          message: reproduction.failure.message
        });
        continue;
      }

      // Reconstructed into temporary storage, never over the tracked document.
      await writeFile(path.join(staging, path.basename(derivation.derivedPath)), reproduction.bytes);

      const trackedPath = path.join(repositoryRoot, derivation.derivedPath);
      let trackedBytes: Buffer;
      try {
        trackedBytes = await readFile(trackedPath);
      } catch {
        violations.push({
          code: "DERIVED_DOCUMENT_ABSENT",
          message: `${derivation.derivedPath} is declared by ${derivation.derivationId} but absent from the workspace.`
        });
        continue;
      }

      if (!digestsMatch(digestsBytes(trackedBytes), derivation.derivedSha256)) {
        violations.push({
          code: "DERIVED_DOCUMENT_DIGEST_MISMATCH",
          message: `${derivation.derivedPath} is ${digestsBytes(
            trackedBytes
          )} but ${derivation.derivationId} declares ${derivation.derivedSha256}.`
        });
        continue;
      }

      if (!Buffer.from(reproduction.bytes).equals(trackedBytes)) {
        violations.push({
          code: "DERIVED_DOCUMENT_BYTES_DIFFER",
          message: `${derivation.derivedPath} does not equal the reproduction from ${derivation.originSnapshotId}.`
        });
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true });
  }

  return violations;
}

async function readsSnapshotDirectory(): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  try {
    return (await readdir(SNAPSHOT_DIRECTORY)).filter((name) => name.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

if (isMainModule(import.meta.url)) {
  const violations = await checksDocumentationSnapshots();
  if (violations.length > 0) {
    process.stderr.write(
      `Documentation snapshot proof is RED:\n${violations
        .map((violation) => `  ${violation.code}: ${violation.message}`)
        .join("\n")}\n`
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Documentation origin and derivation proof is GREEN.\n");
  }
}
