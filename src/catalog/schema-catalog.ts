import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  parsesAuthorityDocument,
  type AuthorityParseFailure
} from "../authority/parse-authority-document.js";
import {
  resolvesRealContainedPath,
  resolvesRealRoot,
  type TargetIdentity
} from "../domain/containment.js";
import { digestsMatch, type Sha256Digest } from "../domain/digest.js";
import { parsesSchemaIdentity, SUPPORTED_DIALECT } from "../domain/schema-identity.js";
import { detectsObservableChange } from "../observation/observe-source-bodies.js";
import { createsSirSchemaValidator } from "../validation/ajv-factory.js";

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
  readonly realContractsRoot: string;
  readonly entries: readonly SchemaCatalogEntry[];
}

/** A finding produced while admitting catalog or schema authority. */
export interface AdmissionFinding {
  readonly code: string;
  readonly instancePath: string;
  readonly message: string;
}

export type CatalogAdmission =
  | { readonly outcome: "admitted"; readonly catalog: SchemaCatalog }
  | { readonly outcome: "not-admitted"; readonly findings: readonly AdmissionFinding[] };

export type SchemaResolution =
  | {
      readonly outcome: "resolved";
      readonly entry: SchemaCatalogEntry;
      readonly schema: Record<string, unknown>;
      readonly observedDigest: Sha256Digest;
    }
  | {
      readonly outcome: "not-admitted";
      readonly findings: readonly AdmissionFinding[];
      readonly entry?: SchemaCatalogEntry;
    }
  | {
      readonly outcome: "digest-mismatch";
      readonly entry: SchemaCatalogEntry;
      readonly observedDigest: Sha256Digest;
      readonly findings: readonly AdmissionFinding[];
    };

/**
 * Raised only when the circuit cannot execute at all.
 *
 * Invalid catalog *content* is a deterministic admission verdict, not a
 * mechanical failure, so it never reaches this error. This is reserved for
 * unreadable input, permission failure, and unexpected internal faults.
 */
export class CatalogIntegrityError extends Error {
  public override readonly name = "CatalogIntegrityError";
}

const CATALOG_SCHEMA_ID =
  "https://schemas.deterministic.solutions/sir/sir-schema-catalog/1.0.0/schema.json";

/**
 * Locates the catalog schema shipped with this package.
 *
 * This is bootstrap authority: it comes from the trusted package, never from
 * the catalog being evaluated, so a caller-supplied catalog cannot choose or
 * weaken the contract that establishes its own validity.
 */
function resolvesPackagedCatalogSchemaPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(
    here,
    "..",
    "..",
    "contracts",
    "catalog",
    "1.0.0",
    "sir-schema-catalog.schema.json"
  );
}

let bootstrapValidator: ReturnType<typeof compilesBootstrapValidator> | undefined;

function compilesBootstrapValidator(schema: Record<string, unknown>) {
  return createsSirSchemaValidator().compile(schema);
}

/**
 * Admits the packaged catalog schema as bootstrap authority.
 *
 * The bootstrap schema is parsed through the same duplicate-aware parser as
 * every other authority document, and its fixed identity and dialect are
 * asserted before it is allowed to judge anything.
 */
async function admitsBootstrapCatalogSchema(): Promise<
  ReturnType<typeof compilesBootstrapValidator>
> {
  if (bootstrapValidator !== undefined) {
    return bootstrapValidator;
  }

  const schemaPath = resolvesPackagedCatalogSchemaPath();

  let bytes: Buffer;
  try {
    bytes = await readFile(schemaPath);
  } catch (cause) {
    throw new CatalogIntegrityError(
      `Packaged catalog schema is unreadable at ${schemaPath}: ${describesCause(cause)}`
    );
  }

  const parsed = parsesAuthorityDocument(bytes);
  if (parsed.outcome === "failed") {
    throw new CatalogIntegrityError(
      `Packaged catalog schema is not admissible authority: ${parsed.failure.message}`
    );
  }

  const schema = parsed.document.value;
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    throw new CatalogIntegrityError("Packaged catalog schema is not a JSON object.");
  }

  const record = schema as Record<string, unknown>;
  if (record["$id"] !== CATALOG_SCHEMA_ID) {
    throw new CatalogIntegrityError(
      `Packaged catalog schema declares $id ${String(record["$id"])}, expected ${CATALOG_SCHEMA_ID}.`
    );
  }
  if (record["$schema"] !== SUPPORTED_DIALECT) {
    throw new CatalogIntegrityError(
      `Packaged catalog schema declares dialect ${String(record["$schema"])}, expected ${SUPPORTED_DIALECT}.`
    );
  }

  try {
    // Compiling validates the schema against the Draft 2020-12 meta-schema.
    bootstrapValidator = compilesBootstrapValidator(record);
  } catch (cause) {
    throw new CatalogIntegrityError(
      `Packaged catalog schema did not compile under Draft 2020-12: ${describesCause(cause)}`
    );
  }

  return bootstrapValidator;
}

