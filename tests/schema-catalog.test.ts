import { describe, expect, it } from "vitest";

import {
  admitsSchemaCatalog,
  resolvesSchemaFromCatalog,
  resolvesContainedPath,
  CatalogIntegrityError,
  type SchemaCatalog,
  type SchemaCatalogEntry
} from "../src/catalog/schema-catalog.js";
import { SUPPORTED_DIALECT } from "../src/domain/schema-identity.js";
import { packagedCatalogPath, contractsRoot, REGISTRY_SCHEMA_ID } from "./support/fixtures.js";

/** Admits the packaged catalog, failing the test if it is not admissible. */
async function admitsPackagedCatalog(): Promise<SchemaCatalog> {
  const admission = await admitsSchemaCatalog(packagedCatalogPath);
  if (admission.outcome !== "admitted") {
    throw new Error(`Packaged catalog was not admitted: ${JSON.stringify(admission.findings)}`);
  }
  return admission.catalog;
}

describe("Packaged schema catalog", () => {
  it("resolves every accepted entry against its recorded digest", async () => {
    const catalog = await admitsPackagedCatalog();
    expect(catalog.entries.length).toBeGreaterThan(0);

    const accepted = catalog.entries.filter(
      (candidate: SchemaCatalogEntry) => candidate.status === "accepted"
    );

    for (const entry of accepted) {
      const resolution = await resolvesSchemaFromCatalog(catalog, entry.schemaId);

      expect(resolution.outcome, `${entry.schemaId}: ${JSON.stringify(resolution)}`).toBe(
        "resolved"
      );
      if (resolution.outcome === "resolved") {
        expect(resolution.schema["$id"]).toBe(entry.schemaId);
        expect(resolution.schema["$schema"]).toBe(SUPPORTED_DIALECT);
      }
    }
  });

  it("declares no floating identifiers", async () => {
    const catalog = await admitsPackagedCatalog();

    for (const entry of catalog.entries) {
      expect(entry.schemaId).not.toMatch(/\/(latest|[0-9]+\.x|\^[0-9])/u);
      expect(entry.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    }
  });

  it("refuses an identity absent from the catalog", async () => {
    const catalog = await admitsPackagedCatalog();

    const resolution = await resolvesSchemaFromCatalog(
      catalog,
      "https://schemas.deterministic.solutions/sir/unknown-family/1.0.0/schema.json"
    );

    expect(resolution.outcome).toBe("not-admitted");
  });

  it("treats an unreadable catalog as a mechanical failure, not a verdict", async () => {
    await expect(admitsSchemaCatalog(`${packagedCatalogPath}.absent`)).rejects.toBeInstanceOf(
      CatalogIntegrityError
    );
  });

  it("reports the registry schema as accepted", async () => {
    const catalog = await admitsPackagedCatalog();
    const entry = catalog.entries.find(
      (candidate: SchemaCatalogEntry) => candidate.schemaId === REGISTRY_SCHEMA_ID
    );

    expect(entry?.status).toBe("accepted");
  });
});

describe("Path containment", () => {
  it("refuses traversal, absolute paths, and backslashes", () => {
    expect(resolvesContainedPath(contractsRoot, "../secrets.json")).toBeUndefined();
    expect(resolvesContainedPath(contractsRoot, "a/../../secrets.json")).toBeUndefined();
    expect(resolvesContainedPath(contractsRoot, "C:\\Windows\\system.ini")).toBeUndefined();
    expect(resolvesContainedPath(contractsRoot, "/etc/passwd")).toBeUndefined();
  });

  it("accepts a contained forward-slash path", () => {
    expect(
      resolvesContainedPath(contractsRoot, "catalog/1.0.0/sir-schema-catalog.schema.json")
    ).toBeDefined();
  });
});
