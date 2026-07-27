import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createsSirSchemaValidator } from "../src/validation/ajv-factory.js";
import { validatesSourceIntegrityRegistry } from "../src/validation/validate-registry.js";
import {
  buildsValidRegistry,
  contractsRoot,
  createsSandbox,
  packagedCatalogPath,
  type Sandbox
} from "./support/fixtures.js";

/**
 * SIR must be governed by the same contracts it enforces. If a receipt the
 * circuit emits does not satisfy the published receipt schema, the receipt
 * contract is decorative rather than authoritative.
 */
describe("Receipts conform to the published receipt schema", () => {
  let sandbox: Sandbox;
  let validatesReceipt: ReturnType<ReturnType<typeof createsSirSchemaValidator>["compile"]>;

  beforeEach(async () => {
    sandbox = await createsSandbox();

    const schemaPath = path.join(
      contractsRoot,
      "source-integrity-validation-receipt",
      "1.0.0",
      "source-integrity-validation-receipt.schema.json"
    );
    const schema = JSON.parse((await readFile(schemaPath)).toString("utf8")) as object;
    validatesReceipt = createsSirSchemaValidator().compile(schema);
  });

  afterEach(async () => {
    await sandbox.dispose();
  });

  it.each([
    ["valid registry", () => buildsValidRegistry()],
    [
      "invalid registry",
      () => {
        const registry = buildsValidRegistry();
        (registry["workspace"] as Record<string, unknown>)["revision"] = "main";
        return registry;
      }
    ],
    [
      "unknown schema identity",
      () => {
        const registry = buildsValidRegistry();
        (registry["contract"] as Record<string, unknown>)["schemaId"] =
          "https://schemas.deterministic.solutions/sir/source-integrity-registry/9.9.9/schema.json";
        (registry["contract"] as Record<string, unknown>)["schemaVersion"] = "9.9.9";
        return registry;
      }
    ]
  ])("emits a schema-conforming receipt for a %s", async (_label, buildRegistry) => {
    const registryPath = await sandbox.writeJson("registry.json", buildRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    // Serialize first: the receipt crosses process boundaries as JSON, and
    // undefined-valued optional keys must not appear in that form.
    const asJson: unknown = JSON.parse(JSON.stringify(receipt));

    expect(validatesReceipt(asJson), JSON.stringify(validatesReceipt.errors, null, 2)).toBe(true);
  });

  it("emits a schema-conforming receipt when observation runs", async () => {
    await sandbox.writeText("workspace/src/kernel/semantic-kernel.ts", "drifted\n");
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: path.join(sandbox.root, "workspace")
    });

    const asJson: unknown = JSON.parse(JSON.stringify(receipt));

    expect(receipt.observation?.performed).toBe(true);
    expect(validatesReceipt(asJson), JSON.stringify(validatesReceipt.errors, null, 2)).toBe(true);
  });
});

describe("The packaged catalog conforms to the catalog schema", () => {
  it("validates the shipped catalog against sir-schema-catalog 1.0.0", async () => {
    const schemaPath = path.join(
      contractsRoot,
      "catalog",
      "1.0.0",
      "sir-schema-catalog.schema.json"
    );
    const schema = JSON.parse((await readFile(schemaPath)).toString("utf8")) as object;
    const validate = createsSirSchemaValidator().compile(schema);

    const catalog: unknown = JSON.parse((await readFile(packagedCatalogPath)).toString("utf8"));

    expect(validate(catalog), JSON.stringify(validate.errors, null, 2)).toBe(true);
  });
});
