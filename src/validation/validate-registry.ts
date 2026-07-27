import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ErrorObject, ValidateFunction } from "ajv";

import {
  loadsSchemaCatalog,
  resolvesSchemaFromCatalog,
  describesCause,
  type SchemaCatalog
} from "../catalog/schema-catalog.js";
import { digestsBytes, digestsMatch, type Sha256Digest } from "../domain/digest.js";
import type { Disposition } from "../domain/dispositions.js";
import { parsesSchemaIdentity, SUPPORTED_DIALECT } from "../domain/schema-identity.js";
import {
  observesSourceBodies,
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
   * Root against which entry `source.relativePath` values are observed.
   * Observation is skipped when omitted, leaving a pure Step-Zero contract check.
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
 * prove trustworthy, so schema admission and digest verification both precede
 * payload evaluation and stop the circuit on failure.
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

  const registryDigest = digestsBytes(bytes);

  // 2. Parse JSON without mutation.
  let payload: unknown;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch (cause) {
    return buildsReceipt({
      disposition: "REGISTRY_CONTRACT_INVALID",
      registryPath,
      registryDigest,
      schemaAdmission: { admitted: false },
      findings: [
        {
          code: "SIR_PAYLOAD_NOT_JSON",
          instancePath: "",
          message: `Registry payload is not valid JSON: ${describesCause(cause)}`
        }
      ]
    });
  }

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
          message: `Declared schema identity "${declaredSchemaId}" is not an exact versioned SIR schema URI. Floating identifiers are forbidden.`
        }
      ]
    });
  }

  // 4. Resolve exact schema from the local catalog.
  const catalog: SchemaCatalog = await loadsSchemaCatalog(request.schemaCatalogPath);
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
      findings: [
        {
          code: "SIR_SCHEMA_NOT_ADMITTED",
          instancePath: "/contract/schemaId",
          message: resolution.reason
        }
      ]
    });
  }

  // 5. Verify catalog schema digest.
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
      findings: [
        {
          code: "SIR_SCHEMA_DIGEST_MISMATCH",
          instancePath: "/contract/schemaId",
          message: resolution.reason
        }
      ]
    });
  }

  const admission = {
    admitted: true,
    declaredSchemaId,
    catalogPath: catalog.catalogPath,
    catalogDigest: resolution.entry.sha256,
    observedDigest: resolution.observedDigest
  } as const;

  // The declared redundancy must agree. Any disagreement is a hard admission
  // failure, checked before the payload is evaluated.
  const redundancyFindings = collectsRedundancyFindings(payload, identity, resolution.entry.sha256);
  if (redundancyFindings.length > 0) {
    return buildsReceipt({
      disposition: "SCHEMA_NOT_ADMITTED",
      registryPath,
      registryDigest,
      schemaAdmission: { ...admission, admitted: false },
      findings: redundancyFindings
    });
  }

  // 6 & 7. Validate the schema against the 2020-12 meta-schema, then compile.
  let validate: ValidateFunction;
  try {
    const ajv = createsSirSchemaValidator();
    validate = ajv.compile(resolution.schema);
  } catch (cause) {
    throw new ValidationExecutionError(
      `Schema ${declaredSchemaId} did not compile under Draft 2020-12: ${describesCause(cause)}`
    );
  }

  // 8. Validate the registry payload.
  const conforms = validate(payload);

  // 9. Canonicalize validation findings.
  const findings = canonicalizesAjvErrors(validate.errors ?? []);

  if (!conforms) {
    return buildsReceipt({
      disposition: "REGISTRY_CONTRACT_INVALID",
      registryPath,
      registryDigest,
      schemaAdmission: admission,
      findings,
      ...readsSubjectIdentity(payload)
    });
  }

  // Physical observation runs only on a structurally valid registry: observing
  // bodies declared by a malformed payload would report on unverified claims.
  let observation: ObservationResult | undefined;
  const observationFindings: ValidationFinding[] = [];

  if (request.workspaceRoot !== undefined) {
    const conformingPayload = payload as {
      entries: readonly {
        bodyId: string;
        source: {
          relativePath: string;
          locator: { kind: string; name: string };
          hash: { algorithm: string; expected: Sha256Digest };
        };
      }[];
    };

    observation = await observesSourceBodies(
      conformingPayload.entries,
      path.resolve(request.workspaceRoot)
    );

    for (const entry of observation.entries) {
      if (entry.conformance !== "BODY_CONFORMS") {
        observationFindings.push({
          code: `SIR_${entry.conformance}`,
          instancePath: instancePathForBody(conformingPayload.entries, entry.bodyId),
          message: `Body "${entry.bodyId}" at ${entry.relativePath}: ${entry.detail ?? entry.conformance}`
        });
      }
    }
  }

  // 10. Produce the validation receipt.
  const drifted = observationFindings.length > 0;

  return buildsReceipt({
    disposition: drifted ? "SOURCE_BODY_DRIFT" : "REGISTRY_CONTRACT_VALID",
    registryPath,
    registryDigest,
    schemaAdmission: admission,
    findings: observationFindings,
    ...readsSubjectIdentity(payload),
    ...(observation === undefined ? {} : { observation })
  });
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
 * Renders AJV findings in a stable order.
 *
 * Two runs over identical bytes must produce identical receipts, so findings
 * are sorted rather than left in AJV's traversal order.
 */
function canonicalizesAjvErrors(errors: readonly ErrorObject[]): ValidationFinding[] {
  return errors
    .map((error) => ({
      code: error.keyword,
      instancePath: error.instancePath,
      schemaPath: error.schemaPath,
      message: error.message ?? `Value violates "${error.keyword}".`
    }))
    .sort(
      (left, right) =>
        left.instancePath.localeCompare(right.instancePath) ||
        (left.schemaPath ?? "").localeCompare(right.schemaPath ?? "") ||
        left.code.localeCompare(right.code) ||
        left.message.localeCompare(right.message)
    );
}

function instancePathForBody(
  entries: readonly { bodyId: string }[],
  bodyId: string
): string {
  const index = entries.findIndex((entry) => entry.bodyId === bodyId);
  return index < 0 ? "/entries" : `/entries/${index}/source`;
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
  findings: readonly ValidationFinding[];
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
    findings: parts.findings,
    ...(parts.observation === undefined ? {} : { observation: parts.observation })
  };
}

export { SUPPORTED_DIALECT };
