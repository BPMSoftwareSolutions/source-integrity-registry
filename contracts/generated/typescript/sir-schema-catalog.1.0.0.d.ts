/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Projected from the JSON Schema contracts by `pnpm generate:types`.
 * These declarations are compile-time guardrails only. They never replace AJV
 * runtime validation and never become canonical authority.
 */

/**
 * Exact immutable schema identity. The pattern structurally forbids floating identifiers such as latest, 1.x, or ^1.0.0.
 */
export type SchemaIdentityUri = string;
/**
 * An exact three-part semantic version. Ranges and floating identifiers are forbidden.
 */
export type ExactSemanticVersion = string;
/**
 * Lowercase hex sha256 digest with an explicit algorithm prefix.
 */
export type Sha256Digest = string;
/**
 * Lowercase kebab-case identifier.
 */
export type Identifier = string;
/**
 * SIR v0.1 supports Draft 2020-12 only. Mixed-dialect catalogs are not admitted.
 */
export type SupportedDialect = "https://json-schema.org/draft/2020-12/schema";
/**
 * Forward-slash relative path contained within the catalog root. Absolute paths, backslashes, and parent traversal are forbidden.
 */
export type RelativePath = string;

/**
 * Governs which schemas are trusted for Source Integrity Registry admission. A schema absent from an accepted catalog entry is never admitted, and is never retrieved from the network.
 */
export interface SIRSchemaCatalog {
  contract: CatalogContractDeclaration;
  /**
   * Stable identity of this catalog.
   */
  catalogId: string;
  /**
   * Trusted schema entries. Order is not significant; schemaId uniqueness is enforced.
   */
  entries: CatalogEntry[];
}
export interface CatalogContractDeclaration {
  contractType: "sir-schema-catalog";
  schemaId: SchemaIdentityUri;
  schemaVersion: ExactSemanticVersion;
  schemaDigest?: Sha256Digest;
}
export interface CatalogEntry {
  schemaId: SchemaIdentityUri;
  schemaFamily: Identifier;
  schemaVersion: ExactSemanticVersion;
  dialect: SupportedDialect;
  relativePath: RelativePath;
  sha256: Sha256Digest;
  /**
   * Only accepted schemas may govern a payload. Revoked entries are retained so historical identities remain resolvable and explicitly refused.
   */
  status: "accepted" | "revoked";
}
