import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { compile } from "json-schema-to-typescript";

import { parsesAuthorityDocument } from "../src/authority/parse-authority-document.ts";
import { CATALOG_MANIFEST } from "./catalog-manifest.ts";
import { isMainModule } from "./is-main-module.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractsRoot = path.join(repositoryRoot, "contracts");
const outputRoot = path.join(contractsRoot, "generated", "typescript");

const BANNER = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Projected from the JSON Schema contracts by \`pnpm generate:types\`.
 * These declarations are compile-time guardrails only. They never replace AJV
 * runtime validation and never become canonical authority.
 */`;

interface GeneratedArtifact {
  readonly outputPath: string;
  readonly contents: string;
}

export async function buildsGeneratedTypes(): Promise<readonly GeneratedArtifact[]> {
  const artifacts: GeneratedArtifact[] = [];

  for (const entry of CATALOG_MANIFEST) {
    const schemaPath = path.join(contractsRoot, entry.relativePath);
    const parsed = parsesAuthorityDocument(await readFile(schemaPath));
    if (parsed.outcome === "failed") {
      throw new Error(
        `Schema at ${entry.relativePath} is not admissible authority: ${parsed.failure.message}`
      );
    }
    const schema = parsed.document.value as Record<string, unknown>;

    const declarations = await compile(schema, entry.schemaFamily, {
      bannerComment: "",
      additionalProperties: false,
      style: { singleQuote: false },
      // Identity URIs are not retrieval instructions here either.
      $refOptions: { resolve: { http: false, file: false } }
    });

    artifacts.push({
      outputPath: path.join(outputRoot, `${entry.schemaFamily}.${entry.schemaVersion}.d.ts`),
      contents: `${BANNER}\n\n${declarations.trimStart()}`
    });
  }

  return artifacts;
}

export { outputRoot, repositoryRoot };

if (isMainModule(import.meta.url)) {
  await mkdir(outputRoot, { recursive: true });
  const artifacts = await buildsGeneratedTypes();

  for (const artifact of artifacts) {
    await writeFile(artifact.outputPath, artifact.contents, "utf8");
    process.stdout.write(`Wrote ${path.relative(repositoryRoot, artifact.outputPath)}\n`);
  }
}
