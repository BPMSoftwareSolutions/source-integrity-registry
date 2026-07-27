import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ErrorObject, ValidateFunction } from "ajv";

import {
  parsesAuthorityDocument,
  type AuthorityParseFailure
} from "../authority/parse-authority-document.js";
import {
  admitsSchemaCatalog,
  resolvesSchemaFromCatalog,
  describesCause,
  type AdmissionFinding,
  type SchemaCatalog
} from "../catalog/schema-catalog.js";
import { resolvesRealRoot } from "../domain/containment.js";
import { digestsMatch, type Sha256Digest } from "../domain/digest.js";
import type { Disposition } from "../domain/dispositions.js";
import { comparesByCodePoint } from "../domain/ordering.js";
import { parsesSchemaIdentity, SUPPORTED_DIALECT } from "../domain/schema-identity.js";
import { escapesJsonPointerToken } from "../authority/parse-authority-document.js";
import {
  observesSourceBodies,
  type ObservableEntry,
  type ObservationResult
} from "../observation/observe-source-bodies.js";
import { createsSirSchemaValidator } from "./ajv-factory.js";

const RECEIPT_SCHEMA_ID =
  "https://schemas.deterministic.solutions/sir/source-integrity-validation-receipt/1.0.0/schema.json";
const RECEIPT_SCHEMA_VERSION = "1.0.0";

export interface ValidationFinding {
  readonly code: string;
  readonly instancePath: string;
  readonly schemaPath?: string;
  readonly message: string;
}

export interface ValidationReceipt {
  readonly contract: {
    readonly contractType: "source-integrity-validation-receipt";
    readonly schemaId: string;
    readonly schemaVersion: string;
  };
  readonly disposition: Disposition;
  readonly subject: {
    readonly registryPath: string;
    readonly registryDigest: Sha256Digest;
    readonly registryId?: string;
    readonly workspaceId?: string;
    readonly workspaceRevision?: string;
  };
  readonly schemaAdmission: {
    readonly admitted: boolean;
    readonly declaredSchemaId?: string;
    readonly catalogDigest?: Sha256Digest;
    readonly observedDigest?: Sha256Digest;
    readonly catalogPath?: string;
  };
  readonly findings: readonly ValidationFinding[];
  readonly observation?: ObservationResult;
}

export interface ValidateRegistryRequest {
  readonly registryPath: string;
  readonly schemaCatalogPath: string;
  /**
   * Root against which entry source paths are observed. Observation is skipped
   * when omitted, leaving a pure Step-Zero contract check.
   */
  readonly workspaceRoot?: string;
}

/** Raised when the circuit cannot reach a verdict at all. */
export class ValidationExecutionError extends Error {
  public override readonly name = "ValidationExecutionError";
}

/**
 * Runs the SIR validation circuit and produces canonical testimony.
 *
 * The circuit refuses to evaluate a payload under a schema it cannot first
 * prove trustworthy, so catalog admission, schema admission, and digest
 * verification all precede payload evaluation and stop the circuit on failure.
 */
