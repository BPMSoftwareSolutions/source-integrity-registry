import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { digestsBytes } from "../src/domain/digest.js";
import { validatesSourceIntegrityRegistry } from "../src/validation/validate-registry.js";
import {
  buildsValidRegistry,
  createsSandbox,
  packagedCatalogPath,
  type Sandbox
} from "./support/fixtures.js";

/** Builds a registry whose single entry declares the digest of `contents`. */
function buildsRegistryForBody(
  relativePath: string,
  contents: string
): Record<string, unknown> {
  const registry = buildsValidRegistry();
  const entry = (registry["entries"] as Record<string, unknown>[])[0]!;
  const source = entry["source"] as Record<string, unknown>;

  source["relativePath"] = relativePath;
  source["locator"] = { kind: "whole-file", name: relativePath.split("/").pop() };
  source["hash"] = {
    algorithm: "sha256",
    expected: digestsBytes(Buffer.from(contents, "utf8"))
  };

  return registry;
}

describe("Physical body observation", () => {
  let sandbox: Sandbox;

  beforeEach(async () => {
    sandbox = await createsSandbox();
  });

  afterEach(async () => {
    await sandbox.dispose();
  });

  it("confirms a body whose bytes match the declared digest", async () => {
    const contents = "export class SemanticKernel {}\n";
    await sandbox.writeText("workspace/src/kernel/semantic-kernel.ts", contents);
    const registryPath = await sandbox.writeJson(
      "registry.json",
      buildsRegistryForBody("src/kernel/semantic-kernel.ts", contents)
    );

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: `${sandbox.root}/workspace`
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_VALID");
    expect(receipt.observation?.entries[0]?.conformance).toBe("BODY_CONFORMS");
  });

  it("reports drift when the observed bytes differ from the declared digest", async () => {
    const declared = "export class SemanticKernel {}\n";
    await sandbox.writeText(
      "workspace/src/kernel/semantic-kernel.ts",
      "export class SemanticKernel { drifted = true }\n"
    );
    const registryPath = await sandbox.writeJson(
      "registry.json",
      buildsRegistryForBody("src/kernel/semantic-kernel.ts", declared)
    );

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: `${sandbox.root}/workspace`
    });

    expect(receipt.disposition).toBe("SOURCE_BODY_DRIFT");
    expect(receipt.observation?.entries[0]?.conformance).toBe("BODY_HASH_MISMATCH");
    expect(receipt.findings[0]?.instancePath).toBe("/entries/0/source");
  });

  it("reports a missing body rather than failing the run", async () => {
    const registryPath = await sandbox.writeJson(
      "registry.json",
      buildsRegistryForBody("src/kernel/absent.ts", "never written")
    );

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: `${sandbox.root}/workspace`
    });

    expect(receipt.disposition).toBe("SOURCE_BODY_DRIFT");
    expect(receipt.observation?.entries[0]?.conformance).toBe("BODY_NOT_FOUND");
  });

  it("does not widen a sub-file locator to the whole file", async () => {
    const contents = "export class SemanticKernel {}\n";
    await sandbox.writeText("workspace/src/kernel/semantic-kernel.ts", contents);

    const registry = buildsRegistryForBody("src/kernel/semantic-kernel.ts", contents);
    const entry = (registry["entries"] as Record<string, unknown>[])[0]!;
    (entry["source"] as Record<string, unknown>)["locator"] = {
      kind: "named-declaration",
      name: "SemanticKernel"
    };

    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: `${sandbox.root}/workspace`
    });

    // Even though the whole-file digest happens to match, a narrower locator
    // designates a different body and is not silently treated as conforming.
    expect(receipt.observation?.entries[0]?.conformance).toBe("BODY_LOCATOR_UNRESOLVED");
    expect(receipt.disposition).toBe("SOURCE_BODY_DRIFT");
  });

  it("omits observation entirely when no workspace root is supplied", async () => {
    const registryPath = await sandbox.writeJson("registry.json", buildsValidRegistry());

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath
    });

    expect(receipt.observation).toBeUndefined();
    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_VALID");
  });

  it("does not observe bodies declared by a structurally invalid registry", async () => {
    const registry = buildsValidRegistry();
    (registry["workspace"] as Record<string, unknown>)["revision"] = "main";
    const registryPath = await sandbox.writeJson("registry.json", registry);

    const receipt = await validatesSourceIntegrityRegistry({
      registryPath,
      schemaCatalogPath: packagedCatalogPath,
      workspaceRoot: `${sandbox.root}/workspace`
    });

    expect(receipt.disposition).toBe("REGISTRY_CONTRACT_INVALID");
    expect(receipt.observation).toBeUndefined();
  });
});
