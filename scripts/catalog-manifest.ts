/**
 * The schemas this package publishes as trusted, in catalog order.
 *
 * Adding a version here is the deliberate act of admitting it. Digests are
 * never written by hand: `generate:catalog` computes them from the bytes on
 * disk, so the catalog cannot claim a digest the files do not have.
 */
export interface ManifestEntry {
  readonly schemaFamily: string;
  readonly schemaVersion: string;
  readonly relativePath: string;
  readonly status: "accepted" | "revoked";
}

export const CATALOG_ID = "sir-package-catalog";

export const CATALOG_MANIFEST: readonly ManifestEntry[] = [
  {
    schemaFamily: "sir-schema-catalog",
    schemaVersion: "1.0.0",
    relativePath: "catalog/1.0.0/sir-schema-catalog.schema.json",
    status: "accepted"
  },
  {
    schemaFamily: "source-integrity-registry",
    schemaVersion: "1.0.0",
    relativePath: "source-integrity-registry/1.0.0/source-integrity-registry.schema.json",
    status: "accepted"
  },
  {
    schemaFamily: "source-integrity-validation-receipt",
    schemaVersion: "1.0.0",
    relativePath:
      "source-integrity-validation-receipt/1.0.0/source-integrity-validation-receipt.schema.json",
    status: "accepted"
  }
];

export function buildsSchemaId(schemaFamily: string, schemaVersion: string): string {
  return `https://schemas.deterministic.solutions/sir/${schemaFamily}/${schemaVersion}/schema.json`;
}
