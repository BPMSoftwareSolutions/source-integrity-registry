/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Projected from the JSON Schema contracts by `pnpm generate:types`.
 * These declarations are compile-time guardrails only. They never replace AJV
 * runtime validation and never become canonical authority.
 */

export type SchemaIdentityUri = string;
export type ExactSemanticVersion = string;
/**
 * The single authoritative signal produced by the circuit.
 */
export type Disposition =
  | "REGISTRY_CONTRACT_VALID"
  | "REGISTRY_CONTRACT_INVALID"
  | "SCHEMA_NOT_ADMITTED"
  | "SCHEMA_DIGEST_MISMATCH"
  | "SOURCE_BODY_DRIFT";
export type Sha256Digest = string;

/**
 * Canonical testimony of one validation circuit execution. Carries observed truth: the disposition reached, the findings that produced it, and the exact inputs the circuit consulted.
 */
export interface SourceIntegrityValidationReceipt {
  contract: ReceiptContractDeclaration;
  disposition: Disposition;
  subject: Subject;
  schemaAdmission: SchemaAdmission;
  /**
   * All findings retained for diagnosis. The parent circuit consumes only the single disposition signal.
   */
  findings: Finding[];
  observation?: Observation;
}
export interface ReceiptContractDeclaration {
  contractType: "source-integrity-validation-receipt";
  schemaId: SchemaIdentityUri;
  schemaVersion: ExactSemanticVersion;
}
export interface Subject {
  /**
   * Path of the payload as supplied to the circuit.
   */
  registryPath: string;
  /**
   * Digest of the exact payload bytes read, established before parsing.
   */
  registryDigest: string;
  registryId?: string;
  workspaceId?: string;
  workspaceRevision?: string;
}
export interface SchemaAdmission {
  admitted: boolean;
  declaredSchemaId?: string;
  catalogDigest?: Sha256Digest;
  observedDigest?: Sha256Digest;
  catalogPath?: string;
}
export interface Finding {
  /**
   * Stable finding code. AJV findings carry the keyword; circuit findings carry a SIR code.
   */
  code: string;
  /**
   * JSON Pointer into the payload. Empty string denotes the document root.
   */
  instancePath: string;
  schemaPath?: string;
  message: string;
}
/**
 * Present only when physical body observation ran, which requires the registry contract to be structurally valid.
 */
export interface Observation {
  performed: boolean;
  workspaceRoot?: string;
  /**
   * Observed bodies keyed by body identity, constructed in code-point key order.
   */
  entries: {
    [k: string]: ObservedEntry;
  };
}
/**
 * Body identity is the containing member name, so it is never repeated as a value field.
 */
export interface ObservedEntry {
  relativePath: string;
  conformance:
    | "BODY_CONFORMS"
    | "BODY_HASH_MISMATCH"
    | "BODY_NOT_FOUND"
    | "BODY_LOCATOR_UNRESOLVED"
    | "BODY_NOT_CONTAINED"
    | "BODY_CHANGED_DURING_OBSERVATION";
  expectedHash?: Sha256Digest;
  observedHash?: Sha256Digest;
  detail?: string;
}
