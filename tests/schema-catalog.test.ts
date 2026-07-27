import { describe, expect, it } from "vitest";

import {
  loadsSchemaCatalog,
  resolvesSchemaFromCatalog,
  resolvesContainedPath,
  CatalogIntegrityError
} from "../src/catalog/schema-catalog.js";
import { SUPPORTED_DIALECT } from "../src/domain/schema-identity.js";
import { packagedCatalogPath, contractsRoot, REGISTRY_SCHEMA_ID } from "./support/fixtures.js";

describe("Packaged schema catalog", () => {
  it("resolves every accepted entry against its recorded digest", async () => {
    const catalog = await loadsSchemaCatalog(packagedCatalogPath);
    expect(catalog.entries.length).toBeGreaterThan(0);

    for (const entry of catalog.entries.filter((candidate) => candidate.status === "accepted")) {
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
    const catalog = await loadsSchemaCatalog(packagedCatalogPath);

    for (const entry of catalog.entries) {
      expect(entry.schemaId).not.toMatch(/\/(latest|[0-9]+\.x|\^[0-9])/u);
      expect(entry.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    }
  });

  it("refuses an identity absent from the catalog", async () => {
    const catalog = await loadsSchemaCatalog(packagedCatalogPath);

    const resolution = await resolvesSchemaFromCatalog(
      catalog,
      "https://schemas.deterministic.solutions/sir/unknown-family/1.0.0/schema.json"
    );

    expect(resolution.outcome).toBe("not-admitted");
  });

  it("refuses a malformed catalog rather than trusting it", async () => {
    await expect(loadsSchemaCatalog(`${packagedCatalogPath}.absent`)).rejects.toBeInstanceOf(
      CatalogIntegrityError
    );
  });

  it("reports the registry schema as accepted", async () => {
    const catalog = await loadsSchemaCatalog(packagedCatalogPath);
    const entry = catalog.entries.find((candidate) => candidate.schemaId === REGISTRY_SCHEMA_ID);

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
