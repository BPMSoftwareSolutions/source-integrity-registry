/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Projected from the JSON Schema contracts by `pnpm generate:types`.
 * These declarations are compile-time guardrails only. They never replace AJV
 * runtime validation and never become canonical authority.
 */

export type SchemaIdentityUri = string;
export type Identifier = string;
/**
 * Forward-slash path relative to the workspace root. Absolute paths, backslashes, and parent traversal are forbidden.
 */
export type RelativePath = string;

/**
 * Declared physical-to-logical bindings between source bodies and the responsibilities they discharge. This contract carries declared truth only. Observed status, conformance disposition, and timestamps belong to validation receipts.
 */
export interface SourceIntegrityRegistry {
  contract: RegistryContractDeclaration;
  registryId: Identifier;
  workspace: Workspace;
  /**
   * Declared source body bindings. bodyId uniqueness is enforced.
   */
  entries: RegistryEntry[];
}
export interface RegistryContractDeclaration {
  contractType: "source-integrity-registry";
  schemaId: SchemaIdentityUri;
  /**
   * Must equal the version segment of schemaId. Disagreement is a hard admission failure.
   */
  schemaVersion: string;
  /**
   * Optional restatement of the governing schema digest. When present it must equal the catalog digest.
   */
  schemaDigest?: string;
}
export interface Workspace {
  workspaceId: Identifier;
  /**
   * Exact 40-character lowercase hex commit identity. Branch names and tags are forbidden.
   */
  revision: string;
}
export interface RegistryEntry {
  bodyId: Identifier;
  responsibility: Responsibility;
  source: Source;
  authority: Authority;
}
export interface Responsibility {
  capabilityId: Identifier;
  featureId: Identifier;
  scenarioId: Identifier;
  responsibilityId: Identifier;
  obligationId: Identifier;
  /**
   * Declared responsibility kind. The set is closed; taxonomy is never guessed.
   */
  kind: "execution" | "resolution" | "validation" | "projection" | "observation" | "admission";
}
export interface Source {
  relativePath: RelativePath;
  language: "typescript" | "javascript" | "json" | "gherkin" | "markdown";
  locator: SourceLocator;
  hash: SourceHash;
}
export interface SourceLocator {
  /**
   * How the body is located within the source file.
   */
  kind: "named-declaration" | "named-export" | "whole-file";
  /**
   * Declared body name. For whole-file locators this restates the file identity.
   */
  name: string;
}
export interface SourceHash {
  algorithm: "sha256";
  /**
   * Declared digest of the source body bytes. Observation compares against this value; the registry never records what was observed.
   */
  expected: string;
}
export interface Authority {
  gherkinReference: RelativePath;
  semanticAuthorityReference: RelativePath;
}