/**
 * Admits a caller catalog under the packaged bootstrap contract.
 *
 * Admission order is fixed: bootstrap authority, duplicate-aware parse,
 * complete contract validation, uniqueness witness — and only then may any
 * entry be consulted.
 */
export async function admitsSchemaCatalog(catalogPath: string): Promise<CatalogAdmission> {
  const validateCatalog = await admitsBootstrapCatalogSchema();
  const absoluteCatalogPath = path.resolve(catalogPath);

  let bytes: Buffer;
  try {
    bytes = await readFile(absoluteCatalogPath);
  } catch (cause) {
    // Unreadable input is a mechanical failure, not a verdict.
    throw new CatalogIntegrityError(
      `Unable to read schema catalog at ${absoluteCatalogPath}: ${describesCause(cause)}`
    );
  }

  const parsed = parsesAuthorityDocument(bytes);
  if (parsed.outcome === "failed") {
    return {
      outcome: "not-admitted",
      findings: [translatesCatalogParseFailure(parsed.failure)]
    };
  }

  if (!validateCatalog(parsed.document.value)) {
    const findings = (validateCatalog.errors ?? []).map((error) => ({
      code: "SIR_CATALOG_CONTRACT_INVALID",
      instancePath: error.instancePath,
      message: error.message ?? `Catalog violates "${error.keyword}".`
    }));

    return {
      outcome: "not-admitted",
      findings:
        findings.length > 0
          ? findings
          : [
              {
                code: "SIR_CATALOG_CONTRACT_INVALID",
                instancePath: "",
                message: "Catalog does not conform to the packaged catalog contract."
              }
            ]
    };
  }

  const document = parsed.document.value as {
    catalogId: string;
    entries: SchemaCatalogEntry[];
  };

  // Uniqueness is a cross-entry witness JSON Schema cannot express for an
  // array of objects, so it stays an explicit check.
  const seen = new Set<string>();
  for (const entry of document.entries) {
    if (seen.has(entry.schemaId)) {
      return {
        outcome: "not-admitted",
        findings: [
          {
            code: "SIR_CATALOG_SCHEMA_ID_DUPLICATE",
            instancePath: "/entries",
            message: `Catalog declares schema identity ${entry.schemaId} more than once.`
          }
        ]
      };
    }
    seen.add(entry.schemaId);
  }

  /**
   * Entry paths are relative to the contracts root containing the catalog
   * directory. The real root is derived from the real catalog file, so a
   * symlinked catalog establishes its trust root from the real target rather
   * than from its unresolved alias.
   */
  const realCatalogDirectory = await resolvesRealRoot(path.dirname(absoluteCatalogPath));
  if (realCatalogDirectory === undefined) {
    throw new CatalogIntegrityError(
      `Catalog directory for ${absoluteCatalogPath} could not be resolved to a real directory.`
    );
  }

  const realContractsRoot = await resolvesRealRoot(path.dirname(realCatalogDirectory));
  if (realContractsRoot === undefined) {
    throw new CatalogIntegrityError(
      `Contracts root for ${absoluteCatalogPath} could not be resolved to a real directory.`
    );
  }

  return {
    outcome: "admitted",
    catalog: {
      catalogId: document.catalogId,
      catalogPath: absoluteCatalogPath,
      realContractsRoot,
      entries: document.entries
    }
  };
}

