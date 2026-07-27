export {
  validatesSourceIntegrityRegistry,
  ValidationExecutionError,
  type ValidateRegistryRequest,
  type ValidationReceipt,
  type ValidationFinding
} from "./validation/validate-registry.js";

export { createsSirSchemaValidator } from "./validation/ajv-factory.js";

export {
  loadsSchemaCatalog,
  resolvesSchemaFromCatalog,
  CatalogIntegrityError,
  type SchemaCatalog,
  type SchemaCatalogEntry,
  type SchemaResolution
} from "./catalog/schema-catalog.js";

export {
  observesSourceBodies,
  type ObservationResult,
  type ObservedEntry,
  type BodyConformance
} from "./observation/observe-source-bodies.js";

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
