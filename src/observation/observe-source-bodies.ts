import { readFile } from "node:fs/promises";

import { resolvesContainedPath, describesCause } from "../catalog/schema-catalog.js";
import { digestsBytes, digestsMatch, type Sha256Digest } from "../domain/digest.js";

export type BodyConformance =
  | "BODY_CONFORMS"
  | "BODY_HASH_MISMATCH"
  | "BODY_NOT_FOUND"
  | "BODY_LOCATOR_UNRESOLVED";

export interface ObservedEntry {
  readonly bodyId: string;
  readonly relativePath: string;
  readonly conformance: BodyConformance;
  readonly expectedHash?: Sha256Digest;
  readonly observedHash?: Sha256Digest;
  readonly detail?: string;
}

export interface ObservationResult {
  readonly performed: boolean;
  readonly workspaceRoot: string;
  readonly entries: readonly ObservedEntry[];
}

/** The subset of a registry entry observation depends on. */
interface ObservableEntry {
  readonly bodyId: string;
  readonly source: {
    readonly relativePath: string;
    readonly locator: { readonly kind: string; readonly name: string };
    readonly hash: { readonly algorithm: string; readonly expected: Sha256Digest };
  };
}

/**
 * Observes declared source bodies and compares them against declared digests.
 *
 * Observation reports what it saw and never edits the registry. A registry
 * records declared truth; reconciling a mismatch is an authoring decision, not
 * something the validator may perform silently.
 */
export async function observesSourceBodies(
  entries: readonly ObservableEntry[],
  workspaceRoot: string
): Promise<ObservationResult> {
  const observed: ObservedEntry[] = [];

  for (const entry of entries) {
    observed.push(await observesOneBody(entry, workspaceRoot));
  }

  return { performed: true, workspaceRoot, entries: observed };
}

async function observesOneBody(
  entry: ObservableEntry,
  workspaceRoot: string
): Promise<ObservedEntry> {
  const { bodyId } = entry;
  const { relativePath, locator, hash } = entry.source;

  const absolutePath = resolvesContainedPath(workspaceRoot, relativePath);
  if (absolutePath === undefined) {
    return {
      bodyId,
      relativePath,
      conformance: "BODY_NOT_FOUND",
      expectedHash: hash.expected,
      detail: `Declared path escapes the workspace root and was not read.`
    };
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(absolutePath);
  } catch (cause) {
    return {
      bodyId,
      relativePath,
      conformance: "BODY_NOT_FOUND",
      expectedHash: hash.expected,
      detail: describesCause(cause)
    };
  }

  /**
   * Step Zero observes whole-file bytes. Sub-file locators require source
   * interpretation, which the corrected sequence places after Step Zero, so a
   * narrower locator is reported as unresolved rather than silently widened to
   * the whole file — that would compare a different body than the one declared.
   */
  if (locator.kind !== "whole-file") {
    return {
      bodyId,
      relativePath,
      conformance: "BODY_LOCATOR_UNRESOLVED",
      expectedHash: hash.expected,
      observedHash: digestsBytes(bytes),
      detail: `Locator kind "${locator.kind}" (${locator.name}) requires source interpretation, which is not part of Step Zero observation.`
    };
  }

  const observedHash = digestsBytes(bytes);
  if (!digestsMatch(observedHash, hash.expected)) {
    return {
      bodyId,
      relativePath,
      conformance: "BODY_HASH_MISMATCH",
      expectedHash: hash.expected,
      observedHash,
      detail: `Declared digest does not match observed bytes.`
    };
  }

  return {
    bodyId,
    relativePath,
    conformance: "BODY_CONFORMS",
    expectedHash: hash.expected,
    observedHash
  };
}