export async function validatesSourceIntegrityRegistry(
  request: ValidateRegistryRequest
): Promise<ValidationReceipt> {
  const registryPath = path.resolve(request.registryPath);

  // 1. Read payload bytes.
  let bytes: Buffer;
  try {
    bytes = await readFile(registryPath);
  } catch (cause) {
    throw new ValidationExecutionError(
      `Unable to read registry payload at ${registryPath}: ${describesCause(cause)}`
    );
  }

  // 2. Parse authority without mutation, preserving duplicate-member evidence.
  const parsed = parsesAuthorityDocument(bytes);
  if (parsed.outcome === "failed") {
    return buildsReceipt({
      disposition: "REGISTRY_CONTRACT_INVALID",
      registryPath,
      registryDigest: parsed.byteDigest,
      schemaAdmission: { admitted: false },
      findings: [translatesRegistryParseFailure(parsed.failure)]
    });
  }

  const registryDigest = parsed.document.byteDigest;
  const payload = parsed.document.value;

  // 3. Extract contract.schemaId.
  const declaredSchemaId = readsDeclaredSchemaId(payload);
  if (declaredSchemaId === undefined) {
    return buildsReceipt({
      disposition: "SCHEMA_NOT_ADMITTED",
      registryPath,
      registryDigest,
      schemaAdmission: { admitted: false },
      findings: [
        {
          code: "SIR_SCHEMA_ID_ABSENT",
          instancePath: "/contract/schemaId",
          message:
            "Registry payload does not declare a string contract.schemaId, so no governing rule set can be resolved."
        }
      ]
    });
  }

  const identity = parsesSchemaIdentity(declaredSchemaId);
  if (identity === undefined) {
    return buildsReceipt({
      disposition: "SCHEMA_NOT_ADMITTED",
      registryPath,
      registryDigest,
      schemaAdmission: { admitted: false, declaredSchemaId },
      findings: [
        {
          code: "SIR_SCHEMA_ID_NOT_EXACT",
          instancePath: "/contract/schemaId",
          message: `Declared schema identity "${declaredSchemaId}" is not an exact versioned SIR schema URI. Floating identifiers and aliases are forbidden.`
        }
      ]
    });
  }

  // 4. Admit the catalog contract before consulting any catalog entry.
  const admission = await admitsSchemaCatalog(request.schemaCatalogPath);
  if (admission.outcome === "not-admitted") {
    return buildsReceipt({
      disposition: "SCHEMA_NOT_ADMITTED",
      registryPath,
      registryDigest,
      schemaAdmission: {
        admitted: false,
        declaredSchemaId,
        catalogPath: path.resolve(request.schemaCatalogPath)
      },
      findings: admission.findings
    });
  }

  const catalog: SchemaCatalog = admission.catalog;

  // 5. Resolve the exact schema, verify its digest, and bind its identity.
  const resolution = await resolvesSchemaFromCatalog(catalog, declaredSchemaId);

  if (resolution.outcome === "not-admitted") {
    return buildsReceipt({
      disposition: "SCHEMA_NOT_ADMITTED",
      registryPath,
      registryDigest,
      schemaAdmission: {
        admitted: false,
        declaredSchemaId,
        catalogPath: catalog.catalogPath,
        ...(resolution.entry === undefined ? {} : { catalogDigest: resolution.entry.sha256 })
      },
      findings: resolution.findings
    });
  }

  if (resolution.outcome === "digest-mismatch") {
    return buildsReceipt({
      disposition: "SCHEMA_DIGEST_MISMATCH",
      registryPath,
      registryDigest,
      schemaAdmission: {
        admitted: false,
        declaredSchemaId,
        catalogPath: catalog.catalogPath,
        catalogDigest: resolution.entry.sha256,
        observedDigest: resolution.observedDigest
      },
      findings: resolution.findings
    });
  }

  const schemaAdmission = {
    admitted: true,
    declaredSchemaId,
    catalogPath: catalog.catalogPath,
    catalogDigest: resolution.entry.sha256,
    observedDigest: resolution.observedDigest
  } as const;

  // The payload's restated schema facts must agree with the resolved schema.
  const redundancyFindings = collectsRedundancyFindings(payload, identity, resolution.entry.sha256);
  if (redundancyFindings.length > 0) {
    return buildsReceipt({
      disposition: "SCHEMA_NOT_ADMITTED",
      registryPath,
      registryDigest,
      schemaAdmission: { ...schemaAdmission, admitted: false },
      findings: redundancyFindings
    });
  }

  // 6. Compile the same in-memory bytes that were digested and identity-bound.
  let validate: ValidateFunction;
  try {
    validate = createsSirSchemaValidator().compile(resolution.schema);
  } catch (cause) {
    throw new ValidationExecutionError(
      `Schema ${declaredSchemaId} did not compile under Draft 2020-12: ${describesCause(cause)}`
    );
  }

  // 7. Validate the registry payload.
  const conforms = validate(payload);
  const findings = canonicalizesAjvErrors(validate.errors ?? []);

  if (!conforms) {
    return buildsReceipt({
      disposition: "REGISTRY_CONTRACT_INVALID",
      registryPath,
      registryDigest,
      schemaAdmission,
      findings,
      ...readsSubjectIdentity(payload)
    });
  }

  // Physical observation runs only on a structurally valid registry: observing
  // bodies declared by a malformed payload would report on unverified claims.
  let observation: ObservationResult | undefined;
  const observationFindings: ValidationFinding[] = [];

  if (request.workspaceRoot !== undefined) {
    const realWorkspaceRoot = await resolvesRealRoot(request.workspaceRoot);
    if (realWorkspaceRoot === undefined) {
      throw new ValidationExecutionError(
        `Workspace root ${request.workspaceRoot} could not be resolved to a real directory.`
      );
    }

    const conformingPayload = payload as { entries: Readonly<Record<string, { source: ObservableEntry }>> };
    const observable: Record<string, ObservableEntry> = {};
    for (const [bodyId, entry] of Object.entries(conformingPayload.entries)) {
      observable[bodyId] = entry.source;
    }

    observation = await observesSourceBodies(observable, realWorkspaceRoot);

    for (const [bodyId, entry] of Object.entries(observation.entries)) {
      if (entry.conformance !== "BODY_CONFORMS") {
        observationFindings.push({
          code: `SIR_${entry.conformance}`,
          instancePath: `/entries/${escapesJsonPointerToken(bodyId)}/source`,
          message: `Body "${bodyId}" at ${entry.relativePath}: ${entry.detail ?? entry.conformance}`
        });
      }
    }
  }

  // 8. Produce the validation receipt.
  const drifted = observationFindings.length > 0;

  return buildsReceipt({
    disposition: drifted ? "SOURCE_BODY_DRIFT" : "REGISTRY_CONTRACT_VALID",
    registryPath,
    registryDigest,
    schemaAdmission,
    findings: canonicalizesFindings(observationFindings),
    ...readsSubjectIdentity(payload),
    ...(observation === undefined ? {} : { observation })
  });
}

