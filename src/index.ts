export {
  validatesSourceIntegrityRegistry,
  ValidationExecutionError,
  type ValidateRegistryRequest,
  type ValidationReceipt,
  type ValidationFinding
} from "./validation/validate-registry.js";

export {
  createsSirSchemaValidator,
  validatesGuarded,
  type GuardedValidation
} from "./validation/ajv-factory.js";

export {
  admitsSchemaCatalog,
  resolvesSchemaFromCatalog,
  CatalogIntegrityError,
  type CatalogAdmission,
  type SchemaCatalog,
  type SchemaCatalogEntry,
  type SchemaResolution,
  type AdmissionFinding
} from "./catalog/schema-catalog.js";

export {
  parsesAuthorityDocument,
  escapesJsonPointerToken,
  joinsJsonPointer,
  type ParsedAuthorityDocument,
  type AuthorityParseResult,
  type AuthorityParseFailure,
  type AuthorityParseFailureKind
} from "./authority/parse-authority-document.js";

export {
  observesSourceBodies,
  type ObservationResult,
  type ObservedEntry,
  type ObservableEntry,
  type BodyConformance
} from "./observation/observe-source-bodies.js";

export {
  resolvesContainedPath,
  resolvesRealContainedPath,
  resolvesRealRoot,
  isContainedBy,
  type ContainmentOutcome,
  type TargetIdentity
} from "./domain/containment.js";

export { comparesByCodePoint, ordersRecordByKey } from "./domain/ordering.js";

export {
  DISPOSITIONS,
  EXIT_CODE,
  resolvesExitCodeForDisposition,
  type Disposition,
  type ExitCode
} from "./domain/dispositions.js";

export {
  digestsBytes,
  digestsMatch,
  isSha256Digest,
  type Sha256Digest
} from "./domain/digest.js";

export {
  parsesSchemaIdentity,
  SUPPORTED_DIALECT,
  type SchemaIdentity
} from "./domain/schema-identity.js";

export {
  recoversOriginBytes,
  reproducesDerivedDocument,
  appliesTransformation,
  projectsCheckedOutBytes,
  isDocumentationSnapshot,
  isDocumentationDerivation,
  type DocumentationSnapshot,
  type DocumentationDerivation,
  type DocumentationTransformationId,
  type DocumentationFailure,
  type OriginRecoveryResult,
  type DerivationResult
} from "./documentation/documentation-snapshot.js";
