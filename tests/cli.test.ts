import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runsCli } from "../src/cli/run-cli.js";
import { EXIT_CODE } from "../src/domain/dispositions.js";
import {
  buildsValidRegistry,
  createsSandbox,
  packagedCatalogPath,
  type Sandbox
} from "./support/fixtures.js";

describe("sir CLI", () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createsSandbox();
  });

  afterEach(async () => {
    await sandbox.dispose();
  });

  it("exits 0 for a valid registry", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const result = await runsCli(["validate", registryPath, "--catalog", packagedCatalogPath]);

    expect(result.exitCode).toBe(EXIT_CODE.REGISTRY_VALID);
    expect(result.stdout).toContain("REGISTRY_CONTRACT_VALID");
  });

  it("exits 3 when the schema is not admitted", async () => {
    const registry = buildsValidRegistry();
    (registry["contract"] as Record<string, unknown>)["schemaId"] =
      "https://schemas.deterministic.solutions/sir/source-integrity-registry/9.9.9/schema.json";
    (registry["contract"] as Record<string, unknown>)["schemaVersion"] = "9.9.9";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const result = await runsCli(["validate", registryPath, "--catalog", packagedCatalogPath]);

    expect(result.exitCode).toBe(EXIT_CODE.SCHEMA_NOT_ADMITTED);
  });

  it("exits 5 when the registry contract is invalid", async () => {
    const registry = buildsValidRegistry();
    (registry["workspace"] as Record<string, unknown>)["revision"] = "main";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const result = await runsCli(["validate", registryPath, "--catalog", packagedCatalogPath]);

    expect(result.exitCode).toBe(EXIT_CODE.REGISTRY_CONTRACT_INVALID);
    expect(result.stdout).toContain("/workspace/revision");
  });

  it("exits 2 for invalid arguments", async () => {
    const missingPath = await runsCli(["validate"]);
    expect(missingPath.exitCode).toBe(EXIT_CODE.INVALID_ARGUMENTS);

    const unknownCommand = await runsCli(["inspect", "registry.json"]);
    expect(unknownCommand.exitCode).toBe(EXIT_CODE.INVALID_ARGUMENTS);

    const unknownOption = await runsCli(["validate", "registry.json", "--verbose"]);
    expect(unknownOption.exitCode).toBe(EXIT_CODE.INVALID_ARGUMENTS);

    const badFormat = await runsCli([
      "validate",
      "registry.json",
      "--format",
      "yaml"
    ]);
    expect(badFormat.exitCode).toBe(EXIT_CODE.INVALID_ARGUMENTS);
  });

  it("exits 6 when the payload cannot be read", async () => {
    const result = await runsCli([
      "validate",
      path.join(sandbox.root, "absent.json"),
      "--catalog",
      packagedCatalogPath
    ]);

    expect(result.exitCode).toBe(EXIT_CODE.EXECUTION_FAILURE);
    expect(result.stderr).toContain("SIR execution failure");
  });

  it("exits 6 when the catalog itself cannot be trusted", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());
    const brokenCatalog = await sandbox.writeText("broken-catalog.json", "{ not json");

    const result = await runsCli(["validate", registryPath, "--catalog", brokenCatalog]);

    expect(result.exitCode).toBe(EXIT_CODE.EXECUTION_FAILURE);
  });

  it("emits the receipt as JSON on request", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const result = await runsCli([
      "validate",
      registryPath,
      "--catalog",
      packagedCatalogPath,
      "--format",
      "json"
    ]);

    const receipt = JSON.parse(result.stdout) as { disposition: string };
    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_VALID");
  });

  it("observes bodies when a workspace root is supplied", async () => {
    await sandbox.writeText("workspace/src/kernel/semantic-kernel.ts", "drifted\n");
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const result = await runsCli([
      "validate",
      registryPath,
      "--catalog",
      packagedCatalogPath,
      "--workspace",
      path.join(sandbox.root, "workspace")
    ]);

    expect(result.exitCode).toBe(EXIT_CODE.REGISTRY_CONTRACT_INVALID);
    expect(result.stdout).toContain("SOURCE_BODY_DRIFT");
  });

  it("prints usage when asked for help", async () => {
    const result = await runsCli(["--help"]);
    expect(result.stdout).toContain("sir validate");
  });
});