/**
 * Resolves a declared schema identity to trusted, identity-bound bytes.
 *
 * Resolution is catalog-only and fails closed at every step. An identity
 * absent from the catalog is refused rather than fetched; bytes disagreeing
 * with the recorded digest are refused rather than used; and bytes whose own
 * declared identity disagrees with the catalog are refused rather than
 * compiled, which closes the swapped-schema false green.
 */
export async function resolvesSchemaFromCatalog(
  catalog: SchemaCatalog,
  declaredSchemaId: string
): Promise<SchemaResolution> {
  const entry = catalog.entries.find((candidate) => candidate.schemaId === declaredSchemaId);

  if (entry === undefined) {
    return {
      outcome: "not-admitted",
      findings: [
        {
          code: "SIR_SCHEMA_NOT_ADMITTED",
          instancePath: "/contract/schemaId",
          message: `Schema identity ${declaredSchemaId} is absent from catalog ${catalog.catalogId}.`
        }
      ]
    };
  }

  if (entry.status !== "accepted") {
    return {
      outcome: "not-admitted",
      entry,
      findings: [
        {
          code: "SIR_SCHEMA_NOT_ADMITTED",
          instancePath: "/contract/schemaId",
          message: `Schema identity ${declaredSchemaId} is present in catalog ${catalog.catalogId} with status "${entry.status}".`
        }
      ]
    };
  }

  if (entry.dialect !== SUPPORTED_DIALECT) {
    return {
      outcome: "not-admitted",
      entry,
      findings: [
        {
          code: "SIR_SCHEMA_DIALECT_MISMATCH",
          instancePath: "/contract/schemaId",
          message: `Schema identity ${declaredSchemaId} declares dialect ${entry.dialect}; SIR admits ${SUPPORTED_DIALECT} only.`
        }
      ]
    };
  }

  const containment = await resolvesRealContainedPath(
    catalog.realContractsRoot,
    entry.relativePath,
    "file"
  );

  if (containment.outcome !== "contained") {
    return {
      outcome: "not-admitted",
      entry,
      findings: [
        {
          code: "SIR_SCHEMA_NOT_CONTAINED",
          instancePath: "/contract/schemaId",
          message: `Catalog entry ${declaredSchemaId}: ${containment.reason}`
        }
      ]
    };
  }

  const identity: TargetIdentity = containment.identity;

  let bytes: Buffer;
  try {
    bytes = await readFile(containment.realPath);
  } catch (cause) {
    return {
      outcome: "not-admitted",
      entry,
      findings: [
        {
          code: "SIR_SCHEMA_NOT_ADMITTED",
          instancePath: "/contract/schemaId",
          message: `Catalog entry ${declaredSchemaId} points at unreadable bytes (${entry.relativePath}): ${describesCause(cause)}`
        }
      ]
    };
  }

  const changed = await detectsObservableChange(containment.realPath, identity);
  if (changed !== undefined) {
    return {
      outcome: "not-admitted",
      entry,
      findings: [
        {
          code: "SIR_SCHEMA_CHANGED_DURING_ADMISSION",
          instancePath: "/contract/schemaId",
          message: `Schema ${declaredSchemaId}: ${changed}`
        }
      ]
    };
  }

  const parsed = parsesAuthorityDocument(bytes);
  if (parsed.outcome === "failed") {
    return {
      outcome: "not-admitted",
      entry,
      findings: [translatesSchemaParseFailure(declaredSchemaId, parsed.failure)]
    };
  }

  const observedDigest = parsed.document.byteDigest;
  if (!digestsMatch(observedDigest, entry.sha256)) {
    return {
      outcome: "digest-mismatch",
      entry,
      observedDigest,
      findings: [
        {
          code: "SIR_SCHEMA_DIGEST_MISMATCH",
          instancePath: "/contract/schemaId",
          message: `Schema ${declaredSchemaId} observed bytes digest ${observedDigest} does not match catalog digest ${entry.sha256}.`
        }
      ]
    };
  }

  const schema = parsed.document.value;
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
    return {
      outcome: "not-admitted",
      entry,
      findings: [
        {
          code: "SIR_SCHEMA_NOT_ADMITTED",
          instancePath: "/contract/schemaId",
          message: `Schema ${declaredSchemaId} is not a JSON object.`
        }
      ]
    };
  }

  const record = schema as Record<string, unknown>;
  const identityFindings = bindsLoadedSchemaIdentity(record, entry, declaredSchemaId);
  if (identityFindings.length > 0) {
    return { outcome: "not-admitted", entry, findings: identityFindings };
  }

  return { outcome: "resolved", entry, schema: record, observedDigest };
}