function translatesRegistryParseFailure(failure: AuthorityParseFailure): ValidationFinding {
  return {
    code:
      failure.kind === "DUPLICATE_MEMBER"
        ? "SIR_REGISTRY_DUPLICATE_MEMBER"
        : "SIR_PAYLOAD_NOT_ADMISSIBLE",
    instancePath: failure.pointer ?? "",
    message: `Registry authority is not admissible: ${failure.message}`
  };
}

function readsDeclaredSchemaId(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return undefined;
  }

  const contract = (payload as Record<string, unknown>)["contract"];
  if (typeof contract !== "object" || contract === null || Array.isArray(contract)) {
    return undefined;
  }

  const schemaId = (contract as Record<string, unknown>)["schemaId"];
  return typeof schemaId === "string" ? schemaId : undefined;
}

/**
 * Checks that the payload's restated schema facts agree with the resolved schema.
 *
 * The redundancy between the URI version, the schemaVersion field, and the
 * digest is deliberate; it only has value if disagreement is refused.
 */
function collectsRedundancyFindings(
  payload: unknown,
  identity: { schemaVersion: string },
  catalogDigest: Sha256Digest
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];
  const contract = (payload as Record<string, unknown>)["contract"] as Record<string, unknown>;

  const declaredVersion = contract["schemaVersion"];
  if (typeof declaredVersion !== "string") {
    findings.push({
      code: "SIR_SCHEMA_VERSION_ABSENT",
      instancePath: "/contract/schemaVersion",
      message: "Registry payload does not declare a string contract.schemaVersion."
    });
  } else if (declaredVersion !== identity.schemaVersion) {
    findings.push({
      code: "SIR_SCHEMA_VERSION_DISAGREEMENT",
      instancePath: "/contract/schemaVersion",
      message: `Declared schemaVersion "${declaredVersion}" disagrees with the version segment "${identity.schemaVersion}" of the declared schemaId.`
    });
  }

  const declaredDigest = contract["schemaDigest"];
  if (typeof declaredDigest === "string" && !digestsMatch(declaredDigest, catalogDigest)) {
    findings.push({
      code: "SIR_SCHEMA_DIGEST_DISAGREEMENT",
      instancePath: "/contract/schemaDigest",
      message: `Declared schemaDigest "${declaredDigest}" disagrees with the catalog digest "${catalogDigest}".`
    });
  }

  return findings;
}

