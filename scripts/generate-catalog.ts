import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { digestsBytes } from "../src/domain/digest.ts";
import { SUPPORTED_DIALECT } from "../src/domain/schema-identity.ts";
import { CATALOG_ID, CATALOG_MANIFEST, buildsSchemaId } from "./catalog-manifest.ts";
import { isMainModule } from "./is-main-module.ts";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractsRoot = path.join(repositoryRoot, "contracts");
const catalogPath = path.join(contractsRoot, "catalog", "sir-schema-catalog.v1.json");

/**
 * Writes the trusted catalog with digests computed from the schema bytes.
 *
 * Paths are recorded relative to the contracts root, which is the containment
 * boundary resolution enforces, so no admitted entry needs parent traversal.
 */
export async function buildsCatalogDocument(): Promise<string> {
  const entries = [];

  for (const manifestEntry of CATALOG_MANIFEST) {
    const schemaPath = path.join(contractsRoot, manifestEntry.relativePath);
    const bytes = await readFile(schemaPath);
    const schema = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;

    const schemaId = buildsSchemaId(manifestEntry.schemaFamily, manifestEntry.schemaVersion);

    if (schema["$id"] !== schemaId) {
      throw new Error(
        `Schema at ${manifestEntry.relativePath} declares $id ${String(schema["$id"])}, expected ${schemaId}.`
      );
    }
    if (schema["$schema"] !== SUPPORTED_DIALECT) {
      throw new Error(
        `Schema at ${manifestEntry.relativePath} declares dialect ${String(schema["$schema"])}, expected ${SUPPORTED_DIALECT}.`
      );
    }

    entries.push({
      schemaId,
      schemaFamily: manifestEntry.schemaFamily,
      schemaVersion: manifestEntry.schemaVersion,
      dialect: SUPPORTED_DIALECT,
      relativePath: path.relative(contractsRoot, schemaPath).split(path.sep).join("/"),
      sha256: digestsBytes(bytes),
      status: manifestEntry.status
    });
  }

  const catalog = {
    contract: {
      contractType: "sir-schema-catalog",
      schemaId: buildsSchemaId("sir-schema-catalog", "1.0.0"),
      schemaVersion: "1.0.0"
    },
    catalogId: CATALOG_ID,
    entries
  };

  return `${JSON.stringify(catalog, null, 2)}\n`;
}

export { catalogPath };

if (isMainModule(import.meta.url)) {
  const document = await buildsCatalogDocument();
  await writeFile(catalogPath, document, "utf8");
  process.stdout.write(`Wrote ${path.relative(repositoryRoot, catalogPath)}\n`);
}
