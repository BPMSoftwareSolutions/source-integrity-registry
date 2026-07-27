import { readFile } from "node:fs/promises";
import path from "node:path";

import { digestsBytes, digestsMatch, type Sha256Digest } from "../domain/digest.js";
import { SUPPORTED_DIALECT } from "../domain/schema-identity.js";

export interface SchemaCatalogEntry {
  readonly schemaId: string;
  readonly schemaFamily: string;
  readonly schemaVersion: string;
  readonly dialect: string;
  readonly relativePath: string;
  readonly sha256: Sha256Digest;
  readonly status: "accepted" | "revoked";
}

export interface SchemaCatalog {
  readonly catalogId: string;
  readonly catalogPath: string;
  readonly catalogRoot: string;
  readonly entries: readonly SchemaCatalogEntry[];
}

export type SchemaResolution =
  | {
      readonly outcome: "resolved";
      readonly entry: SchemaCatalogEntry;
      readonly schema: Record<string, unknown>;
      readonly observedDigest: Sha256Digest;
    }
  | {
      readonly outcome: "not-admitted";
      readonly reason: string;
      readonly entry?: SchemaCatalogEntry;
    }
  | {
      readonly outcome: "digest-mismatch";
      readonly entry: SchemaCatalogEntry;
      readonly observedDigest: Sha256Digest;
      readonly reason: string;
    };

/**
 * Raised when the catalog itself cannot be trusted.
 *
 * A malformed catalog is not a payload verdict — the circuit has no authority
 * to judge anything, so this surfaces as an execution failure rather than as a
 * disposition about the registry.
 */
export class CatalogIntegrityError extends Error {
  public override readonly name = "CatalogIntegrityError";
}

export async function loadsSchemaCatalog(catalogPath: string): Promise<SchemaCatalog> {
  const absoluteCatalogPath = path.resolve(catalogPath);

  let bytes: Buffer;
  try {
    bytes = await readFile(absoluteCatalogPath);
  } catch (cause) {
    throw new CatalogIntegrityError(
      `Unable to read schema catalog at ${absoluteCatalogPath}: ${describesCause(cause)}`
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch (cause) {
    throw new CatalogIntegrityError(
      `Schema catalog at ${absoluteCatalogPath} is not valid JSON: ${describesCause(cause)}`
    );
  }

  const document = parsed as {
    catalogId?: unknown;
    entries?: unknown;
  };

  if (typeof document.catalogId !== "string" || !Array.isArray(document.entries)) {
    throw new CatalogIntegrityError(
      `Schema catalog at ${absoluteCatalogPath} does not declare catalogId and entries.`
    );
  }

  /**
   * Entry paths are relative to the contracts root that contains the catalog
   * directory, so every admitted schema resolves downward from one boundary
   * and no entry needs parent traversal.
   */
  const catalogRoot = path.dirname(path.dirname(absoluteCatalogPath));
  const entries = document.entries.map((entry, index) =>
    readsCatalogEntry(entry, index, absoluteCatalogPath)
  );

  assertsUniqueSchemaIds(entries, absoluteCatalogPath);

  return {
    catalogId: document.catalogId,
    catalogPath: absoluteCatalogPath,
    catalogRoot,
    entries
  };
}

/**
 * Resolves a declared schema identity to trusted bytes.
 *
 * Resolution is catalog-only. An identity absent from the catalog is refused
 * rather than fetched, and a present identity whose bytes disagree with the
 * recorded digest is refused rather than used.
 */
export async function resolvesSchemaFromCatalog(
  catalog: SchemaCatalog,
  declaredSchemaId: string
): Promise<SchemaResolution> {
  const entry = catalog.entries.find((candidate) => candidate.schemaId === declaredSchemaId);

  if (entry === undefined) {
    return {
      outcome: "not-admitted",
      reason: `Schema identity ${declaredSchemaId} is absent from catalog ${catalog.catalogId}.`
    };
  }

  if (entry.status !== "accepted") {
    return {
      outcome: "not-admitted",
      entry,
      reason: `Schema identity ${declaredSchemaId} is present in catalog ${catalog.catalogId} with status "${entry.status}".`
    };
  }

  if (entry.dialect !== SUPPORTED_DIALECT) {
    return {
      outcome: "not-admitted",
      entry,
      reason: `Schema identity ${declaredSchemaId} declares dialect ${entry.dialect}; SIR admits ${SUPPORTED_DIALECT} only.`
    };
  }

  const schemaPath = resolvesContainedPath(catalog.catalogRoot, entry.relativePath);
  if (schemaPath === undefined) {
    return {
      outcome: "not-admitted",
      entry,
      reason: `Catalog entry ${declaredSchemaId} declares a path escaping the catalog root: ${entry.relativePath}`
    };
  }

  let bytes: Buffer;
  try {
    bytes = await readFile(schemaPath);
  } catch (cause) {
    return {
      outcome: "not-admitted",
      entry,
      reason: `Catalog entry ${declaredSchemaId} points at unreadable bytes (${entry.relativePath}): ${describesCause(cause)}`
    };
  }

  const observedDigest = digestsBytes(bytes);
  if (!digestsMatch(observedDigest, entry.sha256)) {
    return {
      outcome: "digest-mismatch",
      entry,
      observedDigest,
      reason: `Schema ${declaredSchemaId} observed bytes digest ${observedDigest} does not match catalog digest ${entry.sha256}.`
    };
  }

  let schema: unknown;
  try {
    schema = JSON.parse(bytes.toString("utf8"));
  } catch (cause) {
    return {
      outcome: "not-admitted",
      entry,
      reason: `Schema ${declaredSchemaId} bytes are not valid JSON: ${describesCause(cause)}`
    };
  }

  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return {
      outcome: "not-admitted",
      entry,
      reason: `Schema ${declaredSchemaId} is not a JSON object.`
    };
  }

  return {
    outcome: "resolved",
    entry,
    schema: schema as Record<string, unknown>,
    observedDigest
  };
}

/**
 * Joins a relative path to a root, refusing anything that escapes it.
 *
 * Catalog paths are data. Even though the catalog schema forbids traversal,
 * resolution re-checks it: the loader must hold regardless of which schema, if
 * any, validated the catalog.
 */
export function resolvesContainedPath(root: string, relativePath: string): string | undefined {
  if (path.isAbsolute(relativePath) || relativePath.includes("\\") || relativePath.includes("\0")) {
    return undefined;
  }

  const resolvedRoot = path.resolve(root);
  const candidate = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, candidate);

  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }

  return candidate;
}

