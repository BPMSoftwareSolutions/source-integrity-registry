import { readFile, writeFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { validatesSourceIntegrityRegistry } from "../src/validation/validate-registry.js";
import {
  buildsValidRegistry,
  createsSandbox,
  packagedCatalogPath,
  readsFixtureEntry,
  REGISTRY_SCHEMA_ID,
  type Sandbox
} from "./support/fixtures.js";

/**
 * Feature: Admit a Source Integrity Registry contract
 *
 * These are the Step-Zero acceptance boundaries from the SIR intent, expressed
 * one test per scenario.
 */
describe("Feature: Admit a Source Integrity Registry contract", () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createsSandbox();
  });

  afterEach(async () => {
    await sandbox.dispose();
  });

  it("admits a registry governed by an accepted schema", async () => {
    // Given a registry payload declaring an exact accepted schema identity
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    // When the registry contract is validated
    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    // Then the payload conforms to the declared schema
    expect(receipt.findings).toEqual([]);
    expect(receipt.schemaAdmission.admitted).toBe(true);

    // And the validation receipt disposition is REGISTRY_CONTRACT_VALID
    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_VALID");
  });

  it("rejects an unknown schema identity", async () => {
    // Given a registry payload declaring a schema absent from the trusted catalog
    const registry = buildsValidRegistry();
    (registry["contract"] as Record<string, unknown>)["schemaId"] =
      "https://schemas.deterministic.solutions/sir/source-integrity-registry/9.9.9/schema.json";
    (registry["contract"] as Record<string, unknown>)["schemaVersion"] = "9.9.9";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    // When the registry contract is validated
    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    // Then validation stops before payload evaluation
    expect(receipt.schemaAdmission.admitted).toBe(false);
    expect(receipt.findings.map((finding) => finding.code)).toEqual(["SIR_SCHEMA_NOT_ADMITTED"]);

    // And the receipt disposition is SCHEMA_NOT_ADMITTED
    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
  });

  it("rejects a mutated historical schema", async () => {
    // Given an accepted schema identity whose observed bytes do not match its catalog digest
    const catalogPath = await sandbox.copyContracts();
    const schemaPath = catalogPath.replace(
      /catalog[\\/]sir-schema-catalog\.v1\.json$/u,
      "source-integrity-registry/1.0.0/source-integrity-registry.schema.json"
    );

    const mutated = JSON.parse((await readFile(schemaPath)).toString("utf8")) as Record<
      string,
      unknown
    >;
    mutated["description"] = "Mutated after acceptance.";
    await writeFile(schemaPath, `${JSON.stringify(mutated, null, 2)}\n`, "utf8");

    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    // When the schema is resolved
    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: catalogPath
    });

    // Then schema admission is rejected
    expect(receipt.schemaAdmission.admitted).toBe(false);
    expect(receipt.schemaAdmission.observedDigest).not.toBe(receipt.schemaAdmission.catalogDigest);

    // And the receipt disposition is SCHEMA_DIGEST_MISMATCH
    expect(receipt.disposition).toBe("SCHEMA_DIGEST_MISMATCH");
  });

  it("rejects a structurally invalid registry", async () => {
    // Given a registry payload governed by an accepted schema
    const registry = buildsValidRegistry();
    // The workspace revision must be an exact commit identity, not a branch.
    (registry["workspace"] as Record<string, unknown>)["revision"] = "main";
    // The responsibility kind is a closed set.
    (readsFixtureEntry(registry)["responsibility"] as Record<string, unknown>)["kind"] =
      "speculation";

    const registryPath = await sandbox.writeJson("registry.json", registry);

    // When the registry contract is validated
    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    // Then canonical validation findings identify the invalid instance paths
    const instancePaths = receipt.findings.map((finding) => finding.instancePath);
    expect(instancePaths).toContain("/workspace/revision");
    expect(instancePaths).toContain("/entries/semantic-kernel-runtime/responsibility/kind");

    // And the receipt disposition is REGISTRY_CONTRACT_INVALID
    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
    expect(receipt.schemaAdmission.admitted).toBe(true);
  });

  it("refuses floating schema identifiers", async () => {
    const registry = buildsValidRegistry();
    (registry["contract"] as Record<string, unknown>)["schemaId"] =
      "https://schemas.deterministic.solutions/sir/source-integrity-registry/latest/schema.json";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings[0]?.code).toBe("SIR_SCHEMA_ID_NOT_EXACT");
  });

  it("refuses a payload whose declared redundancy disagrees", async () => {
    const registry = buildsValidRegistry();
    // schemaId says 1.0.0 while schemaVersion says 1.1.0.
    (registry["contract"] as Record<string, unknown>)["schemaVersion"] = "1.1.0";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain(
      "SIR_SCHEMA_VERSION_DISAGREEMENT"
    );
  });

  it("refuses a declared schema digest that disagrees with the catalog", async () => {
    const registry = buildsValidRegistry();
    (registry["contract"] as Record<string, unknown>)["schemaDigest"] = `sha256:${"a".repeat(64)}`;
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.disposition).toBe("SCHEMA_NOT_ADMITTED");
    expect(receipt.findings.map((finding) => finding.code)).toContain(
      "SIR_SCHEMA_DIGEST_DISAGREEMENT"
    );
  });

  it("produces identical receipts for identical bytes", async () => {
    const registry = buildsValidRegistry();
    (registry["workspace"] as Record<string, unknown>)["revision"] = "main";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const first = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });
    const second = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("does not mutate the payload bytes it validates", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());
    const before = await readFile(registryPath);

    await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect((await readFile(registryPath)).equals(before)).toBe(true);
  });

  it("reports the declared schema identity it resolved", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.schemaAdmission.declaredSchemaId).toBe(REGISTRY_SCHEMA_ID);
    expect(receipt.subject.registryId).toBe("sir-semantic-kernel-main");
  });
});
