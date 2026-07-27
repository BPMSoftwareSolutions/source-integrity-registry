import { readFile, stat } from "node:fs/promises";

import { describesCause } from "../catalog/schema-catalog.js";
import { digestsBytes, digestsMatch, type Sha256Digest } from "../domain/digest.js";
import { comparesByCodePoint, ordersRecordByKey } from "../domain/ordering.js";
import {
  resolvesRealContainedPath,
  type ContainmentOutcome,
  type TargetIdentity
} from "../domain/containment.js";

export type BodyConformance =
  | "BODY_CONFORMS"
  | "BODY_HASH_MISMATCH"
  | "BODY_NOT_FOUND"
  | "BODY_LOCATOR_UNRESOLVED"
  | "BODY_NOT_CONTAINED"
  | "BODY_CHANGED_DURING_OBSERVATION";

export interface ObservedEntry {
  readonly relativePath: string;
  readonly conformance: BodyConformance;
  readonly expectedHash?: Sha256Digest;
  readonly observedHash?: Sha256Digest;
  readonly detail?: string;
}

export interface ObservationResult {
  readonly performed: boolean;
  readonly workspaceRoot: string;
  readonly entries: Readonly<Record<string, ObservedEntry>>;
}

/** The subset of a registry entry observation depends on. */
export interface ObservableEntry {
  readonly relativePath: string;
  readonly locator: { readonly kind: string; readonly name: string };
  readonly hash: { readonly algorithm: string; readonly expected: Sha256Digest };
}

/**
 * Observes declared source bodies and compares them against declared digests.
 *
 * Observation reports what it saw and never edits the registry. A registry
 * records declared truth; reconciling a mismatch is an authoring decision, not
 * something the validator may perform silently.
 *
 * Bodies are visited in code-point key order so equal registries produce
 * equal testimony regardless of member insertion order.
 */
export async function observesSourceBodies(
  entries: Readonly<Record<string, ObservableEntry>>,
  realWorkspaceRoot: string
): Promise<ObservationResult> {
  const observed: (readonly [string, ObservedEntry])[] = [];

  const bodyIds = Object.keys(entries).sort(comparesByCodePoint);

  for (const bodyId of bodyIds) {
    const entry = entries[bodyId];
    if (entry === undefined) {
      continue;
    }
    observed.push([bodyId, await observesOneBody(entry, realWorkspaceRoot)] as const);
  }

  return {
    performed: true,
    workspaceRoot: realWorkspaceRoot,
    entries: ordersRecordByKey(observed)
  };
}

async function observesOneBody(
  entry: ObservableEntry,
  realWorkspaceRoot: string
): Promise<ObservedEntry> {
  const { relativePath, locator, hash } = entry;

  const containment: ContainmentOutcome = await resolvesRealContainedPath(
    realWorkspaceRoot,
    relativePath,
    "file"
  );

  if (containment.outcome === "not-contained") {
    return {
      relativePath,
      conformance: "BODY_NOT_CONTAINED",
      expectedHash: hash.expected,
      detail: containment.reason
    };
  }

  if (containment.outcome === "absent") {
    return {
      relativePath,
      conformance: "BODY_NOT_FOUND",
      expectedHash: hash.expected,
      detail: containment.reason
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
      relativePath,
      conformance: "BODY_LOCATOR_UNRESOLVED",
      expectedHash: hash.expected,
      detail: `Locator kind "${locator.kind}" (${locator.name}) requires source interpretation, which is not part of Step Zero observation.`
    };
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(containment.realPath);
  } catch (cause) {
    return {
      relativePath,
      conformance: "BODY_NOT_FOUND",
      expectedHash: hash.expected,
      detail: describesCause(cause)
    };
  }

  /**
   * Stable-snapshot check: re-stat after reading and reject observable change.
   * This detects ordinary concurrent drift. It is not a claim of race-free
   * security against a hostile filesystem.
   */
  const changed = await detectsObservableChange(containment.realPath, containment.identity);
  if (changed !== undefined) {
    return {
      relativePath,
      conformance: "BODY_CHANGED_DURING_OBSERVATION",
      expectedHash: hash.expected,
      detail: changed
    };
  }

  const observedHash = digestsBytes(bytes);
  if (!digestsMatch(observedHash, hash.expected)) {
    return {
      relativePath,
      conformance: "BODY_HASH_MISMATCH",
      expectedHash: hash.expected,
      observedHash,
      detail: "Declared digest does not match observed bytes."
    };
  }

  return {
    relativePath,
    conformance: "BODY_CONFORMS",
    expectedHash: hash.expected,
    observedHash
  };
}

export type { TargetIdentity };

export async function readsTargetIdentity(realPath: string): Promise<TargetIdentity> {
  const stats = await stat(realPath);
  return {
    realPath,
    ino: String(stats.ino),
    dev: String(stats.dev),
    size: stats.size,
    mtimeMs: stats.mtimeMs
  };
}

/**
 * Reports observable change between a recorded identity and the target now.
 *
 * An indeterminate result — the target vanished, or cannot be stat'd — counts
 * as change: SIR must never report a body it could not re-confirm as
 * conforming.
 */
export async function detectsObservableChange(
  realPath: string,
  before: TargetIdentity
): Promise<string | undefined> {
  let after: TargetIdentity;
  try {
    after = await readsTargetIdentity(realPath);
  } catch (cause) {
    return `Target could not be re-examined after reading: ${describesCause(cause)}`;
  }

  if (after.realPath !== before.realPath) {
    return `Target path resolved to ${after.realPath} after reading, but ${before.realPath} before.`;
  }
  if (after.ino !== before.ino || after.dev !== before.dev) {
    return "Target filesystem identity changed while it was being read.";
  }
  if (after.size !== before.size) {
    return `Target size changed from ${before.size} to ${after.size} while it was being read.`;
  }
  if (after.mtimeMs !== before.mtimeMs) {
    return "Target modification time changed while it was being read.";
  }

  return undefined;
}