/**
 * Renders AJV findings in a stable, runtime-independent order.
 *
 * Two runs over identical bytes must produce identical receipts, so findings
 * are sorted by code point rather than left in AJV's traversal order or
 * ordered by a locale-sensitive comparison.
 */
function canonicalizesAjvErrors(errors: readonly ErrorObject[]): ValidationFinding[] {
  return canonicalizesFindings(
    errors.map((error) => ({
      code: error.keyword,
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      message: error.message ?? `Value violates "${error.keyword}".`
    }))
  );
}

/** Sorts findings by code point without dropping, merging, or deduplicating. */
function canonicalizesFindings(
  findings: readonly ValidationFinding[]
): ValidationFinding[] {
  return [...findings].sort(
    (left, right) =>
      comparesByCodePoint(left.instancePath, right.instancePath) ||
      comparesByCodePoint(left.schemaPath ?? "", right.schemaPath ?? "") ||
      comparesByCodePoint(left.code, right.code) ||
      comparesByCodePoint(left.message, right.message)
  );
}

function readsSubjectIdentity(payload: unknown): {
  registryId?: string;
  workspaceId?: string;
  workspaceRevision?: string;
} {
  if (typeof payload !== "object" || payload === null) {
    return {};
  }

  const document = payload as Record<string, unknown>;
  const workspace = document["workspace"];
  const workspaceRecord =
    typeof workspace === "object" && workspace !== null
      ? (workspace as Record<string, unknown>)
      : {};

  const registryId = document["registryId"];
  const workspaceId = workspaceRecord["workspaceId"];
  const revision = workspaceRecord["revision"];

  return {
    ...(typeof registryId === "string" ? { registryId } : {}),
    ...(typeof workspaceId === "string" ? { workspaceId } : {}),
    ...(typeof revision === "string" ? { workspaceRevision: revision } : {})
  };
}

function buildsReceipt(parts: {
  disposition: Disposition;
  registryPath: string;
  registryDigest: Sha256Digest;
  schemaAdmission: ValidationReceipt["schemaAdmission"];
  findings: readonly (ValidationFinding | AdmissionFinding)[];
  registryId?: string;
  workspaceId?: string;
  workspaceRevision?: string;
  observation?: ObservationResult;
}): ValidationReceipt {
  return {
    contract: {
      contractType: "source-integrity-validation-receipt",
      schemaId: RECEIPT_SCHEMA_ID,
      schemaVersion: RECEIPT_SCHEMA_VERSION
    },
    disposition: parts.disposition,
    subject: {
      registryPath: parts.registryPath,
      registryDigest: parts.registryDigest,
      ...(parts.registryId === undefined ? {} : { registryId: parts.registryId }),
      ...(parts.workspaceId === undefined ? {} : { workspaceId: parts.workspaceId }),
      ...(parts.workspaceRevision === undefined
        ? {}
        : { workspaceRevision: parts.workspaceRevision })
    },
    schemaAdmission: parts.schemaAdmission,
    findings: canonicalizesFindings(parts.findings as readonly ValidationFinding[]),
    ...(parts.observation === undefined ? {} : { observation: parts.observation })
  };
}

export { SUPPORTED_DIALECT };