/**
 * Requires the loaded schema to declare the identity the catalog admitted.
 *
 * Without this, bytes whose digest matches their catalog entry are compiled
 * even when they are a different schema entirely — the demonstrated
 * cross-document false green.
 */
function bindsLoadedSchemaIdentity(
  schema: Record<string, unknown>,
  entry: SchemaCatalogEntry,
  declaredSchemaId: string
): AdmissionFinding[] {
  const findings: AdmissionFinding[] = [];
  const loadedId = schema["$id"];
  const loadedDialect = schema["$schema"];

  if (typeof loadedId !== "string") {
    findings.push({
      code: "SIR_SCHEMA_ID_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Schema ${declaredSchemaId} does not declare a string $id.`
    });
    return findings;
  }

  if (loadedId !== entry.schemaId || loadedId !== declaredSchemaId) {
    findings.push({
      code: "SIR_SCHEMA_ID_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Loaded schema declares $id ${loadedId}, but the requested and catalog identity is ${declaredSchemaId}.`
    });
  }

  if (typeof loadedDialect !== "string") {
    findings.push({
      code: "SIR_SCHEMA_DIALECT_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Schema ${declaredSchemaId} does not declare a string $schema.`
    });
  } else if (loadedDialect !== SUPPORTED_DIALECT || loadedDialect !== entry.dialect) {
    findings.push({
      code: "SIR_SCHEMA_DIALECT_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Loaded schema declares dialect ${loadedDialect}; catalog declares ${entry.dialect} and SIR admits ${SUPPORTED_DIALECT}.`
    });
  }

  // The loaded $id must itself match the exact identity template; a parsed
  // family and version are then compared against the catalog's own claims.
  const parsedIdentity = parsesSchemaIdentity(loadedId);
  if (parsedIdentity === undefined) {
    findings.push({
      code: "SIR_SCHEMA_ID_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Loaded schema $id ${loadedId} is not an exact versioned SIR schema identity.`
    });
    return findings;
  }

  if (parsedIdentity.schemaFamily !== entry.schemaFamily) {
    findings.push({
      code: "SIR_SCHEMA_FAMILY_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Loaded schema family "${parsedIdentity.schemaFamily}" disagrees with catalog family "${entry.schemaFamily}".`
    });
  }

  if (parsedIdentity.schemaVersion !== entry.schemaVersion) {
    findings.push({
      code: "SIR_SCHEMA_VERSION_MISMATCH",
      instancePath: "/contract/schemaId",
      message: `Loaded schema version "${parsedIdentity.schemaVersion}" disagrees with catalog version "${entry.schemaVersion}".`
    });
  }

  return findings;
}

function translatesCatalogParseFailure(failure: AuthorityParseFailure): AdmissionFinding {
  return {
    code:
      failure.kind === "DUPLICATE_MEMBER"
        ? "SIR_CATALOG_DUPLICATE_MEMBER"
        : "SIR_CATALOG_CONTRACT_INVALID",
    instancePath: failure.pointer ?? "",
    message: `Catalog authority is not admissible: ${failure.message}`
  };
}

function translatesSchemaParseFailure(
  declaredSchemaId: string,
  failure: AuthorityParseFailure
): AdmissionFinding {
  return {
    code:
      failure.kind === "DUPLICATE_MEMBER"
        ? "SIR_SCHEMA_DUPLICATE_MEMBER"
        : "SIR_SCHEMA_NOT_ADMITTED",
    instancePath: failure.pointer ?? "",
    message: `Schema ${declaredSchemaId} authority is not admissible: ${failure.message}`
  };
}

export { resolvesContainedPath } from "../domain/containment.js";

export function describesCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}