function readsCatalogEntry(
  candidate: unknown,
  index: number,
  catalogPath: string
): SchemaCatalogEntry {
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    throw new CatalogIntegrityError(
      `Schema catalog at ${catalogPath} has a non-object entry at index ${index}.`
    );
  }

  const entry = candidate as Record<string, unknown>;
  const requiredStrings = [
    "schemaId",
    "schemaFamily",
    "schemaVersion",
    "dialect",
    "relativePath",
    "sha256",
    "status"
  ] as const;

  for (const field of requiredStrings) {
    if (typeof entry[field] !== "string") {
      throw new CatalogIntegrityError(
        `Schema catalog at ${catalogPath} entry ${index} is missing string field "${field}".`
      );
    }
  }

  const status = entry["status"] as string;
  if (status !== "accepted" && status !== "revoked") {
    throw new CatalogIntegrityError(
      `Schema catalog at ${catalogPath} entry ${index} declares unknown status "${status}".`
    );
  }

  return {
    schemaId: entry["schemaId"] as string,
    schemaFamily: entry["schemaFamily"] as string,
    schemaVersion: entry["schemaVersion"] as string,
    dialect: entry["dialect"] as string,
    relativePath: entry["relativePath"] as string,
    sha256: entry["sha256"] as Sha256Digest,
    status
  };
}

function assertsUniqueSchemaIds(
  entries: readonly SchemaCatalogEntry[],
  catalogPath: string
): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (seen.has(entry.schemaId)) {
      throw new CatalogIntegrityError(
        `Schema catalog at ${catalogPath} declares schema identity ${entry.schemaId} more than once.`
      );
    }
    seen.add(entry.schemaId);
  }
}

export function describesCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
