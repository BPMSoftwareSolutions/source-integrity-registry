import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { digestsBytes } from "../../src/domain/digest.js";

export const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export const contractsRoot = path.join(repositoryRoot, "contracts");
export const packagedCatalogPath = path.join(
  contractsRoot,
  "catalog",
  "sir-schema-catalog.v1.json"
);

export const REGISTRY_SCHEMA_ID =
  "https://schemas.deterministic.solutions/sir/source-integrity-registry/1.0.0/schema.json";

/**
 * A registry payload that conforms to source-integrity-registry 1.0.0.
 *
 * Tests derive their variants from this so each scenario differs from a valid
 * baseline in exactly the one respect it is about.
 */
export function buildsValidRegistry(): Record<string, unknown> {
  return {
    contract: {
      contractType: "source-integrity-registry",
      schemaId: REGISTRY_SCHEMA_ID,
      schemaVersion: "1.0.0"
    },
    registryId: "sir-semantic-kernel-main",
    workspace: {
      workspaceId: "semantic-kernel",
      revision: "2704a5909250f7cc56a91d2bf9ddee514c86e871"
    },
    entries: [
      {
        bodyId: "semantic-kernel-runtime",
        responsibility: {
          capabilityId: "semantic-kernel",
          featureId: "execute-semantic-authority",
          scenarioId: "execute-one-semantic-model",
          responsibilityId: "executes-resolved-semantic-model",
          obligationId: "execute-ordered-authorized-steps",
          kind: "execution"
        },
        source: {
          relativePath: "src/kernel/semantic-kernel.ts",
          language: "typescript",
          locator: { kind: "whole-file", name: "semantic-kernel.ts" },
          hash: {
            algorithm: "sha256",
            expected: `sha256:${"0".repeat(64)}`
          }
        },
        authority: {
          gherkinReference: "features/execute-semantic-authority.feature",
          semanticAuthorityReference:
            "semantic-authority/execution/execute-semantic-authority.sej.v1.json"
        }
      }
    ]
  };
}

export interface Sandbox {
  readonly root: string;
  writeJson(relativePath: string, value: unknown): Promise<string>;
  writeText(relativePath: string, contents: string): Promise<string>;
  /** Copies the packaged contracts tree so tests may mutate schema bytes. */
  copyContracts(): Promise<string>;
  dispose(): Promise<void>;
}

export async function createsSandbox(): Promise<Sandbox> {
  const root = await mkdtemp(path.join(tmpdir(), "sir-test-"));

  const writeText = async (relativePath: string, contents: string): Promise<string> => {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
    return target;
  };

  return {
    root,
    writeText,
    writeJson: (relativePath, value) =>
      writeText(relativePath, `${JSON.stringify(value, null, 2)}\n`),
    copyContracts: async () => {
      const target = path.join(root, "contracts");
      await copiesDirectory(contractsRoot, target);
      return path.join(target, "catalog", "sir-schema-catalog.v1.json");
    },
    dispose: () => rm(root, { recursive: true, force: true })
  };
}

async function copiesDirectory(source: string, target: string): Promise<void> {
  const { cp } = await import("node:fs/promises");
  await cp(source, target, { recursive: true });
}

export async function digestsFile(filePath: string): Promise<string> {
  return digestsBytes(await readFile(filePath));
}
